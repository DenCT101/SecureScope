import { useState, useEffect, useRef, useCallback } from 'react';
import { createScan, getScans, getScanById } from '@/services/api';
import { Shield, Globe, Clock, Zap, Terminal, AlertTriangle, Info,
         ShieldCheck, RefreshCw, ChevronRight, Wifi, Cpu, Code2,
         Crosshair, Activity, AlertCircle, CheckCircle2, XCircle,
         Settings, Key, Eye, EyeOff, Check } from 'lucide-react';

// ─── Tool Definitions ────────────────────────────────────────────
const TOOLS = [
  {
    id: 'NIKTO',
    label: 'Nikto',
    desc: 'Web server vulnerability scanner',
    icon: Globe,
    color: '#00e5ff',
    tagColor: 'rgba(0,229,255,0.15)',
  },
  {
    id: 'NMAP',
    label: 'Nmap',
    desc: 'Network port & service scanner',
    icon: Wifi,
    color: '#8b5cf6',
    tagColor: 'rgba(139,92,246,0.15)',
  },
  {
    id: 'SEMGREP',
    label: 'Semgrep',
    desc: 'Static code analysis engine',
    icon: Code2,
    color: '#00ff87',
    tagColor: 'rgba(0,255,135,0.12)',
  },
];

// ─── Severity Config ─────────────────────────────────────────────
const SEVERITY = {
  HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   icon: AlertTriangle },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: AlertTriangle },
  LOW:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', icon: Info },
  INFO:   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.2)', icon: Info },
};

// ─── Fake terminal log lines shown during IN_PROGRESS ─────────────
const TERMINAL_LINES = [
  '> Initializing scanner engine...',
  '> Resolving DNS for target host...',
  '> Establishing HTTP connection...',
  '> Probing server headers...',
  '> Checking for common vulnerabilities...',
  '> Running HTTP method tests...',
  '> Testing for XSS injection vectors...',
  '> Scanning for exposed directories...',
  '> Checking SSL/TLS configuration...',
  '> Analyzing response codes...',
  '> Parsing vulnerability signatures...',
  '> Cross-referencing CVE database...',
  '> Finalizing report...',
];

// ─── Radar SVG Component ─────────────────────────────────────────
function RadarAnimation({ toolColor = '#00e5ff' }) {
  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      {/* Concentric rings */}
      {[200, 140, 80, 40].map((size, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1px solid ${toolColor}`,
            opacity: 0.15 + i * 0.08,
          }}
        />
      ))}
      {/* Ping ring — outer div centers, inner div animates so scale() doesn't fight translate() */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <div style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `1px solid ${toolColor}`,
          animation: 'pulse-ring 2s ease-out infinite',
          opacity: 0.6,
        }} />
      </div>
      {/* Sweep line */}
      <div style={{
        position: 'absolute',
        width: '50%',
        height: 2,
        top: '50%',
        left: '50%',
        transformOrigin: 'left center',
        animation: 'radar-sweep 3s linear infinite',
        background: `linear-gradient(90deg, transparent, ${toolColor})`,
        borderRadius: 9999,
      }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        width: 10,
        height: 10,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: toolColor,
        boxShadow: `0 0 12px ${toolColor}`,
      }} />
      {/* Blip dots */}
      {[
        { top: '25%', left: '70%', delay: '0.3s' },
        { top: '65%', left: '20%', delay: '1.1s' },
        { top: '45%', left: '80%', delay: '0.7s' },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 5,
            height: 5,
            top: pos.top,
            left: pos.left,
            borderRadius: '50%',
            background: toolColor,
            boxShadow: `0 0 8px ${toolColor}`,
            animation: `pulse-dot 1.8s ${pos.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Terminal Log Component ──────────────────────────────────────
function TerminalLog({ status }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [cursor, setCursor] = useState(true);
  const lineRef = useRef(0);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') { setVisibleLines([]); lineRef.current = 0; return; }
    const timer = setInterval(() => {
      if (lineRef.current < TERMINAL_LINES.length) {
        setVisibleLines(prev => [...prev, TERMINAL_LINES[lineRef.current]]);
        lineRef.current++;
      }
    }, 900);
    const blink = setInterval(() => setCursor(c => !c), 530);
    return () => { clearInterval(timer); clearInterval(blink); };
  }, [status]);

  if (status !== 'IN_PROGRESS' && status !== 'PENDING') return null;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '16px 20px',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      lineHeight: 1.8,
      color: '#94a3b8',
      maxHeight: 220,
      overflowY: 'auto',
    }}>
      {status === 'PENDING' && (
        <div style={{ color: '#f59e0b' }}>{'> Waiting in queue...'}</div>
      )}
      {visibleLines.map((line, i) => (
        <div key={i} style={{ color: i === visibleLines.length - 1 ? '#00e5ff' : '#64748b' }}>
          {line}
          {i === visibleLines.length - 1 && (
            <span style={{ opacity: cursor ? 1 : 0, color: '#00e5ff' }}>█</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(22,28,40,0.6)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.05)',
      padding: 16,
      marginBottom: 8,
    }}>
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: '40%' }} />
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    PENDING:     { label: 'In Queue',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: true },
    IN_PROGRESS: { label: 'Scanning', color: '#00e5ff', bg: 'rgba(0,229,255,0.10)',   dot: true },
    COMPLETED:   { label: 'Complete', color: '#00ff87', bg: 'rgba(0,255,135,0.10)',   dot: false },
    FAILED:      { label: 'Failed',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   dot: false },
  };
  const c = cfg[status] || cfg.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 9999,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      border: `1px solid ${c.color}33`,
    }}>
      {c.dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: c.color, display: 'inline-block',
          animation: 'pulse-dot 1.4s ease-in-out infinite',
        }} />
      )}
      {c.label}
    </span>
  );
}

// ─── Vulnerability Card ──────────────────────────────────────────
function VulnCard({ vuln, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY[vuln.severity] || SEVERITY.INFO;
  const Icon = sev.icon;

  return (
    <div
      className="animate-stagger-in"
      style={{
        animationDelay: `${index * 60}ms`,
        background: 'rgba(13,17,23,0.9)',
        border: `1px solid ${sev.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 8,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 4px 20px ${sev.color}18`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: sev.bg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} color={sev.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              padding: '1px 8px', borderRadius: 4,
              background: sev.bg, color: sev.color,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            }}>{vuln.severity}</span>
          </div>
          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            {vuln.message}
          </p>
          {vuln.translatedText && (
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.1)',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                marginBottom: 5, fontSize: 10, color: '#00e5ff',
                fontWeight: 600, letterSpacing: '0.06em',
              }}>
                <Zap size={10} /> AI EXPLANATION
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                {vuln.translatedText}
              </p>
            </div>
          )}
          {expanded && vuln.rawData && (
            <div style={{ marginTop: 10 }}>
              <pre style={{
                fontSize: 10, color: '#475569',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 6, padding: '8px 12px',
                overflow: 'auto', fontFamily: 'var(--font-mono)',
                lineHeight: 1.7, margin: 0,
              }}>
                {JSON.stringify(vuln.rawData, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <ChevronRight
          size={14}
          color="#475569"
          style={{
            flexShrink: 0, marginTop: 4,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
    </div>
  );
}

// ─── Idle Right Panel ────────────────────────────────────────────
function IdlePanel() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 24, padding: 40,
    }}>
      <div className="animate-float" style={{ opacity: 0.25 }}>
        <RadarAnimation toolColor="#00e5ff" />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
          Ready to Scan
        </h2>
        <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          Configure your target and select a scanner tool on the left, then launch a scan to see live results here.
        </p>
      </div>
      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Real-time results', 'AI explanations', 'Multi-tool support'].map(f => (
          <span key={f} style={{
            padding: '4px 12px', borderRadius: 9999,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, color: '#475569',
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel: Active Scan ────────────────────────────────────
function ActiveScanPanel({ scan }) {
  if (!scan) return <IdlePanel />;

  const tool = TOOLS.find(t => t.id === scan.toolType) || TOOLS[0];
  const vulns = scan.vulnerabilities || [];
  const isLive = scan.status === 'PENDING' || scan.status === 'IN_PROGRESS';
  const isComplete = scan.status === 'COMPLETED';
  const isFailed = scan.status === 'FAILED';

  // Progress bar for queue/scanning
  const ProgressBar = () => (
    <div style={{
      height: 2, background: 'rgba(255,255,255,0.05)',
      borderRadius: 9999, overflow: 'hidden', marginBottom: 24,
    }}>
      {isLive && (
        <div style={{
          height: '100%', width: '30%',
          background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)`,
          borderRadius: 9999,
          animation: 'progress-loop 1.8s ease-in-out infinite',
        }} />
      )}
      {isComplete && (
        <div style={{ height: '100%', width: '100%', background: '#00ff87', borderRadius: 9999 }} />
      )}
      {isFailed && (
        <div style={{ height: '100%', width: '100%', background: '#ef4444', borderRadius: 9999 }} />
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <ProgressBar />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: tool.tagColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <tool.icon size={14} color={tool.color} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                color: tool.color, textTransform: 'uppercase',
              }}>{tool.label}</span>
              <StatusBadge status={scan.status} />
            </div>
            <h2 style={{
              fontSize: 15, fontWeight: 600, color: '#e2e8f0',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{scan.url}</h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} />
                {new Date(scan.createdAt).toLocaleString()}
              </span>
              {isComplete && (
                <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={11} />
                  {vulns.length} findings
                </span>
              )}
            </div>
          </div>
          {/* Status icon */}
          <div style={{ flexShrink: 0 }}>
            {isLive && <Activity size={18} color={tool.color} style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />}
            {isComplete && <CheckCircle2 size={18} color="#00ff87" />}
            {isFailed && <XCircle size={18} color="#ef4444" />}
          </div>
        </div>

        {/* Metadata grid */}
        {scan.metadata && Object.keys(scan.metadata).length > 0 && (
          <div style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '6px 16px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            {Object.entries(scan.metadata).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(v)}>{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body: live log or vulnerability list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {isLive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
            <RadarAnimation toolColor={tool.color} />
            <TerminalLog status={scan.status} />
          </div>
        )}

        {isFailed && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '60%', gap: 12, textAlign: 'center',
          }}>
            <XCircle size={40} color="#ef4444" style={{ opacity: 0.5 }} />
            <p style={{ color: '#64748b', fontSize: 14 }}>Scan failed. Please try again.</p>
          </div>
        )}

        {isComplete && vulns.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '60%', gap: 12, textAlign: 'center',
          }}>
            <CheckCircle2 size={40} color="#00ff87" style={{ opacity: 0.5 }} />
            <p style={{ color: '#64748b', fontSize: 14 }}>No vulnerabilities found. Target looks clean!</p>
          </div>
        )}

        {isComplete && vulns.length > 0 && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16, paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <Terminal size={13} color="#64748b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.06em' }}>
                FINDINGS — {vulns.length} TOTAL
              </span>
            </div>
            {vulns.map((v, i) => <VulnCard key={v.id} vuln={v} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History Item ────────────────────────────────────────────────
function HistoryItem({ scan, isActive, onClick }) {
  const tool = TOOLS.find(t => t.id === scan.toolType) || TOOLS[0];
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
        background: isActive ? 'rgba(0,229,255,0.06)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: tool.tagColor, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <tool.icon size={12} color={tool.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: '#94a3b8', fontFamily: 'var(--font-mono)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {scan.url.replace(/^https?:\/\//, '')}
        </div>
        <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>
          {new Date(scan.createdAt).toLocaleDateString()}
        </div>
      </div>
      <StatusBadge status={scan.status} />
    </div>
  );
}

// ─── Main Split Layout ────────────────────────────────────────────
export default function SplitLayout() {
  const [url, setUrl] = useState('');
  const [selectedTool, setSelectedTool] = useState('NIKTO');
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  // ── Settings / BYOK ───────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('securescope_gemini_key') || '');
  const [showKey, setShowKey] = useState(false);

  // Persist Gemini key to localStorage
  useEffect(() => {
    if (geminiKey) localStorage.setItem('securescope_gemini_key', geminiKey);
    else localStorage.removeItem('securescope_gemini_key');
  }, [geminiKey]);

  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(true);

  const [activeScanId, setActiveScanId] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [activeScanLoading, setActiveScanLoading] = useState(false);

  const pollRef = useRef(null);

  // ── Load scan history ─────────────────────────────────────────
  const loadScans = useCallback(async () => {
    try {
      const data = await getScans();
      setScans(data.data || []);
    } catch (_) {}
    finally { setScansLoading(false); }
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  // ── Poll active scan ──────────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeScanId) { setActiveScan(null); return; }

    setActiveScanLoading(true);

    async function fetch() {
      try {
        const data = await getScanById(activeScanId);
        const s = data.data;
        setActiveScan(s);
        setActiveScanLoading(false);

        // Update the scan in the history list
        setScans(prev => prev.map(sc => sc.id === s.id ? { ...sc, status: s.status } : sc));

        if (s.status === 'COMPLETED' || s.status === 'FAILED') {
          clearInterval(pollRef.current);
          loadScans(); // Refresh history
        }
      } catch (_) { setActiveScanLoading(false); }
    }

    fetch();
    pollRef.current = setInterval(fetch, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeScanId, loadScans]);

  // ── Launch scan ───────────────────────────────────────────────
  async function handleLaunch(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLaunchError('');
    setLaunching(true);
    try {
      const res = await createScan(url, selectedTool, geminiKey || null);
      const newScanId = res.data?.id;
      await loadScans();
      if (newScanId) setActiveScanId(newScanId);
      setUrl('');
    } catch (err) {
      setLaunchError(err.message);
    } finally {
      setLaunching(false);
    }
  }

  const activeTool = TOOLS.find(t => t.id === selectedTool) || TOOLS[0];

  return (
    <div className="split-layout">
      {/* ══════════════════════════════════════════ */}
      {/* LEFT PANEL                                 */}
      {/* ══════════════════════════════════════════ */}
      <div className="left-panel">
        {/* Brand Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="animate-logo-glow" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="#00e5ff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                SecureScope
              </div>
              <div style={{ fontSize: 10, color: '#374151', letterSpacing: '0.06em' }}>
                SECURITY SCANNER
              </div>
            </div>
            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                width: 30, height: 30, borderRadius: 7,
                background: showSettings ? 'rgba(0,229,255,0.1)' : 'transparent',
                border: `1px solid ${showSettings ? 'rgba(0,229,255,0.25)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              title="Settings"
            >
              <Settings size={14} color={showSettings ? '#00e5ff' : '#475569'} />
            </button>
          </div>

          {/* Settings Panel (collapsible) */}
          {showSettings && (
            <div className="animate-slide-up" style={{
              marginTop: 14, padding: '12px 14px',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}>
              {/* Gemini API Key */}
              <div style={{ marginBottom: 2 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 600, color: '#475569',
                  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
                }}>
                  <Key size={10} />
                  GEMINI API KEY
                  {geminiKey && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '1px 6px', borderRadius: 9999,
                      background: 'rgba(0,255,135,0.1)', color: '#00ff87',
                      fontSize: 9, fontWeight: 700, marginLeft: 'auto',
                    }}>
                      <Check size={8} /> SET
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 34px 7px 10px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, fontSize: 11,
                      color: '#94a3b8', outline: 'none',
                      fontFamily: 'var(--font-mono)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.3)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    style={{
                      position: 'absolute', right: 8, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#475569', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <p style={{ fontSize: 9, color: '#334155', marginTop: 5, lineHeight: 1.5 }}>
                  Stored locally in your browser. Never sent to any server except Google's Gemini API.
                  {' '}<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: '#00e5ff', textDecoration: 'none' }}>Get a free key →</a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scan Launcher Form */}
        <div style={{ padding: '20px', flexShrink: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#475569', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Target URL</label>
            <div style={{ position: 'relative' }}>
              <Crosshair
                size={14} color="#475569"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="url"
                placeholder="https://target.example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 32px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, fontSize: 13,
                  color: '#e2e8f0', outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          {/* Tool Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#475569', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Scanner Tool</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TOOLS.map(tool => {
                const isSelected = selectedTool === tool.id;
                return (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? tool.tagColor : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? tool.color + '50' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: isSelected ? tool.tagColor : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <tool.icon size={14} color={isSelected ? tool.color : '#475569'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: isSelected ? tool.color : '#94a3b8',
                      }}>{tool.label}</div>
                      <div style={{ fontSize: 10, color: '#374151' }}>{tool.desc}</div>
                    </div>
                    {isSelected && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: tool.color,
                        boxShadow: `0 0 8px ${tool.color}`,
                        animation: 'pulse-dot 1.4s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {launchError && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 7,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12, color: '#ef4444',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertCircle size={12} /> {launchError}
            </div>
          )}

          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            disabled={launching || !url.trim()}
            style={{
              width: '100%', padding: '11px 16px',
              borderRadius: 8, border: 'none', cursor: launching ? 'not-allowed' : 'pointer',
              background: launching || !url.trim()
                ? 'rgba(255,255,255,0.05)'
                : `linear-gradient(135deg, ${activeTool.color}cc, ${activeTool.color}88)`,
              color: launching || !url.trim() ? '#374151' : '#080c14',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: launching || !url.trim() ? 'none' : `0 0 20px ${activeTool.color}30`,
            }}
            onMouseEnter={e => {
              if (!launching && url.trim()) {
                e.currentTarget.style.boxShadow = `0 0 30px ${activeTool.color}50`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = `0 0 20px ${activeTool.color}30`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {launching ? (
              <><RefreshCw size={14} style={{ animation: 'radar-sweep 1s linear infinite' }} /> Queuing...</>
            ) : (
              <><Zap size={14} /> Launch Scan</>
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={{
          padding: '0 20px 10px',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ fontSize: 10, color: '#374151', fontWeight: 600, letterSpacing: '0.06em' }}>
              HISTORY
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>

        {/* Scan History List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 12px 16px',
        }}>
          {scansLoading ? (
            <div style={{ padding: '0 8px' }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : scans.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 20px',
              color: '#374151', fontSize: 12,
            }}>
              No scans yet. Launch your first scan above.
            </div>
          ) : (
            scans.map(scan => (
              <HistoryItem
                key={scan.id}
                scan={scan}
                isActive={activeScanId === scan.id}
                onClick={() => setActiveScanId(scan.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* RIGHT PANEL                                */}
      {/* ══════════════════════════════════════════ */}
      <div className="right-panel">
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(13,17,23,0.6)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: activeScan && (activeScan.status === 'PENDING' || activeScan.status === 'IN_PROGRESS')
                ? '#00e5ff'
                : activeScan?.status === 'COMPLETED'
                  ? '#00ff87'
                  : '#334155',
              boxShadow: activeScan?.status === 'IN_PROGRESS' ? '0 0 8px #00e5ff' : 'none',
              animation: activeScan?.status === 'IN_PROGRESS' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', letterSpacing: '0.06em' }}>
              {activeScan
                ? activeScan.status === 'IN_PROGRESS' ? 'LIVE SCAN'
                : activeScan.status === 'PENDING' ? 'IN QUEUE'
                : activeScan.status === 'COMPLETED' ? 'SCAN RESULTS'
                : 'SCAN FAILED'
                : 'READY'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={12} color="#374151" />
            <span style={{ fontSize: 11, color: '#374151', fontFamily: 'var(--font-mono)' }}>
              SecureScope v1.0
            </span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeScanLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', flexDirection: 'column', gap: 16,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '2px solid rgba(0,229,255,0.2)',
                borderTop: '2px solid #00e5ff',
                animation: 'radar-sweep 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 12, color: '#374151' }}>Loading scan...</span>
            </div>
          ) : (
            <ActiveScanPanel scan={activeScan} />
          )}
        </div>
      </div>
    </div>
  );
}
