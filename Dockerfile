FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=5000
EXPOSE 5000
EXPOSE 3000
CMD ["npx", "concurrently", "node index.js", "node api_server.js"]