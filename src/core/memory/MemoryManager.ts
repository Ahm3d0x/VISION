import { MemoryCategory, MemoryItem, ConversationTurn, MemorySource } from '../../shared/types';
import { VISION_CONFIG } from '../../shared/config';
import { llmProviderManager } from '../providers/llm';
import { LLMMessage } from '../providers/llm/types';

// =========================================================================
// DEFAULT SEED MEMORIES (Foundational OS & User Knowledge)
// =========================================================================

const INITIAL_SEED_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-user-profile',
    category: 'user_preference',
    title: 'User Profile & Identity (Ahmed Mohamed Attia)',
    content: 'User is Ahmed Mohamed Attia (Sir / يا أحمد). Personal Phone: +20 11 40409832 (01140409832). WhatsApp: Active on this number (self chat @A7m3d.Attia). When Ahmed asks to send to his own number ("على رقمي", "على الرقم بتاعي", "ابعتها لي", "أنا"), use his verified personal number (+20 11 40409832). Languages: Fluent Egyptian Arabic and English. Address him respectfully as Ahmed or يا أحمد.',
    tags: ['user', 'ahmed', 'identity', 'phone', '01140409832', 'whatsapp', 'رقمي', 'الرقم بتاعي', 'أنا', 'egyptian-arabic', 'bilingual'],
    confidence: 1.0,
    importance: 5,
    source: 'system',
    accessCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-10T23:30:00.000Z',
  },
  {
    id: 'mem-vision-constitution',
    category: 'project',
    title: 'VISION OS Architecture & Constitution',
    content: 'VISION is an AI-Native Personal Operating System. Core loop: Understand -> Plan -> Permission -> Act -> Observe -> Verify -> Respond. Actions happen through real desktop tools, CMD, PowerShell, browser, and computer vision. Not just a chatbot.',
    tags: ['vision', 'architecture', 'os', 'tools', 'core-loop'],
    confidence: 1.0,
    importance: 5,
    source: 'system',
    accessCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'mem-hardware-specs',
    category: 'system_knowledge',
    title: 'Local Hardware & AI Inference Environment',
    content: 'Primary GPU: NVIDIA GeForce RTX 3060 12GB VRAM. Local ASR service: Qwen3-ASR 1.7B running on port 8765. Local TTS service: VoiceTut-TTS on port 8766. Local LLM: Ollama (qwen3:8b) on port 11434. 100% private, local-first execution.',
    tags: ['hardware', 'gpu', 'rtx3060', 'vram', 'ollama', 'qwen3', 'ports'],
    confidence: 1.0,
    importance: 4,
    source: 'system',
    accessCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'mem-tool-permissions',
    category: 'system_knowledge',
    title: 'Security & Permission Levels Protocol',
    content: 'Level 0: Read-only / auto (telemetry, weather, memory search). Level 1: Low-risk auto (open browser, launch app, screenshot, screen analyze, save memory). Level 2: Moderate confirmation (close apps, kill process, execute shell commands). Level 3: Protected/High-risk confirmation (delete memory, destructive commands). AI intent never equals authorization.',
    tags: ['security', 'permissions', 'levels', 'safety'],
    confidence: 1.0,
    importance: 4,
    source: 'system',
    accessCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'mem-development-workflow',
    category: 'workflow',
    title: 'Desktop Hot-Reload & Build Workflow',
    content: 'Development command: npm run dev (runs Vite + Electron concurrently). Verification: npx tsc --noEmit and npx vite build before staging. Global hotkeys: Ctrl+Alt+Space (Wake & Listen), Ctrl+Alt+S (Emergency Stop), Ctrl+Alt+Q (Shutdown).',
    tags: ['workflow', 'dev', 'npm', 'build', 'hotkeys'],
    confidence: 1.0,
    importance: 3,
    source: 'system',
    accessCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
];

type MemoryChangeListener = () => void;

// Comprehensive Stopwords (Arabic & English) for High-Precision Entity Retrieval
const RETRIEVAL_STOPWORDS = new Set([
  // English
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 
  'with', 'from', 'about', 'how', 'what', 'where', 'when', 'who', 'why', 'can', 'you', 'please',
  'show', 'open', 'run', 'start', 'get', 'check', 'do', 'it', 'me', 'my', 'this', 'that', 'there',
  // Arabic
  'من', 'في', 'على', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'التى', 'ان', 'أن', 'هو', 'هي', 
  'لو', 'إذا', 'اذا', 'كل', 'كان', 'كانت', 'ما', 'ماذا', 'فين', 'إيه', 'ايه', 'ازاي', 'ازاى',
  'عايز', 'اريد', 'افتح', 'شغل', 'وريني', 'شوف', 'اعمل', 'يا', 'بتاع', 'بتاعة', 'حاجة', 'عندي',
  'لي', 'لنا', 'له', 'لها', 'هم', 'هن', 'تلك', 'أين', 'كيف', 'متى'
]);

// =========================================================================
// MemoryManager CLASS — Layered, Ranked, Anti-Contradiction Architecture
// =========================================================================

export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private sessionTurns: ConversationTurn[] = [];
  private rollingSummary: string = '';
  private initialized: boolean = false;
  private isSummarizing: boolean = false;
  private listeners: Set<MemoryChangeListener> = new Set();

  constructor() {
    this.init();
  }

  /**
   * Initialize memory from persistent disk storage (or localStorage fallback).
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      let loadedItems: MemoryItem[] | null = null;

      // 1. Try Electron native disk storage
      if (typeof window !== 'undefined' && window.visionAPI?.loadMemory) {
        try {
          loadedItems = await window.visionAPI.loadMemory();
        } catch (e) {
          console.warn('[MemoryManager] IPC loadMemory error:', e);
        }
      }

      // 2. Try localStorage fallback if running in browser / dev preview
      if (!loadedItems && typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.PERSISTENT_MEMORY);
        if (raw) {
          try {
            loadedItems = JSON.parse(raw);
          } catch (e) {
            console.warn('[MemoryManager] localStorage parse error:', e);
          }
        }
      }

      if (loadedItems && Array.isArray(loadedItems) && loadedItems.length > 0) {
        this.memories.clear();
        for (const item of loadedItems) {
          if (item.id && item.title) {
            this.memories.set(item.id, {
              ...item,
              confidence: item.confidence ?? (item.source === 'user' ? 1.0 : 0.9),
              source: item.source ?? 'system',
              accessCount: item.accessCount ?? 0,
            });
          }
        }
      } else {
        // Seed default foundational memories
        this.memories.clear();
        for (const seed of INITIAL_SEED_MEMORIES) {
          this.memories.set(seed.id, seed);
        }
        await this.persist();
      }

      this.initialized = true;
      this.notifyListeners();
    } catch (err) {
      console.error('[MemoryManager] Initialization error:', err);
      // Fallback in-memory seeds
      for (const seed of INITIAL_SEED_MEMORIES) {
        this.memories.set(seed.id, seed);
      }
      this.initialized = true;
    }
  }

  /**
   * Persist current memories to disk and localStorage.
   */
  public async persist(): Promise<boolean> {
    const items = Array.from(this.memories.values());

    // 1. Electron File Persistence
    if (typeof window !== 'undefined' && window.visionAPI?.saveMemory) {
      try {
        await window.visionAPI.saveMemory(items);
      } catch (e) {
        console.warn('[MemoryManager] Failed to persist to disk via IPC:', e);
      }
    }

    // 2. localStorage mirror
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.PERSISTENT_MEMORY, JSON.stringify(items));
      } catch (e) {
        console.warn('[MemoryManager] Failed to mirror in localStorage:', e);
      }
    }

    this.notifyListeners();
    return true;
  }

  // =========================================================================
  // PERSISTENT MEMORY CRUD & CONTRADICTION RESOLUTION
  // =========================================================================

  public getAll(category?: MemoryCategory): MemoryItem[] {
    const all = Array.from(this.memories.values());
    const filtered = category ? all.filter((m) => m.category === category) : all;
    return filtered.sort((a, b) => {
      const impA = a.importance || 3;
      const impB = b.importance || 3;
      if (impB !== impA) return impB - impA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  public get(id: string): MemoryItem | undefined {
    return this.memories.get(id);
  }

  /**
   * Save a memory item with Contradiction Resolution & Entity Matching.
   * If a memory for the same entity/topic already exists, updates it in place
   * rather than generating duplicate conflicting records.
   */
  public async save(params: {
    id?: string;
    category: MemoryCategory;
    title: string;
    content: string;
    tags?: string[];
    importance?: number;
    confidence?: number;
    source?: MemorySource;
  }): Promise<MemoryItem> {
    const now = new Date().toISOString();

    // 1. Find existing record by explicit ID or Entity-Level matching
    let existing: MemoryItem | undefined;
    if (params.id) {
      existing = this.memories.get(params.id);
    } else {
      const incomingTitleNorm = params.title.toLowerCase().trim();
      const incomingTags = (params.tags || []).map(t => t.toLowerCase().trim());

      for (const item of this.memories.values()) {
        if (item.category !== params.category) continue;
        const itemTitleNorm = item.title.toLowerCase().trim();

        // Exact or normalized title match
        if (incomingTitleNorm === itemTitleNorm) {
          existing = item;
          break;
        }

        // Project entity matching (e.g. "VISION" or "UltraSoft")
        if (params.category === 'project') {
          const incomingProjectKey = incomingTitleNorm.split(/[\s:_-]+/)[0];
          const itemProjectKey = itemTitleNorm.split(/[\s:_-]+/)[0];
          if (incomingProjectKey.length >= 3 && incomingProjectKey === itemProjectKey) {
            existing = item;
            break;
          }
        }

        // Overlapping specific tags and shared title context
        const sharedTags = item.tags.filter(t => incomingTags.includes(t));
        if (sharedTags.length >= 2 && (itemTitleNorm.includes(incomingTitleNorm) || incomingTitleNorm.includes(itemTitleNorm))) {
          existing = item;
          break;
        }
      }
    }

    const id = existing ? existing.id : (params.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    // Auto extract and merge tags
    const newTags = params.tags && params.tags.length > 0
      ? params.tags.map(t => t.trim().toLowerCase())
      : this.extractKeywords(params.title + ' ' + params.content);
    
    const mergedTags = existing
      ? Array.from(new Set([...existing.tags, ...newTags]))
      : newTags;

    // Source & Confidence resolution: User explicit input overrides agent inference
    const source: MemorySource = params.source 
      ? params.source 
      : (existing ? (existing.source === 'user' ? 'user' : 'agent_inferred') : 'agent_inferred');

    const confidence = params.confidence ?? (
      source === 'user' || source === 'user_defined' ? 1.0 :
      source === 'system' || source === 'system_boot' ? 1.0 :
      (existing?.confidence ?? 0.88)
    );

    const item: MemoryItem = {
      id,
      category: params.category,
      title: params.title.trim(),
      content: params.content.trim(),
      tags: mergedTags,
      importance: params.importance ?? existing?.importance ?? 3,
      confidence,
      source,
      accessCount: existing?.accessCount ?? 0,
      lastAccessed: existing?.lastAccessed,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.memories.set(id, item);
    await this.persist();
    return item;
  }

  public async delete(id: string): Promise<boolean> {
    if (!this.memories.has(id)) return false;
    this.memories.delete(id);
    await this.persist();
    return true;
  }

  public search(query: string, category?: MemoryCategory): MemoryItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll(category);

    const tokens = q.split(/\s+/).filter(Boolean);
    const pool = this.getAll(category);

    return pool
      .map((item) => {
        let score = 0;
        const text = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();

        for (const token of tokens) {
          if (item.title.toLowerCase().includes(token)) score += 5;
          if (item.tags.some((t) => t.includes(token))) score += 4;
          if (item.content.toLowerCase().includes(token)) score += 2;
        }

        return { item, score };
      })
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);
  }

  /**
   * Retrieves high-precision, ranked relevant memories to inject into the Agent's prompt context.
   * STRICT ZERO-BLOAT GUARANTEE: Only injects memories that pass a strict relevance threshold.
   * If query is unrelated, returns [] rather than blindly polluting context with arbitrary memories.
   */
  public getRelevantContext(prompt: string, limit: number = VISION_CONFIG.MEMORY.MAX_RELEVANT_MEMORIES): MemoryItem[] {
    const cleanPrompt = prompt.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'؛،]/g, ' ');
    const allTokens = cleanPrompt.split(/\s+/).filter(w => w.length >= 2);
    const contentTokens = allTokens.filter(w => !RETRIEVAL_STOPWORDS.has(w));

    // If prompt contains only generic greetings or stopwords, no persistent memory is relevant
    if (contentTokens.length === 0) {
      return [];
    }

    // Detect category intent from prompt keywords
    const isProjectIntent = /\b(مشروع|كود|code|project|repo|git|مسار|path|مجلد|folder)\b/i.test(prompt);
    const isUserPrefIntent = /\b(تفضيل|اسم|نادي|preference|call me|name|language|لغة|اسلوب)\b/i.test(prompt);
    const isSystemIntent = /\b(جهاز|كارت|gpu|ram|vram|cpu|hardware|specs|مواصفات|حرارة|بورت|port)\b/i.test(prompt);
    const isWorkflowIntent = /\b(طريقة|خطوات|workflow|hotkey|اختصار|build|تشغيل|run|تثبيت)\b/i.test(prompt);

    const scored: { item: MemoryItem; score: number }[] = [];

    for (const item of this.memories.values()) {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const tagsLower = item.tags.map(t => t.toLowerCase());

      // 1. Exact full query match in title (+15)
      if (titleLower.includes(cleanPrompt.trim())) {
        score += 15;
      }

      // 2. Token-level matching
      for (const token of contentTokens) {
        if (titleLower.includes(token)) {
          score += 8; // High weight for title match
        }
        if (tagsLower.some(t => t.includes(token) || token.includes(t))) {
          score += 6; // High weight for tag match
        }
        if (contentLower.includes(token)) {
          score += 3; // Content match
        }
      }

      // 3. Category affinity bonus
      if (isProjectIntent && item.category === 'project') score += 4;
      if (isUserPrefIntent && item.category === 'user_preference') score += 4;
      if (isSystemIntent && item.category === 'system_knowledge') score += 4;
      if (isWorkflowIntent && item.category === 'workflow') score += 4;

      // 4. Quality multipliers (confidence & importance)
      if (score > 0) {
        score *= (item.confidence ?? 0.85);
        score *= (0.85 + (item.importance || 3) * 0.05);

        // Recency and access frequency boost
        if (item.accessCount && item.accessCount > 0) {
          score += Math.min(2.0, item.accessCount * 0.15);
        }
      }

      // Minimum Relevance Threshold: Must have at least a direct title/tag match or strong content match
      const MIN_RELEVANCE_THRESHOLD = 6.0;
      if (score >= MIN_RELEVANCE_THRESHOLD) {
        scored.push({ item, score });
      }
    }

    const topItems = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.item);

    // Update telemetry: lastAccessed and accessCount
    for (const item of topItems) {
      item.lastAccessed = new Date().toISOString();
      item.accessCount = (item.accessCount || 0) + 1;
    }

    return topItems;
  }

  // =========================================================================
  // SESSION WORKING MEMORY & CONTEXT WINDOW AUTO-SUMMARIZATION
  // =========================================================================

  /**
   * Record a conversational turn and schedule summarization if context is large.
   */
  public addTurn(userPrompt: string, agentResponse: string, toolsUsed?: string[]): void {
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      userPrompt: userPrompt.trim(),
      agentResponse: agentResponse.trim(),
      toolsUsed,
    };

    this.sessionTurns.push(turn);
    this.notifyListeners();

    // Trigger auto-summarization if turns exceed threshold
    if (this.sessionTurns.length >= VISION_CONFIG.MEMORY.SUMMARIZE_TRIGGER_TURNS && !this.isSummarizing) {
      this.summarizeOlderTurns().catch((err) => {
        console.warn('[MemoryManager] Auto-summarization failed:', err);
      });
    }
  }

  public getSessionTurns(): ConversationTurn[] {
    return [...this.sessionTurns];
  }

  public getRollingSummary(): string {
    return this.rollingSummary;
  }

  /**
   * Generates formatted LLMMessage[] for live prompt context.
   * Contains the active window of recent turns.
   */
  public getConversationHistory(maxActiveTurns: number = VISION_CONFIG.MEMORY.MAX_ACTIVE_TURNS): LLMMessage[] {
    const messages: LLMMessage[] = [];
    const active = this.sessionTurns.slice(-maxActiveTurns);

    for (const turn of active) {
      messages.push({
        role: 'user',
        content: turn.userPrompt,
      });
      messages.push({
        role: 'assistant',
        content: turn.agentResponse,
      });
    }

    return messages;
  }

  /**
   * Compresses older conversation turns into a rolling session summary
   * to prevent context window bloat while preserving continuity.
   * NOTE: Does NOT pollute persistent memory; stays scoped to active session.
   */
  public async summarizeOlderTurns(): Promise<void> {
    if (this.isSummarizing) return;
    if (this.sessionTurns.length <= VISION_CONFIG.MEMORY.MAX_ACTIVE_TURNS) return;

    this.isSummarizing = true;
    try {
      const turnsToSummarizeCount = this.sessionTurns.length - VISION_CONFIG.MEMORY.MAX_ACTIVE_TURNS;
      const turnsToSummarize = this.sessionTurns.slice(0, turnsToSummarizeCount);
      const remainingTurns = this.sessionTurns.slice(turnsToSummarizeCount);

      const conversationText = turnsToSummarize
        .map((t, idx) => `[Turn ${idx + 1}] User: "${t.userPrompt}"\nVISION: "${t.agentResponse}"${t.toolsUsed ? ` (Tools: ${t.toolsUsed.join(', ')})` : ''}`)
        .join('\n\n');

      const prompt = `You are the Memory Manager of VISION Personal AI OS.
Compress the following earlier conversation turns between Ahmed and VISION into a concise, high-density factual context summary.
Focus on:
1. What tasks or topics Ahmed requested.
2. What digital actions or tools VISION executed.
3. Key results, decisions, preferences, and facts established.
4. Keep it under 150 words in bullet points (Arabic or English matching content).

Prior Summary:
${this.rollingSummary || '(None)'}

New Conversation Turns to Summarize:
${conversationText}

Respond ONLY with the consolidated summary text. Do NOT add conversational fluff.`;

      const provider = llmProviderManager.getProvider();
      const res = await provider.chat([
        { role: 'system', content: 'You are an ultra-concise conversation memory condenser.' },
        { role: 'user', content: prompt },
      ]);

      const summaryText = (res.text || '').trim();
      if (summaryText) {
        this.rollingSummary = summaryText;
        this.sessionTurns = remainingTurns;
      }
    } finally {
      this.isSummarizing = false;
      this.notifyListeners();
    }
  }

  /**
   * Explicitly archives the current session into persistent memory under 'session_archive'.
   * Only called on session termination or explicit user request.
   */
  public async archiveCurrentSession(title?: string): Promise<MemoryItem | null> {
    if (!this.rollingSummary && this.sessionTurns.length === 0) return null;

    const summaryText = this.rollingSummary || this.sessionTurns
      .map((t, idx) => `[Turn ${idx + 1}] User: "${t.userPrompt}" -> VISION: "${t.agentResponse}"`)
      .join('\n');

    return await this.save({
      category: 'session_archive',
      title: title || `Session Archive (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`,
      content: summaryText,
      tags: ['session', 'archive', 'history'],
      importance: 2,
      confidence: 1.0,
      source: 'user',
    });
  }

  public clearSession(): void {
    this.sessionTurns = [];
    this.rollingSummary = '';
    this.notifyListeners();
  }

  public setSessionTurns(turns: ConversationTurn[]): void {
    this.sessionTurns = [...turns];
    this.notifyListeners();
  }

  // =========================================================================
  // SUBSCRIPTIONS & HELPERS
  // =========================================================================

  public subscribe(listener: MemoryChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('[MemoryManager] Listener error:', e);
      }
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'؛،]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !RETRIEVAL_STOPWORDS.has(w));
    return Array.from(new Set(words)).slice(0, 6);
  }
}

export const memoryManager = new MemoryManager();
