export default [
  "strapi::logger",
  "strapi::errors",
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://res.cloudinary.com',
            'https://res-1.cloudinary.com',
          ],
          'connect-src': [
            "'self'",
            'https://api.cloudinary.com',
            'https://res.cloudinary.com',
          ],
          'frame-src': [
            "'self'",
            'https://widget.cloudinary.com',
            'https://res.cloudinary.com',
          ],
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            'https://widget.cloudinary.com',
          ],
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      origin: [
        "http://localhost:3000",
        "https://real-state-app-alpha.vercel.app",
        "https://kvkey.ru",
        "https://www.kvkey.ru"
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
