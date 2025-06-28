/**
 * product controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::product.product', ({ }) => ({
    async uploadImages(ctx) {
        
        try {
            const { files } = ctx.request
            if (!files || !files.images) {
                return ctx.badRequest('No file uploaded')
            }

            const uploadedFiles = await strapi
                .plugin('upload')
                .service('upload')
                .upload({
                    data: {}, // optional metadata
                    files: files.images, // array or object of files
                })

            ctx.send({
                message: 'Upload successful',
                files: uploadedFiles.map(img => img.id),
            })
        } catch (error) {
            return ctx.badRequest(error)
        }
    },
}));
