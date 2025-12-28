import { Member } from '../types/member';
import { Project } from '../types/project';
import { getCloudStorageService } from './cloud-storage';
import * as fs from 'fs';
import * as path from 'path';

// Cloud Storageを使用する場合はこちら、ローカル開発ではメモリまたはローカルファイルシステム
const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === 'true' || process.env.NODE_ENV === 'production';
const DATA_DIR = path.join(process.cwd(), 'data');

// データディレクトリの作成確認
if (!USE_CLOUD_STORAGE && !fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('[Storage] Created data directory at:', DATA_DIR);
    } catch (e) {
        console.error('[Storage] Failed to create data directory:', e);
    }
}

export class StorageService {
    private static cloudStorage = USE_CLOUD_STORAGE ? getCloudStorageService() : null;

    /**
     * ローカルファイルパスを取得
     */
    private static getLocalFilePath(filename: string): string {
        return path.join(DATA_DIR, filename);
    }

    /**
     * メンバーデータを読み込み
     */
    /**
     * メンバーデータを読み込み
     */
    static async loadMembers(): Promise<Member[]> {
        try {
            if (this.cloudStorage) {
                const members = await this.cloudStorage.loadData<Member[]>('members.json');
                if (!members || !Array.isArray(members)) return [];

                // Date型への変換
                return members.map((m) => ({
                    ...m,
                    joinedAt: new Date(m.joinedAt),
                    updatedAt: new Date(m.updatedAt)
                }));
            }

            // ローカルファイルから読み込み
            const filePath = this.getLocalFilePath('members.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                const members = JSON.parse(data);

                if (!Array.isArray(members)) {
                    console.warn('[Storage] member.json content is not an array');
                    return [];
                }

                return members.map((m: any) => ({
                    ...m,
                    joinedAt: new Date(m.joinedAt),
                    updatedAt: new Date(m.updatedAt)
                }));
            }

            // ファイルがない場合は空配列
            return [];
        } catch (error) {
            console.error('[Storage] Failed to load members:', error);
            return [];
        }
    }

    /**
     * メールアドレスでメンバーを検索
     */
    static async findMemberByEmail(email: string): Promise<Member | undefined> {
        const members = await this.loadMembers();
        return members.find(m => m.email === email);
    }

    /**
     * メンバーデータを保存
     */
    static async saveMembers(members: Member[]): Promise<void> {
        try {
            if (this.cloudStorage) {
                await this.cloudStorage.saveData('members.json', members);
                console.log(`[Storage] Saved ${members.length} members to Cloud Storage`);
            } else {
                // ローカル保存
                const filePath = this.getLocalFilePath('members.json');
                fs.writeFileSync(filePath, JSON.stringify(members, null, 2), 'utf-8');
                console.log(`[Storage] Saved ${members.length} members to local file: ${filePath}`);
            }
        } catch (error) {
            console.error('[Storage] Failed to save members:', error);
            throw error;
        }
    }

    /**
     * プロジェクトデータを読み込み
     */
    static async loadProjects(): Promise<Project[]> {
        try {
            if (this.cloudStorage) {
                const projects = await this.cloudStorage.loadData<Project[]>('projects.json');
                if (!projects || !Array.isArray(projects)) return [];
                return this.parseProjects(projects);
            }

            // ローカルファイルから読み込み
            const filePath = this.getLocalFilePath('projects.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                const projects = JSON.parse(data);

                if (!Array.isArray(projects)) {
                    console.warn('[Storage] projects.json content is not an array');
                    return [];
                }

                return this.parseProjects(projects);
            }

            return [];
        } catch (error) {
            console.error('[Storage] Failed to load projects:', error);
            return [];
        }
    }

    private static parseProjects(projects: any[]): Project[] {
        return projects.map((p) => ({
            ...p,
            startDate: new Date(p.startDate),
            deadline: new Date(p.deadline),
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            tasks: (p.tasks || []).map((t: any) => ({
                ...t,
                dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                createdAt: new Date(t.createdAt),
                completedAt: t.completedAt ? new Date(t.completedAt) : undefined
            }))
        }));
    }

    /**
     * プロジェクトデータを保存
     */
    static async saveProjects(projects: Project[]): Promise<void> {
        try {
            if (this.cloudStorage) {
                await this.cloudStorage.saveData('projects.json', projects);
                console.log(`[Storage] Saved ${projects.length} projects to Cloud Storage`);
            } else {
                // ローカル保存
                const filePath = this.getLocalFilePath('projects.json');
                fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
                console.log(`[Storage] Saved ${projects.length} projects to local file: ${filePath}`);
            }
        } catch (error) {
            console.error('[Storage] Failed to save projects:', error);
            throw error;
        }
    }

    /**
     * すべてのデータをクリア
     */
    static async clearAllData(): Promise<void> {
        try {
            if (this.cloudStorage) {
                await this.cloudStorage.deleteData('members.json');
                await this.cloudStorage.deleteData('projects.json');
                await this.cloudStorage.deleteData('settings.json');
                console.log('[Storage] All data cleared from Cloud Storage');
            } else {
                const files = ['members.json', 'projects.json', 'settings.json'];
                for (const file of files) {
                    const filePath = this.getLocalFilePath(file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`[Storage] Deleted local file: ${filePath}`);
                    }
                }
            }
        } catch (error) {
            console.error('[Storage] Failed to clear data:', error);
            throw error;
        }
    }

    /**
     * システム設定を読み込み
     */
    static async loadSettings(): Promise<any> {
        try {
            const defaultSettings = { autoApprove: false };

            if (this.cloudStorage) {
                const settings = await this.cloudStorage.loadData<any>('settings.json');
                return { ...defaultSettings, ...(settings || {}) };
            }

            const filePath = this.getLocalFilePath('settings.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                return { ...defaultSettings, ...JSON.parse(data) };
            }

            return defaultSettings;
        } catch (error) {
            console.error('[Storage] Failed to load settings:', error);
            return { autoApprove: false };
        }
    }

    /**
     * システム設定を保存
     */
    static async saveSettings(settings: any): Promise<void> {
        try {
            if (this.cloudStorage) {
                await this.cloudStorage.saveData('settings.json', settings);
            } else {
                const filePath = this.getLocalFilePath('settings.json');
                fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
            }
        } catch (error) {
            console.error('[Storage] Failed to save settings:', error);
            throw error;
        }
    }
}
