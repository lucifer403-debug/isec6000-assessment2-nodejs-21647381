# Production image for the Express sample app.
# Small Alpine-based Node 16 image to reduce size and attack surface.
FROM node:16-alpine

# Run in production mode.
ENV NODE_ENV=production

WORKDIR /app

# Install only runtime dependencies (no test tools) from the lock file.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only the application code.
COPY app.js server.js ./

# Run as the built-in non-root "node" user, not root.
USER node

EXPOSE 8080

# Lets Docker report whether the app is actually responding.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
