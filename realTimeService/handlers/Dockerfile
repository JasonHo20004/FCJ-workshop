# Use official Node.js 22 image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json if present
COPY ../../package.json ../../package-lock.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the redis subscriber script
COPY redisSubscriber.js ./

ENV AWS_REGION=ap-south-1
ENV REDIS_HOST=my-redis-y9xtus.serverless.aps1.cache.amazonaws.com:6379
ENV CONVERSATION_MEMBERS_TABLE=conversation-members-table
ENV WEBSOCKET_TABLE_NAME=websocket-connections
ENV WEBSOCKET_DOMAIN=wss://zdjjqp08ue.execute-api.ap-south-1.amazonaws.com
ENV WEBSOCKET_STAGE=dev

# Start the subscriber
CMD ["node", "redisSubscriber.js"] 