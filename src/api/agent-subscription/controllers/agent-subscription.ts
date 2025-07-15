/**
 * agent-subscription controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::agent-subscription.agent-subscription",
  ({ strapi }) => ({
    async purchase(ctx) {
      const {
        email,
        agent,
        paymentId,
        label,
        position,
        amount,
        auto_renew,
        productId,
        positionId,
      } = ctx.request.body;

      // Validate that all required fields are provided.
      if (
        !email ||
        !agent ||
        !paymentId ||
        !position ||
        !amount ||
        !productId ||
        !positionId
        // ||
      ) {
        return ctx.badRequest("Missing required fields.");
      }

      // Call the custom service to complete the purchase process in one go.
      return await strapi
        .service("api::agent-subscription.agent-subscription")
        .purchase({
          agent,
          paymentId,
          label,
          position,
          amount,
          auto_renew,
          productId,
          positionId,
          email,
        });
    },

    async advertise(ctx) {
      const agentId = ctx.state.user.id;
      const { paymentId, productId, amount, agent, positionId } =
        ctx.request.body;

      if (agentId !== agent)
        return ctx.badRequest("Agent is not allowed this porduct");

      // 1) Basic validation
      if (!paymentId || !productId || !amount || !agent || !positionId) {
        return ctx.badRequest("Some field is missing");
      }

      return await strapi
        .service("api::agent-subscription.agent-subscription")
        .advertise({
          paymentId,
          productId,
          amount,
          agent,
          positionId,
        });
    },

    async approve(ctx) {
      const { id } = ctx.params;
      if (!id) {
        return ctx.badRequest("Subscription id is required.");
      }
      const subscriptionId = Number(id);

      return await strapi
        .service("api::agent-subscription.agent-subscription")
        .approveBooking(subscriptionId);
    },
  })
);
