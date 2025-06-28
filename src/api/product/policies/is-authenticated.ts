export default (ctx) => {
  if (ctx.state.user && typeof ctx.state.user.id === 'number') {
    return true
  }
  return ctx.unauthorized('You must be logged in to perform this action.')
}
