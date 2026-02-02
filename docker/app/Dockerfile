FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN mkdir -p ./logs

EXPOSE ${PORT:-3040}

CMD ["npm", "start"]