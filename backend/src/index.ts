/**
 * Company Brain - バックエンド Express サーバー
 * 
 * AI社内知能エージェントのAPIエンドポイント
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 環境変数の読み込みを最初に行う
dotenv.config();

// デバッグ: 環境変数が読み込まれているか確認
console.log('=== Environment Variables Debug ===');
console.log('SKIP_AUTH:', process.env.SKIP_AUTH);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================================');

import {
    Member,
    Project,
    KnowledgeArticle,
    FAQ,
    CompanyContext,
    ProjectRequirement,
} from './types';
import { getGeminiService, getGoogleDriveService, getKnowledgeManager, getVectorStoreService, StorageService, getAuditService, getDocumentParserService } from './services';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { setupAdminRoutes } from './services/admin-routes';
import { setupAiRoutes } from './services/ai-routes';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Daily Report interface
interface DailyReport {
    id: string;
    userId: string;
    userName: string;
    date: string;
    projectId: string;
    content: string;
    hours: number;
    createdAt: Date;
}

import { appConfig } from './config';

const app = express();
const PORT = appConfig.port;

// ミドルウェア
app.use((req, res, next) => {
    // セキュリティヘッダー設定 (Helmetの代用)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// ファイルアップロード設定 (multer)
const DATA_DIR = path.join(process.cwd(), 'data');
const uploadDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

// 静的ファイルの配信
app.use('/uploads', express.static(uploadDir));

// CORS設定
const allowedOrigins = appConfig.cors.allowedOrigins;

app.use(cors({
    origin: (origin, callback) => {
        // originがundefinedの場合（同一オリジンリクエスト）も許可
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // 開発中は全て許可（本番環境では厳格化したい場合はfalseに変更）
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// データの動的管理
let members: Member[] = [];
let projects: Project[] = [];
let reports: DailyReport[] = [];

// サンプルデータ（初期化用）
const sampleMembers: Member[] = [
    {
        id: 'm1',
        name: '田中太郎',
        email: 'tanaka@example.com',
        department: 'エンジニアリング',
        position: 'シニアエンジニア',
        skills: [
            { name: 'React', category: 'programming', level: 'expert', yearsOfExperience: 5 },
            { name: 'TypeScript', category: 'programming', level: 'expert', yearsOfExperience: 4 },
            { name: 'Node.js', category: 'programming', level: 'advanced', yearsOfExperience: 4 },
            { name: 'GCP', category: 'infrastructure', level: 'intermediate', yearsOfExperience: 2 }
        ],
        currentProjects: ['p1'],
        workloadStatus: 'busy',
        availability: [],
        pastProjects: ['p0'],
        joinedAt: new Date('2019-01-15'),
        updatedAt: new Date(),
    },
    {
        id: 'm2',
        name: '佐藤美咲',
        email: 'sato@example.com',
        department: 'デザイン',
        position: 'リードデザイナー',
        skills: [
            { name: 'Figma', category: 'design', level: 'expert', yearsOfExperience: 5 },
            { name: 'UI/UX', category: 'design', level: 'expert', yearsOfExperience: 6 },
            { name: 'CSS', category: 'design', level: 'advanced', yearsOfExperience: 5 }
        ],
        currentProjects: ['p1', 'p2'],
        workloadStatus: 'available',
        availability: [],
        pastProjects: ['p1'],
        joinedAt: new Date('2021-06-01'),
        updatedAt: new Date(),
    },
    {
        id: 'm3',
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        department: 'エンジニアリング',
        position: 'ジュニアエンジニア',
        skills: [
            { name: 'Python', category: 'programming', level: 'intermediate', yearsOfExperience: 2 },
            { name: 'SQL', category: 'programming', level: 'intermediate', yearsOfExperience: 2 }
        ],
        currentProjects: ['p2'],
        workloadStatus: 'available',
        availability: [],
        pastProjects: [],
        joinedAt: new Date('2023-04-01'),
        updatedAt: new Date(),
    }
];

const sampleProjects: Project[] = [
    {
        id: 'p1',
        name: '新規Webサービス開発',
        description: '社内業務効率化のためのWebアプリケーション開発プロジェクト',
        category: 'Web開発',
        startDate: new Date('2025-10-01'),
        deadline: new Date('2026-03-31'),
        assignees: ['m1', 'm2'],
        managerId: 'm1',
        status: 'in_progress',
        progressPercent: 45,
        relatedDocuments: [],
        tasks: [
            {
                id: 't1',
                title: 'フロントエンド実装',
                description: 'Reactによるフロントエンド開発',
                assigneeId: 'm1',
                status: 'in_progress',
                priority: 'high',
                dueDate: new Date('2026-02-28'),
                estimatedHours: 120,
                actualHours: 40,
                createdAt: new Date(),
            },
        ],
        createdAt: new Date('2025-10-01'),
        updatedAt: new Date(),
    },
    {
        id: 'p2',
        name: 'デザインリニューアル',
        description: 'コーポレートサイトのデザイン刷り直し',
        category: 'デザイン',
        startDate: new Date('2025-12-01'),
        deadline: new Date('2026-01-15'),
        assignees: ['m2', 'm3'],
        managerId: 'm2',
        status: 'in_progress',
        progressPercent: 20,
        relatedDocuments: [],
        tasks: [],
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date(),
    }
];

const sampleFAQs: FAQ[] = [
    {
        id: 'faq1',
        question: '有給休暇の申請方法は？',
        answer: '社内システム「勤怠管理」からオンラインで申請できます。申請後、上長の承認が必要です。',
        category: '人事・労務',
        tags: ['有給', '休暇', '申請'],
        relatedArticleIds: [],
        popularity: 95,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'faq2',
        question: '経費精算の締め日はいつ？',
        answer: '毎月25日が締め日です。翌月10日に振り込まれます。',
        category: '経理',
        tags: ['経費', '精算', '締め日'],
        relatedArticleIds: [],
        popularity: 88,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

const companyContext: CompanyContext = {
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
    relevantFAQs: sampleFAQs,
};

// 初期化ロジック
async function initData() {
    members = await StorageService.loadMembers();
    projects = await StorageService.loadProjects();

    // サンプルデータの自動生成機能を削除
    // if (members.length === 0) { ... }
    // if (projects.length === 0) { ... }

    console.log('Data initialized from storage');
}

initData();

// APIエンドポイント

/**
 * ヘルスチェック
 */
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * AIヘルスチェック（モデル接続確認）
 */
app.get('/api/health/ai', async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ status: 'error', message: 'GEMINI_API_KEY is not set' });
        }

        // 利用可能なモデル一覧を取得して接続確認とする
        const listModelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (listModelsResponse.ok) {
            const data = await listModelsResponse.json();
            res.json({ status: 'ok', models: data });
        } else {
            const errorText = await listModelsResponse.text();
            res.status(listModelsResponse.status).json({
                status: 'error',
                message: 'Failed to connect to Google Generative AI API',
                details: errorText
            });
        }
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * 自身のプロフィールを更新
 */
app.put('/api/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const updates: Partial<Member> = req.body;

        // 更新不可能なフィールドを除外
        delete updates.id;
        delete updates.email;
        delete updates.role; // 管理者権限が必要なフィールドは除外
        delete updates.status;

        // 配列フィールドのサニタイズ（nullチェックなど）
        if (!updates.skills) delete updates.skills;

        const currentMembers = await StorageService.loadMembers();
        const index = currentMembers.findIndex(m => m.id === user.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const currentMember = currentMembers[index];
        const updatedMember: Member = {
            ...currentMember,
            ...updates,
            updatedAt: new Date()
        };

        currentMembers[index] = updatedMember;
        await StorageService.saveMembers(currentMembers);

        // グローバル変数も更新
        members = currentMembers;

        console.log(`[Profile] Updated profile for: ${user.name}`);
        res.json({ success: true, member: updatedMember });
    } catch (error: any) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * 認証ユーザーとメンバーデータの同期 (レガシー/互換性のため維持するが、基本はauthMiddlewareで完結)
 */
app.post('/api/auth/sync', authMiddleware, async (req: Request, res: Response) => {
    // authMiddlewareですでに同期・作成されているため、ここでは現在のメンバー情報を返すだけでよい
    try {
        const user = (req as AuthenticatedRequest).user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 最新のメンバー情報を取得して返す
        const currentMembers = await StorageService.loadMembers();
        const member = currentMembers.find(m => m.id === user.id);

        if (member) {
            return res.json({ success: true, member: member, isNew: false });
        } else {
            // ここに来ることは理論上ない（middlewareで作られるため）
            return res.status(404).json({ error: 'Member not found after auth' });
        }
    } catch (error: any) {
        console.error('Auth sync error:', error);
        res.status(500).json({ error: 'Failed to sync user data' });
    }
});

/**
 * 画像をアップロード
 */
app.post('/api/upload/image', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log(`[Upload] Received upload request: ${req.method} ${req.url}`);
    next();
}, upload.single('image'), async (req: Request, res: Response) => {
    try {
        console.log('[Upload] Processing image upload...');
        if (!req.file) {
            console.warn('[Upload] No file provided in request');
            return res.status(400).json({ error: 'ファイルがありません' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        console.log(`[Upload] Successfully uploaded: ${imageUrl}`);
        res.json({ success: true, url: imageUrl });
    } catch (error: any) {
        console.error('[Upload] Image upload error:', error);
        res.status(500).json({ error: '画像のアップロードに失敗しました' });
    }
});

app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (req.path === '/admin/clear-data') return next(); // Allow clear-data without auth
    return authMiddleware(req, res, (err) => {
        if (err) return next(err);

        // ゲストユーザーの書き込み制限
        const user = (req as AuthenticatedRequest).user;
        if (user && user.role === 'guest') {
            // 許可されるPOST/PUTリクエスト
            const allowedValues = ['/chat', '/auth/sync'];
            // パスの判定 (/apiを除くパスで比較する必要があるため、req.pathは/chatなどになる)

            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                // 特定のエンドポイントは許可
                if (allowedValues.includes(req.path)) {
                    return next();
                }

                console.warn(`[Auth] Blocked write access for guest: ${user.email} -> ${req.method} ${req.path}`);
                return res.status(403).json({
                    error: 'Guest users are restricted to read-only access.',
                    details: '自動承認ユーザーは閲覧のみ可能です。編集権限が必要な場合は管理者に連絡してください。'
                });
            }
        }
        next();
    });
});

/**
 * AIに質問する
 */
app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: '質問を入力してください' });
        }

        const gemini = getGeminiService();
        const vectorStore = getVectorStoreService();
        const audit = getAuditService();
        const user = (req as AuthenticatedRequest).user;

        // 監査ログ
        if (user) {
            audit.logAccess(user.id, user.name, 'CHAT_QUERY', '', { question });
        }

        // 実データを取得
        const currentProjects = await StorageService.loadProjects();
        const currentMembers = await StorageService.loadMembers();

        // ベクトル検索でナレッジ記事を取得
        const relevantArticles = await vectorStore.search(question, user?.department);

        if (relevantArticles.length === 0) {
            console.log('[Chat] No relevant articles found by vector search.');
        }

        // コンテキストに実データを追加（トークン制限を考慮して制限）
        let enhancedContext = `\n\n【現在のプロジェクト一覧】\n`;

        // 進行中のプロジェクトを優先し、最大5件まで表示
        const activeProjects = currentProjects
            .filter(p => p.status === 'in_progress')
            .slice(0, 5);

        activeProjects.forEach(p => {
            const assigneeNames = currentMembers
                .filter(m => (p.assignees || []).includes(m.id))
                .map(m => m.name)
                .join(', ');

            enhancedContext += `\n- ${p.name} (${p.category || '未分類'})\n`;
            enhancedContext += `  状態: ${p.status === 'planning' ? '企画中' : p.status === 'in_progress' ? '進行中' : '完了'}\n`;
            enhancedContext += `  進捗: ${p.progressPercent || 0}%\n`;
            enhancedContext += `  担当者: ${assigneeNames || '未割り当て'}\n`;
            enhancedContext += `  期限: ${new Date(p.deadline).toLocaleDateString('ja-JP')}\n`;

            // 説明文は長すぎる場合は切り詰める
            if (p.description && p.description.length > 200) {
                enhancedContext += `  概要: ${p.description.substring(0, 200)}...\n`;
            } else {
                enhancedContext += `  概要: ${p.description || 'なし'}\n`;
            }
        });

        if (currentProjects.length > 5) {
            enhancedContext += `\n...他 ${currentProjects.length - 5} 件のプロジェクトがあります。\n`;
        }

        enhancedContext += `\n【メンバー一覧】\n`;
        // 最大10名まで表示
        const displayMembers = currentMembers.slice(0, 10);

        displayMembers.forEach(m => {
            const skills = (m.skills || []).slice(0, 5).map(s => `${s.name}`).join(', ');

            enhancedContext += `\n- ${m.name} (${m.department || '未所属'} / ${m.position || '未設定'})\n`;
            enhancedContext += `  スキル: ${skills || 'なし'}\n`;
            enhancedContext += `  作業負荷: ${m.workloadStatus === 'available' ? '対応可能' : m.workloadStatus === 'busy' ? '多忙' : '過負荷'}\n`;
        });

        if (currentMembers.length > 10) {
            enhancedContext += `\n...他 ${currentMembers.length - 10} 名のメンバーがいます。\n`;
        }

        // コンテキストを構築
        const context: CompanyContext = {
            ...companyContext,
            relevantArticles: relevantArticles,
            companyInfo: {
                ...companyContext.companyInfo,
                description: (companyContext.companyInfo.description + enhancedContext).substring(0, 10000) // 全体の文字数も制限
            }
        };

        const response = await gemini.query(question, context);

        res.json(response);
    } catch (error: any) {
        console.error('Chat error:', error);

        // エラー監査ログ
        const user = (req as AuthenticatedRequest).user;
        if (user) {
            getAuditService().logError(user.id, user.name, 'CHAT_ERROR', error.message);
        }

        res.status(500).json({
            error: 'AIからの回答取得に失敗しました',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * プロジェクト一覧を取得
 */
app.get('/api/projects', (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    if (user) {
        getAuditService().logAccess(user.id, user.name, 'LIST_PROJECTS', 'all');
    }
    res.json(projects);
});

/**
 * プロジェクトを作成・更新
 */
app.post('/api/projects', async (req: Request, res: Response) => {
    console.log('[API] POST /api/projects - Request received');
    console.log('[API] Request body:', JSON.stringify(req.body, null, 2));

    const project: Project = req.body;
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
        projects[index] = { ...project, updatedAt: new Date() };
        console.log(`[API] Updated project: ${project.id}`);
    } else {
        projects.push({ ...project, id: project.id || `p${Date.now()}`, createdAt: new Date(), updatedAt: new Date() });
        console.log(`[API] Created new project: ${project.id || 'new'}`);
    }
    await StorageService.saveProjects(projects);
    console.log('[API] Projects saved successfully');
    res.json({ success: true, project: projects[index >= 0 ? index : projects.length - 1] });
});

/**
 * プロジェクトを削除
 */
app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    projects = projects.filter(p => p.id !== id);
    await StorageService.saveProjects(projects);
    res.json({ success: true });
});

/**
 * 社員一覧を取得
 */
app.get('/api/members', (req: Request, res: Response) => {
    res.json(members);
});

/**
 * 社員を作成・更新
 */
app.post('/api/members', async (req: Request, res: Response) => {
    const member: Member = req.body;
    const index = members.findIndex(m => m.id === member.id);
    if (index >= 0) {
        members[index] = { ...member, updatedAt: new Date() };
    } else {
        members.push({ ...member, id: member.id || `m${Date.now()}`, joinedAt: new Date(), updatedAt: new Date() });
    }
    await StorageService.saveMembers(members);
    res.json({ success: true, member: members[index >= 0 ? index : members.length - 1] });
});

/**
 * 社員を削除
 */
app.delete('/api/members/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    members = members.filter(m => m.id !== id);
    await StorageService.saveMembers(members);
    res.json({ success: true });
});

/**
 * リソース配分を提案
 */
app.post('/api/suggest-resource', async (req: Request, res: Response) => {
    try {
        const requirement: ProjectRequirement = req.body;

        if (!requirement.projectName || !requirement.requiredSkills) {
            return res.status(400).json({ error: 'プロジェクト名と必要スキルを指定してください' });
        }

        const gemini = getGeminiService();
        const suggestion = await gemini.suggestResourceAllocation(requirement, members);

        res.json(suggestion);
    } catch (error) {
        console.error('Suggestion error:', error);
        res.status(500).json({ error: 'リソース提案に失敗しました' });
    }
});

/**
 * リスクアラートを検出
 */
app.get('/api/risks', async (req: Request, res: Response) => {
    try {
        const gemini = getGeminiService();
        const alerts = await gemini.detectRisks(members, projects);

        res.json(alerts);
    } catch (error) {
        console.error('Risk detection error:', error);
        res.status(500).json({ error: 'リスク検出に失敗しました' });
    }
});

/**
 * ドキュメントを解析
 */
app.post('/api/parse-document', async (req: Request, res: Response) => {
    // ...
});

/**
 * Google Driveとの同期を実行
 */
app.post('/api/sync-drive', async (req: Request, res: Response) => {
    try {
        const { folderId } = req.body;
        if (!folderId) {
            return res.status(400).json({ error: 'フォルダIDを指定してください' });
        }

        const driveService = getGoogleDriveService();
        const knowledgeManager = getKnowledgeManager();

        console.log(`[DriveSync] Starting sync for folder: ${folderId}`);
        const files = await driveService.listFiles(folderId);
        console.log(`[DriveSync] Found ${files.length} files in Drive`);

        const results = [];

        for (const file of files) {
            console.log(`[DriveSync] Processing file: ${file.name} (${file.mimeType})`);
            if (file.id && file.name && file.mimeType) {
                const content = await driveService.getFileContent(file.id, file.mimeType);
                const article = await knowledgeManager.processAndSave(file.name, content, file.mimeType, file.webViewLink || undefined);

                // Pineconeへベクトル保存
                try {
                    const vectorStore = getVectorStoreService();
                    await vectorStore.upsertArticle(article);
                } catch (e) {
                    console.error(`Vector upsert failed for ${file.name}:`, e);
                }

                results.push(article);
            }
        }

        console.log(`[DriveSync] Sync finished. Count: ${results.length}`);
        res.json({ success: true, syncedCount: results.length, articles: results });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Google Driveとの同期に失敗しました。認証ファイルを確認してください。' });
    }
});

/**
 * ナレッジをアップロード
 */
app.post('/api/knowledge/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!(req as any).file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        const user = (req as AuthenticatedRequest).user;
        const filePath = (req as any).file.path;
        const originalName = (req as any).file.originalname;
        const mimeType = (req as any).file.mimetype;

        console.log(`[Upload] Processing file: ${originalName} (${mimeType})`);

        // 1. ParserとGeminiを使って解析 & メタデータ抽出
        const documentParser = getDocumentParserService();
        // Uploadされたファイルは一時パスにあるので、それを渡す。
        // ただしDocumentParserは拡張子で判断するので、リネームするか、拡張子を正しく渡す必要がある。
        // DocumentParserService.parseFileは拡張子を見るため、一時ファイルに拡張子をつけるか、
        // DocumentParser側でMIMEタイプなどから類推させる必要がある。
        // ここでは簡易的に元の拡張子を維持するようにリネームする。
        const ext = path.extname(originalName);
        const tempPathWithExt = filePath + ext;
        fs.renameSync(filePath, tempPathWithExt);

        const parsedDoc = await documentParser.parseFile(tempPathWithExt);

        // 2. KnowledgeArticle オブジェクトを作成
        const knowledgeManager = getKnowledgeManager();

        // 解析結果からナレッジ記事を構築
        const article: KnowledgeArticle = {
            id: `k-${Date.now()}`,
            title: originalName,
            content: parsedDoc.content, // 生テキスト
            summary: parsedDoc.analysis?.summary || parsedDoc.content.substring(0, 200),
            category: parsedDoc.analysis?.category as any || 'technical',
            tags: parsedDoc.analysis?.tags || [],
            sourceType: 'upload',
            status: 'published',
            authorId: user?.id || 'system',
            lastUpdatedBy: user?.id || 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            viewCount: 0,
            relatedArticleIds: [],
            attachments: [],
            allowedDepartments: ['general'] // デフォルト
        };

        // 3. ストレージ(GCS)に保存
        await knowledgeManager.saveArticle(article);

        // 4. ベクトルストアに保存
        const vectorStore = getVectorStoreService();
        await vectorStore.upsertArticle(article);

        // 5. 後始末（一時ファイル削除）
        try {
            fs.unlinkSync(tempPathWithExt);
        } catch (e) {
            console.warn('Failed to delete temp file:', e);
        }

        // 監査ログ
        if (user) {
            getAuditService().logAccess(user.id, user.name, 'UPLOAD_KNOWLEDGE', article.id, { fileName: originalName });
        }

        res.json({ success: true, article });

    } catch (error: any) {
        console.error('Upload error:', error);
        // エラー時もファイル削除を試みる
        if ((req as any).file) {
            try {
                // リネーム前か後かわからないので両方トライ（雑だが安全）
                if (fs.existsSync((req as any).file.path)) fs.unlinkSync((req as any).file.path);
                const ext = path.extname((req as any).file.originalname);
                if (fs.existsSync((req as any).file.path + ext)) fs.unlinkSync((req as any).file.path + ext);
            } catch (e) { }
        }
        res.status(500).json({ error: 'ファイルのアップロードと処理に失敗しました', details: error.message });
    }
});

/**
 * ナレッジを削除
 */
app.delete('/api/knowledge/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as AuthenticatedRequest).user;

        console.log(`[Knowledge] Deleting article: ${id}`);

        const knowledgeManager = getKnowledgeManager();
        const vectorStore = getVectorStoreService();

        // 両方から削除
        await Promise.all([
            knowledgeManager.deleteArticle(id),
            vectorStore.deleteArticle(id)
        ]);

        if (user) {
            getAuditService().logAccess(user.id, user.name, 'DELETE_KNOWLEDGE', id);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete knowledge error:', error);
        res.status(500).json({ error: 'ナレッジの削除に失敗しました' });
    }
});

/**
 * 全てのナレッジを取得
 */
app.get('/api/knowledge', async (req: Request, res: Response) => {
    try {
        const knowledgeManager = getKnowledgeManager();
        const articles = await knowledgeManager.getAllKnowledge();
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: 'ナレッジの取得に失敗しました' });
    }
});

/**
 * FAQ一覧を取得
 */
app.get('/api/faqs', (req: Request, res: Response) => {
    res.json(sampleFAQs);
});

/**
 * 日報を作成
 */
app.post('/api/reports', async (req: Request, res: Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const { date, projectId, content, hours } = req.body;

        if (!projectId || !content || !hours) {
            return res.status(400).json({ error: '必須項目を入力してください' });
        }

        const newReport: DailyReport = {
            id: `r${Date.now()}`,
            userId: user?.id || 'unknown',
            userName: user?.name || 'Unknown User',
            date: date || new Date().toISOString().split('T')[0],
            projectId,
            content,
            hours: parseFloat(hours),
            createdAt: new Date()
        };

        reports.push(newReport);

        // 監査ログ
        if (user) {
            getAuditService().logAccess(user.id, user.name, 'CREATE_REPORT', projectId, { hours });
        }

        res.json({ success: true, report: newReport });
    } catch (error) {
        console.error('Report creation error:', error);
        res.status(500).json({ error: '日報作成に失敗しました' });
    }
});

/**
 * 日報一覧を取得
 */
app.get('/api/reports', (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { userId, from, to } = req.query;

    let filteredReports = reports;

    // ユーザーIDでフィルタ
    if (userId) {
        filteredReports = filteredReports.filter(r => r.userId === userId);
    }

    // 日付範囲でフィルタ
    if (from) {
        filteredReports = filteredReports.filter(r => r.date >= from);
    }
    if (to) {
        filteredReports = filteredReports.filter(r => r.date <= to);
    }

    if (user) {
        getAuditService().logAccess(user.id, user.name, 'LIST_REPORTS', '', { count: filteredReports.length });
    }

    res.json(filteredReports);
});

// 管理者ルートのセットアップ
setupAdminRoutes(
    app,
    () => members,
    (m) => { members = m; },
    () => projects,
    (p) => { projects = p; }
);

// AIルートのセットアップ
setupAiRoutes(
    app,
    () => projects
);

// サーバー起動
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🧠 Company Brain - AI社内知能エージェント              ║
║                                                          ║
║   サーバー起動: http://localhost:${PORT}                   ║
║                                                          ║
║   利用可能なエンドポイント:                              ║
║   - POST /api/chat          AIとのチャット              ║
║   - GET  /api/projects      プロジェクト一覧            ║
║   - GET  /api/members       社員一覧                    ║
║   - POST /api/suggest-resource リソース配分提案         ║
║   - GET  /api/risks         リスクアラート              ║
║   - POST /api/parse-document ドキュメント解析           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
