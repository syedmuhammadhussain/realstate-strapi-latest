/**
 * article controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::article.article', () => ({
    async find(ctx) {

        if (ctx.body) {
            return ctx.badRequest("Not access")
        }

        return await strapi.service('api::article.article').findA(ctx);
        // validateQuery (optional)
        // to throw an error on query params that are invalid or the user does not have access to
        // await this.validateQuery(ctx);

        // // sanitizeQuery to remove any query params that are invalid or the user does not have access to
        // // It is strongly recommended to use sanitizeQuery even if validateQuery is used
        // const sanitizedQueryParams = await this.sanitizeQuery(ctx);
        // const { results, pagination } = await strapi.service('api::article.article').findA(sanitizedQueryParams);
        // const sanitizedResults = await this.sanitizeOutput(results, ctx);

        // return this.transformResponse(sanitizedResults, { pagination });
    }
}));
