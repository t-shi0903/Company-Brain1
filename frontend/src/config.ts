export const APP_CONFIG = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '163266853240-cinakd0lkviu6u91r4b7qk6s4pfgo38u.apps.googleusercontent.com',
};

export const SAMPLE_QUESTIONS = [
    "私の今週のタスクスケジュールを教えて",
    "山田さんの現在の作業状況と負荷は？",
    "プロジェクトAの進捗状況と遅延リスクを分析して",
    "経費精算の規定について教えて",
    "新規プロジェクト「AI導入」に必要なリソースを提案して",
    "最近の技術トレンドについて要約して",
    "チーム全体の有給取得状況と推奨アクションは？"
];
