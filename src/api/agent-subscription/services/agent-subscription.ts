/**
 * agent-subscription service
 */

import { factories } from "@strapi/strapi";
import utils from "@strapi/utils";
import { startOfToday, addMonths } from "date-fns";

const { ValidationError, ApplicationError } = utils.errors;

enum PositionStatus {
  AVAILABLE = "AVAILABLE",
  PENDING = "PENDING",
  BOOKED = "BOOKED",
  REJECTED = "REJECTED",
}

export async function verifyPayment(
  paymentId: string,
  expectedAmount: number // in dollars
): Promise<{ valid: boolean; reason?: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.STRIPE_PAYMENT_BASE_URL;

  if (!key || !baseUrl) {
    return { valid: false, reason: "Missing Stripe configuration" };
  }

  const url = `${baseUrl}${paymentId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text(); // helpful for debugging
      strapi.log.warn(`Stripe fetch failed: ${response.status} - ${text}`);
      return { valid: false, reason: `HTTP ${response.status}` };
    }

    const intent: any = await response.json();

    if (intent.status !== "succeeded") {
      return { valid: false, reason: `status ${intent.status}` };
    }

    const received = intent.amount_received as number;
    const expectedCents = Math.round(expectedAmount * 100);
    if (received !== expectedCents) {
      return { valid: false, reason: "amount mismatch" };
    }

    return { valid: true };
  } catch (err: any) {
    strapi.log.warn("Stripe REST error", err.message || err);
    return { valid: false, reason: "exception" };
  }
}

export async function sendAdminApprovalNotification(email, productId) {
  const product = await strapi.db.query("api::product.product").findOne({
    where: { id: productId },
  });

  await strapi
    .plugin("email")
    .service("email")
    .send({
      to: email,
      subject: "Position Booking Confirmation",
      text: `Dear Agent,

Your booking request for the position associated with "${
        product ? product.title : "the selected product"
      }" has been received and is currently pending admin approval. 

You will receive a further update once your booking is confirmed.

Thank you for choosing our service!`,
      html: `<p>Dear Agent,</p>
<p>Your booking request for the position associated with <strong>${
        product ? product.title : "the selected product"
      }</strong> has been received and is currently pending admin approval.</p>
<p>You will receive a further update once your booking is confirmed.</p>
<p>Thank you for choosing our service!</p>`,
    });

  strapi.log.info(`Agent notification: New booking requires approval.`);
}

export default factories.createCoreService(
  "api::agent-subscription.agent-subscription",
  ({}) => ({
    /**
     * Purchases a subscription (or booking) after verifying payment.
     * Optionally, you can wrap all the database operations in a transaction.
     */
    async purchase(input) {
      const {
        agent,
        paymentId,
        label,
        position,
        amount,
        auto_renew,
        productId,
        positionId,
        email,
      } = input;

      // --- Compute Start and End Dates Server-Side using date-fns ---
      const computedStartDate = startOfToday(); // Today's date at midnight
      const computedEndDate = addMonths(computedStartDate, 1); // Expiry date one month later

      strapi.log.info(
        `Computed booking dates: start=${computedStartDate.toISOString()}, end=${computedEndDate.toISOString()}`
      );

      const positionInfo = await strapi.db
        .query("api::position.position")
        .findOne({ where: { id: positionId }, populate: ["city"] });

      if (!positionInfo) throw new ValidationError("Position not found.");

      if (positionInfo.price !== amount) {
        throw new ValidationError(
          `Position price mismatch: expected ${positionInfo.amount}, got ${amount}`
        );
      }

      // Ensure this paymentId has not been used before.
      const exists = await strapi.db
        .query("api::agent-subscription.agent-subscription")
        .findOne({ where: { payment_id: paymentId } });

      if (exists) {
        throw new ValidationError(
          `This payment (${paymentId}) has already been used.`
        );
      }

      // 1. VERIFY PAYMENT WITH STRIPE
      //   const { valid, reason } = await verifyPayment(paymentId, amount);
      //   if (!valid) {
      //     throw new ValidationError(`Stripe verification failed: ${reason}`);
      //   }

      // 2. Check that the product (selectedProductId) is owned by the agent
      const product = await strapi.db.query("api::product.product").findOne({
        where: { id: productId },
        populate: ["owner", "city"], // Assume owner relation holds agent info
      });

      if (!product) {
        throw new ValidationError("Product not found.");
      }
      // Check that the owner of the product matches the requesting agent.
      // Adjust the property access according to your product schema.
      if (!product.owner || product.owner.id !== agent) {
        throw new ValidationError(
          "You are not authorized to book a position for this product."
        );
      }

      // Check product and position should same city
      if (positionInfo.city.id !== product.city.id) {
        throw new ValidationError("Position and product city mismatch");
      }

      // 3. Check that the Position is available.
      const selectedPosition = await strapi.db
        .query("api::position.position")
        .findOne({
          where: { id: positionId, city: product.city.id },
        });

      if (!selectedPosition) throw new ValidationError("Position not found.");

      if (selectedPosition.is_booked)
        throw new ValidationError("This position is already taken.");

      // 4. Create the AgentSubscription record using computed dates.
      const newSubscription = await strapi.db
        .query("api::agent-subscription.agent-subscription")
        .create({
          data: {
            label,
            agent,
            auto_renew,
            subscription_type: "Position",
            selected_position: position,
            start_date: computedEndDate,
            end_date: computedEndDate,
            subscription_status: PositionStatus.PENDING,
            payment_id: paymentId,
            selected_product: productId,
          },
        });

      // 5. Update the Position record to mark it as booked.
      await strapi.db.query("api::position.position").update({
        where: { id: positionId },
        data: { is_booked: true, product: productId },
      });

      // Optionally, you could also send a notification to the agent.
      await sendAdminApprovalNotification(email, productId);

      return newSubscription;
    },

    /**
     * Approves a pending booking.
     * This function assumes that the AgentSubscription record has a relation
     * called `selected_product` and a stored field `position_order`.
     *
     * Security checks:
     * - It verifies the subscription exists and is in PENDING status.
     * - It ensures that a valid position_order is stored.
     * - It updates both the subscription record (to BOOKED) and the associated product.
     */
    async approveBooking(subscriptionId: number) {
      // 1. Fetch the AgentSubscription record along with the associated product.
      const subscription = await strapi.db
        .query("api::agent-subscription.agent-subscription")
        .findOne({
          where: { id: subscriptionId },
          populate: ["selected_product"], // get the related product details
        });

      if (!subscription) {
        throw new ValidationError("Subscription not found.");
      }

      // 2. Check that the subscription is in PENDING status before approving it.
      if (subscription.subscription_status !== PositionStatus.PENDING) {
        throw new ValidationError(
          "Only pending subscriptions can be approved."
        );
      }

      // 3. Verify that the subscription has a valid position_order.
      const sequenceOrder = subscription.selected_position;

      if (sequenceOrder === undefined || sequenceOrder === null) {
        throw new ValidationError(
          "No sequence order found for this subscription."
        );
      }

      // 5. Update the associated product's sequence_order.
      const productId = subscription.selected_product?.id;

      if (!productId) {
        throw new ValidationError(
          "No associated product found in subscription."
        );
      }

      // 4. Update the subscription status to BOOKED.
      const updatedSubscription = await strapi.db
        .query("api::agent-subscription.agent-subscription")
        .update({
          where: { id: subscriptionId },
          data: {
            subscription_status: PositionStatus.BOOKED,
          },
        });

      const updatedProduct = await strapi.db
        .query("api::product.product")
        .update({
          where: { id: productId },
          data: {
            sequence_order: sequenceOrder,
          },
        });

      // 6. Return the updated records.
      // These records can be used to confirm that the approval process completed successfully.
      return {
        updatedSubscription,
        updatedProduct,
      };
    },

    /**
     * Advertise purchase: Validations first then
     * 1. Close gap if this product was already in slot ≥ 26
     * 2. Bump everyone in slot ≥ 26 up by 1
     * 3. Set this product to slot 26
     * 4. Create the subscription record (24h lifetime)
     */
    async advertise({ paymentId, productId, amount, agent, positionId }) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const position = await strapi.db
        .query("api::position.position")
        .findOne({ where: { id: positionId }, populate: ["city"] });

      if (!position) throw new ValidationError("Position not found.");

      if (position.price !== amount) {
        throw new ValidationError(
          `Position price mismatch: expected ${position.amount}, got ${amount}`
        );
      }

      // Ensure this paymentId has not been used before.
      const exists = await strapi.db
        .query("api::agent-subscription.agent-subscription")
        .findOne({ where: { payment_id: paymentId } });

      if (exists) {
        throw new ValidationError(
          `This payment (${paymentId}) has already been used.`
        );
      }

      // 1. VERIFY PAYMENT WITH STRIPE
      //   const { valid, reason } = await verifyPayment(paymentId, amount);
      //   if (!valid) {
      //     throw new ValidationError(`Stripe verification failed: ${reason}`);
      //   }

      // 2. Check that the product (selectedProductId) is owned by the agent
      const product = await strapi.db.query("api::product.product").findOne({
        where: { id: productId },
        populate: ["owner", "city"], // Assume owner relation holds agent info
      });

      if (!product) throw new ValidationError("Product not found.");

      // Check that the owner of the product matches the requesting agent.
      // Adjust the property access according to your product schema.
      if (!product.owner || product.owner.id !== agent) {
        throw new ValidationError(
          "You are not authorized to book a position for this product."
        );
      }

      // Check product and position should same city
      if (position.city.id !== product.city.id) {
        throw new ValidationError(
          "Position city is not relevant with the agent product city"
        );
      }

      return await strapi.db.transaction(async ({ trx }) => {
        // 2) Fetch old sequence_order
        const [{ sequence_order: oldSeq } = { sequence_order: null }] =
          await trx("products")
            .select("sequence_order")
            .where({ id: productId });

        // 3) If it was already in the queue, close that gap
        if (oldSeq >= 26) {
          await trx("products")
            .where("sequence_order", ">", oldSeq)
            .decrement("sequence_order", 1);
        }

        // 4) Push everyone currently at ≥26 up by 1
        await trx("products")
          .where("sequence_order", ">=", 26)
          .increment("sequence_order", 1);

        // 5) Lock this product into slot 26
        await trx("products")
          .where({ id: productId })
          .update({ sequence_order: 26 });

        // 6) Create the subscription record (do NOT pass transacting: trx)
        const subscription = await strapi.db
          .query("api::agent-subscription.agent-subscription")
          .create({
            data: {
              agent,
              payment_id: paymentId,
              selected_product: productId,
              subscription_type: "advertisement",
              label: "Advertisement",
              subscription_status: "BOOKED",
              auto_renew: false,
              selected_position: 26,
              start_date: now.toISOString(),
              end_date: expiresAt.toISOString(),
            },
          });

        // No need to manually commit/rollback; Strapi handles it
        return subscription;
      });
    },
  })
);
