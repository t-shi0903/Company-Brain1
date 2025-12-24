/**
 * Company Brain - Google Gemini API サービス
 * 
 * AIによる自然言語処理、質問応答、リソース推薦機能を提供
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import {
    Member,
    MemberRecommendation,
    Project,
    ProjectProgressSummary,
    ProjectRequirement,
    RiskAlert,
    CompanyContext,
    KnowledgeArticle,
} from '../types';

/** AI応答 */
export interface AIResponse {
    /** 回答テキスト */
    answer: string;
    /** 参照したソース */
    sources: string[];
    /** 信頼度スコア（0-100） */
    confidence: number;
    /** 関連する追加質問の提案 */
    suggestedQuestions?: string[];
}

/** 抽出データ */
export interface ExtractedData {
    /** ドキュメントタイプ */
    documentType: 'pdf' | 'spreadsheet' | 'text' | 'unknown';
    /** 抽出されたテキスト */
    text: string;
    /** メタデータ */
    metadata: Record<string, string>;
    /** 構造化データ（テーブルなど） */
    structuredData?: Record<string, unknown>[];
    /** キーポイント */
    keyPoints: string[];
}

/** リソース提案 */
export interface ResourceSuggestion {
    /** 推薦メンバー一覧 */
    recommendations: MemberRecommendation[];
    /** 提案理由 */
    rationale: string;
    /** 代替案 */
    alternatives?: MemberRecommendation[];
}

/**
 * Google Gemini API サービスクラス
 */
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private modelName: string = 'gemini-1.5-flash';

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('GEMINI_API_KEY is required. Set it as an environment variable or pass it to the constructor.');
        }
        this.genAI = new GoogleGenerativeAI(key);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }

    /**
     * 自然言語での質問に回答
     */
    async query(question: string, context?: CompanyContext): Promise<AIResponse> {
        // コンテキストがない場合は空のコンテキストを作成
        const currentContext = context || {
            companyInfo: { name: 'サンプル株式会社', industry: 'IT', description: '' },
            relevantArticles: [],
            relevantFAQs: [],
            relevantPolicies: []
        };

        const systemPrompt = this.buildSystemPrompt(currentContext);
        const prompt = `${systemPrompt}
        
${currentContext.relevantArticles.length > 0 ? '【重要：以下の追加ナレッジも考慮してください】\n' + currentContext.relevantArticles.map(a => `${a.title}: ${a.content}`).join('\n\n') : ''}

ユーザーの質問: ${question}

社内情報を参考に、丁寧かつ具体的に回答してください。ナレッジに基づいて回答した場合は、どの資料を参考にしたかも明記してください。`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            return {
                answer: text,
                sources: currentContext.relevantArticles.map(a => a.title) || [],
                confidence: 85,
                suggestedQuestions: await this.generateFollowUpQuestions(question, text),
            };
        } catch (error: any) {
            console.error('Gemini API Error details:', error);
            if (error.status === 429) {
                throw new Error('AIの利用制限（1日の回数上限など）に達しました。しばらく時間を置いてから再度お試しください。');
            }
            throw new Error('AIからの回答取得に失敗しました。詳細: ' + (error.message || '不明なエラー'));
        }
    }

    /**
     * ドキュメントから情報を抽出
     */
    async extractFromDocument(content: string, documentType: string = 'text'): Promise<ExtractedData> {
        const prompt = `以下のドキュメントを分析し、重要な情報を抽出してください。

ドキュメント内容:
${content}

以下の形式でJSON形式で回答してください（JSONのみを返してください）:
{
  "keyPoints": ["重要ポイント1", "重要ポイント2", ...],
  "metadata": {
    "title": "ドキュメントタイトル（推測）",
    "type": "ドキュメントタイプ（報告書、マニュアル、議事録など）",
    "date": "日付（あれば）"
  },
  "summary": "ドキュメントの要約（100文字程度）"
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // JSONを抽出
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSON extraction failed');
            }

            const extracted = JSON.parse(jsonMatch[0]);

            return {
                documentType: documentType as ExtractedData['documentType'],
                text: content,
                metadata: extracted.metadata || {},
                keyPoints: extracted.keyPoints || [],
            };
        } catch (error) {
            console.error('Document extraction error:', error);
            return {
                documentType: 'unknown',
                text: content,
                metadata: {},
                keyPoints: [],
            };
        }
    }

    /**
     * プロジェクト進捗を分析
     */
    async analyzeProjectProgress(project: Project): Promise<ProjectProgressSummary> {
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(t => t.status === 'done').length;
        const now = new Date();
        const delayedTasks = project.tasks.filter(
            t => t.status !== 'done' && new Date(t.dueDate) < now
        ).length;

        const prompt = `以下のプロジェクト情報を分析し、現状の課題と次のアクションを提案してください。

プロジェクト名: ${project.name}
進捗率: ${project.progressPercent}%
期限: ${project.deadline}
総タスク数: ${totalTasks}
完了タスク数: ${completedTasks}
遅延タスク数: ${delayedTasks}

タスク一覧:
${project.tasks.map(t => `- ${t.title} (${t.status}, 期限: ${t.dueDate})`).join('\n')}

以下の形式でJSON形式で回答してください:
{
  "currentIssues": ["課題1", "課題2"],
  "nextActions": ["アクション1", "アクション2"],
  "riskLevel": "low" | "medium" | "high" | "critical"
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { currentIssues: [], nextActions: [], riskLevel: 'medium' };

            const riskAlerts: RiskAlert[] = [];

            // 期限リスクのチェック
            const daysUntilDeadline = Math.ceil(
                (new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilDeadline < 7 && project.progressPercent < 80) {
                riskAlerts.push({
                    type: 'deadline_risk',
                    severity: 'high',
                    message: `期限まで${daysUntilDeadline}日ですが、進捗率は${project.progressPercent}%です。`,
                    detectedAt: now,
                });
            }

            return {
                project,
                totalTasks,
                completedTasks,
                delayedTasks,
                nextActions: analysis.nextActions || [],
                currentIssues: analysis.currentIssues || [],
                riskAlerts,
            };
        } catch (error) {
            console.error('Project analysis error:', error);
            return {
                project,
                totalTasks,
                completedTasks,
                delayedTasks,
                nextActions: [],
                currentIssues: [],
                riskAlerts: [],
            };
        }
    }

    /**
     * 最適なリソース配分を提案
     */
    async suggestResourceAllocation(
        requirement: ProjectRequirement,
        availableMembers: Member[]
    ): Promise<ResourceSuggestion> {
        const memberInfo = availableMembers.map(m => ({
            id: m.id,
            name: m.name,
            skills: m.skills.map(s => `${s.name}(${s.level})`).join(', '),
            workload: m.workloadStatus,
            currentProjects: m.currentProjects.length,
        }));

        const prompt = `新規プロジェクトに最適なメンバーを推薦してください。

【要件】
プロジェクト名: ${requirement.projectName}
必要スキル: ${requirement.requiredSkills.join(', ')}
見積もり工数: ${requirement.estimatedHours}時間
期限: ${requirement.deadline}
優先度: ${requirement.priority}

【利用可能なメンバー】
${JSON.stringify(memberInfo, null, 2)}

以下の形式でJSON形式で回答してください:
{
  "recommendations": [
    {
      "memberId": "メンバーID",
      "matchScore": 0-100の数値,
      "reasons": ["推薦理由1", "推薦理由2"]
    }
  ],
  "rationale": "総合的な判断理由"
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [], rationale: '' };

            const recommendations: MemberRecommendation[] = suggestion.recommendations.map((rec: any) => {
                const member = availableMembers.find(m => m.id === rec.memberId);
                return {
                    member: member!,
                    matchScore: rec.matchScore,
                    reasons: rec.reasons,
                };
            }).filter((rec: MemberRecommendation) => rec.member);

            return {
                recommendations,
                rationale: suggestion.rationale,
            };
        } catch (error) {
            console.error('Resource suggestion error:', error);
            return {
                recommendations: [],
                rationale: 'リソース推薦の生成に失敗しました。',
            };
        }
    }

    /**
     * リスクアラートを検出
     */
    async detectRisks(
        members: Member[],
        projects: Project[]
    ): Promise<RiskAlert[]> {
        const alerts: RiskAlert[] = [];
        const now = new Date();

        // 過負荷メンバーの検出
        for (const member of members) {
            if (member.workloadStatus === 'overloaded') {
                alerts.push({
                    type: 'overload_risk',
                    severity: 'high',
                    message: `${member.name}さんに負荷が集中しています。現在${member.currentProjects.length}件のプロジェクトを担当中です。`,
                    relatedMemberIds: [member.id],
                    detectedAt: now,
                });
            }
        }

        // プロジェクト期限リスクの検出
        for (const project of projects) {
            const daysUntilDeadline = Math.ceil(
                (new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (project.status === 'in_progress' && daysUntilDeadline < 7 && project.progressPercent < 70) {
                alerts.push({
                    type: 'deadline_risk',
                    severity: daysUntilDeadline < 3 ? 'critical' : 'high',
                    message: `「${project.name}」の期限まで${daysUntilDeadline}日ですが、進捗は${project.progressPercent}%です。`,
                    relatedMemberIds: project.assignees,
                    detectedAt: now,
                });
            }
        }

        return alerts;
    }

    /**
     * システムプロンプトを構築
     */
    private buildSystemPrompt(context?: CompanyContext): string {
        let prompt = `あなたは「Company Brain」という社内AIアシスタントです。
会社の事業、社員、プロジェクト、社内規定などについて、正確で親切な回答を提供してください。

基本ルール:
- 社内情報に基づいて回答してください
- 不確かな情報は「確認が必要です」と伝えてください
- 個人情報の取り扱いには注意してください`;

        if (context) {
            prompt += `\n\n【会社情報】
会社名: ${context.companyInfo.name}
業種: ${context.companyInfo.industry}
概要: ${context.companyInfo.description}`;

            if (context.relevantArticles.length > 0) {
                prompt += `\n\n【関連ナレッジ】\n`;
                context.relevantArticles.forEach(article => {
                    prompt += `- ${article.title}: ${article.summary}\n`;
                });
            }

            if (context.relevantFAQs.length > 0) {
                prompt += `\n\n【関連FAQ】\n`;
                context.relevantFAQs.forEach(faq => {
                    prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
                });
            }
        }

        return prompt;
    }

    /**
     * フォローアップ質問を生成
     */
    private async generateFollowUpQuestions(
        originalQuestion: string,
        answer: string
    ): Promise<string[]> {
        const prompt = `以下の質問と回答を踏まえて、ユーザーが次に聞きそうな関連質問を3つ提案してください。

質問: ${originalQuestion}
回答: ${answer}

JSON配列形式で回答してください（例: ["質問1", "質問2", "質問3"]）:`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch {
            return [];
        }
    }
}

// デフォルトインスタンスをエクスポート
let defaultService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
    if (!defaultService) {
        defaultService = new GeminiService();
    }
    return defaultService;
}
