import type { Context } from "koa";

export default {
  async updateMe(ctx: Context) {
    const { auth } = ctx.state;
    const authenticatedUser = ctx.state.user;

    if (!authenticatedUser?.id) {
      return ctx.unauthorized("You must be logged in to update your profile.");
    }

    // Define allowed fields (modify according to your model)
    const allowedFields = ["phone", "email", "username", "image"];
    const payload: Record<string, any> = {};

    // Filter and copy allowed fields
    for (const field of allowedFields) {
      if (ctx.request.body[field] !== undefined) {
        payload[field] = ctx.request.body[field];
      }
    }

    try {
      // Update user
      const updatedUser = await strapi.db
        .query("plugin::users-permissions.user")
        .update({
          where: { id: authenticatedUser.id },
          data: payload,
        });

      // Sanitize output using Strapi 5's sanitizeOutput method
      const model = strapi.getModel("plugin::users-permissions.user");
      const sanitizedUser = await strapi.contentAPI.sanitize.output(
        updatedUser,
        model,
        { auth }
      );

      return ctx.send({ data: sanitizedUser });
    } catch (error) {
      strapi.log.error("Error updating user profile:", error);
      return ctx.internalServerError("Unable to update profile.");
    }
  },
};
