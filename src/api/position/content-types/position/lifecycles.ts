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
    debugger;
    const {
      params: { data, where },
    } = event;

    if ((data.order !== undefined || data.city) && data.order !== undefined) {
      let city = data.city;
      let order = data.order;

      if (!city || order === undefined) {
        const currentRecord = await strapi.db
          .query("api::position.position")
          .findOne({
            where: { id: where.id },
          });
        if (!city) city = currentRecord.city;
        if (order === undefined) order = currentRecord.order;
      }

      if (city?.connect) {
        city = city.connect[0].id;
      } else if (typeof city === "object" && city.id) {
        city = city.id;
      }

      const duplicate = await strapi.db
        .query("api::position.position")
        .findOne({
          where: {
            city,
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
  },
};
