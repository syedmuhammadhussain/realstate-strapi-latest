// src/api/agent-subscription/routes/custom-agent-subscription.ts
export default {
  routes: [
    {
      method: "POST",
      path: "/agent-subscriptions/purchase",
      handler: "agent-subscription.purchase",
      config: {
        policies: [],
        middlewares: [],
        auth: {
          mode: "required",
          scope: [],
        },
      },
    },
    {
      method: "GET",
      path: "/agent-subscriptions/:id/approve",
      handler: "agent-subscription.approve",
      config: {
        auth: false, // skip the public JWT flow
        policies: ["admin-token"],
      },
    },
    {
      method: "POST",
      path: "/agent-subscriptions/advertise",
      handler: "agent-subscription.advertise",
      config: {
        // policies: ['global::is-authenticated', 'global::is-agent'],
        // auth: { mode: 'required' },
        policies: [],
        middlewares: [],
        auth: {
          mode: "required",
          scope: [],
        },
      },
    },
  ],
};
