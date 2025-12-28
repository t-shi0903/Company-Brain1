import { Pinecone } from '@pinecone-database/pinecone';
import { Department, KnowledgeArticle } from '../types';
import { getGeminiService } from './gemini';

export class VectorStoreService {
    private pinecone: Pinecone | null = null;
    private indexName: string = 'company-brain';

    constructor() {
        if (process.env.PINECONE_API_KEY) {
            this.pinecone = new Pinecone({
                apiKey: process.env.PINECONE_API_KEY,
            });
        } else {
            console.warn('PINECONE_API_KEY is not set. Vector search will be disabled.');
        }
    }

    /**
     * 記事をベクトル化してPineconeに保存
     */
    async upsertArticle(article: KnowledgeArticle) {
        if (!this.pinecone) return;

        try {
            const gemini = getGeminiService();
            // Embedding用のテキストを作成（タイトル、要約、本文の冒頭）
            const textToEmbed = `Title: ${article.title}\nSummary: ${article.summary}\nContent: ${article.content.substring(0, 8000)}`;
            const embedding = await gemini.generateEmbedding(textToEmbed);

            const index = this.pinecone.index(this.indexName);

            // sourceUrlのundefined対策
            const metadata: Record<string, any> = {
                title: article.title,
                summary: article.summary,
                category: article.category
            };

            if (article.sourceUrl) {
                metadata.sourceUrl = article.sourceUrl;
            }

            // 閲覧権限を保存 (String Array)
            if (article.allowedDepartments) {
                metadata.allowedDepartments = article.allowedDepartments;
            }

            await index.upsert([{
                id: article.id,
                values: embedding,
                metadata: metadata
            }]);
            console.log(`Upserted article ${article.id} to Pinecone`);
        } catch (error) {
            console.error('Pinecone upsert error:', error);
        }
    }

    /**
     * 記事をベクトルストアから削除
     */
    async deleteArticle(articleId: string) {
        if (!this.pinecone) return;

        try {
            const index = this.pinecone.index(this.indexName);
            await index.deleteOne(articleId);
            console.log(`Deleted article ${articleId} from Pinecone`);
        } catch (error) {
            console.error('Pinecone delete error:', error);
        }
    }

    /**
     * クエリに関連する記事を検索
     */
    async search(query: string, department?: Department, limit: number = 5): Promise<KnowledgeArticle[]> {
        if (!this.pinecone) return [];

        try {
            const gemini = getGeminiService();
            const embedding = await gemini.generateEmbedding(query);

            const index = this.pinecone.index(this.indexName);

            const filter: any = {};
            // departmentが指定され、adminでない場合はフィルタリング
            if (department && department !== 'admin') {
                // シンプルに "allowedDepartments" に department が含まれているかチェック
                // Pineconeのメタデータ配列フィルタ: "field": { "$in": ["value"] } ではなく
                // 配列フィールドに対して単一値でフィルタすると「含まれるか」になる
                filter.allowedDepartments = department;

                // フォールバック: 'general' (全社公開) も含めたい場合は $or が必要だが、
                // Pinecone Free Tier ($or support) 次第。ここでは安全側で AND 的な挙動（department権限必須）とするか、
                // シンプルに department (例: 'sales') を指定する。
                // 'general' は全員が持っているロールではないため、ドキュメント側に ['general', 'sales'] とついていれば 'sales' でヒットする。
            }

            const results = await index.query({
                vector: embedding,
                topK: limit,
                includeMetadata: true,
                filter: Object.keys(filter).length > 0 ? filter : undefined
            });

            // Pineconeの結果をKnowledgeArticle形式に変換（簡易的）
            // 本来はIDを使ってGCSからフルデータを取るべきだが、
            // RAGのコンテキストとしてはメタデータ（要約など）で十分な場合も多い
            // ここではメタデータから復元できる範囲で返す
            return results.matches.map(match => {
                const md = match.metadata as any;
                return {
                    id: match.id,
                    title: md.title || 'Untitled',
                    content: md.summary || '', // コンテンツの代わりにサマリーを返す（トークン節約）
                    summary: md.summary || '',
                    sourceUrl: md.sourceUrl,
                    category: md.category || 'technical',
                    sourceType: 'google_drive', // 仮
                    tags: [],
                    status: 'published',
                    authorId: 'system',
                    lastUpdatedBy: 'system',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    viewCount: 0,
                    relatedArticleIds: [],
                    attachments: [],
                    allowedDepartments: md.allowedDepartments || []
                };
            });
        } catch (error) {
            console.error('Pinecone search error:', error);
            return [];
        }
    }
}

// シングルトンエクスポート
let defaultService: VectorStoreService | null = null;

export function getVectorStoreService(): VectorStoreService {
    if (!defaultService) {
        defaultService = new VectorStoreService();
    }
    return defaultService;
}
