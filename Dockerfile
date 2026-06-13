FROM node:24-slim
WORKDIR /app
ENV PORT=3000
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY . .
RUN node node_modules/vite/bin/vite.js build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]