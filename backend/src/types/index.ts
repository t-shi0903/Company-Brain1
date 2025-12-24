/**
 * Company Brain - 型定義エクスポート
 */
import { KnowledgeArticle } from './knowledge';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export interface CompanyContext {
    companyName: string;
    mission: string;
    values: string[];
    companyInfo: {
        name: string;
        industry: string;
        description: string;
        foundedYear: number;
        employees: number;
        baseLocation: string;
    };
    relevantArticles?: KnowledgeArticle[]; // RAG検索結果
    relevantFAQs?: any[]; // 互換性のため
}

export * from './member';
export * from './project';
export * from './schedule';
export * from './knowledge';
