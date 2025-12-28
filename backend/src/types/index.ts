/**
 * Company Brain - 型定義エクスポート
 */
import { KnowledgeArticle } from './knowledge';

export type Department = 'admin' | 'sales' | 'engineering' | 'general';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    picture: string;
    department: Department;
    role?: UserRole;
}

export type UserRole = 'admin' | 'member' | 'guest';
export type UserStatus = 'approved' | 'pending' | 'rejected';

export interface User {
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
    status: UserStatus;
    organizationId: string; // 将来のマルチテナント対応
    requestedAt: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
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
export * from './schedule';
export * from './knowledge';

export interface AuditLog {
    timestamp: Date;
    userId: string;
    userName: string;
    action: string;
    resourceId?: string;
    resourceType?: string;
    details?: any;
    ip?: string;
}
