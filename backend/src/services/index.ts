/**
 * Company Brain - サービスエクスポート
 */

export * from './gemini';
export * from './ai';
export * from './storage';
export * from './google-drive';
export * from './knowledge-manager';
export * from './vector-store';

import { GeminiService } from './gemini';
import { GoogleDriveService } from './google-drive';
import { KnowledgeManager } from './knowledge-manager';

export const getGeminiService = () => new GeminiService();
export const getGoogleDriveService = () => new GoogleDriveService();
export const getKnowledgeManager = () => new KnowledgeManager();
