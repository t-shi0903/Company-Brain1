/**
 * Company Brain - バックエンド Express サーバー
 * 
 * AI社内知能エージェントのAPIエンドポイント
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GeminiService, getGeminiService, createDocumentParser } from './services';
import {
    Member,
    Project,
    KnowledgeArticle,
    FAQ,
    CompanyContext,
    ProjectRequirement,
} from './types';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// サンプルデータ（実際はデータベースから取得）
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
            {
                id: 't2',
                title: 'バックエンドAPI開発',
                description: 'Express/Node.jsによるAPI開発',
                assigneeId: 'm1',
                status: 'done',
                priority: 'high',
                dueDate: new Date('2026-01-31'),
                estimatedHours: 80,
                actualHours: 75,
                createdAt: new Date(),
                completedAt: new Date(),
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
    res.json(sampleProjects);
});

/**
 * プロジェクト進捗を分析
 */
app.get('/api/projects/:id/analysis', async (req: Request, res: Response) => {
    try {
        const project = sampleProjects.find(p => p.id === req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'プロジェクトが見つかりません' });
        }

        const gemini = getGeminiService();
        const analysis = await gemini.analyzeProjectProgress(project);

        res.json(analysis);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'プロジェクト分析に失敗しました' });
    }
});

/**
 * 社員一覧を取得
 */
app.get('/api/members', (req: Request, res: Response) => {
    res.json(sampleMembers);
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
        const suggestion = await gemini.suggestResourceAllocation(requirement, sampleMembers);

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
        const alerts = await gemini.detectRisks(sampleMembers, sampleProjects);

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
