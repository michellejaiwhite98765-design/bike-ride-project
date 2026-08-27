FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "echo STARTING MIGRATION && npm run migrate && echo MIGRATION FINISHED && echo STARTING SERVER && npm start"]