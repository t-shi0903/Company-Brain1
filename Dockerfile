FROM node:20-slim

WORKDIR /app

# バックエンドのパッケージ定義をコピー
COPY backend/package*.json ./

# 依存関係をインストール
RUN npm install

# バックエンドのソースコードを全てコピー
# 注意: ここで backend フォルダの中身を /app に展開する形にします
COPY backend/ .

# TypeScriptをビルド
RUN npm run build

# ポート8080を公開
EXPOSE 8080

# 環境変数でポートを設定
ENV PORT=8080

# アプリを起動
CMD ["node", "dist/index.js"]
