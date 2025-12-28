import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { APP_CONFIG } from './config'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <GoogleOAuthProvider clientId={APP_CONFIG.GOOGLE_CLIENT_ID}>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </GoogleOAuthProvider>
    </StrictMode>,
)
