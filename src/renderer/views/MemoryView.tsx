import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  Tag, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Sparkles, 
  RefreshCw, 
  Check, 
  X, 
  Star,
  Brain,
  Layers,
  Clock
} from 'lucide-react';
import { MemoryItem, MemoryCategory, ConversationTurn } from '../../shared/types';
import { memoryManager } from '../../core/memory/MemoryManager';

interface MemoryViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ onNavigateTab }) => {
  const [memories, setMemories] = useState<MemoryItem[]>(() => memoryManager.getAll());
  const [turns, setTurns] = useState<ConversationTurn[]>(() => memoryManager.getSessionTurns());
  const [rollingSummary, setRollingSummary] = useState<string>(() => memoryManager.getRollingSummary());
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formId, setFormId] = useState<string | undefined>(undefined);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('user_preference');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formImportance, setFormImportance] = useState<number>(3);

  // Sync with MemoryManager subscriptions
  useEffect(() => {
    const unsubscribe = memoryManager.subscribe(() => {
      setMemories(memoryManager.getAll());
      setTurns(memoryManager.getSessionTurns());
      setRollingSummary(memoryManager.getRollingSummary());
    });
    return unsubscribe;
  }, []);

  const filteredMemories = memories.filter((mem) => {
    const matchesCat = selectedCat === 'all' || mem.category === selectedCat;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      mem.title.toLowerCase().includes(q) ||
      mem.content.toLowerCase().includes(q) ||
      mem.tags.some(t => t.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const getCatBadge = (cat: MemoryCategory) => {
    switch (cat) {
      case 'project':
        return { label: 'Project Knowledge', color: 'text-vision-cyan border-vision-cyan/40 bg-vision-cyan/10' };
      case 'user_preference':
        return { label: 'User Preference', color: 'text-vision-teal border-vision-teal/40 bg-vision-teal/10' };
      case 'workflow':
        return { label: 'Workflow & Command', color: 'text-vision-gold border-vision-gold/40 bg-vision-gold/10' };
      case 'conversation_summary':
        return { label: 'Session Summary', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' };
      case 'system_knowledge':
      default:
        return { label: 'System Rule', color: 'text-vision-silver border-vision-border bg-vision-surface' };
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormId(undefined);
    setFormTitle('');
    setFormCategory('user_preference');
    setFormContent('');
    setFormTags('');
    setFormImportance(3);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mem: MemoryItem) => {
    setModalMode('edit');
    setFormId(mem.id);
    setFormTitle(mem.title);
    setFormCategory(mem.category);
    setFormContent(mem.content);
    setFormTags(mem.tags.join(', '));
    setFormImportance(mem.importance || 3);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    await memoryManager.save({
      id: formId,
      category: formCategory,
      title: formTitle.trim(),
      content: formContent.trim(),
      tags: tagsArray,
      importance: formImportance,
      source: 'user_defined',
    });

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete memory record "${title}"?`)) {
      await memoryManager.delete(id);
    }
  };

  const handleManualSummarize = async () => {
    setIsSummarizing(true);
    try {
      await memoryManager.summarizeOlderTurns();
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleClearSession = () => {
    if (window.confirm('Do you want to clear current session turns and start a fresh dialogue without erasing persistent memories?')) {
      memoryManager.clearSession();
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto overflow-y-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-vision-border pb-4 gap-4">
        <div>
          <h1 className="text-sm font-mono font-bold tracking-widest text-vision-cyan flex items-center space-x-2">
            <Brain className="w-4 h-4 text-vision-cyan" />
            <span>VISION MEMORY &amp; KNOWLEDGE ARCHITECTURE</span>
          </h1>
          <p className="text-xs font-mono text-vision-text-muted mt-1">
            Persistent long-term knowledge, session context, user preferences, and automatic conversation summarization.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-vision-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory..."
              className="pl-8 pr-3 py-1.5 text-xs font-mono bg-vision-panel border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text w-48 focus:w-64 transition-all"
            />
          </div>

          {/* Add Memory Button */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-vision-cyan text-vision-bg hover:bg-vision-cyan-glow rounded transition-all shadow-glow-cyan-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory Record</span>
          </button>
        </div>
      </div>

      {/* Working Session Memory & Context Window HUD Banner */}
      <div className="hud-panel rounded-lg p-4 border border-vision-border bg-gradient-to-r from-vision-panel/90 via-vision-surface/80 to-vision-panel/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-vision-cyan animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-vision-cyan flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ACTIVE SESSION WORKING MEMORY</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-vision-surface border border-vision-border text-vision-text-muted">
              {turns.length} turns in context
            </span>
          </div>

          <p className="text-xs font-mono text-vision-text-secondary leading-relaxed">
            {rollingSummary ? (
              <span className="text-vision-text">
                <span className="text-purple-400 font-bold">Cumulative Context Summary: </span>
                {rollingSummary}
              </span>
            ) : (
              'Active conversation session is persisted. Long dialogs are automatically summarized and compressed without losing intent.'
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleManualSummarize}
            disabled={isSummarizing || turns.length < 2}
            className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-mono rounded bg-vision-surface border border-vision-border hover:border-vision-cyan text-vision-text-secondary hover:text-vision-cyan transition-colors disabled:opacity-40"
            title="Compress and summarize older turns now"
          >
            <Sparkles className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span>{isSummarizing ? 'Summarizing...' : 'Summarize Context'}</span>
          </button>

          <button
            onClick={handleClearSession}
            className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-mono rounded bg-vision-surface border border-vision-border hover:border-red-500/50 text-vision-text-secondary hover:text-red-400 transition-colors"
            title="Clear current session and begin a fresh dialogue"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Session</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('sessions')}
              className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-mono rounded bg-vision-cyan/15 border border-vision-cyan/40 text-vision-cyan hover:bg-vision-cyan/25 transition-colors font-bold shadow-glow-cyan-sm"
              title="Inspect all past session records & full transcripts"
            >
              <Clock className="w-3 h-3" />
              <span>Recent Sessions</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 text-xs font-mono overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Memory' },
          { id: 'user_preference', label: 'User Preferences' },
          { id: 'project', label: 'Projects' },
          { id: 'workflow', label: 'Workflows & Commands' },
          { id: 'system_knowledge', label: 'System Rules & Specs' },
          { id: 'conversation_summary', label: 'Session Summaries' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedCat(item.id)}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              selectedCat === item.id
                ? 'bg-vision-cyan text-vision-bg font-bold shadow-glow-cyan-sm'
                : 'bg-vision-panel text-vision-text-secondary hover:text-vision-text border border-vision-border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Memories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.map((mem) => {
          const badge = getCatBadge(mem.category);
          return (
            <div
              key={mem.id}
              className="hud-panel rounded-lg p-4 border border-vision-border hover:border-vision-cyan/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {mem.importance && mem.importance >= 4 && (
                      <span className="flex items-center text-amber-400 text-[10px] font-mono space-x-0.5" title={`Importance: ${mem.importance}/5`}>
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{mem.importance}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(mem)}
                      className="p-1 rounded text-vision-text-muted hover:text-vision-cyan hover:bg-vision-surface transition-colors"
                      title="Edit Record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(mem.id, mem.title)}
                      className="p-1 rounded text-vision-text-muted hover:text-red-400 hover:bg-vision-surface transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xs font-mono font-bold text-vision-text mt-2.5 flex items-center justify-between">
                  <span>{mem.title}</span>
                </h3>

                <p className="text-xs font-mono text-vision-text-secondary mt-2 leading-relaxed whitespace-pre-wrap">
                  {mem.content}
                </p>
              </div>

              {/* Footer / Tags */}
              <div className="mt-4 pt-3 border-t border-vision-border flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center flex-wrap gap-1.5">
                  {mem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded bg-vision-surface text-[10px] font-mono text-vision-text-muted border border-vision-border flex items-center space-x-1"
                    >
                      <Tag className="w-2 h-2 text-vision-cyan" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>

                <span className="text-[9px] font-mono text-vision-text-muted ml-auto">
                  {new Date(mem.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}

        {filteredMemories.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs font-mono text-vision-text-muted border border-dashed border-vision-border rounded-lg">
            No memory records match your current query.
          </div>
        )}
      </div>

      {/* Modal Dialog for Add / Edit Memory */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hud-panel rounded-xl border border-vision-border max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-vision-border pb-3">
              <h2 className="text-sm font-mono font-bold text-vision-cyan flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>{modalMode === 'create' ? 'Create New Memory Record' : 'Edit Memory Record'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-vision-text-muted hover:text-vision-text p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-vision-text-muted mb-1">Record Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. User preferred programming languages & frameworks"
                  required
                  className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-vision-text-muted mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text"
                  >
                    <option value="user_preference">User Preference</option>
                    <option value="project">Project Knowledge</option>
                    <option value="workflow">Workflow &amp; Command</option>
                    <option value="system_knowledge">System Knowledge</option>
                    <option value="conversation_summary">Session Summary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-vision-text-muted mb-1">Importance Level (1-5)</label>
                  <select
                    value={formImportance}
                    onChange={(e) => setFormImportance(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text"
                  >
                    <option value="1">1 - Trivial / Low</option>
                    <option value="2">2 - Minor Note</option>
                    <option value="3">3 - Moderate (Default)</option>
                    <option value="4">4 - High Priority</option>
                    <option value="5">5 - Critical &amp; Core</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-vision-text-muted mb-1">Content &amp; Rules</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter detailed facts, architectural guidelines, or preferences..."
                  rows={4}
                  required
                  className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text resize-none"
                />
              </div>

              <div>
                <label className="block text-vision-text-muted mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. preferences, stack, typescript, electron"
                  className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-vision-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-vision-surface border border-vision-border text-vision-text-muted hover:text-vision-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-vision-cyan text-vision-bg font-bold rounded hover:bg-vision-cyan-glow transition-all shadow-glow-cyan-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save to Memory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
