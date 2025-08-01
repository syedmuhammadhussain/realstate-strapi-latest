# File: ./Dockerfile

FROM node:18-alpine
# Installing libvips-dev for sharp Compatibility
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY . .
COPY wait-for-it.sh ./

RUN chown -R node:node /opt/app
USER node

# Build Strapi
RUN npm run build

EXPOSE 1337
CMD ["./wait-for-it.sh", "postgres:5432", "--", "npm", "run", "start"]