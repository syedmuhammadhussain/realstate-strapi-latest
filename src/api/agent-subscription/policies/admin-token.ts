// src/policies/admin-token.ts
import type { Context, Next } from 'koa'

export default async function adminToken(ctx: Context, next: Next) {
  const authHeader =
    ctx.request.header.authorization || ctx.headers['authorization'] || ''

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (token && token === process.env.STRAPI_ADMIN_API_TOKEN) return true

  return ctx.unauthorized('Invalid admin API token')
}
