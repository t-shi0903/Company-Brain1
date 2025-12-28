# Build stage
FROM node:20-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# envsubstを使用するためのパッケージをインストール
RUN apk add --no-cache bash gettext

# ビルドした静的ファイルをコピー
COPY --from=build /app/dist /usr/share/nginx/html

# nginx設定ファイルをテンプレートとしてコピー
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 起動スクリプトを作成
RUN echo '#!/bin/bash' > /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    echo 'set -e' >> /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    echo 'export BACKEND_URL=${BACKEND_URL:-https://company-brain-backend-163266853240.asia-northeast1.run.app}' >> /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    echo 'export BACKEND_HOST=${BACKEND_HOST:-company-brain-backend-163266853240.asia-northeast1.run.app}' >> /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    echo 'envsubst "\$BACKEND_URL \$BACKEND_HOST" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.d/40-envsubst-on-templates.sh && \
    chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
