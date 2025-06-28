import type { Context, Next } from 'koa'

export default async function isAdmin(ctx: Context, next: Next) {
  const user = ctx.state.user

  // Check that a user is logged in and that the user's role is "Administrator"
  if (user && user.role && user.role.toFixed() === 'Administrator') {
    // Authorized: proceed to the next middleware or controller action.
    return await next()
  }

  // Otherwise, return an unauthorized response.
  return ctx.unauthorized(
    'You must be an administrator to perform this action.'
  )
}
