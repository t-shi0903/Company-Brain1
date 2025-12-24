import { useState, useEffect } from 'react';
import './Dashboard.css';

interface Project {
    id: string;
    name: string;
    status: string;
    progressPercent: number;
    deadline: string;
    assignees: string[];
}

interface Member {
    id: string;
    name: string;
    department: string;
    workloadStatus: string;
    skills: { name: string; level: string }[];
    currentProjects: string[];
}

interface RiskAlert {
    type: string;
    severity: string;
    message: string;
    detectedAt: string;
}

// サンプルデータ（APIが利用できない場合のフォールバック）
const SAMPLE_PROJECTS: Project[] = [
    { id: 'p1', name: '新規Webサービス開発', status: 'in_progress', progressPercent: 45, deadline: '2025-03-31', assignees: ['m1'] },
    { id: 'p2', name: 'モバイルアプリリニューアル', status: 'in_progress', progressPercent: 72, deadline: '2025-02-15', assignees: ['m1', 'm2'] },
    { id: 'p3', name: '社内システム改修', status: 'planning', progressPercent: 15, deadline: '2025-04-30', assignees: ['m2'] },
];

const SAMPLE_MEMBERS: Member[] = [
    { id: 'm1', name: '田中太郎', department: 'エンジニアリング', workloadStatus: 'moderate', skills: [{ name: 'TypeScript', level: 'expert' }, { name: 'React', level: 'advanced' }], currentProjects: ['p1', 'p2'] },
    { id: 'm2', name: '佐藤花子', department: 'デザイン', workloadStatus: 'available', skills: [{ name: 'UI/UXデザイン', level: 'expert' }, { name: 'Figma', level: 'expert' }], currentProjects: ['p2', 'p3'] },
    { id: 'm3', name: '鈴木一郎', department: 'マーケティング', workloadStatus: 'busy', skills: [{ name: 'マーケティング', level: 'advanced' }, { name: 'データ分析', level: 'intermediate' }], currentProjects: ['p1'] },
];

const SAMPLE_ALERTS: RiskAlert[] = [
    { type: 'deadline_risk', severity: 'high', message: '「モバイルアプリリニューアル」の期限まで54日ですが、進捗は72%です。', detectedAt: new Date().toISOString() },
];

function Dashboard() {
    const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
    const [members, setMembers] = useState<Member[]>(SAMPLE_MEMBERS);
    const [alerts, setAlerts] = useState<RiskAlert[]>(SAMPLE_ALERTS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('google_id_token');
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projectsRes, membersRes, alertsRes] = await Promise.all([
                    fetch('/api/projects', { headers }),
                    fetch('/api/members', { headers }),
                    fetch('/api/risks', { headers }),
                ]);

                if (projectsRes.ok) {
                    const projectsData = await projectsRes.json();
                    setProjects(projectsData);
                }
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    setMembers(membersData);
                }
                if (alertsRes.ok) {
                    const alertsData = await alertsRes.json();
                    setAlerts(alertsData);
                }
            } catch (error) {
                console.log('Using sample data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            planning: '企画中',
            in_progress: '進行中',
            on_hold: '保留',
            completed: '完了',
            cancelled: 'キャンセル',
        };
        return labels[status] || status;
    };

    const getWorkloadLabel = (status: string) => {
        const labels: Record<string, { text: string; className: string }> = {
            available: { text: '余裕あり', className: 'success' },
            moderate: { text: '通常', className: 'info' },
            busy: { text: '多忙', className: 'warning' },
            overloaded: { text: '過負荷', className: 'danger' },
        };
        return labels[status] || { text: status, className: '' };
    };

    const getSeverityClass = (severity: string) => {
        const classes: Record<string, string> = {
            low: 'info',
            medium: 'warning',
            high: 'danger',
            critical: 'danger',
        };
        return classes[severity] || '';
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>データを読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* サマリーカード */}
            <div className="summary-cards">
                <div className="summary-card glass animate-fadeIn">
                    <div className="card-icon projects">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className="card-content">
                        <span className="card-value">{projects.length}</span>
                        <span className="card-label">進行中プロジェクト</span>
                    </div>
                </div>

                <div className="summary-card glass animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                    <div className="card-icon members">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div className="card-content">
                        <span className="card-value">{members.length}</span>
                        <span className="card-label">チームメンバー</span>
                    </div>
                </div>

                <div className="summary-card glass animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                    <div className="card-icon alerts">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <div className="card-content">
                        <span className="card-value">{alerts.length}</span>
                        <span className="card-label">アクティブアラート</span>
                    </div>
                </div>

                <div className="summary-card glass animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                    <div className="card-icon progress">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                        </svg>
                    </div>
                    <div className="card-content">
                        <span className="card-value">
                            {Math.round(projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length)}%
                        </span>
                        <span className="card-label">平均進捗率</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* リスクアラート */}
                {alerts.length > 0 && (
                    <section className="dashboard-section alerts-section glass animate-fadeIn">
                        <h2 className="section-title">
                            <span className="title-icon">⚠️</span>
                            リスクアラート
                        </h2>
                        <div className="alerts-list">
                            {alerts.map((alert, index) => (
                                <div key={index} className={`alert-item ${getSeverityClass(alert.severity)}`}>
                                    <div className="alert-indicator"></div>
                                    <div className="alert-content">
                                        <p className="alert-message">{alert.message}</p>
                                        <span className="alert-time">
                                            {new Date(alert.detectedAt).toLocaleString('ja-JP')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* プロジェクト一覧 */}
                <section className="dashboard-section projects-section glass animate-fadeIn">
                    <h2 className="section-title">
                        <span className="title-icon">📊</span>
                        プロジェクト進捗
                    </h2>
                    <div className="projects-list">
                        {projects.map((project) => (
                            <div key={project.id} className="project-item">
                                <div className="project-header">
                                    <h3 className="project-name">{project.name}</h3>
                                    <span className={`status-badge ${project.status}`}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                                <div className="project-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${project.progressPercent}%` }}
                                        />
                                    </div>
                                    <span className="progress-text">{project.progressPercent}%</span>
                                </div>
                                <div className="project-meta">
                                    <span className="deadline">
                                        📅 期限: {new Date(project.deadline).toLocaleDateString('ja-JP')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* メンバー一覧 */}
                <section className="dashboard-section members-section glass animate-fadeIn">
                    <h2 className="section-title">
                        <span className="title-icon">👥</span>
                        チームメンバー
                    </h2>
                    <div className="members-list">
                        {members.map((member) => {
                            const workload = getWorkloadLabel(member.workloadStatus);
                            return (
                                <div key={member.id} className="member-item">
                                    <div className="member-avatar">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="member-info">
                                        <h3 className="member-name">{member.name}</h3>
                                        <span className="member-department">{member.department}</span>
                                        <div className="member-skills">
                                            {member.skills.slice(0, 2).map((skill, i) => (
                                                <span key={i} className="skill-tag">{skill.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="member-status">
                                        <span className={`workload-badge ${workload.className}`}>
                                            {workload.text}
                                        </span>
                                        <span className="project-count">
                                            {member.currentProjects.length}件担当
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
