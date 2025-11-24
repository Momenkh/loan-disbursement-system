FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm config set fetch-retry-maxtimeout 1200000 \
    && npm config set fetch-retries 10 \
    && npm config set fetch-timeout 1200000

RUN npm ci

COPY . .

RUN npm run build


FROM node:22-slim

WORKDIR /app

# copy build folder
COPY --from=builder /app/dist ./dist

# install only prod dependencies (if you have any)
COPY package*.json ./
RUN npm install --omit=dev

# vite preview runs on 4173 by default
EXPOSE 4173
CMD ["npm", "run", "serve"]
