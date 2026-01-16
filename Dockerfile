FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build step
RUN npm run build

# 🔍 DEBUG: verify build output
RUN ls -la dist || echo "dist folder missing"

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
