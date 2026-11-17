FROM node:26-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY openapi.yaml ./openapi.yaml
ENV NODE_ENV=production
EXPOSE 4000
USER node
CMD ["node", "src/server.js"]
