FROM rust:slim as builder

WORKDIR /build
RUN apt-get update && \
    apt-get install -y libpq-dev pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Set environment variable for SQLx to work in offline mode
ENV SQLX_OFFLINE=true

# Copy the Cargo files
COPY Cargo.toml ./Cargo.toml

# Copy source code and migrations
COPY src/ ./src/
COPY data/ ./data/
COPY migrations/ ./migrations/

# List current directory to debug
RUN ls -la

# Build the application
RUN cargo build --release

# Our final base
FROM debian:bookworm-slim

# Set environment variable to indicate Docker environment
ENV DOCKER_ENVIRONMENT=true

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y libpq5 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /backend

# Copy the binary from builder
COPY --from=builder /build/target/release/backend /backend/backend
# Copy migrations
COPY --from=builder /build/migrations /backend/migrations

COPY --from=builder /build/data /backend/data

# Make binary executable
RUN chmod +x /backend/backend

# Expose the port
EXPOSE 3030

# Run the binary
CMD ["/backend/backend"]