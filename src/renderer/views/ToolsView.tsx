import React, { useState } from 'react';
import { Wrench, Shield, Check, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { ToolDefinition } from '../../shared/types';
import { toolRegistry } from '../../core/tools/registry';

const INITIAL_TOOLS: ToolDefinition[] = [
  {
    id: 'app.launch',
    name: 'Launch Application',
    description: 'Opens and brings focus to target native desktop applications (VS Code, Chrome, Terminal, etc.)',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    parametersSchema: { appName: 'string', args: 'string[] (optional)' },
    enabled: true,
  },
  {
    id: 'filesystem.search',
    name: 'Filesystem Search',
    description: 'Searches local workspace files and folders matching glob/regex queries.',
    category: 'filesystem',
    permissionLevel: 0,
    riskLevel: 'LOW',
    parametersSchema: { query: 'string', basePath: 'string' },
    enabled: true,
  },
  {
    id: 'filesystem.write',
    name: 'Write / Modify File',
    description: 'Creates or updates file contents within authorized project boundaries.',
    category: 'filesystem',
    permissionLevel: 2,
    riskLevel: 'MEDIUM',
    parametersSchema: { targetPath: 'string', content: 'string' },
    enabled: true,
  },
  {
    id: 'terminal.exec',
    name: 'Execute Shell Command',
    description: 'Executes verified PowerShell / Node.js commands in sandbox environment.',
    category: 'system',
    permissionLevel: 3,
    riskLevel: 'HIGH',
    parametersSchema: { command: 'string', cwd: 'string' },
    enabled: true,
  },
  {
    id: 'git.status',
    name: 'Git Repository Status',
    description: 'Inspects active git branches, modified files, diffs, and commit log.',
    category: 'code',
    permissionLevel: 0,
    riskLevel: 'LOW',
    parametersSchema: { repoPath: 'string' },
    enabled: true,
  },
  {
    id: 'screen.capture',
    name: 'Screen Perception & OCR',
    description: 'Captures desktop frame for visual layout inspection and UI understanding.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    parametersSchema: { displayId: 'number (optional)' },
    enabled: true,
  },
  {
    id: 'browser.navigate',
    name: 'Browser Automation',
    description: 'Controls headless/headed browser sessions to read pages or execute web tasks.',
    category: 'browser',
    permissionLevel: 2,
    riskLevel: 'MEDIUM',
    parametersSchema: { url: 'string', action: 'navigate | click | type' },
    enabled: true,
  }
];

export const ToolsView: React.FC = () => {
  const [tools, setTools] = useState<ToolDefinition[]>(() => {
    const liveTools = toolRegistry.getAll();
    if (liveTools.length > 0) {
      return liveTools.map((t) => ({
        id: t.name,
        name: t.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: t.description,
        category: t.category as any,
        permissionLevel: t.permissionLevel,
        riskLevel: t.riskLevel,
        parametersSchema: (t.toLLMDeclaration().function.parameters.properties as any) || {},
        enabled: true,
      }));
    }
    return INITIAL_TOOLS;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleTool = (id: string) => {
    setTools(tools.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const filteredTools = tools.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getPermissionBadge = (level: number) => {
    switch (level) {
      case 0:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/40">LEVEL 0 (READ-ONLY)</span>;
      case 1:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-vision-teal/15 text-vision-teal border border-vision-teal/40">LEVEL 1 (LOW RISK)</span>;
      case 2:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-vision-gold/15 text-vision-gold border border-vision-gold/40">LEVEL 2 (CONFIRMABLE)</span>;
      case 3:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-vision-error/15 text-vision-error border border-vision-error/40">LEVEL 3 (STRICT AUTH)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-vision-border pb-4 gap-4">
        <div>
          <h1 className="text-sm font-mono font-bold tracking-widest text-vision-cyan flex items-center space-x-2">
            <Wrench className="w-4 h-4" />
            <span>MODULAR TOOL REGISTRY</span>
          </h1>
          <p className="text-xs font-mono text-vision-text-muted mt-1">
            Exposed execution capabilities with explicit Zod schema validation and permission boundaries.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-vision-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tools..."
              className="pl-8 pr-3 py-1.5 text-xs font-mono bg-vision-panel border border-vision-border focus:border-vision-cyan rounded outline-none text-vision-text"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        {['all', 'system', 'filesystem', 'code', 'automation', 'browser'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded capitalize transition-colors ${
              selectedCategory === cat
                ? 'bg-vision-cyan text-vision-bg font-bold shadow-glow-cyan-sm'
                : 'bg-vision-panel text-vision-text-secondary hover:text-vision-text border border-vision-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="hud-panel rounded-lg p-4 border border-vision-border hover:border-vision-border-active/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-vision-teal uppercase tracking-widest">
                    [{tool.category}]
                  </span>
                  <h3 className="text-xs font-mono font-bold text-vision-text mt-0.5">
                    {tool.name}
                  </h3>
                  <span className="text-[11px] font-mono text-vision-text-muted block mt-0.5">
                    ID: {tool.id}
                  </span>
                </div>

                <button
                  onClick={() => toggleTool(tool.id)}
                  className="text-vision-cyan hover:opacity-80"
                  title={tool.enabled ? 'Disable tool' : 'Enable tool'}
                >
                  {tool.enabled ? (
                    <ToggleRight className="w-6 h-6 text-vision-cyan" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-vision-text-muted" />
                  )}
                </button>
              </div>

              <p className="text-xs font-mono text-vision-text-secondary mt-2.5">
                {tool.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-vision-border flex items-center justify-between">
              {getPermissionBadge(tool.permissionLevel)}
              <span className="text-[10px] font-mono text-vision-silver">
                Zod Validated
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
