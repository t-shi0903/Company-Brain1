import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export class GoogleDriveService {
    private drive;

    constructor() {
        const KEY_FILE = path.join(__dirname, '../../config/google-service-account.json');

        if (!fs.existsSync(KEY_FILE)) {
            throw new Error(`認証ファイルが見つかりません: ${KEY_FILE}`);
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        this.drive = google.drive({ version: 'v3', auth });
    }

    /**
     * 指定されたフォルダ内のファイル一覧を取得する
     */
    async listFiles(folderId: string) {
        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, modifiedTime)',
            });
            return response.data.files || [];
        } catch (error) {
            console.error('Google Drive list error:', error);
            throw error;
        }
    }

    /**
     * ファイルのコンテンツを取得する (テキスト/PDF/Word等)
     */
    async getFileContent(fileId: string, mimeType: string): Promise<Buffer> {
        try {
            if (mimeType === 'application/vnd.google-apps.document') {
                // Googleドキュメントの場合はPDFとしてエクスポート
                const res = await this.drive.files.export({
                    fileId,
                    mimeType: 'application/pdf',
                }, { responseType: 'arraybuffer' });
                return Buffer.from(res.data as ArrayBuffer);
            } else {
                // 通常のファイルはそのままストリームで取得
                const res = await this.drive.files.get({
                    fileId,
                    alt: 'media',
                }, { responseType: 'arraybuffer' });
                return Buffer.from(res.data as ArrayBuffer);
            }
        } catch (error) {
            console.error('Google Drive download error:', error);
            throw error;
        }
    }
}
