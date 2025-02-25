# backend/Dockerfile

# Stage 1: Build the application with Rust 1.81-slim and required dependencies
FROM rust:1.81-slim AS builder

# Install pkg-config and OpenSSL development libraries
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire backend source code to the container
COPY . .

# Build the application in release mode
RUN cargo build --release

# Stage 2: Create a minimal runtime image using Debian Bookworm Slim
FROM debian:bookworm-slim

# Install runtime OpenSSL libraries. In Bookworm, use libssl3.
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy the built binary from the builder stage.
COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# Expose the port the backend listens on
EXPOSE 3030

# Run the binary when the container starts
CMD ["backend"]
