# backend/Dockerfile

# Stage 1: Build the application with a newer Rust version
FROM rust:1.71-slim as builder

WORKDIR /app

# Copy the entire backend source code to the container
COPY . .

# Build the application in release mode
RUN cargo build --release

# Stage 2: Create a minimal runtime image using Debian Bullseye Slim for a newer glibc
FROM debian:bullseye-slim

# Copy the built binary from the builder stage.
# Replace 'backend' with your actual binary name if it differs.
COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# Expose the port the backend listens on
EXPOSE 3030

# Run the binary when the container starts
CMD ["backend"]
