/**
 * article service
 */

import { errors } from '@strapi/utils';
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::article.article', () => ({
    async findA(params) {
        let okay = false;

        if (!okay) {
            throw new errors.ApplicationError('Something went wrong', { foo: 'bar' });
        }

        const result = await super.create(params);

        return result;
    }
}));
