import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserProfile, Member } from '../types';
import { StorageService } from '../services/storage';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '163266853240-cinakd0lkviu6u91r4b7qk6s4pfgo38u.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

export interface AuthenticatedRequest extends Request {
    user?: UserProfile;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 認証バイパス（SKIP_AUTHが設定されている場合）
    if (process.env.SKIP_AUTH === 'true') {
        console.log('[Auth] SKIP_AUTH is enabled - bypassing authentication');
        (req as AuthenticatedRequest).user = {
            id: 'dev-user',
            email: 'dev@example.com',
            name: 'Developer',
            picture: '',
            department: 'admin'
        };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[Auth] No token provided or invalid format');
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    // console.log('[Auth] Attempting to verify token...');

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (payload) {
            const email = payload.email || '';
            const name = payload.name || 'Unknown';
            const picture = payload.picture || '';

            // 既存メンバーを検索
            let member = await StorageService.findMemberByEmail(email);
            let userProfile: UserProfile;

            if (member) {
                // 既存メンバー: 情報の同期
                let needsUpdate = false;

                // 初回ログイン時や、名前・画像が未設定の場合のみGoogleの情報を同期
                if (!member.name && name) {
                    member.name = name;
                    needsUpdate = true;
                }
                if (!member.picture && picture) {
                    member.picture = picture;
                    needsUpdate = true;
                }

                // ロール/ステータスが未設定の場合の補完（移行用）
                if (!member.role) { member.role = 'member'; needsUpdate = true; }
                if (!member.status) { member.status = 'approved'; needsUpdate = true; }

                if (needsUpdate) {
                    member.updatedAt = new Date();
                    const allMembers = await StorageService.loadMembers();
                    const index = allMembers.findIndex(m => m.id === member!.id);
                    if (index >= 0) {
                        allMembers[index] = member;
                        await StorageService.saveMembers(allMembers);
                        console.log(`[Auth] Synced member data: ${email}`);
                    }
                }

                // アクセスチェック
                if (member.status === 'rejected') {
                    console.warn(`[Auth] Rejected member attempted to login: ${email}`);
                    return res.status(403).json({ error: 'Access denied' });
                }

                if (member.status === 'pending') {
                    console.log(`[Auth] Pending member attempted to login: ${email}`);
                    return res.status(403).json({ error: 'Account pending approval', status: 'pending' });
                }

                userProfile = {
                    id: member.id,
                    email: member.email,
                    name: member.name,
                    picture: member.picture || '',
                    department: member.department as any || 'general', // 型キャスト
                    role: member.role as any || 'member'
                };

            } else {
                // 新規メンバー: 自動作成
                console.log(`[Auth] Creating new member for: ${email}`);

                // 部署の推定
                let department = 'general';
                if (email.includes('sales')) department = 'sales';
                else if (email.includes('engineer') || email.includes('dev')) department = 'engineering';
                else if (email.includes('design')) department = 'design';

                const isInitialAdmin = email === process.env.INITIAL_ADMIN_EMAIL || email === 'miku.0505.itsuki@gmail.com';

                // システム設定を確認
                const settings = await StorageService.loadSettings();
                const autoApprove = settings.autoApprove || false;

                const status = isInitialAdmin || autoApprove ? 'approved' : 'pending';
                const role = isInitialAdmin ? 'admin' : (autoApprove ? 'guest' : 'member');

                const newMember: Member = {
                    id: payload.sub, // Google IDをそのまま使用 (または uuid)
                    name: name,
                    email: email,
                    department: department,
                    position: 'Member',
                    role: role,
                    status: status,
                    picture: picture,
                    skills: [],
                    currentProjects: [],
                    workloadStatus: 'available',
                    availability: [],
                    pastProjects: [],
                    requestedAt: new Date(),
                    approvedAt: isInitialAdmin ? new Date() : undefined,
                    approvedBy: isInitialAdmin ? 'system' : undefined,
                    joinedAt: new Date(),
                    updatedAt: new Date()
                };

                const allMembers = await StorageService.loadMembers();
                allMembers.push(newMember);
                await StorageService.saveMembers(allMembers);

                if (newMember.status === 'pending') {
                    console.log(`[Auth] New member created, pending approval: ${email}`);
                    return res.status(403).json({ error: 'Account pending approval', status: 'pending' });
                }

                userProfile = {
                    id: newMember.id,
                    email: newMember.email,
                    name: newMember.name,
                    picture: newMember.picture || '',
                    department: newMember.department as any,
                    role: newMember.role as any
                };
            }

            (req as AuthenticatedRequest).user = userProfile;
            console.log(`[Auth] Successfully authenticated: ${email} (${userProfile.department})`);
            next();
        } else {
            console.error('[Auth] Invalid token payload - payload is null');
            res.status(401).json({ error: 'Invalid token payload' });
        }
    } catch (error: any) {
        console.error('[Auth] Token verification failed:', {
            message: error.message,
            name: error.name,
            // スタックトレースは開発時のみ
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
        res.status(401).json({
            error: 'Authentication failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Invalid or expired token'
        });
    }
};
