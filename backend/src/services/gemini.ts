import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
import { appConfig } from '../config';

/** AI応答 */
export interface AIResponse {
    /** 回答テキスト */
    content: string;
    /** 参照したソース */
    sources: { title: string; url?: string }[];
    /** 関連する追加質問の提案 */
    relatedQuestions?: string[];
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
    /** 要約 */
    summary?: string;
    /** カテゴリ */
    category?: string;
    /** タグ */
    tags?: string[];
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
 * Google Generative AI Service (AI Studio SDK)
 */
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private modelName: string = appConfig.gemini.models.chat;
    private embeddingModel: GenerativeModel;

    constructor() {
        const apiKey = appConfig.gemini.apiKey;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            throw new Error('GEMINI_API_KEY is not set');
        }

        console.log(`[GeminiService] Initializing with primary model: ${this.modelName}`);

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }

    /**
     * テキストのEmbeddingを取得
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!text) return [];
        try {
            const cleanText = text.replace(/\n/g, ' ');
            const result = await this.embeddingModel.embedContent(cleanText);
            return result.embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            return [];
        }
    }

    /**
     * 指定されたプロンプトでコンテンツを生成し、失敗した場合はフォールバックモデルを試行する
     */
    private async generateContentWithFallback(prompt: string): Promise<{ text: string, modelName: string }> {
        const modelsToTry = [this.modelName, ...appConfig.gemini.fallbackModels];
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`[GeminiService] Attempting with model: ${modelName}`);
                const model = this.genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                if (text) {
                    console.log(`[GeminiService] Success with ${modelName}`);
                    return { text, modelName };
                }
            } catch (error: any) {
                lastError = error;
                console.warn(`[GeminiService] Failed with model ${modelName}:`, error.message || error);
            }
        }

        throw lastError || new Error('All models failed to generate content');
    }

    /**
     * ユーザーの質問に対する回答を生成
     */
    async query(userMessage: string, context?: CompanyContext): Promise<AIResponse> {
        const currentContext = context || {
            companyName: 'Company Brain',
            mission: '社内ナレッジとAIの融合により、組織の生産性を最大化する',
            values: ['革新', '協調', '効率'],
            companyInfo: {
                name: 'Company Brain Inc.',
                industry: 'AI & Software',
                description: '次世代の社内ナレッジ管理・AIアシスタントソリューションを提供します。',
                foundedYear: 2024,
                employees: 50,
                baseLocation: 'Tokyo'
            },
            relevantArticles: [],
            relevantFAQs: []
        };

        const systemPrompt = this.buildSystemPrompt(currentContext);
        const prompt = `${systemPrompt}\n\nユーザーの質問: ${userMessage}`;

        try {
            const { text } = await this.generateContentWithFallback(prompt);

            return {
                content: text,
                sources: currentContext.relevantArticles?.map(a => ({
                    title: a.title,
                    url: a.sourceUrl
                })) || [],
                relatedQuestions: []
            };
        } catch (error: any) {
            console.error('[GeminiService] Query failed after all retries:', error);
            return this.handleGeminiError(error);
        }
    }

    /**
     * Gemini APIのエラーをハンドリングしてユーザーフレンドリーなメッセージを返す
     */
    private handleGeminiError(error: any): AIResponse {
        let errorMessage = 'AIからの回答取得に失敗しました。';
        const message = error.message || '';
        const status = error.status || 0;

        if (message.includes('404') || status === 404) {
            errorMessage += '\n(ヒント: 指定されたモデルが見つかりません。APIキーが有効か、モデル名が正しいか確認してください)';
        } else if (message.includes('403') || message.includes('permission') || status === 403) {
            errorMessage += '\n(ヒント: APIキーの権限が不足しているか、APIが無効化されています)';
        } else if (message.includes('429') || status === 429) {
            errorMessage += '\n(ヒント: APIの割り当て制限（クォータ）を超えました)';
        } else if (message.includes('SAFETY')) {
            errorMessage += '\n(ヒント: 安全性フィルターにより回答がブロックされました)';
        } else {
            errorMessage += `\n詳細: ${message}`;
        }

        return {
            content: errorMessage,
            sources: []
        };
    }

    /**
     * AIレスポンスからJSONを安全に抽出してパースする
     */
    private parseAIJson<T>(text: string, fallback: T): T {
        try {
            const jsonBlock = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonBlock && jsonBlock[1]) {
                return JSON.parse(jsonBlock[1]);
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            const arrayMatch = text.match(/\[[\s\S]*\]/);
            if (arrayMatch && Array.isArray(fallback)) {
                return JSON.parse(arrayMatch[0]);
            }

            return fallback;
        } catch (error) {
            return fallback;
        }
    }

    /**
     * ドキュメントから情報を抽出
     */
    async extractFromDocument(content: string, documentType: string = 'text'): Promise<ExtractedData> {
        const prompt = `以下のドキュメントを分析し、重要な情報を抽出してください。
以下の形式でJSON形式で回答してください:
{
  "keyPoints": ["重要ポイント1"],
  "metadata": {"title": "推測タイトル"},
  "summary": "要約",
  "category": "technical",
  "tags": ["タグ"]
}
ドキュメント内容: ${content.substring(0, 10000)}`;

        try {
            const { text } = await this.generateContentWithFallback(prompt);
            const extracted = this.parseAIJson(text, { metadata: {}, keyPoints: [] }) as any;

            return {
                documentType: documentType as ExtractedData['documentType'],
                text: content,
                metadata: extracted.metadata || {},
                keyPoints: extracted.keyPoints || [],
                summary: extracted.summary,
                category: extracted.category,
                tags: extracted.tags,
            };
        } catch (error) {
            return { documentType: 'unknown', text: content, metadata: {}, keyPoints: [] };
        }
    }

    /**
     * プロジェクト進捗を分析
     */
    async analyzeProjectProgress(project: Project): Promise<ProjectProgressSummary> {
        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
        const prompt = `プロジェクト「${project.name}」の進捗を分析してください。JSONで回答を返してください。`;

        try {
            const { text } = await this.generateContentWithFallback(prompt);
            const analysis = this.parseAIJson(text, { currentIssues: [], nextActions: [], riskLevel: 'medium' });

            return {
                project,
                totalTasks,
                completedTasks,
                delayedTasks: 0,
                nextActions: analysis.nextActions || [],
                currentIssues: analysis.currentIssues || [],
                riskAlerts: [],
            };
        } catch (error) {
            return { project, totalTasks, completedTasks, delayedTasks: 0, nextActions: [], currentIssues: [], riskAlerts: [] };
        }
    }

    /**
     * 最適なリソース配分を提案
     */
    async suggestResourceAllocation(requirement: ProjectRequirement, availableMembers: Member[]): Promise<ResourceSuggestion> {
        const prompt = `プロジェクト「${requirement.projectName}」に最適なメンバーを推薦してください。JSONで回答してください。`;

        try {
            const { text } = await this.generateContentWithFallback(prompt);
            const suggestion = this.parseAIJson(text, { recommendations: [], rationale: '' });

            const recommendations = suggestion.recommendations.map((rec: any) => {
                const member = availableMembers.find(m => m.id === rec.memberId);
                return member ? { member, matchScore: rec.matchScore, reasons: rec.reasons } : null;
            }).filter((r: any) => r !== null) as MemberRecommendation[];

            return { recommendations, rationale: suggestion.rationale };
        } catch (error) {
            return { recommendations: [], rationale: 'エラーが発生しました。' };
        }
    }

    /**
     * リスクアラートを検出
     */
    async detectRisks(members: Member[], projects: Project[]): Promise<RiskAlert[]> {
        const alerts: RiskAlert[] = [];
        const now = new Date();

        for (const member of members) {
            if (member.workloadStatus === 'overloaded') {
                alerts.push({
                    type: 'overload_risk',
                    severity: 'high',
                    message: `${member.name}さんに負荷が集中しています。`,
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
        let prompt = `あなたは「Company Brain」という社内AIアシスタントです。`;
        if (context) {
            prompt += `\n会社名: ${context.companyInfo.name}`;
        }
        return prompt;
    }

    /**
     * フォローアップ質問を生成
     */
    async generateFollowUpQuestions(originalQuestion: string, answer: string): Promise<string[]> {
        const prompt = `質問「${originalQuestion}」への回答「${answer}」を踏まえた関連質問を3つ提案してください。JSON配列形式で。`;
        try {
            const { text } = await this.generateContentWithFallback(prompt);
            return this.parseAIJson(text, []);
        } catch {
            return [];
        }
    }

    /**
     * ダッシュボードサマリーを生成
     */
    async generateDashboardSummary(prompt: string): Promise<any> {
        try {
            const { text } = await this.generateContentWithFallback(prompt);
            return this.parseAIJson(text, {});
        } catch (error) {
            console.error('Dashboard summary generation error:', error);
            throw error;
        }
    }
}

let defaultService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
    if (!defaultService) {
        defaultService = new GeminiService();
    }
    return defaultService;
}
