import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import './Login.css';

interface LoginProps {
    onLoginSuccess: (credentialResponse: CredentialResponse) => void;
    onLoginError: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoginError }) => {
    return (
        <div className="login-container">
            <div className="login-box">
                <h1>Company Brain</h1>
                <p>社内情報へのアクセスにはログインが必要です</p>
                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={onLoginSuccess}
                        onError={onLoginError}
                        auto_select
                        useOneTap
                    />
                </div>
            </div>
        </div>
    );
};
