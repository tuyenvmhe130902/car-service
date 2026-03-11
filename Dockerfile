FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Force better-sqlite3 to build from source
ENV npm_config_build_from_source=true

RUN npm install

COPY . .

# Rebuild better-sqlite3 to ensure it's built for the correct platform
RUN npm rebuild better-sqlite3

EXPOSE 3000

CMD ["npm", "run", "dev"]