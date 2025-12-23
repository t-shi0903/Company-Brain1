/**
 * Company Brain - プロジェクト（Project）データ型定義
 * 
 * 事業・プロジェクトの管理、進捗追跡のための型定義
 */

/** プロジェクトステータス */
export type ProjectStatus =
    | 'planning'      // 企画中
    | 'in_progress'   // 進行中
    | 'on_hold'       // 保留
    | 'completed'     // 完了
    | 'cancelled';    // キャンセル

/** タスク優先度 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** タスクステータス */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

/** タスク */
export interface Task {
    /** 一意のID */
    id: string;
    /** タスク名 */
    title: string;
    /** 詳細説明 */
    description: string;
    /** 担当者ID */
    assigneeId: string;
    /** ステータス */
    status: TaskStatus;
    /** 優先度 */
    priority: TaskPriority;
    /** 期限 */
    dueDate: Date;
    /** 見積もり工数（時間） */
    estimatedHours: number;
    /** 実績工数（時間） */
    actualHours: number;
    /** 作成日時 */
    createdAt: Date;
    /** 完了日時 */
    completedAt?: Date;
}

/** 関連ドキュメント */
export interface ProjectDocument {
    /** 一意のID */
    id: string;
    /** ドキュメント名 */
    name: string;
    /** ドキュメントタイプ */
    type: 'specification' | 'meeting_notes' | 'report' | 'other';
    /** ファイルURL */
    fileUrl: string;
    /** アップロード日時 */
    uploadedAt: Date;
    /** アップロード者ID */
    uploadedBy: string;
}

/** プロジェクト */
export interface Project {
    /** 一意のID */
    id: string;
    /** プロジェクト名 */
    name: string;
    /** 説明 */
    description: string;
    /** クライアント名（外部案件の場合） */
    clientName?: string;
    /** プロジェクトカテゴリ */
    category: string;
    /** 開始日 */
    startDate: Date;
    /** 期限 */
    deadline: Date;
    /** 担当者ID一覧 */
    assignees: string[];
    /** プロジェクトマネージャーID */
    managerId: string;
    /** ステータス */
    status: ProjectStatus;
    /** 進捗率（0-100） */
    progressPercent: number;
    /** 関連ドキュメント */
    relatedDocuments: ProjectDocument[];
    /** タスク一覧 */
    tasks: Task[];
    /** 予算 */
    budget?: number;
    /** 実績コスト */
    actualCost?: number;
    /** 作成日時 */
    createdAt: Date;
    /** 最終更新日時 */
    updatedAt: Date;
}

/** プロジェクト進捗サマリー */
export interface ProjectProgressSummary {
    /** プロジェクト */
    project: Project;
    /** 総タスク数 */
    totalTasks: number;
    /** 完了タスク数 */
    completedTasks: number;
    /** 遅延タスク数 */
    delayedTasks: number;
    /** 次のアクション */
    nextActions: string[];
    /** 直近の課題 */
    currentIssues: string[];
    /** リスクアラート */
    riskAlerts: RiskAlert[];
}

/** リスクアラート */
export interface RiskAlert {
    /** アラートタイプ */
    type: 'deadline_risk' | 'overload_risk' | 'budget_risk' | 'resource_risk';
    /** 重大度 */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** メッセージ */
    message: string;
    /** 関連する社員ID（該当する場合） */
    relatedMemberIds?: string[];
    /** 検出日時 */
    detectedAt: Date;
}

/** プロジェクト要件（リソース配分用） */
export interface ProjectRequirement {
    /** プロジェクト名 */
    projectName: string;
    /** 必要なスキル */
    requiredSkills: string[];
    /** 見積もり工数（時間） */
    estimatedHours: number;
    /** 期限 */
    deadline: Date;
    /** 優先度 */
    priority: TaskPriority;
}
