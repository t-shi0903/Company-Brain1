/**
 * Company Brain - サービスエクスポート
 */

export * from './gemini';
export * from './storage';
export * from './google-drive';
export * from './knowledge-manager';
export * from './vector-store';
export * from './audit';

import { GeminiService } from './gemini';
import { GoogleDriveService } from './google-drive';
import { KnowledgeManager } from './knowledge-manager';
import { AuditService } from './audit';
import { DocumentParserService, createDocumentParser } from './document-parser';

export const getGeminiService = () => new GeminiService();
export const getGoogleDriveService = () => new GoogleDriveService();
export const getKnowledgeManager = () => new KnowledgeManager();
export const getAuditService = () => AuditService.getInstance();
export const getDocumentParserService = () => createDocumentParser();
