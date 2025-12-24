import { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import { Login } from './components/Login';
import { CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function App() {
    const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('google_id_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserProfile(decoded);
                setIsAuthenticated(true);
            } catch (e) {
                console.error('Invalid token', e);
                localStorage.removeItem('google_id_token');
            }
        }
    }, []);

    const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            const token = credentialResponse.credential;
            localStorage.setItem('google_id_token', token);
            const decoded = jwtDecode(token);
            setUserProfile(decoded);
            setIsAuthenticated(true);
        }
    };

    const handleLoginError = () => {
        console.error('Login Failed');
        alert('ログインに失敗しました。');
    };

    const handleLogout = () => {
        localStorage.removeItem('google_id_token');
        setIsAuthenticated(false);
        setUserProfile(null);
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} onLoginError={handleLoginError} />;
    }

    return (
        <div className="app-container">
            {/* 背景エフェクト */}
            <div className="bg-effects">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
            </div>

            <header className="header glass">
                <div className="header-content">
                    <div className="logo">
                        <img src="/brain.svg" alt="Company Brain" className="logo-icon animate-float" />
                        <div className="logo-text">
                            <h1>Company Brain</h1>
                            <span>AI社内知能エージェント</span>
                        </div>
                    </div>

                    <nav className="nav">
                        <button
                            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            AIチャット
                        </button>
                        <button
                            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            ダッシュボード
                        </button>
                        <button
                            className="nav-btn admin-btn"
                            onClick={() => window.open('/admin', '_blank')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            管理
                        </button>
                    </nav>

                    <div className="user-profile" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {userProfile?.picture && <img src={userProfile.picture} alt="user" className="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                        <button className="logout-btn" onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                {activeTab === 'chat' ? (
                    <div className="view-transition">
                        <ChatInterface />
                    </div>
                ) : (
                    <div className="view-transition">
                        <Dashboard />
                    </div>
                )}
            </main>

            <footer className="footer">
                <p>&copy; 2024 Company Brain - Powered by Gemini 1.5 Pro</p>
            </footer>
        </div>
    );
}

export default App;
