import { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';
import { SAMPLE_QUESTIONS } from '../config'; // Assuming config.ts exists and exports SAMPLE_QUESTIONS

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: { title: string; url?: string }[];
    suggestedQuestions?: string[];
}

interface ChatInterfaceProps {
    user?: {
        name: string;
        picture?: string;
    } | null;
}

function ChatInterface({ user }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: 'こんにちは！Company Brainです。🧠\n\n社内のあらゆる情報についてお答えします。プロジェクトの進捗、社員情報、社内規定など、何でもお気軽にお尋ねください。',
            timestamp: new Date(),
            suggestedQuestions: SAMPLE_QUESTIONS.slice(0, 3),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const question = text || inputValue.trim();
        if (!question || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('google_id_token');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // トークン期限切れなどの場合
                    localStorage.removeItem('google_id_token');
                    alert('セッションの有効期限が切れました。再度ログインしてください。');
                    window.location.href = '/'; // トップに戻る（リロードはしないが、Appの状態リセットのため遷移はする）
                    return;
                }

                const errorData = await response.json().catch(() => ({}));
                // 詳細情報があればそれを含める
                let errorMessage = errorData.error || 'API error';

                // エラーの詳細情報があれば追加
                if (errorData.content) {
                    errorMessage = errorData.content;
                } else if (errorData.details) {
                    errorMessage += `\n\n${errorData.details}`;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content || data.answer || 'すみません、回答を生成できませんでした。',
                timestamp: new Date(),
                sources: data.sources || [],
                suggestedQuestions: data.relatedQuestions || data.suggestedQuestions || [],
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            // デバッグのため、生のエラーメッセージを表示
            console.error('Frontend Error:', error);
            const errorContent = `エラーが発生しました。\n\n${error.message}`;

            const fallbackMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, fallbackMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-container glass">
            {/* メッセージエリア */}
            <div className="messages-area">
                {messages.map((message, index) => (
                    <div
                        key={message.id}
                        className={`message ${message.role} animate-fadeIn`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="message-avatar">
                            {message.role === 'assistant' ? (
                                <div className="avatar-ai">🧠</div>
                            ) : (
                                <div
                                    className="avatar-user"
                                    style={{
                                        backgroundImage: user?.picture ? `url(${user.picture})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {!user?.picture && '👤'}
                                </div>
                            )}
                        </div>
                        <div className="message-content">
                            <div className="message-text">
                                {(message.content || '').split('\n').map((line, i) => (
                                    <p key={i}>{line || <br />}</p>
                                ))}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                                <div className="message-sources">
                                    <span className="sources-label">📚 参照:</span>
                                    {message.sources.map((source, i) => (
                                        source.url ? (
                                            <a
                                                key={i}
                                                href={source.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="source-tag source-link"
                                                title="Google Driveで開く"
                                            >
                                                {source.title} 🔗
                                            </a>
                                        ) : (
                                            <span key={i} className="source-tag">{source.title}</span>
                                        )
                                    ))}
                                </div>
                            )}

                            {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                                <div className="suggested-questions">
                                    <span className="suggestions-label">💡 関連質問:</span>
                                    <div className="suggestions-list">
                                        {message.suggestedQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                className="suggestion-btn"
                                                onClick={() => handleSend(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <span className="message-time">
                                {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message assistant animate-fadeIn">
                        <div className="message-avatar">
                            <div className="avatar-ai">🧠</div>
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="input-area">
                <div className="input-wrapper">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="質問を入力してください..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <p className="input-hint">Enter で送信 • Shift + Enter で改行</p>
            </div>
        </div>
    );
}

export default ChatInterface;
