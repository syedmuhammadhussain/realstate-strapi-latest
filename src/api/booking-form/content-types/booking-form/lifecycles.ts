import { errors } from '@strapi/utils'
import { v4 as uuidv4 } from 'uuid'
import {
  parseISO,
  isBefore,
  startOfToday,
  isValid as isValidDate,
} from 'date-fns'

interface LifecycleEvent {
  params: {
    data?: any
    where?: any
  }
  result?: any
}

export default {

  async beforeCreate(event: LifecycleEvent) {

    const { data } = event.params

    // 1) Required & format checks
    if (!data.name?.trim())
      throw new errors.ValidationError('Name is required.')
    if (!data.phone?.trim())
      throw new errors.ValidationError('Phone number is required.')
    if (!/^\+?\d{7,15}$/.test(data.phone))
      throw new errors.ValidationError(
        'Phone must be 7–15 digits, optional leading +.'
      )
    if (!data.email?.trim())
      throw new errors.ValidationError('Email is required.')
    if (!/^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$/.test(data.email))
      throw new errors.ValidationError('Email format is invalid.')

    // 2) Product existence & availability
    const productId =
      typeof data.product === 'object'
        ? data.product.set?.[0]?.id
        : data.product

    if (!productId) throw new errors.ValidationError('Product ID is required.')
    const product = await strapi.db
      .query('api::product.product')
      .findOne({ where: { id: productId } })
    if (!product) throw new errors.ApplicationError('Product not found.')
    if (product.is_booked)
      throw new errors.ApplicationError('Product is already booked.')

    // 3) Prevent duplicate pending booking
    const dup = await strapi.db
      .query('api::booking-form.booking-form')
      .findOne({
        where: {
          product: productId,
          email: data.email,
          booking_status: 'PENDING',
        },
      })
    if (dup)
      throw new errors.ApplicationError(
        'A pending booking for this product and email already exists.'
      )

    // 4) Date checks
    if (data.arrival) {
      const arrival = parseISO(data.arrival)
      if (!isValidDate(arrival))
        throw new errors.ValidationError('Invalid arrival date.')
      if (isBefore(arrival, startOfToday()))
        throw new errors.ValidationError('Arrival cannot be in the past.')

      if (data.departure) {
        const departure = parseISO(data.departure)
        if (!isValidDate(departure))
          throw new errors.ValidationError('Invalid departure date.')
        if (isBefore(departure, arrival))
          throw new errors.ValidationError('Departure before arrival.')
      }
    }

    // if (data.booking_date) {
    //   const bd = parseISO(data.booking_date)
    //   if (!isValidDate(bd))
    //     throw new errors.ValidationError('Invalid booking date.')
    // }

    if (data.booking_expiry) {
      const exp = parseISO(data.booking_expiry)
      if (!isValidDate(exp))
        throw new errors.ValidationError('Invalid expiry date.')
      if (isBefore(exp, startOfToday()))
        throw new errors.ValidationError('Expiry cannot be in the past.')
    }

    // 5) Guest count
    if (data.guest != null) {
      if (!Number.isInteger(data.guest) || data.guest < 1)
        throw new errors.ValidationError(
          'Guest count must be a positive integer.'
        )
    }

    // 6) Defaults
    data.booking_status = 'PENDING'
    data.booking_date = new Date().toISOString()
  },

  async afterCreate(event: LifecycleEvent) {
    const { result } = event
    const bookingId = result.id

    // reload with product + owner
    const booking = await strapi.db
      .query('api::booking-form.booking-form')
      .findOne({
        where: { id: bookingId },
        populate: ['product', 'product.owner'],
      })

    if (!booking?.product?.owner) {
      strapi.log.warn(
        'Missing product/owner; skipping post-create notifications.'
      )
      throw new errors.ValidationError('Missing product/owner; skipping post-create notifications.')
    }

    const ownerEmail = booking.product.owner.email
    const clientEmail = booking.email
    const pName = booking.product.title
    const ownerId = booking.product.owner.id

    // EMAILS (PENDING)
    try {
      // to client
      await strapi
        .plugin('email')
        .service('email')
        .send({
          to: clientEmail,
          subject: 'Booking Request Received',
          html: `<p>Your request for "<strong>${pName}</strong>" is received. We’ll update you soon.</p>`,
        })

      // to owner
      await strapi
        .plugin('email')
        .service('email')
        .send({
          to: ownerEmail,
          subject: 'New Booking Request',
          html: `<p>A new booking request arrived for "<strong>${pName}</strong>". Please review.</p>`,
        })

      strapi.log.info(`📧 Booking emails sent to client & owner`)
    } catch (e) {
      strapi.log.error('Error sending booking emails:', e)
      throw new errors.ApplicationError('Error sending booking emails:')
    }

    // NOTIFICATION (PENDING)
    try {
      const notif = await strapi.db
        .query('api::notification.notification')
        .create({
          data: {
            documentId: uuidv4(),
            type: 'booking_request',
            message: `New booking request for "${pName}"`,
            recipient: ownerId,
            notification_status: 'Active',
            booking_form: {
              connect: { id: bookingId },
            },
          },
          populate: ['booking_form'],
        })

      strapi.log.info(`🔔 Created notification ${notif.id} (PENDING)`)
    } catch (e) {
      strapi.log.error('Error creating booking notification:', e)
      throw new errors.ApplicationError('Error creating booking notification:')
    }
  },

  async beforeUpdate(event: any): Promise<void> {
    const { data, where } = event.params

    // 0️⃣ Only run when status is being set to "booked"
    if (data.booking_status?.toLowerCase() !== 'booked') {
      return
    }

    // 1️⃣ Load existing booking + product
    const bookingForm = await strapi.db
      .query('api::booking-form.booking-form')
      .findOne({
        where: { id: where.id },
        populate: ['product'],
      })

    if (!bookingForm) {
      throw new errors.ApplicationError('Booking not found.')
    }

    // 2️⃣ Must have been "pending" previously
    if (bookingForm.booking_status.toLowerCase() !== 'pending') {
      throw new errors.ApplicationError(
        `Cannot transition booking from "${bookingForm.booking_status}".`
      )
    }

    const product = bookingForm.product
    if (!product) {
      throw new errors.ApplicationError('No product linked to this booking.')
    }

    // 3️⃣ Prevent double-booking
    if (product.is_booked) {
      throw new errors.ApplicationError('Product is already booked.')
    }

    // 4️⃣ booking_expiry must exist & be a valid future-or-today date
    if (!data.booking_expiry) {
      throw new errors.ApplicationError(
        'Booking expiry date is required when approving.'
      )
    }

    const expiryDate = parseISO(data.booking_expiry)

    if (!isValidDate(expiryDate)) {
      throw new errors.ApplicationError('Invalid expiry date format.')
    }

    // compare to start of today
    if (isBefore(expiryDate, startOfToday())) {
      throw new errors.ApplicationError('Expiry date cannot be in the past.')
    }

    // 5️⃣ (Optional) Validate arrival/departure if present
    if (bookingForm.arrival) {
      const arrival = parseISO(bookingForm.arrival)

      if (!isValidDate(arrival)) {
        throw new errors.ApplicationError('Stored arrival date is invalid.')
      }

      if (bookingForm.departure) {
        const departure = parseISO(bookingForm.departure)
        if (!isValidDate(departure) || isBefore(departure, arrival)) {
          throw new errors.ApplicationError(
            'Departure must be on or after arrival.'
          )
        }
        // also ensure expiry ≥ departure
        if (isBefore(expiryDate, departure)) {
          throw new errors.ApplicationError(
            'Expiry date cannot be before departure date.'
          )
        }
      }
    }

    // 6️⃣ Everything’s valid — update product and mutate booking-form data
    await strapi.db.query('api::product.product').update({
      where: { id: product.id },
      data: {
        is_booked: true,
        expiry_date: expiryDate.toISOString(),
      },
    })

    // 7️⃣ Mutate the booking form so Strapi writes back status & expiry
    data.expiry_date = expiryDate.toISOString()
  },
}
