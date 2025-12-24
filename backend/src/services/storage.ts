import fs from 'fs/promises';
import path from 'path';
import { Member } from '../types/member';
import { Project } from '../types/project';

const DATA_DIR = path.join(__dirname, '../../data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

export class StorageService {
    private static async ensureDataDir() {
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
        }
    }

    static async loadMembers(): Promise<Member[]> {
        await this.ensureDataDir();
        try {
            const data = await fs.readFile(MEMBERS_FILE, 'utf-8');
            const members = JSON.parse(data);
            // Date型への変換が必要な場合はここで行う
            return members.map((m: any) => ({
                ...m,
                joinedAt: new Date(m.joinedAt),
                updatedAt: new Date(m.updatedAt)
            }));
        } catch {
            return [];
        }
    }

    static async saveMembers(members: Member[]): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(MEMBERS_FILE, JSON.stringify(members, null, 2));
    }

    static async loadProjects(): Promise<Project[]> {
        await this.ensureDataDir();
        try {
            const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
            const projects = JSON.parse(data);
            return projects.map((p: any) => ({
                ...p,
                startDate: new Date(p.startDate),
                deadline: new Date(p.deadline),
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt),
                tasks: p.tasks.map((t: any) => ({
                    ...t,
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                    createdAt: new Date(t.createdAt),
                    completedAt: t.completedAt ? new Date(t.completedAt) : undefined
                }))
            }));
        } catch {
            return [];
        }
    }

    static async saveProjects(projects: Project[]): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    }
}
