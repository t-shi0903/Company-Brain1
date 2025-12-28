/**
 * Company Brain - 社員（Member）データ型定義
 * 
 * 社員のプロフィール、スキル、現在の負荷状況を管理するための型定義
 */

/** スキルレベル */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** スキル情報 */
export interface Skill {
    /** スキル名 */
    name: string;
    /** スキルカテゴリ（例: 'programming', 'design', 'management'） */
    category: string;
    /** 習熟度 */
    level: SkillLevel;
    /** 経験年数 */
    yearsOfExperience: number;
}

/** 負荷状況 */
export type WorkloadStatus = 'available' | 'moderate' | 'busy' | 'overloaded';

/** 空き時間スロット */
export interface AvailabilitySlot {
    /** 開始日時 */
    startTime: Date;
    /** 終了日時 */
    endTime: Date;
    /** 繰り返し設定（週次など） */
    recurring?: 'daily' | 'weekly' | 'monthly';
}

/** 社員データ */
export interface Member {
    /** 一意のID */
    id: string;
    /** 氏名 */
    name: string;
    /** メールアドレス */
    email: string;
    /** 部署 */
    department: string;
    /** 役職 */
    position: string;
    /** 権限ロール (admin | member | guest) */
    role?: 'admin' | 'member' | 'guest';
    /** ステータス (approved | pending | rejected) */
    status?: 'approved' | 'pending' | 'rejected';
    /** プロフィール画像URL */
    avatarUrl?: string;
    /** Googleプロフィール画像URL（互換性のため） */
    picture?: string;
    /** スキルセット */
    skills: Skill[];
    /** 現在担当中のプロジェクトID一覧 */
    currentProjects: string[];
    /** 負荷状況 */
    workloadStatus: WorkloadStatus;
    /** 空き時間 */
    availability: AvailabilitySlot[];
    /** 過去に担当したプロジェクトID一覧 */
    pastProjects: string[];
    /** 申請日時 */
    requestedAt?: Date;
    /** 承認日時 */
    approvedAt?: Date;
    /** 承認者 */
    approvedBy?: string;
    /** 拒絶日時 */
    rejectedAt?: Date;
    /** 拒絶者 */
    rejectedBy?: string;
    /** 入社日 */
    joinedAt: Date;
    /** 最終更新日時 */
    updatedAt: Date;
}

/** 社員の検索条件 */
export interface MemberSearchCriteria {
    /** スキル名でフィルタ */
    skills?: string[];
    /** 部署でフィルタ */
    department?: string;
    /** 負荷状況でフィルタ（指定以下の負荷） */
    maxWorkload?: WorkloadStatus;
    /** 空き時間があるか */
    hasAvailability?: boolean;
}

/** リソース推薦結果 */
export interface MemberRecommendation {
    /** 推薦された社員 */
    member: Member;
    /** マッチ度スコア（0-100） */
    matchScore: number;
    /** 推薦理由 */
    reasons: string[];
}
