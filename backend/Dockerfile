FROM node:20-slim

WORKDIR /app

# バックエンドの依存関係をコピー
COPY backend/package*.json ./

# 依存関係をインストール
RUN npm install

# ソースコードをコピー
COPY backend/ ./

# TypeScriptをビルド
RUN npm run build

# ポート3001を公開
EXPOSE 8080

# 環境変数でポートを設定
ENV PORT=8080

# アプリを起動
CMD ["node", "dist/index.js"]
