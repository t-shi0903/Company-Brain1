import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserProfile } from '../types';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '163266853240-cinakd0lkviu6u91r4b7qk6s4pfgo38u.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

export interface AuthenticatedRequest extends Request {
    user?: UserProfile;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 開発環境用のバイパス (必要に応じて)
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        (req as AuthenticatedRequest).user = {
            id: 'dev-user',
            email: 'dev@example.com',
            name: 'Developer',
            picture: ''
        };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (payload) {
            (req as AuthenticatedRequest).user = {
                id: payload.sub,
                email: payload.email || '',
                name: payload.name || 'Unknown',
                picture: payload.picture || ''
            };
            next();
        } else {
            res.status(401).json({ error: 'Invalid token payload' });
        }
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};
