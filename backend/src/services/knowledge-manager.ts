import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { KnowledgeArticle, KnowledgeCategory } from '../types';

export class KnowledgeManager {
    private knowledgeDir: string;

    constructor() {
        this.knowledgeDir = path.join(__dirname, '../../data/knowledge');
        this.ensureDir();
    }

    private async ensureDir() {
        try {
            await fs.mkdir(this.knowledgeDir, { recursive: true });
        } catch (error) {
            console.error('Directory creation error:', error);
        }
    }

    /**
     * 内容を抽出してナレッジとして保存する
     */
    async processAndSave(fileName: string, content: Buffer, mimeType: string): Promise<KnowledgeArticle> {
        let text = '';

        if (mimeType === 'application/pdf') {
            const data = await pdf(content);
            text = data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: content });
            text = result.value;
        } else if (mimeType.startsWith('text/')) {
            text = content.toString('utf-8');
        } else {
            // 解析不能な場合はとりあえず空文字（PDF等に変換済みの場合を想定）
            text = `[Content from ${fileName}]`;
        }

        const article: KnowledgeArticle = {
            id: `k-${Date.now()}`,
            title: fileName,
            content: text,
            summary: text.substring(0, 200), // 簡易的な要約
            sourceType: 'google_drive',
            category: 'technical' as KnowledgeCategory,
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

        const filePath = path.join(this.knowledgeDir, `${article.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(article, null, 2));

        return article;
    }

    /**
     * すべてのナレッジを取得する
     */
    async getAllKnowledge(): Promise<KnowledgeArticle[]> {
        const files = await fs.readdir(this.knowledgeDir);
        const articles: KnowledgeArticle[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(this.knowledgeDir, file), 'utf-8');
                articles.push(JSON.parse(content));
            }
        }

        return articles;
    }
}
