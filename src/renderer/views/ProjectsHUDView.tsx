import React, { useState, useMemo } from 'react';
import { 
  FolderGit2, 
  Plus, 
  ExternalLink, 
  Code, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Search, 
  Terminal, 
  FolderOpen, 
  GitBranch, 
  Copy, 
  Check, 
  X, 
  Play, 
  RefreshCw,
  AppWindow,
  Sliders
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  tagline: string;
  path: string;
  tech: string[];
  category: 'System' | 'Development' | 'Hardware' | 'Research' | 'Design';
  status: 'ACTIVE' | 'IN PROGRESS' | 'PLANNING' | 'RESEARCH';
  lastModified: string;
  branch?: string;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'p-vision',
    name: 'VISION',
    tagline: 'Personal AI Operating System with neural voice, vision, and tool execution',
    path: 'g:\\work\\VISION',
    tech: ['TypeScript', 'Electron', 'React', 'Drizzle', 'Tailwind'],
    category: 'System',
    status: 'ACTIVE',
    lastModified: 'Just now',
    branch: 'main',
  },
  {
    id: 'p-ultrasoft',
    name: 'UltraSoft',
    tagline: 'Enterprise ERP interface, financial workflows & automated accounting',
    path: 'g:\\work\\UltraSoft',
    tech: ['TypeScript', 'React', 'Node.js', 'SQLite'],
    category: 'Development',
    status: 'IN PROGRESS',
    lastModified: '3 days ago',
    branch: 'dev',
  },
  {
    id: 'p-busla',
    name: 'Busla-IC-Design',
    tagline: 'High-speed FSM & Verilog hardware simulation testbench',
    path: 'g:\\work\\Busla-IC-Design',
    tech: ['Verilog', 'SystemVerilog', 'ModelSim'],
    category: 'Hardware',
    status: 'ACTIVE',
    lastModified: '2 hours ago',
    branch: 'master',
  },
  {
    id: 'p-workflow',
    name: 'Visual-Workflow',
    tagline: 'Visual node orchestration & automated pipeline workflow graph',
    path: 'g:\\work\\Visual-Workflow',
    tech: ['React', 'TypeScript', 'Tailwind CSS'],
    category: 'Development',
    status: 'ACTIVE',
    lastModified: 'Yesterday',
    branch: 'main',
  },
  {
    id: 'p-study',
    name: 'Study Platform',
    tagline: 'Interactive electronics & AI education workspace with online labs',
    path: 'g:\\work\\study-platform',
    tech: ['React', 'Node.js', 'PostgreSQL'],
    category: 'Development',
    status: 'ACTIVE',
    lastModified: '5 days ago',
    branch: 'master',
  },
  {
    id: 'p-starklabs',
    name: 'StarkLabs Control Center',
    tagline: 'Hardware telemetry, serial communication, and embedded device control',
    path: 'g:\\work\\starklabs-control-center',
    tech: ['ESP32', 'Arduino', 'C++', 'WebSocket'],
    category: 'Hardware',
    status: 'PLANNING',
    lastModified: '1 week ago',
    branch: 'dev',
  },
  {
    id: 'p-digital-ic',
    name: 'Digital-IC-Design',
    tagline: 'Digital logic verification and ASIC design lab with timing analysis',
    path: 'g:\\work\\Digital-IC-Design',
    tech: ['VHDL', 'Verilog', 'FPGA'],
    category: 'Hardware',
    status: 'RESEARCH',
    lastModified: '2 weeks ago',
    branch: 'main',
  },
  {
    id: 'p-3d-lab',
    name: '3D Printing Lab',
    tagline: 'Parametric CAD models and mechanical enclosures for electronics',
    path: 'g:\\work\\3D.starkLaBs',
    tech: ['Fusion 360', 'STL', 'Klipper'],
    category: 'Design',
    status: 'ACTIVE',
    lastModified: '5 days ago',
    branch: 'main',
  },
];

const CATEGORIES = ['All', 'Active', 'System', 'Development', 'Hardware', 'Design', 'Research'];

export const ProjectsHUDView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected project for inspection drawer
  const [inspectProject, setInspectProject] = useState<ProjectItem | null>(null);
  const [gitStatusOutput, setGitStatusOutput] = useState<string | null>(null);
  const [isLoadingGit, setIsLoadingGit] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // New Project Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjTagline, setNewProjTagline] = useState('');
  const [newProjCat, setNewProjCat] = useState<ProjectItem['category']>('Development');
  const [newProjTemplate, setNewProjTemplate] = useState('React + Vite');
  const [isCreatingProj, setIsCreatingProj] = useState(false);

  // Quick stats
  const totalCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length;

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchCat =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Active'
          ? p.status === 'ACTIVE'
          : p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.tech.some(t => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [projects, selectedCategory, searchQuery]);

  // Actions
  const handleOpenInVSCode = (project: ProjectItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.visionAPI?.launchApp) {
      window.visionAPI.launchApp('code', [project.path]);
    }
  };

  const handleOpenInExplorer = (project: ProjectItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.visionAPI?.openPath) {
      window.visionAPI.openPath(project.path);
    }
  };

  const handleOpenTerminal = (project: ProjectItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.visionAPI?.executeCommand) {
      window.visionAPI.executeCommand({
        command: `Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '${project.path}'"`,
      });
    }
  };

  const handleInspect = async (project: ProjectItem) => {
    setInspectProject(project);
    setGitStatusOutput(null);
    setIsLoadingGit(true);

    if (window.visionAPI?.executeCommand) {
      try {
        const res = await window.visionAPI.executeCommand({
          command: 'git status -s; git branch --show-current',
          cwd: project.path,
          timeout: 10000,
        });
        setGitStatusOutput(res.stdout || (res.success ? 'Working tree clean' : res.stderr || 'No git repository detected'));
      } catch (err: any) {
        setGitStatusOutput('Unable to inspect Git status: ' + err.message);
      } finally {
        setIsLoadingGit(false);
      }
    } else {
      setIsLoadingGit(false);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setIsCreatingProj(true);

    const safeName = newProjName.trim().replace(/\s+/g, '-');
    const targetPath = `g:\\work\\${safeName}`;

    try {
      if (window.visionAPI?.executeCommand) {
        await window.visionAPI.executeCommand({
          command: `mkdir -p "${targetPath}"`,
          cwd: 'g:\\work',
        });
      }

      const created: ProjectItem = {
        id: `p-${Date.now()}`,
        name: newProjName.trim(),
        tagline: newProjTagline.trim() || `Autonomous project workspace for ${newProjName.trim()}`,
        path: targetPath,
        tech: newProjTemplate === 'React + Vite' ? ['React', 'TypeScript', 'Vite', 'Tailwind'] :
              newProjTemplate === 'Node + TypeScript' ? ['Node.js', 'TypeScript'] :
              newProjTemplate === 'Python AI' ? ['Python', 'PyTorch', 'FastAPI'] : ['General'],
        category: newProjCat,
        status: 'ACTIVE',
        lastModified: 'Just now',
        branch: 'main',
      };

      setProjects([created, ...projects]);
      setShowNewModal(false);
      setNewProjName('');
      setNewProjTagline('');
      setInspectProject(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingProj(false);
    }
  };

  const getStatusBadge = (status: ProjectItem['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-vision-success/15 text-vision-success border-vision-success/40';
      case 'IN PROGRESS':
        return 'bg-vision-cyan/15 text-vision-cyan border-vision-cyan/40 shadow-glow-cyan-sm';
      case 'PLANNING':
        return 'bg-vision-gold/15 text-vision-gold border-vision-gold/40';
      case 'RESEARCH':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/40';
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between hud-scanline-overlay overflow-y-auto space-y-4 relative">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-vision-border/60 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-vision-cyan/15 border border-vision-cyan/30">
              <FolderGit2 className="w-4 h-4 text-vision-cyan" />
            </div>
            <h2 className="text-sm font-mono font-bold text-vision-text tracking-widest uppercase">
              PROJECTS & WORKSPACES HUB
            </h2>
          </div>
          <p className="text-[10px] font-mono text-vision-text-muted mt-1">
            Direct IDE launching, filesystem exploration, terminal execution, and Git monitoring.
          </p>
        </div>

        {/* Quick HUD Metrics Bar & New Project Button */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-center">
            <div className="text-[9px] font-mono text-vision-text-muted uppercase">Tracked</div>
            <div className="text-xs font-mono font-bold text-vision-cyan">{totalCount} Workspaces</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-vision-panel border border-vision-border text-center">
            <div className="text-[9px] font-mono text-vision-text-muted uppercase">Active</div>
            <div className="text-xs font-mono font-bold text-vision-teal">{activeCount} Running</div>
          </div>

          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-vision-bg font-mono text-xs font-bold shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all ml-1"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = cat === 'All'
              ? totalCount
              : cat === 'Active'
              ? activeCount
              : projects.filter(p => p.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  selectedCategory === cat
                    ? 'bg-vision-cyan/20 text-vision-cyan border-vision-cyan shadow-glow-cyan-sm font-bold'
                    : 'bg-vision-panel text-vision-text-secondary border-vision-border hover:text-vision-text hover:border-vision-border/80'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat ? 'bg-vision-cyan/30 text-white' : 'bg-black/30 text-vision-text-muted'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-vision-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, tech, or paths..."
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

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            onClick={() => handleInspect(proj)}
            className="hud-panel hud-corner rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-vision-cyan/60 hover:shadow-glow-cyan-sm hover:bg-vision-panel/90 transition-all group cursor-pointer"
          >
            {/* Card Header */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-mono text-sm font-bold text-vision-text group-hover:text-vision-cyan transition-colors flex items-center space-x-1.5">
                    <span>{proj.name}</span>
                  </h3>
                  <div className="text-[10px] font-mono text-vision-cyan/80 mt-0.5">
                    {proj.category} Workspace
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border uppercase shrink-0 ${getStatusBadge(proj.status)}`}>
                  {proj.status}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-[11px] text-vision-text-secondary mt-2 line-clamp-2 leading-relaxed">
                {proj.tagline}
              </p>

              {/* Workspace Directory Path */}
              <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-vision-border/80 flex items-center justify-between text-[10px] font-mono text-vision-text-muted group-hover:border-vision-border transition-colors">
                <span className="truncate max-w-[85%]">{proj.path}</span>
                {proj.branch && (
                  <span className="flex items-center space-x-1 text-vision-cyan shrink-0 ml-1">
                    <GitBranch className="w-2.5 h-2.5" />
                    <span>{proj.branch}</span>
                  </span>
                )}
              </div>

              {/* Tech Stack Chips */}
              <div className="flex flex-wrap gap-1.5 pt-2.5">
                {proj.tech.map((t, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-vision-panel border border-vision-border/80 text-[10px] font-mono text-vision-teal font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Interactive Controls */}
            <div className="pt-2.5 border-t border-vision-border/60 flex items-center justify-between text-[10px] font-mono">
              <span className="text-vision-text-muted">Updated {proj.lastModified}</span>

              {/* 1-Click Launch Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={(e) => handleOpenInVSCode(proj, e)}
                  className="px-2 py-1 rounded-lg bg-vision-cyan/10 border border-vision-cyan/30 text-vision-cyan hover:bg-vision-cyan/25 hover:text-white transition-colors flex items-center space-x-1"
                  title="Open in Visual Studio Code"
                >
                  <Code className="w-3 h-3" />
                  <span>VS Code</span>
                </button>

                <button
                  onClick={(e) => handleOpenInExplorer(proj, e)}
                  className="px-2 py-1 rounded-lg bg-vision-panel border border-vision-border text-vision-text-muted hover:text-white hover:border-vision-border/80 transition-colors flex items-center space-x-1"
                  title="Open in Windows Explorer"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Files</span>
                </button>

                <button
                  onClick={(e) => handleOpenTerminal(proj, e)}
                  className="px-2 py-1 rounded-lg bg-vision-panel border border-vision-border text-vision-text-muted hover:text-white hover:border-vision-border/80 transition-colors flex items-center space-x-1"
                  title="Open in PowerShell Terminal"
                >
                  <Terminal className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER NOTICE */}
      <div className="pt-2 border-t border-vision-border/60 flex items-center justify-between text-[10px] font-mono text-vision-text-muted shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-vision-cyan animate-ping" />
          <span>PROJECTS ENGINE: 1-CLICK LAUNCH TO VS CODE, EXPLORER, TERMINAL</span>
        </div>
        <div>
          Click any card to inspect Git branches, working tree diffs, and project statistics.
        </div>
      </div>

      {/* PROJECT INSPECTION DRAWER */}
      {inspectProject && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-150"
          onClick={() => setInspectProject(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-vision-bg border-l border-vision-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-vision-border/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-vision-panel border border-vision-cyan/40 shadow-glow-cyan-sm">
                  <FolderGit2 className="w-5 h-5 text-vision-cyan" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-mono font-bold text-vision-text">
                      {inspectProject.name}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${getStatusBadge(inspectProject.status)}`}>
                      {inspectProject.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-vision-cyan/90 mt-0.5">
                    Category: {inspectProject.category} &bull; Updated: {inspectProject.lastModified}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectProject(null)}
                className="p-1.5 rounded-xl bg-vision-panel border border-vision-border hover:border-vision-cyan text-vision-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Path and Actions Bar */}
            <div className="p-3 rounded-xl bg-vision-panel border border-vision-border space-y-2">
              <div className="text-[10px] font-mono text-vision-text-muted uppercase">Workspace Location</div>
              <div className="flex items-center justify-between gap-2 bg-black/50 p-2 rounded-lg border border-vision-border/80">
                <span className="text-xs font-mono text-vision-teal truncate">{inspectProject.path}</span>
                <button
                  onClick={() => handleCopyPath(inspectProject.path)}
                  className="text-vision-cyan hover:text-white shrink-0 p-1"
                  title="Copy Path"
                >
                  {copiedPath ? <Check className="w-3.5 h-3.5 text-vision-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* 3 Main Action Triggers */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleOpenInVSCode(inspectProject)}
                  className="py-2 px-3 rounded-xl bg-vision-cyan text-vision-bg font-mono font-bold text-xs flex items-center justify-center space-x-1.5 shadow-glow-cyan hover:brightness-110 transition-all"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Open in VS Code</span>
                </button>

                <button
                  onClick={() => handleOpenInExplorer(inspectProject)}
                  className="py-2 px-3 rounded-xl bg-vision-panel border border-vision-border text-vision-text hover:text-vision-cyan hover:border-vision-cyan font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Show in Explorer</span>
                </button>

                <button
                  onClick={() => handleOpenTerminal(inspectProject)}
                  className="py-2 px-3 rounded-xl bg-vision-panel border border-vision-border text-vision-text hover:text-vision-cyan hover:border-vision-cyan font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>PowerShell</span>
                </button>
              </div>
            </div>

            {/* Description & Tech */}
            <div className="p-3 rounded-xl bg-vision-panel/60 border border-vision-border space-y-2 text-xs">
              <div className="text-[10px] font-mono text-vision-text-muted uppercase">Project Overview</div>
              <p className="text-vision-text leading-relaxed">
                {inspectProject.tagline}
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                {inspectProject.tech.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-black/40 border border-vision-border text-vision-teal font-mono text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Live Git Status Inspector */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-vision-text flex items-center space-x-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-vision-cyan" />
                  <span>LIVE GIT REPOSITORY STATUS</span>
                </span>
                <button
                  onClick={() => handleInspect(inspectProject)}
                  disabled={isLoadingGit}
                  className="text-[10px] text-vision-cyan hover:text-white flex items-center space-x-1"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLoadingGit ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/70 border border-vision-border font-mono text-[11px] min-h-[140px] max-h-[220px] overflow-y-auto">
                {isLoadingGit ? (
                  <div className="h-28 flex flex-col items-center justify-center text-vision-cyan space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Inspecting git tree...</span>
                  </div>
                ) : (
                  <pre className="text-vision-teal leading-relaxed whitespace-pre-wrap">
                    {gitStatusOutput || 'No status available'}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {showNewModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowNewModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-vision-bg border border-vision-border rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-vision-border pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-vision-cyan/20 border border-vision-cyan">
                  <Plus className="w-4 h-4 text-vision-cyan" />
                </div>
                <h3 className="font-mono text-sm font-bold text-vision-text uppercase">
                  Create New Workspace Project
                </h3>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-vision-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-3.5 font-mono text-xs">
              <div>
                <label className="block text-vision-cyan font-bold mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Autonomous-Robotics-V2"
                  className="w-full px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                />
                <span className="text-[10px] text-vision-text-muted mt-0.5 block">
                  Will be initialized at: g:\work\{newProjName.trim() || '<name>'}
                </span>
              </div>

              <div>
                <label className="block text-vision-text font-bold mb-1">Tagline / Mission</label>
                <input
                  type="text"
                  value={newProjTagline}
                  onChange={(e) => setNewProjTagline(e.target.value)}
                  placeholder="e.g. Next-generation computer vision pipeline"
                  className="w-full px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-vision-text font-bold mb-1">Category</label>
                  <select
                    value={newProjCat}
                    onChange={(e) => setNewProjCat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  >
                    <option value="Development">Development</option>
                    <option value="Hardware">Hardware</option>
                    <option value="System">System</option>
                    <option value="Research">Research</option>
                    <option value="Design">Design</option>
                  </select>
                </div>

                <div>
                  <label className="block text-vision-text font-bold mb-1">Initial Stack Template</label>
                  <select
                    value={newProjTemplate}
                    onChange={(e) => setNewProjTemplate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  >
                    <option value="React + Vite">React + Vite</option>
                    <option value="Node + TypeScript">Node + TypeScript</option>
                    <option value="Python AI">Python AI</option>
                    <option value="Blank Folder">Blank Folder</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-vision-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-vision-panel border border-vision-border text-vision-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProj || !newProjName.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-vision-bg font-bold shadow-glow-cyan hover:brightness-110 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isCreatingProj ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Initialize Workspace</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
