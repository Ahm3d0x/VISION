import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Terminal, 
  Globe, 
  Code, 
  FolderGit2, 
  FileText, 
  Cloud, 
  Eye, 
  Scan, 
  Cpu, 
  Search, 
  Check, 
  ToggleLeft, 
  ToggleRight, 
  Shield, 
  Play, 
  Copy, 
  X, 
  RefreshCw, 
  Sliders, 
  Layers, 
  MessageSquare, 
  AppWindow, 
  Camera, 
  Database, 
  ExternalLink, 
  Clock, 
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users
} from 'lucide-react';
import { toolRegistry } from '../../core/tools/registry';
import { executionEngine, ExecutionResponse } from '../../core/execution/ExecutionEngine';
import { Tool } from '../../core/tools/types';

// Category Definitions & Filter Tabs
type CategoryTab = 
  | 'All' 
  | 'System & CLI' 
  | 'App Control' 
  | 'Web & Browser' 
  | 'Vision & Screen' 
  | 'Memory' 
  | 'Communication';

const CATEGORIES: CategoryTab[] = [
  'All',
  'System & CLI',
  'App Control',
  'Web & Browser',
  'Vision & Screen',
  'Memory',
  'Communication',
];

// Helper to map tool names into refined HUD categories
function getToolDisplayCategory(tool: Tool): CategoryTab {
  const name = tool.name;
  if (name.startsWith('send_whatsapp') || name.startsWith('read_whatsapp') || name.includes('contact')) {
    return 'Communication';
  }
  if (name.includes('memory')) {
    return 'Memory';
  }
  if (name.includes('screenshot') || name.includes('screen') || name.includes('image')) {
    return 'Vision & Screen';
  }
  if (name.includes('browser') || name.includes('web')) {
    return 'Web & Browser';
  }
  if (name.includes('app') || name === 'focus_app' || name === 'launch_app' || name === 'close_app' || name === 'close_all_apps') {
    return 'App Control';
  }
  return 'System & CLI';
}

// Helper to assign specialized high-tech icons per tool
function getToolIcon(toolName: string) {
  if (toolName === 'execute_command') return <Terminal className="w-5 h-5 text-vision-cyan" />;
  if (toolName === 'take_screenshot') return <Camera className="w-5 h-5 text-vision-teal" />;
  if (toolName === 'system_telemetry') return <Cpu className="w-5 h-5 text-vision-gold" />;
  if (toolName === 'get_running_apps') return <Layers className="w-5 h-5 text-blue-400" />;
  if (toolName === 'get_weather') return <Cloud className="w-5 h-5 text-sky-400" />;
  if (toolName.includes('app')) return <AppWindow className="w-5 h-5 text-indigo-400" />;
  if (toolName.includes('browser')) return <Globe className="w-5 h-5 text-cyan-400" />;
  if (toolName === 'web_search') return <Search className="w-5 h-5 text-blue-400" />;
  if (toolName === 'fetch_web_page') return <FileText className="w-5 h-5 text-emerald-400" />;
  if (toolName.includes('screen') || toolName.includes('image')) return <Eye className="w-5 h-5 text-purple-400" />;
  if (toolName.includes('memory')) return <Database className="w-5 h-5 text-amber-400" />;
  if (toolName.includes('contact')) return <Users className="w-5 h-5 text-emerald-400" />;
  if (toolName.includes('whatsapp')) return <MessageSquare className="w-5 h-5 text-green-400" />;
  return <Wrench className="w-5 h-5 text-vision-cyan" />;
}

// Recommended default arguments for immediate 1-click testing
const SAMPLE_INPUTS: Record<string, Record<string, any>> = {
  execute_command: { command: 'dir', shell: 'powershell', timeout: 30000 },
  launch_app: { app_name: 'notepad' },
  close_app: { app_name: 'notepad' },
  close_all_apps: { except_apps: ['VISION', 'Code'] },
  focus_app: { process_name: 'explorer' },
  get_running_apps: {},
  take_screenshot: {},
  system_telemetry: {},
  get_weather: { location: 'Cairo' },
  open_browser: { url: 'https://google.com' },
  web_search: { query: 'Next generation AI systems', max_results: 5 },
  fetch_web_page: { url: 'https://en.wikipedia.org/wiki/Artificial_intelligence', max_length: 2000 },
  analyze_screen: { prompt: 'Summarize what is currently displayed on the desktop screen.' },
  analyze_image_file: { file_path: '', prompt: 'Describe the contents of this image.' },
  save_memory: { key: 'user_profile', value: 'Prefers dark HUD with pure English telemetry.', category: 'preference' },
  search_memory: { query: 'preference' },
  update_memory: { key: 'user_profile', value: 'Prefers high contrast dark HUD with pure English telemetry.' },
  delete_memory: { key: 'temp_test' },
  list_memory: { limit: 20 },
  search_contacts: { query: 'Ahmed' },
  get_contact: { name_or_phone: 'Ahmed' },
  list_contacts: { limit: 20 },
  send_whatsapp_message: { recipient: 'Ahmed', message: 'Greetings from VISION autonomous HUD!' },
  send_whatsapp_screenshot: { recipient: 'Ahmed', caption: 'VISION screen snapshot' },
  send_whatsapp_file: { recipient: 'Ahmed', file_path: '' },
  read_whatsapp_chat: { contact_name: 'Ahmed', limit: 10 },
};

export const ToolsHUDView: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<CategoryTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [disabledTools, setDisabledTools] = useState<Set<string>>(new Set());
  
  // Active tool being tested in drawer
  const [activeTestTool, setActiveTestTool] = useState<Tool | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResponse | null>(null);
  const [execDurationMs, setExecDurationMs] = useState<number | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Load all registered tools from live registry
  const allTools = useMemo(() => {
    return toolRegistry.getAll();
  }, []);

  // Stats
  const totalCount = allTools.length;
  const activeCount = totalCount - disabledTools.size;
  const autoRunCount = allTools.filter(t => t.permissionLevel <= 1).length;
  const guardedCount = allTools.filter(t => t.permissionLevel >= 2).length;

  const toggleTool = (toolName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDisabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  // Open the Test / Execution Console
  const openTestConsole = (tool: Tool) => {
    setActiveTestTool(tool);
    setExecResult(null);
    setExecDurationMs(null);
    setCopiedResult(false);

    // Initialize parameters with sample default values
    const decl = tool.toLLMDeclaration();
    const props = decl.function.parameters.properties || {};
    const sample = SAMPLE_INPUTS[tool.name] || {};
    const initialValues: Record<string, any> = {};

    for (const key of Object.keys(props)) {
      if (key in sample) {
        initialValues[key] = sample[key];
      } else {
        const propType = props[key]?.type;
        if (propType === 'number' || propType === 'integer') initialValues[key] = 0;
        else if (propType === 'boolean') initialValues[key] = false;
        else if (propType === 'array') initialValues[key] = [];
        else initialValues[key] = '';
      }
    }
    setTestParams(initialValues);
  };

  // Execute Tool directly from HUD
  const handleExecute = async () => {
    if (!activeTestTool) return;
    setIsExecuting(true);
    setExecResult(null);
    setCopiedResult(false);
    const start = performance.now();

    try {
      // Clean params: omit empty optional strings
      const cleanedParams: Record<string, any> = {};
      const decl = activeTestTool.toLLMDeclaration();
      const required = new Set(decl.function.parameters.required || []);

      for (const [key, val] of Object.entries(testParams)) {
        if (val === '' && !required.has(key)) {
          continue;
        }
        cleanedParams[key] = val;
      }

      const res = await executionEngine.executeTool(
        activeTestTool.name, 
        cleanedParams, 
        { caller: 'hud_test_console', confirmed: true }
      );
      setExecDurationMs(Math.round(performance.now() - start));
      setExecResult(res);
    } catch (err: any) {
      setExecDurationMs(Math.round(performance.now() - start));
      setExecResult({
        status: 'FAILED',
        toolName: activeTestTool.name,
        error: err.message || 'Execution failed unexpectedly',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Quick 1-click execution for 0-argument tools
  const handleQuickRun = async (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    openTestConsole(tool);
    setIsExecuting(true);
    const start = performance.now();

    try {
      const res = await executionEngine.executeTool(
        tool.name, 
        {}, 
        { caller: 'hud_quick_run', confirmed: true }
      );
      setExecDurationMs(Math.round(performance.now() - start));
      setExecResult(res);
    } catch (err: any) {
      setExecDurationMs(Math.round(performance.now() - start));
      setExecResult({
        status: 'FAILED',
        toolName: tool.name,
        error: err.message || 'Execution failed unexpectedly',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyOutput = () => {
    if (!execResult) return;
    const textToCopy = JSON.stringify(execResult.result?.output ?? execResult, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return allTools.filter((t) => {
      const displayCat = getToolDisplayCategory(t);
      const matchCat = selectedCat === 'All' || displayCat === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        displayCat.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allTools, selectedCat, searchQuery]);

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between hud-scanline-overlay overflow-hidden relative">
      {/* Top Banner & Control Metrics */}
      <div className="flex flex-col gap-3 pb-3 border-b border-vision-border/60 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-vision-cyan/15 border border-vision-cyan/30">
                <Wrench className="w-4 h-4 text-vision-cyan animate-pulse" />
              </div>
              <h2 className="text-sm font-mono font-bold text-vision-text tracking-widest uppercase">
                CONNECTED TOOLS & AUTONOMOUS WORKSPACE
              </h2>
            </div>
            <p className="text-[10px] font-mono text-vision-text-muted mt-1">
              Live inspection, parameter configuration, and real-time execution of all registered OS capabilities.
            </p>
          </div>

          {/* Quick HUD Metrics Bar */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-center">
              <div className="text-[9px] font-mono text-vision-text-muted uppercase">Total Tools</div>
              <div className="text-xs font-mono font-bold text-vision-cyan">{totalCount} Registered</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-center">
              <div className="text-[9px] font-mono text-vision-text-muted uppercase">Auto-Permit</div>
              <div className="text-xs font-mono font-bold text-vision-teal">{autoRunCount} Safe</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-center">
              <div className="text-[9px] font-mono text-vision-text-muted uppercase">Guarded</div>
              <div className="text-xs font-mono font-bold text-vision-gold">{guardedCount} Explicit</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
            {CATEGORIES.map((cat) => {
              const count = cat === 'All' 
                ? totalCount 
                : allTools.filter(t => getToolDisplayCategory(t) === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    selectedCat === cat
                      ? 'bg-vision-cyan/20 text-vision-cyan border-vision-cyan shadow-glow-cyan-sm font-bold'
                      : 'bg-vision-panel text-vision-text-secondary border-vision-border hover:text-vision-text hover:border-vision-border/80'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCat === cat ? 'bg-vision-cyan/30 text-white' : 'bg-black/30 text-vision-text-muted'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-vision-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools or parameters..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-xs font-mono text-vision-text placeholder-vision-text-muted outline-none focus:border-vision-cyan transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-vision-text-muted hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 overflow-y-auto pr-1 my-3 scrollbar-thin">
        {filteredTools.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-vision-border rounded-2xl">
            <Search className="w-8 h-8 text-vision-text-muted mb-2 opacity-50" />
            <p className="text-xs font-mono text-vision-text">No tools match your criteria.</p>
            <p className="text-[10px] font-mono text-vision-text-muted mt-1">Try resetting the search query or selecting 'All'.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredTools.map((tool) => {
              const isEnabled = !disabledTools.has(tool.name);
              const displayCategory = getToolDisplayCategory(tool);
              const decl = tool.toLLMDeclaration();
              const paramKeys = Object.keys(decl.function.parameters.properties || {});
              const paramCount = paramKeys.length;
              const isZeroArg = paramCount === 0;

              return (
                <div
                  key={tool.name}
                  onClick={() => openTestConsole(tool)}
                  className={`hud-panel hud-corner rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all cursor-pointer group ${
                    isEnabled
                      ? 'border-vision-border hover:border-vision-cyan/60 hover:shadow-glow-cyan-sm hover:bg-vision-panel/90'
                      : 'opacity-40 border-vision-border/40 bg-vision-panel/30'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-vision-panel border border-vision-border/80 group-hover:border-vision-cyan/50 group-hover:bg-vision-cyan/10 transition-colors">
                        {getToolIcon(tool.name)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-mono text-xs font-bold text-vision-text group-hover:text-vision-cyan transition-colors">
                            {tool.name}
                          </h3>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-vision-cyan/80">
                          {displayCategory}
                        </span>
                      </div>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={(e) => toggleTool(tool.name, e)}
                      className="text-vision-cyan hover:scale-110 transition-transform p-0.5"
                      title={isEnabled ? 'Click to disable tool' : 'Click to enable tool'}
                    >
                      {isEnabled ? (
                        <ToggleRight className="w-5 h-5 text-vision-cyan" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-vision-text-muted" />
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-vision-text-secondary leading-relaxed line-clamp-2 min-h-[32px]">
                    {tool.description}
                  </p>

                  {/* Metadata Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono">
                    {/* Permission Badge */}
                    <span className={`px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                      tool.permissionLevel === 0 
                        ? 'bg-vision-cyan/10 text-vision-cyan border-vision-cyan/30'
                        : tool.permissionLevel === 1 
                        ? 'bg-vision-teal/10 text-vision-teal border-vision-teal/30'
                        : tool.permissionLevel === 2 
                        ? 'bg-vision-gold/10 text-vision-gold border-vision-gold/30'
                        : 'bg-vision-error/10 text-vision-error border-vision-error/30'
                    }`}>
                      <Shield className="w-2.5 h-2.5" />
                      <span>Level {tool.permissionLevel}</span>
                    </span>

                    {/* Risk Badge */}
                    <span className={`px-1.5 py-0.5 rounded-md border ${
                      tool.riskLevel === 'LOW' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : tool.riskLevel === 'MEDIUM' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {tool.riskLevel}
                    </span>

                    {/* Params count */}
                    <span className="px-1.5 py-0.5 rounded-md bg-vision-panel border border-vision-border text-vision-text-muted ml-auto">
                      {isZeroArg ? '0 Params' : `${paramCount} ${paramCount === 1 ? 'Param' : 'Params'}`}
                    </span>
                  </div>

                  {/* Bottom Interactive Controls */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-vision-border/60 text-[10px] font-mono">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTestConsole(tool);
                      }}
                      className="flex items-center space-x-1 text-vision-cyan hover:text-white transition-colors py-0.5 px-2 rounded-lg bg-vision-cyan/10 border border-vision-cyan/20 hover:bg-vision-cyan/25"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Inspect & Run</span>
                    </button>

                    {/* Quick Run for 0-arg tools */}
                    {isZeroArg && isEnabled && (
                      <button
                        onClick={(e) => handleQuickRun(tool, e)}
                        className="flex items-center space-x-1 text-vision-teal hover:text-white transition-colors py-0.5 px-2.5 rounded-lg bg-vision-teal/15 border border-vision-teal/40 hover:bg-vision-teal/30 font-bold"
                        title="Execute immediately with no arguments"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Quick Run</span>
                      </button>
                    )}

                    {!isZeroArg && (
                      <span className="text-[10px] text-vision-text-muted flex items-center space-x-1">
                        <span>Configurable</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER NOTICE */}
      <div className="pt-2 border-t border-vision-border/60 flex items-center justify-between text-[10px] font-mono text-vision-text-muted shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-vision-cyan animate-ping" />
          <span>AUTONOMOUS TOOL ENGINE: {activeCount}/{totalCount} ACTIVE</span>
        </div>
        <div>
          Click any tool card to inspect schemas, configure arguments, and execute in real-time.
        </div>
      </div>

      {/* SLIDE-OVER TEST & CONTROL DRAWER */}
      {activeTestTool && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-150"
          onClick={() => setActiveTestTool(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-vision-bg border-l border-vision-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-vision-border/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-vision-panel border border-vision-cyan/40 shadow-glow-cyan-sm">
                  {getToolIcon(activeTestTool.name)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-mono font-bold text-vision-text">
                      {activeTestTool.name}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                      activeTestTool.permissionLevel === 0 ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                      activeTestTool.permissionLevel === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      activeTestTool.permissionLevel === 2 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      Level {activeTestTool.permissionLevel}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-vision-cyan/90 mt-0.5">
                    Category: {getToolDisplayCategory(activeTestTool)} &bull; Risk: {activeTestTool.riskLevel}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTestTool(null)}
                className="p-1.5 rounded-xl bg-vision-panel border border-vision-border hover:border-vision-cyan text-vision-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tool Description */}
            <div className="p-3 rounded-xl bg-vision-panel/60 border border-vision-border text-xs text-vision-text leading-relaxed">
              <div className="text-[10px] font-mono text-vision-text-muted uppercase mb-1">Function Description</div>
              {activeTestTool.description}
            </div>

            {/* Dynamic Argument Configuration */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-vision-text flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-vision-cyan" />
                  <span>PARAMETERS & ARGUMENTS</span>
                </span>
                <span className="text-[10px] text-vision-text-muted">
                  Zod Schema Validated
                </span>
              </div>

              {(() => {
                const decl = activeTestTool.toLLMDeclaration();
                const props = decl.function.parameters.properties || {};
                const requiredSet = new Set(decl.function.parameters.required || []);
                const keys = Object.keys(props);

                if (keys.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-vision-panel/40 border border-dashed border-vision-border text-center">
                      <CheckCircle2 className="w-6 h-6 text-vision-teal mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-mono text-vision-text">This tool requires zero arguments.</p>
                      <p className="text-[10px] font-mono text-vision-text-muted mt-1">Ready for direct instant execution.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {keys.map((key) => {
                      const prop = props[key];
                      const isReq = requiredSet.has(key);
                      const val = testParams[key] ?? '';

                      return (
                        <div key={key} className="p-3 rounded-xl bg-vision-panel border border-vision-border space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-bold text-vision-cyan flex items-center space-x-1.5">
                              <span>{key}</span>
                              <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-black/40 text-vision-text-muted">
                                {prop.type}
                              </span>
                            </label>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                              isReq ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-vision-text-muted'
                            }`}>
                              {isReq ? 'Required' : 'Optional'}
                            </span>
                          </div>

                          {prop.description && (
                            <p className="text-[10px] text-vision-text-muted leading-relaxed">
                              {prop.description}
                            </p>
                          )}

                          {/* Dynamic Input Control */}
                          {prop.type === 'boolean' ? (
                            <div className="flex items-center space-x-2 pt-1">
                              <input
                                type="checkbox"
                                id={`input-${key}`}
                                checked={Boolean(val)}
                                onChange={(e) => setTestParams({ ...testParams, [key]: e.target.checked })}
                                className="w-4 h-4 rounded bg-vision-panel border-vision-border text-vision-cyan focus:ring-0"
                              />
                              <label htmlFor={`input-${key}`} className="text-xs font-mono text-vision-text">
                                {val ? 'Enabled (true)' : 'Disabled (false)'}
                              </label>
                            </div>
                          ) : prop.type === 'number' || prop.type === 'integer' ? (
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => setTestParams({ ...testParams, [key]: Number(e.target.value) })}
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-xs font-mono text-vision-text outline-none focus:border-vision-cyan"
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => setTestParams({ ...testParams, [key]: e.target.value })}
                              placeholder={`Enter ${key}...`}
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-xs font-mono text-vision-text placeholder-vision-text-muted/60 outline-none focus:border-vision-cyan"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Execution Action Bar */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => openTestConsole(activeTestTool)}
                  disabled={isExecuting}
                  className="px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-xs font-mono text-vision-text-muted hover:text-white transition-colors"
                >
                  Reset Defaults
                </button>

                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-glow-cyan-sm disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Tool...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Tool Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Result Output Console */}
              {execResult && (
                <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-vision-border space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-vision-border/80 pb-2">
                    <div className="flex items-center space-x-2">
                      {execResult.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-vision-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-vision-error" />
                      )}
                      <span className={`text-xs font-mono font-bold ${
                        execResult.status === 'COMPLETED' ? 'text-vision-success' : 'text-vision-error'
                      }`}>
                        {execResult.status === 'COMPLETED' ? 'EXECUTION COMPLETED' : 'EXECUTION FAILED'}
                      </span>
                      {execDurationMs !== null && (
                        <span className="text-[10px] font-mono text-vision-text-muted flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{execDurationMs}ms</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleCopyOutput}
                      className="text-[10px] font-mono flex items-center space-x-1 text-vision-cyan hover:text-white transition-colors px-2 py-0.5 rounded bg-vision-cyan/10 border border-vision-cyan/20"
                    >
                      {copiedResult ? (
                        <>
                          <Check className="w-3 h-3 text-vision-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Output</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary Message */}
                  {execResult.result?.message && (
                    <div className="text-xs font-mono text-vision-text-secondary bg-vision-panel/50 p-2.5 rounded-lg border border-vision-border/60">
                      {execResult.result.message}
                    </div>
                  )}

                  {/* Error Message */}
                  {execResult.error && (
                    <div className="text-xs font-mono text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30">
                      {execResult.error}
                    </div>
                  )}

                  {/* Live Screenshot Preview if dataUrl is available */}
                  {execResult.result?.output?.dataUrl && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-vision-cyan">LIVE SCREENSHOT CAPTURE:</div>
                      <div className="rounded-xl overflow-hidden border border-vision-cyan/40 bg-black max-h-48 flex items-center justify-center">
                        <img 
                          src={execResult.result.output.dataUrl} 
                          alt="Captured Screenshot" 
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Running Apps Preview if list is returned */}
                  {Array.isArray(execResult.result?.output) && execResult.result.output.length > 0 && typeof execResult.result.output[0] === 'object' && 'name' in execResult.result.output[0] && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-vision-cyan">
                        ACTIVE RUNNING APPS ({execResult.result.output.length} found):
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {execResult.result.output.map((app: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-vision-panel border border-vision-border/40">
                            <span className="text-vision-text font-bold">{app.name}</span>
                            <span className="text-vision-text-muted text-[10px]">{app.title || `PID: ${app.pid}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formatted Raw Output */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-vision-text-muted uppercase">Structured JSON Output:</div>
                    <pre className="text-[10px] font-mono text-vision-teal bg-black/80 p-3 rounded-xl border border-vision-border overflow-x-auto max-h-56 scrollbar-thin">
                      {JSON.stringify(execResult.result?.output ?? execResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
