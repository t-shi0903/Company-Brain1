/**
 * Company Brain - ナレッジ（Knowledge）データ型定義
 * 
 * 社内知識ベース、ドキュメント管理、FAQ のための型定義
 */

/** ナレッジカテゴリ */
export type KnowledgeCategory =
    | 'company_policy'      // 社内規定
    | 'benefits'            // 福利厚生
    | 'procedure'           // 業務手順
    | 'technical'           // 技術資料
    | 'case_study'          // 事例（成功/失敗）
    | 'faq'                 // よくある質問
    | 'other';              // その他

/** ドキュメントステータス */
export type DocumentStatus = 'draft' | 'published' | 'archived' | 'deprecated';

/** ナレッジ記事 */
export interface KnowledgeArticle {
    /** 一意のID */
    id: string;
    /** タイトル */
    title: string;
    /** 内容（Markdown形式） */
    content: string;
    /** 要約（AI生成または手動） */
    summary: string;
    /** 情報源の種類 (google_drive, slack, manual等) */
    sourceType: 'google_drive' | 'slack' | 'manual';
    /** 情報源のURL (Google Driveのリンク等) */
    sourceUrl?: string;
    /** カテゴリ */
    category: KnowledgeCategory;
    /** タグ */
    tags: string[];
    /** ステータス */
    status: DocumentStatus;
    /** 作成者ID */
    authorId: string;
    /** 最終更新者ID */
    lastUpdatedBy: string;
    /** 作成日時 */
    createdAt: Date;
    /** 最終更新日時 */
    updatedAt: Date;
    /** 閲覧数 */
    viewCount: number;
    /** 関連記事ID */
    relatedArticleIds: string[];
    /** 添付ファイル */
    attachments: KnowledgeAttachment[];
}

/** 添付ファイル */
export interface KnowledgeAttachment {
    /** 一意のID */
    id: string;
    /** ファイル名 */
    fileName: string;
    /** ファイルURL */
    fileUrl: string;
    /** MIMEタイプ */
    mimeType: string;
    /** ファイルサイズ（バイト） */
    fileSize: number;
    /** アップロード日時 */
    uploadedAt: Date;
}

/** FAQ項目 */
export interface FAQ {
    /** 一意のID */
    id: string;
    /** 質問 */
    question: string;
    /** 回答 */
    answer: string;
    /** カテゴリ */
    category: string;
    /** タグ */
    tags: string[];
    /** 関連ナレッジ記事ID */
    relatedArticleIds: string[];
    /** よく聞かれる度（ランキング用） */
    popularity: number;
    /** 作成日時 */
    createdAt: Date;
    /** 最終更新日時 */
    updatedAt: Date;
}

/** 社内規定 */
export interface CompanyPolicy {
    /** 一意のID */
    id: string;
    /** 規定名 */
    name: string;
    /** 規定内容 */
    content: string;
    /** バージョン */
    version: string;
    /** 施行日 */
    effectiveDate: Date;
    /** 対象部署（空の場合は全社） */
    applicableDepartments: string[];
    /** 作成日時 */
    createdAt: Date;
    /** 最終更新日時 */
    updatedAt: Date;
}

/** ケーススタディ（成功/失敗事例） */
export interface CaseStudy {
    /** 一意のID */
    id: string;
    /** タイトル */
    title: string;
    /** 概要 */
    summary: string;
    /** 詳細内容 */
    content: string;
    /** 成功か失敗か */
    outcome: 'success' | 'failure' | 'mixed';
    /** 学んだ教訓 */
    lessonsLearned: string[];
    /** 関連プロジェクトID */
    projectId?: string;
    /** タグ */
    tags: string[];
    /** 作成者ID */
    authorId: string;
    /** 作成日時 */
    createdAt: Date;
}

/** ナレッジ検索クエリ */
export interface KnowledgeSearchQuery {
    /** 検索キーワード */
    keyword: string;
    /** カテゴリフィルタ */
    categories?: KnowledgeCategory[];
    /** タグフィルタ */
    tags?: string[];
    /** 日付範囲（開始） */
    fromDate?: Date;
    /** 日付範囲（終了） */
    toDate?: Date;
    /** 最大件数 */
    limit?: number;
}

/** ナレッジ検索結果 */
export interface KnowledgeSearchResult {
    /** 記事 */
    article: KnowledgeArticle;
    /** 関連度スコア（0-100） */
    relevanceScore: number;
    /** マッチしたキーワード */
    matchedKeywords: string[];
}

/** 会社コンテキスト（AI用） */
export interface CompanyContext {
    /** 会社情報 */
    companyInfo: {
        name: string;
        industry: string;
        description: string;
    };
    /** 関連ナレッジ記事 */
    relevantArticles: KnowledgeArticle[];
    /** 関連FAQ */
    relevantFAQs: FAQ[];
    /** 関連ポリシー */
    relevantPolicies: CompanyPolicy[];
}
