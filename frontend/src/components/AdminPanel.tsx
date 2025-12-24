import { useState, useEffect } from 'react';
import './AdminPanel.css';

interface Skill {
    name: string;
    category: string;
    level: string;
    yearsOfExperience: number;
}

interface Member {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    skills: Skill[];
    currentProjects: string[];
    workloadStatus: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    category: string;
    status: string;
    progressPercent: number;
    deadline: string;
}

function AdminPanel() {
    const [members, setMembers] = useState<Member[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeTab, setActiveTab] = useState<'members' | 'projects'>('projects');
    const [isLoading, setIsLoading] = useState(true);

    const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [mRes, pRes] = await Promise.all([
                fetch('/api/members'),
                fetch('/api/projects')
            ]);
            if (mRes.ok) setMembers(await mRes.ok ? await mRes.json() : []);
            if (pRes.ok) setProjects(await pRes.ok ? await pRes.json() : []);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMember)
            });
            if (res.ok) {
                setEditingMember(null);
                fetchData();
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingProject)
            });
            if (res.ok) {
                setEditingProject(null);
                fetchData();
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    const handleDelete = async (type: 'members' | 'projects', id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        try {
            const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    if (isLoading) return <div className="admin-loading">読み込み中...</div>;

    return (
        <div className="admin-panel animate-fadeIn">
            <div className="admin-tabs glass">
                <button
                    className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    プロジェクト管理
                </button>
                <button
                    className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    メンバー管理
                </button>
            </div>

            <div className="admin-content glass">
                {activeTab === 'projects' ? (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>プロジェクト一覧</h2>
                            <button className="add-btn" onClick={() => setEditingProject({})}>+ 新規プロジェクト</button>
                        </div>

                        <div className="admin-list">
                            {projects.map(p => (
                                <div key={p.id} className="admin-list-item">
                                    <div className="item-info">
                                        <strong>{p.name}</strong>
                                        <span>{p.category} | {p.status}</span>
                                    </div>
                                    <div className="item-actions">
                                        <button onClick={() => setEditingProject(p)}>編集</button>
                                        <button className="delete" onClick={() => handleDelete('projects', p.id)}>削除</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {editingProject && (
                            <div className="modal">
                                <form className="admin-form glass" onSubmit={handleSaveProject}>
                                    <h3>{editingProject.id ? 'プロジェクト編集' : '新規プロジェクト'}</h3>
                                    <input
                                        type="text"
                                        placeholder="プロジェクト名"
                                        value={editingProject.name || ''}
                                        onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="カテゴリ"
                                        value={editingProject.category || ''}
                                        onChange={e => setEditingProject({ ...editingProject, category: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="説明"
                                        value={editingProject.description || ''}
                                        onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                                    />
                                    <div className="form-row">
                                        <select
                                            value={editingProject.status || 'planning'}
                                            onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}
                                        >
                                            <option value="planning">企画中</option>
                                            <option value="in_progress">進行中</option>
                                            <option value="completed">完了</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="進捗(%)"
                                            value={editingProject.progressPercent || 0}
                                            onChange={e => setEditingProject({ ...editingProject, progressPercent: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" onClick={() => setEditingProject(null)}>キャンセル</button>
                                        <button type="submit" className="save-btn">保存</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>メンバー一覧</h2>
                            <button className="add-btn" onClick={() => setEditingMember({})}>+ メンバー追加</button>
                        </div>

                        <div className="admin-list">
                            {members.map(m => (
                                <div key={m.id} className="admin-list-item">
                                    <div className="item-info">
                                        <strong>{m.name}</strong>
                                        <span>{m.department} | {m.position}</span>
                                    </div>
                                    <div className="item-actions">
                                        <button onClick={() => setEditingMember(m)}>編集</button>
                                        <button className="delete" onClick={() => handleDelete('members', m.id)}>削除</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {editingMember && (
                            <div className="modal">
                                <form className="admin-form glass" onSubmit={handleSaveMember}>
                                    <h3>{editingMember.id ? 'メンバー編集' : 'メンバー追加'}</h3>
                                    <input
                                        type="text"
                                        placeholder="名前"
                                        value={editingMember.name || ''}
                                        onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="メールアドレス"
                                        value={editingMember.email || ''}
                                        onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="部署"
                                        value={editingMember.department || ''}
                                        onChange={e => setEditingMember({ ...editingMember, department: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="役職"
                                        value={editingMember.position || ''}
                                        onChange={e => setEditingMember({ ...editingMember, position: e.target.value })}
                                    />
                                    <div className="form-actions">
                                        <button type="button" onClick={() => setEditingMember(null)}>キャンセル</button>
                                        <button type="submit" className="save-btn">保存</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPanel;
