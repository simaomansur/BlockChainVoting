# Use the official Rust image which includes Cargo
FROM rust:latest

# Install Node.js (needed for the frontend/React part)
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

WORKDIR /project
