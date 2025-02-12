# frontend/Dockerfile

# Stage 1: Build the React app
FROM node:16 as builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code and build the app
COPY . .
RUN npm run build

# Stage 2: Serve the built app using Nginx
FROM nginx:alpine

# Copy the build output to Nginx's html folder
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 3000 where Nginx will serve your app
EXPOSE 3000

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
