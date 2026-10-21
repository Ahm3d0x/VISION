import { ConversationTurn, ActionRecord, RecentSessionRecord } from '../../shared/types';
import { memoryManager } from './MemoryManager';

const STORAGE_KEY = 'vision_recent_sessions';
const ACTIVE_ID_KEY = 'vision_active_session_id';
const MAX_SESSIONS = 50;

type SessionChangeListener = () => void;

class SessionManager {
  private sessions: RecentSessionRecord[] = [];
  private activeSessionId: string = '';
  private listeners: Set<SessionChangeListener> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.sessions = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SessionManager] Failed to parse sessions from localStorage:', e);
      this.sessions = [];
    }

    const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
    if (savedActiveId && this.sessions.some((s) => s.id === savedActiveId)) {
      this.activeSessionId = savedActiveId;
    } else if (this.sessions.length > 0) {
      this.activeSessionId = this.sessions[0].id;
    } else {
      this.initDefaultSession();
    }
  }

  private initDefaultSession(): RecentSessionRecord {
    const now = new Date().toISOString();
    const newSession: RecentSessionRecord = {
      id: `session_${Date.now()}`,
      title: 'Active Session',
      startedAt: now,
      lastActiveAt: now,
      durationSeconds: 0,
      turns: [],
      actions: [],
      status: 'active',
      tags: ['chat', 'interactive'],
      metrics: {
        turnsCount: 0,
        actionsCount: 0,
        toolsCount: 0,
      },
    };

    this.sessions.unshift(newSession);
    this.activeSessionId = newSession.id;
    this.saveToStorage();
    return newSession;
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.sessions.length > MAX_SESSIONS) {
        this.sessions = this.sessions.slice(0, MAX_SESSIONS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
      if (this.activeSessionId) {
        localStorage.setItem(ACTIVE_ID_KEY, this.activeSessionId);
      }
    } catch (e) {
      console.warn('[SessionManager] Failed to persist sessions:', e);
    }
  }

  public getActiveSession(): RecentSessionRecord {
    let session = this.sessions.find((s) => s.id === this.activeSessionId);
    if (!session) {
      session = this.initDefaultSession();
    }
    return session;
  }

  public getAllSessions(): RecentSessionRecord[] {
    return [...this.sessions];
  }

  public getSession(id: string): RecentSessionRecord | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  public recordTurn(turn: ConversationTurn): void {
    const session = this.getActiveSession();

    // Auto-generate a readable title from the first prompt
    if (session.turns.length === 0 && session.title === 'Active Session') {
      const cleanPrompt = turn.userPrompt.replace(/[\r\n]+/g, ' ').trim();
      session.title = cleanPrompt.length > 45 ? `${cleanPrompt.slice(0, 42)}...` : cleanPrompt || 'General Session';
    }

    session.turns.push(turn);
    session.lastActiveAt = new Date().toISOString();

    const startedTime = new Date(session.startedAt).getTime();
    const currentTime = new Date(session.lastActiveAt).getTime();
    session.durationSeconds = Math.max(1, Math.round((currentTime - startedTime) / 1000));

    session.metrics.turnsCount = session.turns.length;
    if (turn.toolsUsed && turn.toolsUsed.length > 0) {
      session.metrics.toolsCount = (session.metrics.toolsCount || 0) + turn.toolsUsed.length;
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  public recordAction(action: ActionRecord): void {
    const session = this.getActiveSession();
    const existingIndex = session.actions.findIndex((a) => a.id === action.id);

    if (existingIndex >= 0) {
      session.actions[existingIndex] = { ...action };
    } else {
      session.actions.unshift({ ...action });
    }

    session.lastActiveAt = new Date().toISOString();
    session.metrics.actionsCount = session.actions.length;

    this.saveToStorage();
    this.notifyListeners();
  }

  public createNewSession(customTitle?: string): RecentSessionRecord {
    // 1. Mark previous active session as archived if it had interactions
    const current = this.sessions.find((s) => s.id === this.activeSessionId);
    if (current && (current.turns.length > 0 || current.actions.length > 0)) {
      current.status = 'archived';
    }

    // 2. Clear memoryManager current session turns
    memoryManager.clearSession();

    // 3. Create fresh new session
    const now = new Date().toISOString();
    const newSession: RecentSessionRecord = {
      id: `session_${Date.now()}`,
      title: customTitle || 'Active Session',
      startedAt: now,
      lastActiveAt: now,
      durationSeconds: 0,
      turns: [],
      actions: [],
      status: 'active',
      tags: ['chat', 'interactive'],
      metrics: {
        turnsCount: 0,
        actionsCount: 0,
        toolsCount: 0,
      },
    };

    this.sessions.unshift(newSession);
    this.activeSessionId = newSession.id;
    this.saveToStorage();
    this.notifyListeners();

    return newSession;
  }

  public restoreSession(sessionId: string): RecentSessionRecord | null {
    const target = this.sessions.find((s) => s.id === sessionId);
    if (!target) return null;

    // Switch active ID
    this.activeSessionId = target.id;
    target.status = 'active';

    // Synchronize MemoryManager with restored session turns
    memoryManager.setSessionTurns(target.turns);

    this.saveToStorage();
    this.notifyListeners();
    return target;
  }

  public deleteSession(sessionId: string): boolean {
    const index = this.sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return false;

    this.sessions.splice(index, 1);

    if (this.activeSessionId === sessionId) {
      if (this.sessions.length > 0) {
        this.activeSessionId = this.sessions[0].id;
        memoryManager.setSessionTurns(this.sessions[0].turns);
      } else {
        this.initDefaultSession();
        memoryManager.clearSession();
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public updateTitle(sessionId: string, newTitle: string): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session || !newTitle.trim()) return;

    session.title = newTitle.trim();
    this.saveToStorage();
    this.notifyListeners();
  }

  public exportSessionMarkdown(sessionId: string): string {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return '';

    const lines: string[] = [];
    lines.push(`# VISION Session Transcript: ${session.title}`);
    lines.push(`- **Session ID:** \`${session.id}\``);
    lines.push(`- **Started At:** ${new Date(session.startedAt).toLocaleString()}`);
    lines.push(`- **Last Active:** ${new Date(session.lastActiveAt).toLocaleString()}`);
    lines.push(`- **Duration:** ${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s`);
    lines.push(`- **Status:** ${session.status.toUpperCase()}`);
    lines.push(`- **Total Turns:** ${session.turns.length}`);
    lines.push(`- **Total Actions:** ${session.actions.length}`);
    lines.push('');
    lines.push('---');
    lines.push('## Conversation History');
    lines.push('');

    if (session.turns.length === 0) {
      lines.push('*No conversation turns recorded in this session.*');
    } else {
      session.turns.forEach((turn, idx) => {
        lines.push(`### Turn ${idx + 1} [${turn.timestamp}]`);
        lines.push(`**User:** ${turn.userPrompt}`);
        lines.push('');
        lines.push(`**VISION:** ${turn.agentResponse}`);
        if (turn.toolsUsed && turn.toolsUsed.length > 0) {
          lines.push(`*Tools Used:* \`${turn.toolsUsed.join('`, `')}\``);
        }
        lines.push('');
      });
    }

    if (session.actions.length > 0) {
      lines.push('---');
      lines.push('## Executed Actions');
      lines.push('');
      session.actions.forEach((act, idx) => {
        lines.push(`### Action ${idx + 1}: ${act.commandText}`);
        lines.push(`- **Status:** ${act.status}`);
        lines.push(`- **Started:** ${act.startedAt} | **Completed:** ${act.completedAt || 'In Progress'}`);
        if (act.outputSummary) {
          lines.push(`- **Summary:** ${act.outputSummary}`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  public exportSessionJSON(sessionId: string): string {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return '{}';
    return JSON.stringify(session, null, 2);
  }

  public subscribe(listener: SessionChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('[SessionManager] Listener error:', e);
      }
    }
  }
}

export const sessionManager = new SessionManager();
