/**
 * Company Brain - スケジュール（Schedule）データ型定義
 * 
 * カレンダー連携、会議管理、空き時間管理のための型定義
 */

/** イベントタイプ */
export type EventType =
    | 'meeting'       // 会議
    | 'work_block'    // 作業時間
    | 'deadline'      // 締め切り
    | 'out_of_office' // 不在
    | 'holiday'       // 休暇
    | 'other';        // その他

/** 繰り返し設定 */
export interface RecurrenceRule {
    /** 繰り返しパターン */
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    /** 間隔（例：2週ごとなら2） */
    interval: number;
    /** 終了日（設定しない場合は無期限） */
    endDate?: Date;
    /** 曜日指定（weekly の場合） */
    daysOfWeek?: number[]; // 0=日曜, 1=月曜, ...
}

/** カレンダーイベント */
export interface CalendarEvent {
    /** 一意のID */
    id: string;
    /** イベントタイトル */
    title: string;
    /** 詳細説明 */
    description?: string;
    /** イベントタイプ */
    type: EventType;
    /** 開始日時 */
    startTime: Date;
    /** 終了日時 */
    endTime: Date;
    /** 場所（会議室など） */
    location?: string;
    /** オンライン会議URL */
    meetingUrl?: string;
    /** 主催者ID */
    organizerId: string;
    /** 参加者ID一覧 */
    attendeeIds: string[];
    /** 関連プロジェクトID */
    projectId?: string;
    /** 繰り返し設定 */
    recurrence?: RecurrenceRule;
    /** 終日イベントかどうか */
    isAllDay: boolean;
    /** 作成日時 */
    createdAt: Date;
}

/** 会議ログ */
export interface MeetingLog {
    /** 一意のID */
    id: string;
    /** 関連イベントID */
    eventId: string;
    /** 議事録 */
    minutes: string;
    /** 決定事項 */
    decisions: string[];
    /** アクションアイテム */
    actionItems: ActionItem[];
    /** 記録者ID */
    recorderId: string;
    /** 記録日時 */
    recordedAt: Date;
}

/** アクションアイテム */
export interface ActionItem {
    /** 内容 */
    description: string;
    /** 担当者ID */
    assigneeId: string;
    /** 期限 */
    dueDate: Date;
    /** 完了フラグ */
    isCompleted: boolean;
}

/** スケジュール（社員のカレンダー情報） */
export interface Schedule {
    /** 社員ID */
    memberId: string;
    /** イベント一覧 */
    events: CalendarEvent[];
    /** 会議ログ一覧 */
    meetingLogs: MeetingLog[];
    /** 最終同期日時 */
    lastSyncedAt: Date;
}

/** 空き時間検索結果 */
export interface AvailableTimeSlot {
    /** 開始日時 */
    startTime: Date;
    /** 終了日時 */
    endTime: Date;
    /** 利用可能な社員ID一覧 */
    availableMemberIds: string[];
}

/** スケジュール分析結果 */
export interface ScheduleAnalysis {
    /** 社員ID */
    memberId: string;
    /** 分析期間開始 */
    periodStart: Date;
    /** 分析期間終了 */
    periodEnd: Date;
    /** 会議時間合計（時間） */
    totalMeetingHours: number;
    /** 作業可能時間合計（時間） */
    totalWorkHours: number;
    /** 稼働率 */
    utilizationRate: number;
    /** 過密警告 */
    overloadWarning: boolean;
    /** 警告メッセージ */
    warningMessage?: string;
}
