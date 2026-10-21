import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Camera, 
  Scan, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  Send, 
  AppWindow, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Maximize2,
  FolderOpen,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { visionService, ScreenAnalysisResult } from '../../core/vision/VisionService';
import { FormattedResponse } from '../components/FormattedResponse';

interface RunningApp {
  pid: number;
  name: string;
  title: string;
  memoryMb: number;
}

export const VisionHUDView: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotMeta, setScreenshotMeta] = useState<{
    filePath?: string;
    width?: number;
    height?: number;
    screenName?: string;
  } | null>(null);

  const [activeWindow, setActiveWindow] = useState<string>('Detecting active window...');
  const [runningApps, setRunningApps] = useState<RunningApp[]>([]);
  const [selectedAppIndex, setSelectedAppIndex] = useState<number | null>(0);

  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  // Fetch running applications on mount
  useEffect(() => {
    refreshRunningApps();
  }, []);

  const refreshRunningApps = async () => {
    if (window.visionAPI?.getRunningApps) {
      try {
        const apps = await window.visionAPI.getRunningApps();
        setRunningApps(apps);
        if (apps.length > 0) {
          const focused = apps.find(a => a.title && a.title.trim().length > 0) || apps[0];
          setActiveWindow(focused.title || focused.name);
        }
      } catch (err) {
        console.warn('Failed to enumerate running apps:', err);
      }
    }
  };

  // Capture screen and run AI vision reasoning
  const handleCaptureAndAnalyze = async (specificPrompt?: string) => {
    setIsCapturing(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    const start = performance.now();

    try {
      // 1. Refresh running processes to get real desktop state
      await refreshRunningApps();

      // 2. Take desktop screenshot
      if (!window.visionAPI?.takeScreenshot) {
        throw new Error('Desktop visionAPI.takeScreenshot is not available.');
      }

      const shot = await window.visionAPI.takeScreenshot();
      if (!shot.success || !shot.dataUrl) {
        throw new Error(shot.error || 'Failed to capture desktop screenshot.');
      }

      setScreenshotUrl(shot.dataUrl);
      setScreenshotMeta({
        filePath: shot.filePath,
        width: shot.width,
        height: shot.height,
        screenName: shot.screenName || 'Display 0',
      });
      setIsCapturing(false);

      // 3. Multimodal Vision Reasoning & OCR
      const promptText = specificPrompt || 
        'Analyze this desktop screen thoroughly:\n' +
        '1. Open Applications & Active Window: Identify visible windows and current focus.\n' +
        '2. Text & Code Inspection: Summarize any open code, terminal commands, or text.\n' +
        '3. Errors & Status: Check for any syntax errors, warnings, or alerts.\n' +
        'Provide a clean, structured overview in English.';

      const visionRes = await visionService.analyzeImage(shot.dataUrl, promptText);

      setAnalysisDuration(Math.round(performance.now() - start));
      if (visionRes.success) {
        setAnalysisResult(visionRes.analysis);
        setModelUsed(visionRes.modelUsed);
      } else {
        setAnalysisError(visionRes.error || 'Vision analysis could not be completed.');
        setAnalysisResult(visionRes.analysis || null);
        setModelUsed(visionRes.modelUsed);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Screen capture and analysis failed.');
    } finally {
      setIsCapturing(false);
      setIsAnalyzing(false);
    }
  };

  // Preset action triggers
  const handlePresetAction = (type: 'explain' | 'ocr' | 'errors' | 'custom') => {
    if (!screenshotUrl) {
      handleCaptureAndAnalyze();
      return;
    }

    if (type === 'ocr') {
      const p = 'Extract and transcribe all visible text, code snippets, titles, and terminal logs from this image verbatim. Format cleanly in Markdown.';
      handleReanalyze(p);
    } else if (type === 'explain') {
      const p = 'Explain the active code and user interface shown on this screen in detail. Break down the components and data flow.';
      handleReanalyze(p);
    } else if (type === 'errors') {
      const p = 'Scan this screen specifically for errors, bug traces, syntax errors, or terminal warnings. Explain the root cause and provide fix suggestions.';
      handleReanalyze(p);
    }
  };

  // Reanalyze existing captured screenshot with a new prompt
  const handleReanalyze = async (promptToUse: string) => {
    if (!screenshotUrl) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    const start = performance.now();

    try {
      const visionRes = await visionService.analyzeImage(screenshotUrl, promptToUse);
      setAnalysisDuration(Math.round(performance.now() - start));
      if (visionRes.success) {
        setAnalysisResult(visionRes.analysis);
        setModelUsed(visionRes.modelUsed);
      } else {
        setAnalysisError(visionRes.error || 'Analysis failed.');
        setAnalysisResult(visionRes.analysis);
        setModelUsed(visionRes.modelUsed);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenScreenshotFolder = () => {
    if (screenshotMeta?.filePath && window.visionAPI?.openPath) {
      window.visionAPI.openPath(screenshotMeta.filePath);
    }
  };

  const handleCopyAnalysis = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between hud-scanline-overlay overflow-y-auto space-y-4">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-vision-border/60">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-vision-cyan/15 border border-vision-cyan flex items-center justify-center text-vision-cyan shadow-glow-cyan-sm">
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-vision-text tracking-widest uppercase flex items-center space-x-2">
              <span>VISION MODE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-vision-cyan/20 text-vision-cyan border border-vision-cyan/40">
                SCREEN PERCEPTION & OCR HUD
              </span>
            </h2>
            <p className="text-[10px] font-mono text-vision-text-muted">
              Live Neural Vision • Optical UI Segmentation & Multimodal Reasoning
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {screenshotMeta?.filePath && (
            <button
              onClick={handleOpenScreenshotFolder}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-vision-panel border border-vision-border text-xs font-mono text-vision-text-muted hover:text-white hover:border-vision-cyan transition-colors"
              title="Open screenshot file on disk"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open File</span>
            </button>
          )}

          <button
            onClick={() => handleCaptureAndAnalyze()}
            disabled={isCapturing || isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-vision-bg font-mono text-xs font-bold shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isCapturing || isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span>
              {isCapturing 
                ? 'CAPTURING SCREEN...' 
                : isAnalyzing 
                ? 'ANALYZING WITH AI...' 
                : 'CAPTURE & ANALYZE SCREEN'}
            </span>
          </button>
        </div>
      </div>

      {/* Main 2-Column HUD Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        
        {/* Left: Real Screen Inspection Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="hud-panel hud-corner rounded-2xl p-4 space-y-3 relative overflow-hidden">
            
            {/* Viewport Header */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-vision-cyan flex items-center space-x-2 font-semibold truncate max-w-[70%]">
                <Scan className="w-4 h-4 animate-pulse shrink-0" />
                <span className="truncate">Active Window: {activeWindow}</span>
              </span>
              <span className="text-[10px] text-vision-text-muted shrink-0">
                {screenshotMeta ? `${screenshotMeta.width} × ${screenshotMeta.height} • ${screenshotMeta.screenName}` : 'Display 0 • Ready'}
              </span>
            </div>

            {/* Live Captured Screen Canvas */}
            <div className="relative aspect-video rounded-xl bg-vision-bg border border-vision-border/80 overflow-hidden group">
              {screenshotUrl ? (
                <>
                  <img 
                    src={screenshotUrl} 
                    alt="Real Captured Desktop Screen" 
                    className="w-full h-full object-contain bg-black cursor-pointer"
                    onClick={() => setIsFullscreenImage(true)}
                  />
                  <button
                    onClick={() => setIsFullscreenImage(true)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View Full Resolution"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                /* Ready State Display */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-vision-surface via-vision-panel to-vision-bg text-center space-y-3">
                  <div className="p-4 rounded-2xl bg-vision-cyan/10 border border-vision-cyan/30 text-vision-cyan animate-pulse">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-vision-text uppercase">
                      Desktop Optical Sensor Ready
                    </h3>
                    <p className="text-[11px] font-mono text-vision-text-muted mt-1 max-w-sm">
                      Click <strong className="text-vision-cyan">"CAPTURE & ANALYZE SCREEN"</strong> to snapshot your real desktop and run neural visual reasoning.
                    </p>
                  </div>
                </div>
              )}

              {/* Scanning Laser Beam */}
              {(isCapturing || isAnalyzing) && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-vision-cyan to-transparent shadow-glow-cyan animate-scanline"></div>
              )}
            </div>

            {/* Interactive Suggested Vision Actions */}
            <div className="pt-2">
              <div className="text-[11px] font-mono font-bold uppercase text-vision-text-secondary mb-2 flex items-center justify-between">
                <span>Interactive Vision Tools</span>
                <span className="text-[9px] text-vision-text-muted font-normal">Click to trigger analysis</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <button 
                  onClick={() => handlePresetAction('explain')}
                  disabled={isAnalyzing}
                  className="p-2.5 rounded-xl bg-vision-panel hover:bg-vision-cyan/15 text-vision-text hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/40 text-left transition-colors disabled:opacity-50"
                >
                  <div className="font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-vision-cyan" />
                    <span>1. Explain Code</span>
                  </div>
                  <div className="text-[10px] text-vision-text-muted mt-0.5">Analyze logic & UI</div>
                </button>

                <button 
                  onClick={() => handlePresetAction('ocr')}
                  disabled={isAnalyzing}
                  className="p-2.5 rounded-xl bg-vision-panel hover:bg-vision-cyan/15 text-vision-text hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/40 text-left transition-colors disabled:opacity-50"
                >
                  <div className="font-bold flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>2. OCR Extract</span>
                  </div>
                  <div className="text-[10px] text-vision-text-muted mt-0.5">Transcribe all text</div>
                </button>

                <button 
                  onClick={() => handlePresetAction('errors')}
                  disabled={isAnalyzing}
                  className="p-2.5 rounded-xl bg-vision-panel hover:bg-vision-cyan/15 text-vision-text hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/40 text-left transition-colors disabled:opacity-50"
                >
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>3. Find Errors</span>
                  </div>
                  <div className="text-[10px] text-vision-text-muted mt-0.5">Scan bugs & alerts</div>
                </button>

                <button 
                  onClick={() => handleCaptureAndAnalyze()}
                  disabled={isCapturing || isAnalyzing}
                  className="p-2.5 rounded-xl bg-vision-panel hover:bg-vision-cyan/15 text-vision-text hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/40 text-left transition-colors disabled:opacity-50"
                >
                  <div className="font-bold flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 text-sky-400" />
                    <span>4. Rescan Live</span>
                  </div>
                  <div className="text-[10px] text-vision-text-muted mt-0.5">New live capture</div>
                </button>
              </div>

              {/* Custom AI Prompt Input for Screen */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim()) {
                      handleReanalyze(customPrompt);
                      setCustomPrompt('');
                    }
                  }}
                  placeholder="Ask Vision AI anything about this screen (e.g. 'What is written on line 32?')..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-vision-panel border border-vision-border text-xs font-mono text-vision-text placeholder-vision-text-muted outline-none focus:border-vision-cyan transition-colors"
                />
                <button
                  onClick={() => {
                    if (customPrompt.trim()) {
                      handleReanalyze(customPrompt);
                      setCustomPrompt('');
                    }
                  }}
                  disabled={!customPrompt.trim() || isAnalyzing}
                  className="px-3.5 py-2 rounded-xl bg-vision-cyan/20 border border-vision-cyan text-vision-cyan hover:bg-vision-cyan/30 text-xs font-mono font-bold flex items-center space-x-1 transition-colors disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                  <span>Ask</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Right: Detected Windows & AI Vision Intelligence (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Real Detected Running Applications */}
          <div className="hud-panel hud-corner rounded-2xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold tracking-widest uppercase text-vision-cyan flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Detected Windows & Processes ({runningApps.length})</span>
              </span>
              <button 
                onClick={refreshRunningApps}
                className="text-[10px] text-vision-text-muted hover:text-vision-cyan flex items-center space-x-1"
                title="Refresh Running Applications"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
              {runningApps.length === 0 ? (
                <div className="p-3 text-center text-vision-text-muted text-[11px]">
                  No active application windows detected.
                </div>
              ) : (
                runningApps.slice(0, 10).map((app, i) => (
                  <div
                    key={`${app.pid}-${i}`}
                    onClick={() => {
                      setSelectedAppIndex(i);
                      if (app.title) setActiveWindow(app.title);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                      selectedAppIndex === i
                        ? 'bg-vision-panel border-vision-cyan text-vision-cyan shadow-glow-cyan-sm'
                        : 'bg-vision-surface/60 border-vision-border/60 text-vision-text hover:bg-vision-panel'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-vision-bg border border-vision-border flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-[11px] truncate">{app.name}</div>
                        {app.title && (
                          <div className="text-[9px] text-vision-text-muted truncate">{app.title}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-vision-text-muted shrink-0 ml-2">
                      {app.memoryMb ? `${app.memoryMb} MB` : `PID ${app.pid}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real AI Multimodal Vision Reasoning */}
          <div className="hud-panel hud-corner rounded-2xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] border-b border-vision-border/80 pb-2">
              <div className="font-bold tracking-widest uppercase text-vision-cyan flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Vision Reasoning</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {analysisDuration !== null && (
                  <span className="text-[10px] text-vision-text-muted flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{analysisDuration}ms</span>
                  </span>
                )}
                {analysisResult && (
                  <button
                    onClick={handleCopyAnalysis}
                    className="p-1 rounded bg-vision-panel border border-vision-border text-vision-text-muted hover:text-white"
                    title="Copy Analysis"
                  >
                    {copied ? <Check className="w-3 h-3 text-vision-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Model Badge */}
            {modelUsed && (
              <div className="flex items-center space-x-1.5 text-[9px] text-vision-cyan">
                <Cpu className="w-2.5 h-2.5" />
                <span>Engine: {modelUsed}</span>
              </div>
            )}

            {/* Error state */}
            {analysisError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] leading-relaxed">
                {analysisError}
              </div>
            )}

            {/* Analysis Content */}
            <div className="min-h-[160px] max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
              {isAnalyzing ? (
                <div className="h-40 flex flex-col items-center justify-center text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-vision-cyan animate-spin" />
                  <p className="text-xs text-vision-text">Running Multimodal Vision Reasoning...</p>
                  <p className="text-[10px] text-vision-text-muted">Analyzing pixels, layout, and textual elements</p>
                </div>
              ) : analysisResult ? (
                <div className="text-[11px] text-vision-text leading-relaxed">
                  <FormattedResponse content={analysisResult} />
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-vision-text-muted space-y-1">
                  <Scan className="w-6 h-6 opacity-40 mb-1" />
                  <p className="text-xs">No active analysis loaded.</p>
                  <p className="text-[10px]">Click "CAPTURE & ANALYZE SCREEN" above to generate a live synthesis.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {isFullscreenImage && screenshotUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsFullscreenImage(false)}
        >
          <div className="relative max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-vision-cyan/40 shadow-glow-cyan">
            <img 
              src={screenshotUrl} 
              alt="Fullscreen Screen Capture" 
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <div className="p-3 bg-vision-bg/90 border-t border-vision-border flex items-center justify-between text-xs font-mono">
              <span className="text-vision-cyan">
                {screenshotMeta?.width} × {screenshotMeta?.height} • {screenshotMeta?.screenName}
              </span>
              <button 
                onClick={() => setIsFullscreenImage(false)}
                className="px-3 py-1 rounded bg-vision-panel border border-vision-border text-white hover:border-vision-cyan"
              >
                Close (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
