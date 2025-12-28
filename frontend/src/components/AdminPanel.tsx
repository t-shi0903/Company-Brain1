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
    role?: 'admin' | 'member';
    status?: 'approved' | 'pending' | 'rejected';
    picture?: string;
    skills: Skill[];
    currentProjects: string[];
    workloadStatus: string;
    requestedAt?: string;
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

interface KnowledgeArticle {
    id: string;
    title: string;
    summary: string;
    category: string;
    sourceType?: string;
    updatedAt: string;
}

function AdminPanel() {
    const [members, setMembers] = useState<Member[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [knowledge, setKnowledge] = useState<KnowledgeArticle[]>([]);
    const [activeTab, setActiveTab] = useState<'members' | 'projects' | 'knowledge' | 'data' | 'settings'>('projects');
    const [settings, setSettings] = useState<{ autoApprove: boolean }>({ autoApprove: false });
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [folderId, setFolderId] = useState('');

    const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('google_id_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [mRes, pRes, kRes, sRes] = await Promise.all([
                fetch('/api/members', { headers }),
                fetch('/api/projects', { headers }),
                fetch('/api/knowledge', { headers }),
                fetch('/api/admin/settings', { headers })
            ]);

            if (mRes.ok) setMembers(await mRes.json());
            if (pRes.ok) setProjects(await pRes.json());
            if (kRes.ok) setKnowledge(await kRes.json());
            if (sRes.ok) setSettings(await sRes.json());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = async (newSettings: any) => {
        try {
            const token = localStorage.getItem('google_id_token');
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newSettings)
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                alert('設定を保存しました');
            } else {
                alert('設定の保存に失敗しました');
            }
        } catch (error) {
            console.error('Settings update error:', error);
            alert('エラーが発生しました');
        }
    };

    const handleApproveUser = async (email: string) => {
        if (!confirm('このユーザーを承認しますか？')) return;

        try {
            const token = localStorage.getItem('google_id_token');
            const encodedEmail = encodeURIComponent(email);
            const res = await fetch(`/api/admin/users/${encodedEmail}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('承認しました');
                fetchData();
            } else {
                alert('エラーが発生しました');
            }
        } catch (error) {
            console.error('Failed to approve user:', error);
        }
    };

    const handleRejectUser = async (email: string) => {
        if (!confirm('このユーザーを拒否しますか？')) return;

        try {
            const token = localStorage.getItem('google_id_token');
            const encodedEmail = encodeURIComponent(email);
            const res = await fetch(`/api/admin/users/${encodedEmail}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('拒否しました');
                fetchData();
            } else {
                alert('エラーが発生しました');
            }
        } catch (error) {
            console.error('Failed to reject user:', error);
        }
    };

    const [syncingFile, setSyncingFile] = useState<string | null>(null);

    // ファイルアップロード
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsSyncing(true);
        setSyncingFile(file.name);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('google_id_token');
            const response = await fetch('/api/knowledge/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || ''}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setKnowledge([...knowledge, data.article]);
                alert('ファイルをアップロードし、ナレッジベースに追加しました！');
            } else {
                const errorData = await response.json();
                alert(`アップロード失敗: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('アップロード中にエラーが発生しました');
        } finally {
            setIsSyncing(false);
            setSyncingFile(null);
            // inputをリセットするためにkeyを変更するなどの工夫が必要だが、ここでは簡易的
            event.target.value = '';
        }
    };

    // Google Drive 同期
    const handleSyncDrive = async () => {
        if (!folderId) {
            alert('Google DriveのフォルダIDを入力してください');
            return;
        }
        setIsSyncing(true);
        try {
            const res = await fetch('/api/sync-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`${data.syncedCount}件のドキュメントを同期しました`);
                fetchData();
            } else {
                alert('同期に失敗しました: ' + data.error);
            }
        } catch (error) {
            alert('通信エラーが発生しました');
        } finally {
            setIsSyncing(false);
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

    const handleDelete = async (type: string, id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        try {
            const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleClearData = async () => {
        if (!confirm('⚠️ すべてのデータを削除しますか？\n\nこの操作は取り消せません。\n\n※エクスポートでバックアップを取ることをお勧めします。')) return;
        try {
            const res = await fetch('/api/admin/clear-data', { method: 'POST' });
            if (res.ok) {
                alert('✅ すべてのデータをクリアしました');
                fetchData();
            } else {
                alert('❌ データのクリアに失敗しました');
            }
        } catch (error) {
            console.error('Clear error:', error);
            alert('❌ エラーが発生しました');
        }
    };

    const handleExportData = async () => {
        try {
            const res = await fetch('/api/admin/export-data');
            if (res.ok) {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                a.download = `company-brain-backup-${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('✅ データをエクスポートしました');
            } else {
                alert('❌ エクスポートに失敗しました');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ エラーが発生しました');
        }
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm(`📁 "${file.name}" をインポートしますか？\n\n現在のデータは上書きされます。`)) {
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const res = await fetch('/api/admin/import-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const result = await res.json();
                alert('✅ ' + result.message);
                fetchData();
            } else {
                alert('❌ インポートに失敗しました');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('❌ ファイルの読み込みに失敗しました\n\n正しいJSONファイルか確認してください。');
        }

        event.target.value = '';
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
                    👤 ユーザー・メンバー管理
                </button>
                <button
                    className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
                    onClick={() => setActiveTab('knowledge')}
                >
                    📚 ナレッジ管理
                </button>
                <button
                    className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                >
                    🔧 データ管理
                </button>
                <button
                    className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    ⚙️ 設定
                </button>
            </div>

            <div className="admin-content glass">
                {activeTab === 'projects' && (
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
                )}

                {activeTab === 'members' && (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>ユーザー・メンバー一覧</h2>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Googleログインしたユーザーが自動的に追加されます。承認とプロフィールの設定を行ってください。</p>
                        </div>
                        <div className="admin-list">
                            {members.map(m => (
                                <div key={m.id} className="admin-list-item">
                                    <div className="item-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            {m.picture && <img src={m.picture} alt="" className="user-avatar-small" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                            <div>
                                                <strong>{m.name}</strong>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{m.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span className={`status-badge status-${m.status || 'pending'}`} style={{ fontSize: '0.7rem' }}>
                                                {m.status === 'approved' ? '承認済み' : m.status === 'pending' ? '承認待ち' : '拒否済み'}
                                            </span>
                                            {m.status === 'pending' && m.requestedAt && (
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                                    申請日: {new Date(m.requestedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.8rem' }}>{m.department || '部署未設定'} | {m.position || '役職未設定'}</span>
                                        </div>
                                    </div>
                                    <div className="item-actions">
                                        {m.status === 'pending' && (
                                            <>
                                                <button className="approve-btn" onClick={() => handleApproveUser(m.email)} style={{ background: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}>承認</button>
                                                <button className="reject-btn" onClick={() => handleRejectUser(m.email)} style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#f44336' }}>拒否</button>
                                            </>
                                        )}
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


                {activeTab === 'knowledge' && (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>ナレッジ管理</h2>
                        </div>

                        <div className="knowledge-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            {/* Google Drive 同期 */}
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🔄</span> Google Drive 同期
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="フォルダID"
                                        value={folderId}
                                        onChange={e => setFolderId(e.target.value)}
                                        style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                    <button
                                        className="save-btn"
                                        onClick={handleSyncDrive}
                                        disabled={isSyncing}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {isSyncing && !syncingFile ? '同期中...' : '同期'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.8rem' }}>
                                    指定したGoogle Driveフォルダ内のファイルを同期します。
                                </p>
                            </div>

                            {/* ファイルアップロード */}
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📤</span> ファイルアップロード
                                </h3>
                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '1rem',
                                    border: '2px dashed rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>
                                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</span>
                                    <span style={{ fontSize: '0.9rem' }}>クリックしてファイルを選択</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>PDF, Excel, Word, Text</span>
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        disabled={isSyncing}
                                    />
                                </label>
                            </div>
                        </div>

                        {isSyncing && (
                            <div className="glass" style={{ padding: '1rem', marginBottom: '2rem', textAlign: 'center', color: '#4fd1c5', background: 'rgba(79, 209, 197, 0.1)' }}>
                                {syncingFile ? `ファイルを解析中: ${syncingFile}...` : 'Google Driveと同期中...'}
                            </div>
                        )}

                        <div className="section-header">
                            <h3>登録済みナレッジ ({knowledge.length}件)</h3>
                        </div>
                        <div className="admin-list">
                            {knowledge.map(k => (
                                <div key={k.id} className="admin-list-item">
                                    <div className="item-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong>{k.title}</strong>
                                            <span className="status-badge" style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 6px',
                                                background: k.sourceType === 'google_drive' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: k.sourceType === 'google_drive' ? '#4285f4' : '#10b981',
                                                border: 'none'
                                            }}>
                                                {k.sourceType === 'google_drive' ? 'Drive' : 'Upload'}
                                            </span>
                                            {k.category && (
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6, border: '1px solid rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '4px' }}>
                                                    {k.category}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>
                                            {k.summary ? k.summary.substring(0, 100) + (k.summary.length > 100 ? '...' : '') : 'No summary'}
                                        </span>
                                    </div>
                                    <div className="item-actions">
                                        <span style={{ fontSize: '0.8rem', marginRight: '1rem', opacity: 0.7 }}>
                                            {new Date(k.updatedAt).toLocaleDateString()}
                                        </span>
                                        <button className="delete" onClick={() => handleDelete('knowledge', k.id)}>削除</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                )}

                {activeTab === 'data' && (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>🔧 データ管理</h2>
                        </div>

                        <div className="data-management-grid" style={{ display: 'grid', gap: '1.5rem', marginTop: '2rem' }}>
                            {/* エクスポート */}
                            <div className="glass" style={{ padding: '2rem', borderRadius: '16px' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📦</span> データエクスポート
                                </h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                                    現在のすべてのデータをJSONファイルとしてダウンロードします。
                                    <br />
                                    バックアップや他の環境への移行に使用できます。
                                </p>
                                <button
                                    className="save-btn"
                                    onClick={handleExportData}
                                    style={{ width: '100%' }}
                                >
                                    📥 データをエクスポート
                                </button>
                            </div>

                            {/* インポート */}
                            <div className="glass" style={{ padding: '2rem', borderRadius: '16px' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📂</span> データインポート
                                </h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                                    以前エクスポートしたJSONファイルからデータを復元します。
                                    <br />
                                    ⚠️ 現在のデータは上書きされます。
                                </p>
                                <label
                                    className="save-btn"
                                    style={{ display: 'block', width: '100%', textAlign: 'center', cursor: 'pointer' }}
                                >
                                    📤 ファイルを選択してインポート
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportData}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>

                            {/* データクリア */}
                            <div className="glass" style={{ padding: '2rem', borderRadius: '16px', border: '2px solid rgba(255, 100, 100, 0.3)' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff6b6b' }}>
                                    <span>⚠️</span> データクリア
                                </h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                                    すべてのプロジェクトとメンバー情報を削除します。
                                    <br />
                                    <strong style={{ color: '#ff6b6b' }}>⚠️ この操作は取り消せません！</strong>
                                    <br />
                                    実行前に必ずエクスポートしてバックアップを取ることをお勧めします。
                                </p>
                                <button
                                    className="delete"
                                    onClick={handleClearData}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #ff6b6b, #c92a2a)', padding: '1rem' }}
                                >
                                    🗑️ すべてのデータをクリア
                                </button>
                            </div>

                            {/* 現在のデータ状況 */}
                            <div className="glass" style={{ padding: '2rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.1), rgba(49, 130, 206, 0.1))' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📊</span> 現在のデータ
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4facfe' }}>{projects.length}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>プロジェクト</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#43e97b' }}>{members.length}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>メンバー</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f093fb' }}>{knowledge.length}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>ナレッジ</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="management-section">
                        <div className="section-header">
                            <h2>⚙️ システム設定</h2>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>システム全体の動作設定を管理します。</p>
                        </div>

                        <div className="settings-grid" style={{ marginTop: '2rem' }}>
                            <div className="glass" style={{ padding: '2rem', borderRadius: '16px' }}>
                                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>認証・アクセス制御</h3>

                                <div className="setting-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1, marginRight: '2rem' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>新規ユーザーの自動承認</div>
                                        <div style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: '1.6' }}>
                                            有効にすると、Googleアカウントでログインした新規ユーザーを「承認待ち」にせず、即座にアクセス許可（Member権限）を与えます。<br />
                                            <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: 'rgba(251, 191, 36, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                                ⚠️ セキュリティ警告: 誰でも組織に参加できるようになります。一時的な利用を推奨します。
                                            </span>
                                        </div>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoApprove}
                                            onChange={(e) => handleUpdateSettings({ ...settings, autoApprove: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPanel;
