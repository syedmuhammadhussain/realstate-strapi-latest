import { errors } from "@strapi/utils";

export default {
  async beforeCreate(event) {
    const {
      params: { data },
    } = event;

    if (data.city && data.order !== undefined) {
      const duplicate = await strapi.db
        .query("api::position.position")
        .findOne({
          where: {
            city: data.city.connect[0].id,
            order: data.order,
          },
        });

      if (duplicate) {
        throw new errors.ValidationError(
          `The order value ${data.order} already exists for this city.`
        );
      }
    }
  },

  async beforeUpdate(event) {
    const {
      params: { data, where },
    } = event;

    // Only proceed if order is being updated or city might be relevant
    if (data.order !== undefined || data.city !== undefined) {
      let cityId: number | undefined;
      let order = data.order;

      // Fetch current record to fill in missing fields
      const currentRecord = await strapi.db
        .query("api::position.position")
        .findOne({
          where: { id: where.id },
          populate: { city: true }, // Ensure city relation is populated
        });

      // Resolve city ID from incoming data or fallback to current record
      if (data.city?.connect?.[0]?.id) {
        cityId = data.city.connect[0].id;
      } else if (typeof data.city === "object" && data.city.id) {
        cityId = data.city.id;
      } else if (currentRecord?.city?.id) {
        cityId = currentRecord.city.id;
      }

      // Resolve order from incoming data or fallback
      if (order === undefined) {
        order = currentRecord.order;
      }

      // Only validate if both city and order are resolved
      if (cityId !== undefined && order !== undefined) {
        const duplicate = await strapi.db
          .query("api::position.position")
          .findOne({
            where: {
              city: cityId,
              order,
              id: { $ne: where.id },
            },
          });

        if (duplicate) {
          throw new errors.ValidationError(
            `Position with order ${order} already exists for this city.`
          );
        }
      }
    }
  },

  // async beforeUpdate(event) {
  //   debugger;
  //   const {
  //     params: { data, where },
  //   } = event;

  //   if ((data.order !== undefined || data.city) && data.order !== undefined) {
  //     let city = data.city;
  //     let order = data.order;

  //     if (!city || order === undefined) {
  //       const currentRecord = await strapi.db
  //         .query("api::position.position")
  //         .findOne({
  //           where: { id: where.id },
  //         });
  //       if (!city) city = currentRecord.city;
  //       if (order === undefined) order = currentRecord.order;
  //     }

  //     if (city?.connect) {
  //       city = city.connect[0].id;
  //     } else if (typeof city === "object" && city.id) {
  //       city = city.id;
  //     }

  //     const duplicate = await strapi.db
  //       .query("api::position.position")
  //       .findOne({
  //         where: {
  //           city,
  //           order,
  //           id: { $ne: where.id },
  //         },
  //       });

  //     if (duplicate) {
  //       throw new errors.ValidationError(
  //         `Position with order ${order} already exists for this city.`
  //       );
  //     }
  //   }
  // },
};
