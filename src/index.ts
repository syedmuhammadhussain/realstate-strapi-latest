import type { Core } from '@strapi/strapi';
import utils from '@strapi/utils'

const { ApplicationError } = utils.errors

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],

      /**
       * Lifecycle hook triggered before a new user is created.
       * @param {any} event - The event object containing the created user's details.
       */
      async beforeCreate(event: any) {
        const { data } = event.params

        const role = await strapi.db
          .query('plugin::users-permissions.role')
          .findOne({ where: { type: data.roleName } })

        if (!role) {
          throw new ApplicationError('Impossible to find the default role')
        }

        data.role = role.id
      },

    })
  },
};
