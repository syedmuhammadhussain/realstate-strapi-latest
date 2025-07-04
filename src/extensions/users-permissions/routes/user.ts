// File: src/extensions/users-permissions/routes/user.ts

const userRoutes: Array<any> = [
  {
    method: 'PUT',
    path: '/user/me',
    handler: 'user.updateMe',
    config: {
      prefix: '',
      policies: ['global::is-authenticated'],
      middlewares: [],
      auth: { scope: [] },
    },
  },
]

export default userRoutes
