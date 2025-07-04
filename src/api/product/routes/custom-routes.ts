export default {
  routes: [
    {
      method: 'POST',
      path: '/products/upload-images',
      handler: 'product.uploadImages',
      config: {
        policies: ['global::is-authenticated'],
        middlewares: [],
        auth: {
          mode: 'required',
        },
      }
    },
    {
      method: 'PUT',
      path: '/products/:id',
      handler: 'product.update',
      config: {
        auth: {
          mode: 'required',
          scope: []
        },
        policies: ['allow-sequence-update'],
        middlewares: [],
      },
    }
  ],
}
