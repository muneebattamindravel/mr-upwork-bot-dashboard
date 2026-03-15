'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getBots,
  startBotRemote,
  stopBotRemote,
  checkBotStatus,
} from '@/apis/bots';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PlayCircle, PauseCircle, Settings, Loader2, Wifi, WifiOff } from 'lucide-react';
import BotSettingsModal from '../components/botSettingsModal';

// Background refresh — only for initial load + offline health fallback
const REFRESH_INTERVAL = 15000;

const API_URL = import.meta.env.VITE_API_URL || '';
const SOCKET_ORIGIN = (() => {
  try { return new URL(API_URL).origin; }
  catch { return window.location.origin; }
})();

// ─── Operational status config ────────────────────────────────────────────────
// Each scraper status string → human label + Tailwind color pair
const STATUS_CONFIG = {
  idle:                { label: 'Idle',           bg: 'bg-gray-100',    text: 'text-gray-600'    },
  navigating_feed:     { label: 'Loading Feed',   bg: 'bg-blue-100',    text: 'text-blue-700'    },
  scraping_feed:       { label: 'Scraping Feed',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
  visiting_job_detail: { label: 'Loading Job',    bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  scraping_job:        { label: 'Scraping Job',   bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  saving_to_db:        { label: 'Saving',         bg: 'bg-teal-100',    text: 'text-teal-700'    },
  cycle_complete:      { label: 'Cycle Done ✓',   bg: 'bg-green-100',   text: 'text-green-700'   },
  cloudflare_detected: { label: 'Cloudflare ⚡',  bg: 'bg-orange-100',  text: 'text-orange-700'  },
  cloudflare_passed:   { label: 'CF Solved ✓',    bg: 'bg-lime-100',    text: 'text-lime-700'    },
  cloudflare_failed:   { label: 'CF Failed ✗',    bg: 'bg-red-100',     text: 'text-red-700'     },
  cycle_error:         { label: 'Error',           bg: 'bg-red-100',     text: 'text-red-700'     },
  job_load_failed:     { label: 'Load Failed',     bg: 'bg-red-100',     text: 'text-red-700'     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Compute whether a bot is currently online from heartbeat recency.
// This is the source of truth for Online/Offline — NOT the DB healthStatus field,
// which can lag by up to the cron interval (15s) due to the cron write cycle.
const isBotOnline = (bot) => {
  if (bot.forceStopped) return false;
  if (!bot.lastSeen) return false;
  const interval = bot.settings?.heartbeatInterval || 10000;
  return (Date.now() - new Date(bot.lastSeen).getTime()) < interval * 5;
};

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '—';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatTimeAgo = (input) => {
  if (!input) return 'never';
  const diff = Math.max(0, Date.now() - new Date(input).getTime());
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts = [];
  if (h) parts.push(h + 'h');
  if (m || h) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ') + ' ago';
};

// ─── Module-level sub-components ──────────────────────────────────────────────
// IMPORTANT: must be defined at module level, not inside BotMonitor.
// Defining them inside causes Radix/shadcn to remount on every parent render.

// ── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ pct, color = 'bg-blue-500' }) => (
  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
    <div
      className={cn('h-full rounded-full transition-all duration-500', color)}
      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
    />
  </div>
);

// ── Active cycle progress panel ───────────────────────────────────────────────
// Shown when bot is online and NOT idle — displays cycle #, category and job progress
const ActiveProgressPanel = ({ bot, opCfg, pending }) => {
  const p         = bot.currentProgress || {};
  const cycleNum  = (bot.stats?.cyclesCompleted || 0) + 1;
  const qIdx      = p.queryIndex  || 0;
  const qTotal    = p.queryTotal  || 0;
  const qName     = p.queryName   || (qTotal > 0 ? `Category ${qIdx}` : '');
  const jIdx      = p.jobIndex    || 0;
  const jTotal    = p.jobTotal    || 0;
  const catPct    = qTotal > 0 ? (qIdx / qTotal) * 100 : 0;
  const jobPct    = jTotal > 0 ? (jIdx / jTotal) * 100 : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">

      {/* Row 1: cycle number + status pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cycle</span>
          <span className="text-sm font-extrabold text-slate-800">#{cycleNum}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {opCfg && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', opCfg.bg, opCfg.text)}>
              {opCfg.label}
            </span>
          )}
          {pending && (
            <span className="text-xs text-yellow-600 font-semibold animate-pulse">
              {pending === 'starting' ? 'Starting…' : 'Stopping…'}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: category/query name — always shown when available, prominent tag */}
      {qName ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex-shrink-0">
            {qTotal > 1 ? 'Category' : 'Query'}
          </span>
          <span className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-lg truncate max-w-xs',
            qTotal > 1
              ? 'bg-purple-100 text-purple-800'   // category URL mode
              : 'bg-blue-100 text-blue-800'        // keyword search mode
          )}>
            {qName}
          </span>
          {qTotal > 1 && (
            <span className="text-xs text-slate-400 font-medium flex-shrink-0 tabular-nums">
              {qIdx} / {qTotal}
            </span>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic animate-pulse">Starting cycle…</div>
      )}

      {/* Category sweep progress bar — only shown when multi-category */}
      {qTotal > 1 && (
        <div className="space-y-1">
          <ProgressBar pct={catPct} color="bg-purple-400" />
        </div>
      )}

      {/* Job progress within current category */}
      {jTotal > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Job</span>
            <span className="font-semibold text-slate-700 tabular-nums">{jIdx} / {jTotal}</span>
          </div>
          <ProgressBar pct={jobPct} color="bg-blue-500" />
        </div>
      )}

      {/* Running cycle totals — 4 big numbers, updated every heartbeat */}
      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-200">
        <div className="flex flex-col items-center">
          <span className="text-lg font-extrabold tabular-nums text-slate-700">{p.found ?? 0}</span>
          <span className="text-xs text-slate-400 mt-0.5">Found</span>
        </div>
        <div className="flex flex-col items-center">
          <span className={cn('text-lg font-extrabold tabular-nums', (p.newJobs ?? 0) > 0 ? 'text-green-600' : 'text-slate-700')}>{p.newJobs ?? 0}</span>
          <span className="text-xs text-slate-400 mt-0.5">New</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-extrabold tabular-nums text-slate-700">{p.dupes ?? 0}</span>
          <span className="text-xs text-slate-400 mt-0.5">Dupes</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-extrabold tabular-nums text-slate-700">{p.filtered ?? 0}</span>
          <span className="text-xs text-slate-400 mt-0.5">Filtered</span>
        </div>
      </div>

      {/* Current job title / message */}
      {bot.message && (
        <div className="text-xs text-slate-600 truncate pt-1 border-t border-slate-200 font-medium">
          {bot.message}
        </div>
      )}

      {/* Job URL — muted, truncated */}
      {bot.jobUrl && (
        <div className="text-xs text-slate-400 truncate -mt-1">
          {bot.jobUrl}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => {
  const variants = {
    gray:   { bg: 'bg-gray-100',   num: 'text-gray-800',   sub: 'text-gray-600'   },
    green:  { bg: 'bg-green-100',  num: 'text-green-800',  sub: 'text-green-700'  },
    red:    { bg: 'bg-red-100',    num: 'text-red-800',    sub: 'text-red-700'    },
    yellow: { bg: 'bg-yellow-100', num: 'text-yellow-800', sub: 'text-yellow-700' },
  };
  const v = variants[color] || variants.gray;
  return (
    <div className={cn('rounded-xl p-4 flex flex-col items-center justify-center shadow-sm', v.bg)}>
      <div className={cn('text-3xl font-bold', v.num)}>{value}</div>
      <div className={cn('text-sm mt-0.5', v.sub)}>{label}</div>
    </div>
  );
};

const StatRow = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500">{label}</span>
    <span className={cn('font-semibold tabular-nums', highlight || 'text-gray-800')}>{value ?? '—'}</span>
  </div>
);

const CycleStat = ({ label, value, highlight }) => (
  <div className="flex flex-col items-center">
    <div className={cn('text-xl font-bold tabular-nums', highlight || 'text-gray-700')}>{value ?? 0}</div>
    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
  </div>
);

const SectionLabel = ({ children }) => (
  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{children}</div>
);

const BotCard = ({
  bot, botOnline, pending, isRunning, isAgentUp, isBusy,
  hasLiveSocket, agentStatus, idleInfo, onToggle, onSettings,
}) => {
  const s = bot.stats || {};

  const opCfg = bot.status
    ? (STATUS_CONFIG[bot.status] || { label: bot.status, bg: 'bg-gray-100', text: 'text-gray-600' })
    : null;

  const sessionUptime     = bot.sessionStartedAt
    ? formatDuration(Date.now() - new Date(bot.sessionStartedAt).getTime()) : '—';
  const totalActiveTime   = formatDuration(s.totalActiveTime || 0);
  const lastCycleDuration = formatDuration(bot.lastCycleDurationMs || 0);
  const avgCycleDuration  = bot.avgCycleDurationMs
    ? formatDuration(bot.avgCycleDurationMs) : '—';

  // ── Derive Agent status (is the agent.js process alive?) ────────────────
  // agentStatus prop: 'running' | 'unknown' | 'offline' | undefined
  // forceStopped is intentionally NOT used here — it only reflects scraper state,
  // not agent state. agent.js keeps running even after scraper is stopped.
  const agentLabel = agentStatus === 'running'
    ? { text: 'Running',  dot: 'bg-green-500',  tx: 'text-green-700' }
    : agentStatus === 'offline'
      ? { text: 'Offline',  dot: 'bg-red-500',    tx: 'text-red-600'   }
      : agentStatus === 'unknown'
        ? { text: 'Unknown',  dot: 'bg-yellow-400', tx: 'text-yellow-600' }
        : { text: 'Checking…',dot: 'bg-gray-400',   tx: 'text-gray-500'  };

  // ── Derive Scraper status (what is the scraper doing right now?) ──────────
  // Source of truth: lastSeen recency + bot.status field + healthStatus cron field.
  const scraperLabel = (() => {
    if (bot.forceStopped)               return { text: 'Stopped',  dot: 'bg-red-500',    tx: 'text-red-600'    };
    if (!botOnline)                     return { text: 'Offline',  dot: 'bg-red-400',    tx: 'text-red-500'    };
    if (bot.healthStatus === 'stuck')   return { text: 'Stuck',    dot: 'bg-yellow-500', tx: 'text-yellow-700' };
    if (bot.status === 'idle')          return { text: 'Idle',     dot: 'bg-gray-400',   tx: 'text-gray-600'   };
    if (bot.status)                     return { text: opCfg?.label || bot.status, dot: 'bg-blue-500', tx: 'text-blue-700' };
    return                                     { text: 'Online',   dot: 'bg-green-500',  tx: 'text-green-700'  };
  })();

  return (
    <Card className="p-4 shadow-md space-y-3">

      {/* ── Header: bot ID + gear ───────────────────────────────────────────── */}
      <div className="flex justify-between items-center gap-2">
        <div className="font-bold text-base truncate">{bot.botId}</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Socket freshness — small technical indicator */}
          <span className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1',
            hasLiveSocket ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
          )}>
            {hasLiveSocket ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {hasLiveSocket ? 'Live' : 'Polling'}
          </span>
          <button onClick={onSettings} className="text-gray-400 hover:text-gray-700">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Two clear status boxes ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Agent box — status + agent last seen */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Agent</div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', agentLabel.dot)} />
            <span className={cn('text-sm font-bold truncate', agentLabel.tx)}>{agentLabel.text}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1 truncate">
            {bot.agentLastSeen ? formatTimeAgo(bot.agentLastSeen) : 'Never'}
          </div>
        </div>

        {/* Scraper box — status + scraper last seen + start/stop button */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Scraper</div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0 animate-pulse', scraperLabel.dot)} />
              <span className={cn('text-sm font-bold truncate', scraperLabel.tx)}>{scraperLabel.text}</span>
            </div>
            <button
              onClick={onToggle}
              disabled={!isAgentUp || isBusy}
              className={cn(
                'flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors',
                (!isAgentUp || isBusy) && 'cursor-not-allowed opacity-40'
              )}
              title={
                !isAgentUp  ? 'Agent offline — cannot send command'
                : isBusy    ? (pending === 'starting' ? 'Starting…' : 'Stopping…')
                : isRunning ? 'Stop Scraper'
                : 'Start Scraper'
              }
            >
              {isBusy
                ? <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                : isRunning
                  ? <PauseCircle className="w-6 h-6" />
                  : <PlayCircle className="w-6 h-6" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-400 truncate">
              {bot.lastSeen ? formatTimeAgo(bot.lastSeen) : 'Never'}
            </div>
            {pending && (
              <div className="text-xs text-yellow-600 font-medium animate-pulse">
                {pending === 'starting' ? 'Starting…' : 'Stopping…'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Live activity panel — always shown when online ───────────────── */}
      {botOnline && (
        bot.status === 'idle' && idleInfo ? (
          /* Idle: countdown + last category scraped */
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cycle</span>
                <span className="text-sm font-extrabold text-slate-800">
                  #{bot.stats?.cyclesCompleted || 0}
                </span>
                {/* Last category name — persists from cycle_complete heartbeat */}
                {bot.currentProgress?.queryName && (
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full truncate max-w-[160px]">
                    {bot.currentProgress.queryName}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500">Complete</span>
            </div>
            {(() => {
              const remaining = Math.max(0, idleInfo.totalSecs - (Date.now() - idleInfo.receivedAt) / 1000);
              const remSecs   = Math.ceil(remaining);
              const m = Math.floor(remSecs / 60);
              const s = remSecs % 60;
              const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
              const pct   = Math.max(0, Math.min(100, (remaining / idleInfo.totalSecs) * 100));
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Next cycle in</span>
                    <span className="font-bold tabular-nums text-slate-800">{label}</span>
                  </div>
                  <ProgressBar pct={pct} color="bg-slate-400" />
                </div>
              );
            })()}
          </div>
        ) : (
          /* Active: cycle + category/job progress */
          <ActiveProgressPanel bot={bot} opCfg={opCfg} pending={pending} />
        )
      )}

      {/* ── Timing section ────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Timing</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <StatRow label="Session Uptime"  value={sessionUptime} />
          <StatRow label="Total Active"    value={totalActiveTime} />
          <StatRow label="Last Cycle"      value={lastCycleDuration} />
          <StatRow label="Avg Cycle"       value={avgCycleDuration} />
        </div>
      </div>

      {/* ── Last Cycle ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Last Cycle</SectionLabel>
        <div className="grid grid-cols-4 gap-1 text-xs text-center">
          <CycleStat label="Found"    value={s.lastCycleFeedFound    ?? 0} />
          <CycleStat label="New"      value={s.lastCycleJobsScraped  ?? 0}
            highlight={(s.lastCycleJobsScraped ?? 0) > 0 ? 'text-green-700' : null} />
          <CycleStat label="Dupes"    value={s.lastCycleDuplicates   ?? 0} />
          <CycleStat label="Filtered" value={s.lastCycleFiltered     ?? 0} />
        </div>
      </div>

      {/* ── Lifetime ──────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Lifetime</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <StatRow label="Jobs Scraped"   value={s.jobsScraped          ?? 0} />
          <StatRow label="Cycles"         value={s.cyclesCompleted       ?? 0} />
          <StatRow label="Feed Found"     value={s.feedJobsFound         ?? 0} />
          <StatRow label="Feed Pages"     value={s.feedPagesLoaded       ?? 0} />
          <StatRow label="Dupes Skipped"  value={s.duplicateJobsSkipped  ?? 0} />
          <StatRow label="Filtered"       value={s.jobsFiltered          ?? 0} />
          <StatRow label="Load Errors"    value={s.jobLoadErrors         ?? 0}
            highlight={(s.jobLoadErrors ?? 0) > 0 ? 'text-red-500' : null} />
          <StatRow label="Cycle Errors"   value={s.cycleErrors           ?? 0}
            highlight={(s.cycleErrors ?? 0) > 0 ? 'text-red-500' : null} />
          <StatRow label="CF Solves"      value={s.cloudflareSolves      ?? 0} />
          <StatRow label="CF Fails"       value={s.cloudflareFailures    ?? 0}
            highlight={(s.cloudflareFailures ?? 0) > 0 ? 'text-orange-500' : null} />
        </div>
      </div>

    </Card>
  );
};

// ─── Main page component ──────────────────────────────────────────────────────

const BotMonitor = () => {
  const [bots, setBots]             = useState([]);
  const [agentStatusMap, setAgentStatusMap] = useState({});
  const [pendingMap, setPendingMap] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [activeBot, setActiveBot]   = useState(null);
  // idleInfoMap[botId] = { totalSecs, receivedAt } — set on idle, cleared on any other status
  const [idleInfoMap, setIdleInfoMap] = useState({});

  const pendingRef         = useRef({});
  pendingRef.current       = pendingMap;
  const socketConnectedRef = useRef(false);

  // Per-bot: timestamp of last socket heartbeat received for that bot.
  // Used to show the per-bot Live/Polling badge.
  const socketLastSeenRef  = useRef({});

  // Tick every 1s — drives countdown timer when idle + keeps timeAgo/isOnline fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Summary computed from bots state (uses isOnline, not DB healthStatus) ──
  const summary = {
    total:   bots.length,
    online:  bots.filter(isBotOnline).length,
    offline: bots.filter(b => !isBotOnline(b)).length,
    stuck:   bots.filter(b => b.healthStatus === 'stuck').length,
  };

  // Whether this is the very first load (agent status always checked on first load)
  const isFirstLoadRef = useRef(true);

  // ── Full refresh ─────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    try {
      const botList = await getBots();
      setBots(botList);

      // Always check agent status on the very first page load so the user immediately
      // gets accurate Running/Stopped state regardless of socket connection timing.
      // On subsequent polls: only check when socket is offline to avoid flicker.
      const shouldCheckAgent = isFirstLoadRef.current || !socketConnectedRef.current;
      if (shouldCheckAgent) {
        isFirstLoadRef.current = false;
        const entries = await Promise.all(
          botList.map(async (bot) => {
            try {
              // checkBotStatus now returns full { agentStatus, scraperStatus, status, ... }
              const statusData = await checkBotStatus(bot.botId);
              return [bot.botId, statusData];
            } catch {
              return [bot.botId, { agentStatus: 'unknown', scraperStatus: 'stopped' }];
            }
          })
        );
        setAgentStatusMap(Object.fromEntries(entries));
      }
    } catch (err) {
      console.error('[refreshAll]', err.message);
    }
  }, []);

  // ── Socket.IO ────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshAll();
    const pollInterval = setInterval(refreshAll, REFRESH_INTERVAL);

    const socket = io(SOCKET_ORIGIN, {
      path: '/up-bot-brain-api/socket.io',
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 15000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socketConnectedRef.current = true;
    });
    socket.on('disconnect', () => {
      socketConnectedRef.current = false;
    });

    socket.on('bot:heartbeat', ({
      botId, status, message, jobUrl, lastSeen, healthStatus, forceStopped,
      stats, sessionStartedAt, lastCycleStartedAt, lastCycleEndedAt,
      lastCycleDurationMs, avgCycleDurationMs, currentProgress,
    }) => {
      // Record per-bot socket update time for Live/Polling badge
      socketLastSeenRef.current[botId] = Date.now();

      setBots(prev => prev.map(b =>
        b.botId === botId
          ? {
              ...b,
              status, message, jobUrl, lastSeen,
              healthStatus:        healthStatus        ?? b.healthStatus,
              forceStopped:        forceStopped        ?? b.forceStopped,
              stats:               stats               ?? b.stats,
              sessionStartedAt:    sessionStartedAt    ?? b.sessionStartedAt,
              lastCycleStartedAt:  lastCycleStartedAt  ?? b.lastCycleStartedAt,
              lastCycleEndedAt:    lastCycleEndedAt    ?? b.lastCycleEndedAt,
              lastCycleDurationMs: lastCycleDurationMs ?? b.lastCycleDurationMs,
              avgCycleDurationMs:  avgCycleDurationMs  ?? b.avgCycleDurationMs,
              currentProgress:     currentProgress     ?? b.currentProgress,
            }
          : b
      ));

      // Track idle countdown: parse "Sleeping for X.Xs before next cycle"
      // Only record receivedAt on the FIRST idle heartbeat — subsequent idle pings
      // must NOT reset it or the countdown oscillates back to the full value every 10s.
      if (status === 'idle') {
        const m = message?.match(/Sleeping for ([\d.]+)s/);
        if (m) {
          setIdleInfoMap(prev => {
            if (prev[botId]) return prev; // already tracking — keep original receivedAt
            return { ...prev, [botId]: { totalSecs: parseFloat(m[1]), receivedAt: Date.now() } };
          });
        }
      } else {
        setIdleInfoMap(prev => { const n = { ...prev }; delete n[botId]; return n; });
      }

      // Update agent status (guard: don't flip to running if we're stopping this bot)
      // Heartbeat confirms both agent and scraper are alive
      if (pendingRef.current[botId] !== 'stopping') {
        setAgentStatusMap(prev => ({
          ...prev,
          [botId]: { ...(prev[botId] || {}), agentStatus: 'running', scraperStatus: 'running' },
        }));
      }
      // Confirm start if dashboard was waiting
      if (pendingRef.current[botId] === 'starting') {
        setPendingMap(prev => ({ ...prev, [botId]: null }));
        toast.success('Bot is now running');
      }
    });

    // Brain broadcasts this on every start/stop — ALL open windows sync pending state
    socket.on('bot:status_changing', ({ botId, action }) => {
      setPendingMap(prev => ({ ...prev, [botId]: action }));
    });

    // Agent confirmed it executed the stop command.
    // Only mark scraperStatus: 'stopped' — agent itself stays running.
    socket.on('bot:command_ack', ({ botId, command, success }) => {
      if (command === 'stop') {
        if (success) {
          setAgentStatusMap(prev => ({
            ...prev,
            [botId]: { ...(prev[botId] || {}), scraperStatus: 'stopped' },
            // agentStatus intentionally NOT changed — agent.js keeps running
          }));
          if (pendingRef.current[botId] === 'stopping') {
            setPendingMap(prev => ({ ...prev, [botId]: null }));
            toast.success('Bot stopped');
          }
        } else {
          setPendingMap(prev => ({ ...prev, [botId]: null }));
          toast.error('Stop command failed on agent');
        }
      }
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [refreshAll]);

  // ── Command handler ───────────────────────────────────────────────────────
  const handleToggle = async (bot) => {
    const botId      = bot.botId;
    const agentIsUp  = agentStatusMap[botId]?.agentStatus === 'running';
    if (!agentIsUp) return;  // agent offline — button should already be disabled, but safety guard
    const scraperRunning = isBotOnline(bot);                 // is the scraper currently running?
    const isRunning  = scraperRunning;
    const action     = isRunning ? 'stopping' : 'starting';
    const expected   = isRunning ? 'stopped'  : 'running';

    setPendingMap(prev => ({ ...prev, [botId]: action }));

    try {
      const res = isRunning ? await stopBotRemote(botId) : await startBotRemote(botId);
      toast.success(res.message || 'Command sent');
    } catch {
      toast.error('Failed to send command');
      setPendingMap(prev => ({ ...prev, [botId]: null }));
      return;
    }

    // Socket delivers confirmation instantly; this is just a 35s safety fallback
    setTimeout(async () => {
      if (pendingRef.current[botId]) {
        try {
          const statusData = await checkBotStatus(botId);
          setAgentStatusMap(prev => ({ ...prev, [botId]: statusData }));
          setPendingMap(prev => ({ ...prev, [botId]: null }));
          if (statusData?.agentStatus !== expected) toast.warning('Status unclear after 35s — showing latest from brain');
        } catch {
          setPendingMap(prev => ({ ...prev, [botId]: null }));
        }
      }
    }, 35000);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">

      {/* Summary cards — 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Bots" value={summary.total}   color="gray"   />
        <SummaryCard label="Online"     value={summary.online}  color="green"  />
        <SummaryCard label="Offline"    value={summary.offline} color="red"    />
        <SummaryCard label="Stuck"      value={summary.stuck}   color="yellow" />
      </div>

      <h1 className="text-2xl font-bold">Scraper Monitor</h1>

      {bots.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No bots found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map((bot) => {
            const botOnline       = isBotOnline(bot);
            const agentStatusData = agentStatusMap[bot.botId];  // full { agentStatus, scraperStatus }
            const agentStatus     = agentStatusData?.agentStatus; // string for BotCard
            const pending         = pendingMap[bot.botId];
            const isRunning       = botOnline;                   // scraper is sending heartbeats
            const isAgentUp       = agentStatus === 'running';   // agent can accept start/stop commands
            const isBusy          = !!pending;

            // Per-bot Live badge: did we receive a socket heartbeat for this bot recently?
            const hasLiveSocket =
              socketLastSeenRef.current[bot.botId] != null &&
              (Date.now() - socketLastSeenRef.current[bot.botId]) < 20000;

            return (
              <BotCard
                key={bot.botId}
                bot={bot}
                botOnline={botOnline}
                pending={pending}
                isRunning={isRunning}
                isAgentUp={isAgentUp}
                isBusy={isBusy}
                hasLiveSocket={hasLiveSocket}
                agentStatus={agentStatus}
                idleInfo={idleInfoMap[bot.botId] || null}
                onToggle={() => handleToggle(bot)}
                onSettings={() => { setActiveBot(bot); setShowSettings(true); }}
              />
            );
          })}
        </div>
      )}

      {showSettings && activeBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <BotSettingsModal botId={activeBot.botId} onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
};

export default BotMonitor;
