import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import './App.css';

type View = 'chat' | 'dashboard' | 'admin';

function App() {
    const [activeView, setActiveView] = useState<View>('chat');

    const renderView = () => {
        switch (activeView) {
            case 'chat': return <ChatInterface />;
            case 'dashboard': return <Dashboard />;
            case 'admin': return <AdminPanel />;
            default: return <ChatInterface />;
        }
    };

    return (
        <div className="app">
            {/* 背景エフェクト */}
            <div className="bg-effects">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
            </div>

            {/* ヘッダー */}
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
                            className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveView('chat')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            AIチャット
                        </button>
                        <button
                            className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveView('dashboard')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            ダッシュボード
                        </button>
                        <button
                            className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
                            onClick={() => setActiveView('admin')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            管理
                        </button>
                    </nav>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="main">
                {renderView()}
            </main>

            {/* フッター */}
            <footer className="footer">
                <p>© 2024 Company Brain - Powered by Google Gemini AI</p>
            </footer>
        </div>
    );
}

export default App;
