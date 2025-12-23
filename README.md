# Company Brain - AI社内知能エージェント

社内のあらゆるリソース（事業、社員、予定、スキル、タスク）を統合し、AIが「会社の頭脳」として機能するインタラクティブな知識管理アプリケーション。

## 🚀 機能

- 🧠 **AIチャット**: Google Gemini APIを使用した自然言語による質問応答
- 📊 **ダッシュボード**: プロジェクト進捗、メンバー負荷状況の可視化
- ⚠️ **リスクアラート**: 期限リスクや過負荷の自動検出
- 📄 **ドキュメント解析**: PDF、CSV、テキストからの情報抽出

## 📋 必要条件

- Node.js 18以上
- Google Gemini API キー

## 🛠️ セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/company-brain.git
cd company-brain
```

### 2. バックエンドのセットアップ

```bash
cd backend
npm install
cp .env.example .env
# .env ファイルに GEMINI_API_KEY を設定
npm run dev
```

### 3. フロントエンドのセットアップ

```bash
cd frontend
npm install
npm run dev
```

### 4. アクセス

ブラウザで http://localhost:5173 を開く

## 📁 プロジェクト構成

```
company-brain/
├── backend/          # Express + TypeScript バックエンド
│   ├── src/
│   │   ├── types/    # データ型定義
│   │   ├── services/ # Gemini API、ドキュメント解析
│   │   └── index.ts  # Express サーバー
│   └── package.json
│
└── frontend/         # React + Vite フロントエンド
    ├── src/
    │   ├── components/
    │   └── App.tsx
    └── package.json
```

## 🔑 API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/chat` | AIとのチャット |
| GET | `/api/projects` | プロジェクト一覧 |
| GET | `/api/members` | 社員一覧 |
| POST | `/api/suggest-resource` | リソース配分提案 |
| GET | `/api/risks` | リスクアラート |

## 🎨 技術スタック

- **バックエンド**: Node.js, Express, TypeScript
- **AI**: Google Gemini API
- **フロントエンド**: React 18, Vite, TypeScript
- **スタイリング**: Vanilla CSS (ダークモード)

## 📝 ライセンス

MIT
