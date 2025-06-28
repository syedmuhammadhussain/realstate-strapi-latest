const path = require("path")

export default ({ env }) => ({
    'users-permissions': {
        config: {
            register: {
                allowedFields: ['phone', 'roleName', 'image'],
            },
            jwt: { expiresIn: '30d' },
        },
    },
    upload: {
        config: {
            provider: 'local',
            sizeLimit: env.int('UPLOAD_SIZE_LIMIT', 10 * 1024 * 1024), // 10 MB in dev
            tmpWorkingDirectory: env(
                'STRAPI_UPLOAD_TMP',
                path.resolve(__dirname, '..', 'tmp')
            ),
            providerOptions: {
                local: {
                    tmpdir: path.resolve(__dirname, '../tmp'),
                },
            },
        },
    },
    email: {
        config: {
            provider: 'nodemailer',
            providerOptions: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: env('EMAIL_USERNAME'),
                    pass: env('EMAIL_PASSWORD'),
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
            },
            settings: {
                defaultFrom: `"My App Support" <${env('EMAIL_USERNAME')}>`,
                defaultReplyTo: `"My App Support" <${env('EMAIL_USERNAME')}>`,
            },
        },
    },
});
