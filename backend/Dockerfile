FROM rust:1.88-slim-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.toml
COPY src src

RUN cargo build --release

FROM debian:bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/noxqr-backend /usr/local/bin/noxqr-backend

ENV NOXQR_BACKEND_ADDR=0.0.0.0:3001

EXPOSE 3001

CMD ["noxqr-backend"]
