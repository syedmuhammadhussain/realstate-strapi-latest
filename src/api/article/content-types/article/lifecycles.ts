
import { errors } from '@strapi/utils';
const { ApplicationError } = errors;

export default {
    beforeCreate(event) {
        let okay = false;

        // Throwing an error will prevent the entity from being created
        if (!okay) {
            throw new errors.ApplicationError('Something went wrong', { foo: 'bar' });
        }
    },
};