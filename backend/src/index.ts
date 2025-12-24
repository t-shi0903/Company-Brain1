/**
 * Company Brain - バックエンド Express サーバー
 * 
 * AI社内知能エージェントのAPIエンドポイント
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
    Member,
    Project,
    KnowledgeArticle,
    FAQ,
    CompanyContext,
    ProjectRequirement,
} from './types';
import { getGeminiService } from './services';
import { StorageService } from './services/storage';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// データの動的管理
let members: Member[] = [];
let projects: Project[] = [];

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
    companyInfo: {
        name: 'サンプル株式会社',
        industry: 'IT・ソフトウェア開発',
        description: 'Webアプリケーションとモバイルアプリの受託開発を行う技術会社です。',
    },
    relevantArticles: [],
    relevantFAQs: sampleFAQs,
    relevantPolicies: [],
};

// 初期化ロジック
async function initData() {
    members = await StorageService.loadMembers();
    projects = await StorageService.loadProjects();

    if (members.length === 0) {
        members = sampleMembers;
        await StorageService.saveMembers(members);
    }
    if (projects.length === 0) {
        projects = sampleProjects;
        await StorageService.saveProjects(projects);
    }
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
 * AIに質問する
 */
app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: '質問を入力してください' });
        }

        const gemini = getGeminiService();
        const response = await gemini.query(question, companyContext);

        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'AIからの回答取得に失敗しました' });
    }
});

/**
 * プロジェクト一覧を取得
 */
app.get('/api/projects', (req: Request, res: Response) => {
    res.json(projects);
});

/**
 * プロジェクトを作成・更新
 */
app.post('/api/projects', async (req: Request, res: Response) => {
    const project: Project = req.body;
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
        projects[index] = { ...project, updatedAt: new Date() };
    } else {
        projects.push({ ...project, id: project.id || `p${Date.now()}`, createdAt: new Date(), updatedAt: new Date() });
    }
    await StorageService.saveProjects(projects);
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
    try {
        const { content, type } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'ドキュメント内容を指定してください' });
        }

        const gemini = getGeminiService();
        const extracted = await gemini.extractFromDocument(content, type || 'text');

        res.json(extracted);
    } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ error: 'ドキュメント解析に失敗しました' });
    }
});

/**
 * FAQ一覧を取得
 */
app.get('/api/faqs', (req: Request, res: Response) => {
    res.json(sampleFAQs);
});

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
