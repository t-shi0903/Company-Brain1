/**
 * Company Brain - ドキュメントパーサーサービス
 * 
 * PDF、CSV、テキストファイルからのデータ抽出
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import { GeminiService, ExtractedData } from './gemini';

/** ファイル解析結果 */
export interface ParsedDocument {
    /** ファイル名 */
    fileName: string;
    /** ファイルパス */
    filePath: string;
    /** MIMEタイプ */
    mimeType: string;
    /** 抽出されたテキスト */
    content: string;
    /** AI分析結果 */
    analysis?: ExtractedData;
    /** 解析日時 */
    parsedAt: Date;
}

/** CSVデータ */
export interface CSVData {
    /** ヘッダー */
    headers: string[];
    /** 行データ */
    rows: Record<string, string>[];
    /** 総行数 */
    totalRows: number;
}

/**
 * ドキュメントパーサーサービス
 */
export class DocumentParserService {
    private geminiService: GeminiService;

    constructor(geminiService?: GeminiService) {
        this.geminiService = geminiService || new GeminiService();
    }

    /**
     * ファイルを解析
     */
    async parseFile(filePath: string): Promise<ParsedDocument> {
        const fileName = path.basename(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const mimeType = this.getMimeType(extension);

        let content: string;

        switch (extension) {
            case '.pdf':
                content = await this.parsePDF(filePath);
                break;
            case '.csv':
                const csvData = await this.parseCSV(filePath);
                content = this.csvToText(csvData);
                break;
            case '.txt':
            case '.md':
                content = await this.parseText(filePath);
                break;
            case '.json':
                content = await this.parseJSON(filePath);
                break;
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }

        // AIによる分析
        const analysis = await this.geminiService.extractFromDocument(content, extension.slice(1));

        return {
            fileName,
            filePath,
            mimeType,
            content,
            analysis,
            parsedAt: new Date(),
        };
    }

    /**
     * PDFファイルを解析
     */
    async parsePDF(filePath: string): Promise<string> {
        try {
            // pdf-parse は動的インポートで使用
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('PDF parsing error:', error);
            throw new Error(`PDFファイルの解析に失敗しました: ${filePath}`);
        }
    }

    /**
     * CSVファイルを解析
     */
    async parseCSV(filePath: string): Promise<CSVData> {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const records = csvParse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });

            const headers = records.length > 0 ? Object.keys(records[0]) : [];

            return {
                headers,
                rows: records,
                totalRows: records.length,
            };
        } catch (error) {
            console.error('CSV parsing error:', error);
            throw new Error(`CSVファイルの解析に失敗しました: ${filePath}`);
        }
    }

    /**
     * テキストファイルを解析
     */
    async parseText(filePath: string): Promise<string> {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            console.error('Text file reading error:', error);
            throw new Error(`テキストファイルの読み込みに失敗しました: ${filePath}`);
        }
    }

    /**
     * JSONファイルを解析
     */
    async parseJSON(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('JSON parsing error:', error);
            throw new Error(`JSONファイルの解析に失敗しました: ${filePath}`);
        }
    }

    /**
     * テキストから構造化データを抽出
     */
    async extractStructuredData(text: string): Promise<Record<string, unknown>> {
        const extracted = await this.geminiService.extractFromDocument(text, 'text');
        return {
            keyPoints: extracted.keyPoints,
            metadata: extracted.metadata,
        };
    }

    /**
     * 複数ファイルを一括解析
     */
    async parseMultipleFiles(filePaths: string[]): Promise<ParsedDocument[]> {
        const results: ParsedDocument[] = [];

        for (const filePath of filePaths) {
            try {
                const parsed = await this.parseFile(filePath);
                results.push(parsed);
            } catch (error) {
                console.error(`Error parsing ${filePath}:`, error);
                // エラーがあっても続行
            }
        }

        return results;
    }

    /**
     * ディレクトリ内のファイルを全て解析
     */
    async parseDirectory(dirPath: string, extensions: string[] = ['.pdf', '.csv', '.txt', '.md']): Promise<ParsedDocument[]> {
        const files = fs.readdirSync(dirPath)
            .filter(file => extensions.includes(path.extname(file).toLowerCase()))
            .map(file => path.join(dirPath, file));

        return this.parseMultipleFiles(files);
    }

    /**
     * CSVデータをテキストに変換
     */
    private csvToText(csvData: CSVData): string {
        let text = `CSVデータ（${csvData.totalRows}行）\n\n`;
        text += `列: ${csvData.headers.join(', ')}\n\n`;

        // 最初の10行のみをテキスト化
        const sampleRows = csvData.rows.slice(0, 10);
        sampleRows.forEach((row, index) => {
            text += `行${index + 1}: `;
            text += csvData.headers.map(h => `${h}=${row[h]}`).join(', ');
            text += '\n';
        });

        if (csvData.totalRows > 10) {
            text += `\n... 他${csvData.totalRows - 10}行`;
        }

        return text;
    }

    /**
     * MIMEタイプを取得
     */
    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json',
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }
}

// デフォルトインスタンスをエクスポート
export function createDocumentParser(geminiService?: GeminiService): DocumentParserService {
    return new DocumentParserService(geminiService);
}
