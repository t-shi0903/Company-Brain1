import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export class GoogleDriveService {
    private drive;

    constructor() {
        // クラウド環境（環境変数）またはローカル（ファイル）から認証情報を取得
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            this.drive = google.drive({ version: 'v3', auth });
        } else {
            const KEY_FILE = path.join(__dirname, '../../config/google-service-account.json');

            if (!fs.existsSync(KEY_FILE)) {
                // 開発環境でもファイルがない場合は警告（ただしクラウドデプロイ時は環境変数があればOK）
                console.warn(`認証ファイルが見つかりません: ${KEY_FILE}`);
            }

            const auth = new google.auth.GoogleAuth({
                keyFile: KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            this.drive = google.drive({ version: 'v3', auth });
        }
    }

    /**
     * 指定されたフォルダ内のファイル一覧を取得する
     */
    async listFiles(folderId: string) {
        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
            });
            return response.data.files || [];
        } catch (error) {
            console.error('Google Drive list error:', error);
            throw error;
        }
    }

    /**
     * ファイルのコンテンツを取得する (テキスト/PDF/Word/Excel/PPT等)
     */
    async getFileContent(fileId: string, mimeType: string): Promise<Buffer> {
        try {
            if (mimeType === 'application/vnd.google-apps.document') {
                // Googleドキュメント -> PDF
                const res = await this.drive.files.export({
                    fileId,
                    mimeType: 'application/pdf',
                }, { responseType: 'arraybuffer' });
                return Buffer.from(res.data as ArrayBuffer);
            } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                // Googleスプレッドシート -> Excel (xlsx)
                const res = await this.drive.files.export({
                    fileId,
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }, { responseType: 'arraybuffer' });
                return Buffer.from(res.data as ArrayBuffer);
            } else if (mimeType === 'application/vnd.google-apps.presentation') {
                // Googleスライド -> PowerPoint (pptx)
                const res = await this.drive.files.export({
                    fileId,
                    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
