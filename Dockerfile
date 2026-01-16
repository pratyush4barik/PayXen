# 1. Use Node LTS
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy entire project
COPY . .

# 6. Build the app (creates dist/)
RUN npm run build

# 7. Expose the backend port
EXPOSE 5000

# 8. Start production server
CMD ["npm", "run", "start"]
