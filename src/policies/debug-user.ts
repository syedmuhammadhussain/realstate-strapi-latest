import { Context, Next } from 'koa'

export default async function debugUser(ctx: Context, next: Next) {
  console.log('→ [debug-user] ctx.state.user =', ctx.state.user)
  return await next()
}
