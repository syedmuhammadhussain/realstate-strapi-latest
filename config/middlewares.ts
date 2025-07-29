export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: [
        "http://localhost:3000",
        "https://real-state-app-alpha.vercel.app",
        "https://admin.kvkey.ru"
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      formLimit: "5mb",
      jsonLimit: "5mb",
      textLimit: "5mb",
      formidable: {
        uploadDir: null,
        keepExtensions: false,
        maxFileSize: 10 * 1024 * 1024,
      },
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
