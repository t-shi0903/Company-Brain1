import { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './components/Login';
import { PendingApproval } from './components/PendingApproval';
import { CredentialResponse, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { APP_CONFIG } from './config';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

interface User {
    email: string;
    name: string;
    picture?: string;
    role?: 'admin' | 'member' | 'guest';
}

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<'dashboard' | 'chat' | 'admin'>('dashboard');
    const [isPending, setIsPending] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    useEffect(() => {
        const token = localStorage.getItem('google_id_token');
        if (token) {
            try {
                const decoded = jwtDecode<User>(token);
                // ページロード時も同期完了を待つために一度チェック
                handleInitialCheck(token, decoded);
            } catch (e) {
                localStorage.removeItem('google_id_token');
            }
        }
    }, []);

    const handleInitialCheck = async (token: string, decodedUser: User) => {
        setIsSyncing(true);
        try {
            const member = await checkUserStatus(token);
            if (member) {
                setUser({
                    email: member.email,
                    name: member.name,
                    picture: member.picture || '',
                    role: member.role
                });
            } else {
                setUser(decodedUser);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const checkUserStatus = async (token: string): Promise<any> => {
        try {
            // 1. メンバー同期 (User -> Member)
            const syncResponse = await fetch(`${APP_CONFIG.API_BASE_URL}/api/auth/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let memberData = null;
            if (syncResponse.ok) {
                const data = await syncResponse.json();
                memberData = data.member;
                console.log('Member sync successful');
            }

            // 2. ステータス確認 (既存ロジック)
            const response = await fetch(`${APP_CONFIG.API_BASE_URL}/api/projects`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 403) {
                const data = await response.json();
                if (data.status === 'pending') {
                    setIsPending(true);
                }
            }
            return memberData;
        } catch (error) {
            console.error('Status check failed:', error);
            return null;
        }
    };

    const handleLoginSuccess = async (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            setIsSyncing(true);
            try {
                localStorage.setItem('google_id_token', credentialResponse.credential);
                const decoded = jwtDecode<User>(credentialResponse.credential);

                // ステータス同期を待ってからユーザーをセット
                const member = await checkUserStatus(credentialResponse.credential);
                if (member) {
                    setUser({
                        email: member.email,
                        name: member.name,
                        picture: member.picture || '',
                        role: member.role
                    });
                } else {
                    setUser(decoded);
                }
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('google_id_token');
        setUser(null);
        setIsPending(false);
    };

    // 同期中はローディング表示
    if (isSyncing) {
        return (
            <div className="loading-screen" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner"></div>
                <p style={{ marginLeft: '1rem' }}>アカウント情報を同期中...</p>
            </div>
        );
    }

    // ログインしていない場合
    if (!user) {
        return (
            <GoogleOAuthProvider clientId={APP_CONFIG.GOOGLE_CLIENT_ID}>
                <ErrorBoundary>
                    <ThemeProvider>
                        <Login
                            onLoginSuccess={handleLoginSuccess}
                            onLoginError={() => console.log('Login Failed')}
                        />
                    </ThemeProvider>
                </ErrorBoundary>
            </GoogleOAuthProvider>
        );
    }

    // 承認待ちの場合
    if (isPending) {
        return (
            <ErrorBoundary>
                <ThemeProvider>
                    <PendingApproval />
                </ThemeProvider>
            </ErrorBoundary>
        );
    }

    // 承認済みの場合
    return (
        <GoogleOAuthProvider clientId={APP_CONFIG.GOOGLE_CLIENT_ID}>
            <ErrorBoundary>
                <ThemeProvider>
                    <MainLayout
                        currentView={view}
                        onNavigate={setView}
                        user={user}
                        onLogin={() => { }}
                        onLogout={handleLogout}
                        onUserUpdate={setUser}
                    >
                        {view === 'chat' ? (
                            <div className="view-transition">
                                <ChatInterface user={user} />
                            </div>
                        ) : view === 'admin' ? (
                            <div className="view-transition">
                                <AdminPanel />
                            </div>
                        ) : (
                            <div className="view-transition">
                                <Dashboard onNavigate={setView} user={user} />
                            </div>
                        )}
                    </MainLayout>
                </ThemeProvider>
            </ErrorBoundary>
        </GoogleOAuthProvider>
    );
}

export default App;
