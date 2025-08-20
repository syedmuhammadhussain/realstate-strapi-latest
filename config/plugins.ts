const path = require("path");

export default ({ env }) => ({
  upload: {
    config: {
      provider: "cloudinary",
      providerOptions: {
        cloud_name: env("CLOUDINARY_NAME"),
        api_key: env("CLOUDINARY_KEY"),
        api_secret: env("CLOUDINARY_SECRET"),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  graphql: {
    enabled: false,
  },
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: env("EMAIL_USERNAME"),
          pass: env("EMAIL_PASSWORD"),
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      },
      settings: {
        defaultFrom: `"My App Support" <${env("EMAIL_USERNAME")}>`,
        defaultReplyTo: `"My App Support" <${env("EMAIL_USERNAME")}>`,
      },
    },
  },
  "users-permissions": {
    config: {
      register: {
        allowedFields: ["phone", "roleName", "image"],
      },
      jwt: { expiresIn: "30d" },
    },
  },
});
