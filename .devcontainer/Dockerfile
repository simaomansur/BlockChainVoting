# Use the official VS Code dev container image for Rust as our base
FROM mcr.microsoft.com/vscode/devcontainers/rust:latest

# Install Node.js (needed for React) using Node v16.x (or update to a later version if desired)
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Set the working directory to the mount point
WORKDIR /project