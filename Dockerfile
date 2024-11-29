# Stage 1: Build dependencies in a temporary stage
FROM node:23.3.0 AS builder

# Install required global dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    git \
    curl \
    sqlite3 && \
    apt-get clean && \
    npm install -g pnpm@9.4.0

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./
COPY scripts ./scripts
COPY docs ./docs
COPY packages ./packages
COPY characters ./characters
COPY agent ./agent

# Install dependencies and build
RUN pnpm clean && pnpm install && pnpm build

# Stage 2: Production image
FROM node:23.3.0

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    python3 \
    curl \
    sqlite3 && \
    apt-get clean && \
    npm install -g pnpm@9.4.0

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app /app

# Install Playwright
RUN pnpm exec playwright install
RUN pnpm exec playwright install-deps

ENV NODE_ENV=production

CMD ["pnpm", "start", "--character=characters/trenchesai.character.json"]
