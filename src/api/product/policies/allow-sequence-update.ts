
import { errors } from '@strapi/utils';

export default (ctx) => {
  const data = ctx.request.body?.data || {}

  if (data.sequence_order !== undefined) {
    if (ctx.request.headers['x-from-purchase'] !== 'true') {
      throw new errors.PolicyError('You are not allowed to perform this action');
    }

  }

  return true
};