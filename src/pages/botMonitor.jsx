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
  bot, botOnline, pending, isRunning, isKnown, isBusy,
  hasLiveSocket, onToggle, onSettings,
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

  return (
    <Card className="p-4 shadow-md space-y-3">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold text-base truncate">{bot.botId}</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Per-bot data-freshness indicator: Live = recent socket heartbeat */}
          <span className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1',
            hasLiveSocket ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          )}>
            {hasLiveSocket
              ? <Wifi className="w-3 h-3" />
              : <WifiOff className="w-3 h-3" />}
            {hasLiveSocket ? 'Live' : 'Polling'}
          </span>

          {/* Agent connectivity — computed from lastSeen, not DB healthStatus */}
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            botOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {botOnline ? 'online' : 'offline'}
          </span>

          {/* Stuck badge — only shown when genuinely stuck, separate from online/offline */}
          {bot.healthStatus === 'stuck' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              stuck
            </span>
          )}

          <button onClick={onSettings} className="text-gray-400 hover:text-gray-700 ml-1">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Operational status + live message + current job ────────────────── */}
      {/* Always shown when bot is online — NOT gated on DB healthStatus */}
      {botOnline && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {opCfg && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', opCfg.bg, opCfg.text)}>
                {opCfg.label}
              </span>
            )}
            {pending && (
              <span className="text-xs text-yellow-600 font-medium animate-pulse">
                {pending === 'starting' ? 'Starting...' : 'Stopping...'}
              </span>
            )}
          </div>
          {bot.message && (
            <div className="text-xs text-gray-600 break-all line-clamp-2">{bot.message}</div>
          )}
          {bot.jobUrl && (
            <div className="text-xs text-gray-500 truncate">
              <span className="font-medium text-gray-700">Job:</span> {bot.jobUrl}
            </div>
          )}
        </div>
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

      {/* ── Footer: last seen + start/stop button ─────────────────────────── */}
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="text-xs text-gray-500">
          Last Seen: {formatTimeAgo(bot.lastSeen)}
        </div>
        <div className="flex items-center gap-2">
          {pending && (
            <span className="text-xs text-yellow-600 font-medium animate-pulse">
              {pending === 'starting' ? 'Starting...' : 'Stopping...'}
            </span>
          )}
          <button
            onClick={onToggle}
            disabled={!isKnown || isBusy}
            className={cn(
              'text-blue-600 hover:text-blue-800 transition-colors',
              (!isKnown || isBusy) && 'cursor-not-allowed opacity-50'
            )}
            title={
              !isKnown  ? 'Checking...'
              : isBusy  ? pending + '...'
              : isRunning ? 'Stop Bot'
              : 'Start Bot'
            }
          >
            {isBusy
              ? <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              : isRunning
                ? <PauseCircle className="w-8 h-8" />
                : <PlayCircle className="w-8 h-8" />}
          </button>
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

  const pendingRef         = useRef({});
  pendingRef.current       = pendingMap;
  const socketConnectedRef = useRef(false);

  // Per-bot: timestamp of last socket heartbeat received for that bot.
  // Used to show the per-bot Live/Polling badge.
  const socketLastSeenRef  = useRef({});

  // Tick every 5s so timeAgo / isOnline values stay current without full re-renders
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Summary computed from bots state (uses isOnline, not DB healthStatus) ──
  const summary = {
    total:   bots.length,
    online:  bots.filter(isBotOnline).length,
    offline: bots.filter(b => !isBotOnline(b)).length,
    stuck:   bots.filter(b => b.healthStatus === 'stuck').length,
  };

  // ── Full refresh ─────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    try {
      const botList = await getBots();
      setBots(botList);

      // Only poll agent status when socket is offline (avoids "Stopped→Running" flicker)
      if (!socketConnectedRef.current) {
        const entries = await Promise.all(
          botList.map(async (bot) => {
            try {
              const status = await checkBotStatus(bot.botId);
              return [bot.botId, status];
            } catch {
              return [bot.botId, 'unknown'];
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
      lastCycleDurationMs, avgCycleDurationMs,
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
            }
          : b
      ));

      // Update agent status (guard: don't flip to running if we're stopping this bot)
      if (pendingRef.current[botId] !== 'stopping') {
        setAgentStatusMap(prev => ({ ...prev, [botId]: 'running' }));
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

    // Agent confirmed it executed the stop command
    socket.on('bot:command_ack', ({ botId, command, success }) => {
      if (command === 'stop') {
        if (success) {
          setAgentStatusMap(prev => ({ ...prev, [botId]: 'stopped' }));
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
    const botId     = bot.botId;
    const isRunning = agentStatusMap[botId] === 'running';
    const action    = isRunning ? 'stopping' : 'starting';
    const expected  = isRunning ? 'stopped'  : 'running';

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
          const status = await checkBotStatus(botId);
          setAgentStatusMap(prev => ({ ...prev, [botId]: status }));
          setPendingMap(prev => ({ ...prev, [botId]: null }));
          if (status !== expected) toast.warning('Status unclear after 35s — showing latest from brain');
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
            const botOnline    = isBotOnline(bot);
            const agentStatus  = agentStatusMap[bot.botId];
            const pending      = pendingMap[bot.botId];
            const isRunning    = agentStatus === 'running';
            const isKnown      = agentStatus !== undefined;
            const isBusy       = !!pending;

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
                isKnown={isKnown}
                isBusy={isBusy}
                hasLiveSocket={hasLiveSocket}
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
