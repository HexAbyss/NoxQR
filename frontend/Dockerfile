FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package.json

RUN npm install

FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_QR_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_QR_API_URL=$NEXT_PUBLIC_QR_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_QR_API_URL=http://localhost:3001

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
