// File: src/extensions/users-permissions/strapi-server.ts

// We import the controller and routes we wrote.
import updateMeController from './controllers/user'
import userRoutes from './routes/user'

// The export here *must* be a default function that receives the plugin object.
// The export here *must* be a default function that receives the plugin object.
export default (plugin: any) => {
  plugin.controllers.user = {
    ...plugin.controllers.user,
    ...updateMeController,
  }

  // 2️⃣ Add our custom route definitions into the "content-api" group.
  plugin.routes['content-api'].routes.push(...userRoutes)

  return plugin
}
