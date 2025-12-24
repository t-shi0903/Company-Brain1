import { Pinecone } from '@pinecone-database/pinecone';
import { KnowledgeArticle } from '../types';
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
     * クエリに関連する記事を検索
     */
    async search(query: string, limit: number = 5): Promise<KnowledgeArticle[]> {
        if (!this.pinecone) return [];

        try {
            const gemini = getGeminiService();
            const embedding = await gemini.generateEmbedding(query);

            const index = this.pinecone.index(this.indexName);
            const results = await index.query({
                vector: embedding,
                topK: limit,
                includeMetadata: true
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
                    attachments: []
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
