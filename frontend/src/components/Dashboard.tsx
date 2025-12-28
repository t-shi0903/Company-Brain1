import { useState, useEffect } from 'react';
import './Dashboard.css';
import ErrorBoundary from './ErrorBoundary';
import { ThemeSelector } from './ThemeSelector';
import { DashboardSkeleton } from './LoadingSkeleton';

import { ProjectModal } from './ProjectModal';
import { MemberModal } from './MemberModal';
import { ReportModal } from './ReportModal';
import { AIInsights } from './AIInsights';
import { QuickActions } from './QuickActions';
import { Project, Member, RiskAlert } from '../types';

// サンプルデータ（APIが利用できない場合のフォールバック）
// 型に合わせてデータを整形
const SAMPLE_PROJECTS: Project[] = [
    { id: 'p1', name: '新規Webサービス開発', status: 'in_progress', progress: 45, progressPercent: 45, deadline: '2025-03-31', assignees: ['m1'] },
    { id: 'p2', name: 'モバイルアプリリニューアル', status: 'in_progress', progress: 72, progressPercent: 72, deadline: '2025-02-15', assignees: ['m1', 'm2'] },
    { id: 'p3', name: '社内システム改修', status: 'planning', progress: 15, progressPercent: 15, deadline: '2025-04-30', assignees: ['m2'] },
];

const SAMPLE_MEMBERS: Member[] = [
    { id: 'm1', name: '田中太郎', department: 'エンジニアリング', workloadStatus: 'moderate', skills: [{ name: 'TypeScript', level: 'expert' }, { name: 'React', level: 'advanced' }], currentProjects: ['p1', 'p2'] },
    { id: 'm2', name: '佐藤花子', department: 'デザイン', workloadStatus: 'available', skills: [{ name: 'UI/UXデザイン', level: 'expert' }, { name: 'Figma', level: 'expert' }], currentProjects: ['p2', 'p3'] },
    { id: 'm3', name: '鈴木一郎', department: 'マーケティング', workloadStatus: 'busy', skills: [{ name: 'マーケティング', level: 'advanced' }, { name: 'データ分析', level: 'intermediate' }], currentProjects: ['p1'] },
];

const SAMPLE_ALERTS: RiskAlert[] = [
    { type: 'deadline_risk', severity: 'high', message: '「モバイルアプリリニューアル」の期限まで54日ですが、進捗は72%です。', detectedAt: new Date().toISOString() },
];

interface DashboardProps {
    onNavigate: (view: 'dashboard' | 'chat' | 'admin') => void;
    user: {
        email: string;
        name: string;
        picture?: string;
        role?: 'admin' | 'member' | 'guest';
    } | null;
}

function Dashboard({ onNavigate, user }: DashboardProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);

    // ... (fetchData effect is same) ...

    // ... (helper functions getStatusLabel, getWorkloadLabel, getSeverityClass are same) ...
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

    // 自分のプロフィール更新をメンバー一覧に即座に反映させる
    useEffect(() => {
        if (user && members.length > 0) {
            setMembers(prev => prev.map(m =>
                m.email === user.email
                    ? { ...m, name: user.name, picture: user.picture }
                    : m
            ));
        }
    }, [user]);

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


    const CircularProgress = ({ value, size = 60, strokeWidth = 6, color = "var(--color-primary-500)" }: { value: number, size?: number, strokeWidth?: number, color?: string }) => {
        // NaN値を0にフォールバック
        const safeValue = isNaN(value) || !isFinite(value) ? 0 : value;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (safeValue / 100) * circumference;

        return (
            <div className="circular-progress" style={{ width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--bg-tertiary)"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                </svg>
                <div className="circular-text">{Math.round(safeValue)}%</div>
            </div>
        );
    };

    const criticalAlert = alerts.find(a => a.severity === 'high' || a.severity === 'critical');

    // Quick Actions Handlers
    const handleNewProject = () => {
        const newProject: any = {
            id: `new_${Date.now()}`,
            name: '新規プロジェクト',
            status: 'planning',
            progress: 0,
            progressPercent: 0,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week later
            assignees: [],
            description: '',
            tasks: [],
            category: 'General',
            startDate: new Date(),
            managerId: 'me',
            relatedDocuments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setSelectedProject(newProject);
    };

    const handleAddMember = () => {
        setMemberModalOpen(true);
    };

    const handleCreateReport = () => {
        setReportModalOpen(true);
    };

    const handleMemberSave = (member: Member) => {
        setMembers([...members, member]);
        setMemberModalOpen(false);
    };

    const handleReportSave = (report: any) => {
        console.log('Report saved:', report);
        setReportModalOpen(false);
    };

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="dashboard animate-fadeIn">

            {/* Project Details Modal */}
            {selectedProject && (
                <ProjectModal
                    project={{
                        ...selectedProject,
                        title: selectedProject.title || selectedProject.name,
                        progress: selectedProject.progress || selectedProject.progressPercent || 0
                    }}
                    isOpen={!!selectedProject}
                    onClose={() => setSelectedProject(null)}
                    onUpdate={(updatedProject) => {
                        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
                        setSelectedProject(null);
                    }}
                    members={members}
                    initialEditMode={selectedProject.id.startsWith('new_')}
                    readOnly={user?.role === 'guest'}
                />
            )}


            {/* Quick Actions FAB - ゲスト以外のみ表示 */}
            {user?.role !== 'guest' && (
                <QuickActions
                    onNewProject={handleNewProject}
                    onAddMember={handleAddMember}
                    onCreateReport={handleCreateReport}
                />
            )}

            {/* Member Modal */}
            <MemberModal
                isOpen={memberModalOpen}
                onClose={() => setMemberModalOpen(false)}
                onSave={handleMemberSave}
            />

            {/* Report Modal */}
            <ReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                projects={projects}
                onSave={handleReportSave}
            />

            {/* AI Insights Widget */}
            <ErrorBoundary fallback={<div className="ai-insights-widget error"><p>AIウィジェットの表示エラー</p></div>}>
                <AIInsights />
            </ErrorBoundary>

            {/* Critical Alert Hero */}
            {criticalAlert && (
                <div className="hero-alert glass animate-pulse">
                    <div className="hero-icon">⚠️</div>
                    <div className="hero-content">
                        <h3>Critical Alert Detected</h3>
                        <p>{criticalAlert.message}</p>
                    </div>
                    <button className="hero-action">CHECK</button>
                </div>
            )}

            {/* サマリーカード */}
            <section className="summary-cards">
                <div className="summary-card">
                    <div className="card-header">
                        <div className="card-icon projects">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </div>
                        <span className="card-label">Projects</span>
                    </div>
                    <div className="card-body">
                        <div className="card-value">{projects.length}</div>
                        <span className="card-sub">Active Projects</span>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-header">
                        <div className="card-icon members">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <span className="card-label">Team</span>
                    </div>
                    <div className="card-body">
                        <div className="card-value">{members.length}</div>
                        <span className="card-sub">Members</span>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-header">
                        <div className="card-icon progress">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <span className="card-label">Avg. Progress</span>
                    </div>
                    <div className="card-body">
                        <div className="card-value">
                            {(() => {
                                const validProjects = projects.filter(p => !isNaN(p.progress) && isFinite(p.progress));
                                return validProjects.length > 0
                                    ? Math.round(validProjects.reduce((sum, p) => sum + p.progress, 0) / validProjects.length)
                                    : 0;
                            })()}%
                        </div>
                        <span className="card-sub">On Track</span>
                    </div>
                </div>
            </section>

            <div className="dashboard-grid layout-2-1">
                {/* プロジェクト一覧 - Enhanced List */}
                <section className="dashboard-section projects-section glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>
                            <span className="title-icon">📂</span> プロジェクト状況
                        </h2>
                        {user?.role !== 'guest' && (
                            <button className="icon-btn-small" title="新規プロジェクト" onClick={handleNewProject}>＋</button>
                        )}
                    </div>

                    <div className="projects-list-enhanced">
                        {projects.map((project, i) => (
                            <div
                                key={project.id}
                                className={`project-card-row ${user?.role === 'guest' ? 'readonly' : ''}`}
                                style={{ animationDelay: `${i * 0.1}s`, cursor: user?.role === 'guest' ? 'default' : 'pointer' }}
                                onClick={() => user?.role !== 'guest' && setSelectedProject(project)}
                            >
                                <div className="project-info-main">
                                    <h3>{project.name}</h3>
                                    <span className="deadline-badge">📅 {new Date(project.deadline).toLocaleDateString()}</span>
                                </div>
                                <div className="project-status-visual">
                                    <CircularProgress value={project.progress} size={45} strokeWidth={4} color={project.status === 'in_progress' ? 'var(--color-primary-500)' : 'var(--text-muted)'} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* メンバー一覧 - Card Grid */}
                <section className="dashboard-section members-section glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>
                            <span className="title-icon">💎</span> チームメンバー
                        </h2>
                        {user?.role !== 'guest' && (
                            <button className="icon-btn-small" title="メンバー追加" onClick={handleAddMember}>＋</button>
                        )}
                    </div>

                    <div className="members-grid">
                        {members.map((member, i) => {
                            const isBusy = member.workloadStatus === 'busy' || member.workloadStatus === 'overloaded';
                            return (
                                <div key={member.id} className="member-card glass-hover" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="member-card-header">
                                        <div className={`avatar-ring ${member.workloadStatus}`}>
                                            <div
                                                className="member-avatar-lg"
                                                style={{
                                                    backgroundImage: (member.picture || member.avatarUrl) ? `url(${member.picture || member.avatarUrl})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {!(member.picture || member.avatarUrl) && member.name.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="member-card-info">
                                            <h4>{member.name}</h4>
                                            <span>{member.department}</span>
                                        </div>
                                    </div>
                                    <div className="member-skills-chips">
                                        {member.skills.slice(0, 3).map((s, idx) => (
                                            <span key={idx} className="skill-chip">{s.name}</span>
                                        ))}
                                    </div>
                                    {isBusy && <div className="status-dot busy" title="Busy"></div>}
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
