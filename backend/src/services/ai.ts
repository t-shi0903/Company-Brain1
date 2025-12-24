import { GeminiService } from './gemini';
import { createDocumentParser } from './document-parser';

const gemini = new GeminiService();
const parser = createDocumentParser(gemini);

export const analyzeProject = async (projectData: any) => {
    return gemini.extractFromDocument(JSON.stringify(projectData), 'json');
};

export const detectRisk = async (context: any) => {
    return gemini.detectRisks(context.members || [], context.projects || []);
};

export const parseDocument = async (content: string, type: string) => {
    return gemini.extractFromDocument(content, type);
};
