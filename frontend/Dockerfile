# Stage 1: Build the React app using a slim Node image
FROM node:16-slim AS builder
# Set the working directory
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Add the following line to fix the babel warning
RUN npm install --save-dev @babel/plugin-proposal-private-property-in-object

# Before copying all files, let's make sure the directory structure exists
RUN mkdir -p /app/src/api

# Copy the rest of the source code
COPY . .

# Debug: List directories to verify file structure
RUN ls -la /app/src

# Build the app
RUN npm run build

# Stage 2: Serve the built app using Nginx
FROM nginx:alpine
# Copy the build output to Nginx's html folder
COPY --from=builder /app/build /usr/share/nginx/html

# Add configuration to handle client-side routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80
# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]