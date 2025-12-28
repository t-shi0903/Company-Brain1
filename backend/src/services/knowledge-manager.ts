import path from 'path';
import os from 'os';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as xlsx from 'xlsx';
import * as officeParser from 'officeparser';
import { Storage } from '@google-cloud/storage';
import { KnowledgeArticle, KnowledgeCategory } from '../types';
import fs from 'fs/promises'; // 一時ファイル用
import { appConfig } from '../config';

export class KnowledgeManager {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.storage = new Storage();
        this.bucketName = appConfig.storage.bucketName;
    }

    /**
     * 既に作成されたナレッジ記事を保存する（公開メソッド）
     */
    async saveArticle(article: KnowledgeArticle): Promise<void> {
        await this.saveToGCS(article);
    }

    /**
     * ナレッジ記事を削除する
     */
    async deleteArticle(id: string): Promise<void> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(`${id}.json`);
            await file.delete();
            console.log(`Deleted article ${id} from GCS`);
        } catch (error) {
            console.error(`Error deleting article ${id} from GCS:`, error);
            // 既に存在しない場合などは無視してよいが、ログには出しておく
        }
    }

    /**
     * 内容を抽出してナレッジとして保存する
     */
    async processAndSave(fileName: string, content: Buffer, mimeType: string, sourceUrl?: string): Promise<KnowledgeArticle> {
        let text = '';

        try {
            if (mimeType === 'application/pdf') {
                const data = await pdf(content);
                text = data.text;
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer: content });
                text = result.value;
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                // Excel
                const workbook = xlsx.read(content, { type: 'buffer' });
                text = workbook.SheetNames.map(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    return xlsx.utils.sheet_to_txt(sheet);
                }).join('\n\n');
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                // PPTX: 一時ファイルを使用する (OSの一時ディレクトリを使用)
                const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}.pptx`);
                try {
                    await fs.writeFile(tempPath, content);
                    text = await new Promise<string>((resolve, reject) => {
                        officeParser.parseOffice(tempPath, (data: string, err: any) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });
                } finally {
                    await fs.unlink(tempPath).catch(() => { });
                }
            } else if (mimeType.startsWith('text/')) {
                text = content.toString('utf-8');
            } else {
                text = `[Content from ${fileName}]`;
            }
        } catch (error) {
            console.error(`Error parsing file ${fileName}:`, error);
            text = `[Error extracting content from ${fileName}]`;
        }

        const article: KnowledgeArticle = {
            id: `k-${Date.now()}`,
            title: fileName,
            content: text,
            summary: text.substring(0, 200),
            sourceType: 'google_drive',
            sourceUrl: sourceUrl,
            category: 'technical' as KnowledgeCategory,
            tags: [],
            status: 'published',
            authorId: 'system',
            lastUpdatedBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            viewCount: 0,
            relatedArticleIds: [],
            attachments: [],
            // デフォルトでは全社公開 (簡易実装)
            // ファイル名やフォルダ構造に基づいて権限を変えるロジックをここに追加可能
            allowedDepartments: ['general', 'admin', 'sales', 'engineering']
        };

        // GCSに保存
        await this.saveToGCS(article);

        return article;
    }

    private async saveToGCS(article: KnowledgeArticle) {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(`${article.id}.json`);

            await file.save(JSON.stringify(article, null, 2), {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'no-cache',
                },
            });
            console.log(`Saved article ${article.id} to GCS bucket ${this.bucketName}`);
        } catch (error) {
            console.error('Error saving to GCS:', error);
            // エラー時はログに出すのみ（処理は続行）
        }
    }

    // 全記事取得（GCSから）
    async getAllKnowledge(): Promise<KnowledgeArticle[]> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const [files] = await bucket.getFiles();

            const articles: KnowledgeArticle[] = [];

            // 並列でダウンロード（数が多い場合は制限が必要だが現状は簡易実装）
            await Promise.all(files.map(async (file) => {
                if (file.name.endsWith('.json')) {
                    try {
                        const [content] = await file.download();
                        const article = JSON.parse(content.toString());
                        articles.push(article);
                    } catch (e) {
                        console.error(`Failed to load ${file.name}`, e);
                    }
                }
            }));

            return articles;
        } catch (error) {
            console.error('Error listing articles from GCS:', error);
            return [];
        }
    }
}

