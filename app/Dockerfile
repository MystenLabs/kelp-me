FROM node:20-alpine

# Install pnpm globally (if not already installed)
RUN npm install -g pnpm

WORKDIR /app

COPY package.json .

RUN pnpm install

COPY . .

#RUN pnpm run build

EXPOSE 3000

CMD [ "pnpm", "run", "dev" ]
