#!/bin/bash

# Detect system architecture
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    echo "Detected ARM64 architecture"
    export DOCKERFILE="Dockerfile.arm64"
    export DOCKER_PLATFORM="linux/arm64"
else
    echo "Detected x86_64/amd64 architecture"
    export DOCKERFILE="Dockerfile"
    export DOCKER_PLATFORM="linux/amd64"
fi

echo "Using Dockerfile: $DOCKERFILE"
echo "Using platform: $DOCKER_PLATFORM"

# Stop any running containers
docker-compose down

# Build and start the containers
docker-compose build --no-cache
docker-compose up