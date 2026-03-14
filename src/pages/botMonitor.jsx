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
import BotSummaryCard from '@/components/botSummaryCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PlayCircle, PauseCircle, Settings, Loader2 } from 'lucide-react';
import BotSettingsModal from '../components/botSettingsModal';

// Background refresh interval — only for offline/health detection
// Running state is updated instantly via socket heartbeats
const REFRESH_INTERVAL = 15000;

// Socket.IO connection URL
// If VITE_API_URL is absolute (http://host/path) extract the origin.
// If it's relative (/up-bot-brain-api) the brain is on the same host — use window.location.origin.
const API_URL = import.meta.env.VITE_API_URL || '';
const SOCKET_ORIGIN = (() => {
  try {
    const u = new URL(API_URL);           // throws if relative
    return u.origin;                      // "https://server.com"
  } catch {
    return window.location.origin;        // relative URL → same host as dashboard
  }
})();

const BotMonitor = () => {
  const [bots, setBots]                       = useState([]);
  const [summary, setSummary]                 = useState({ total: 0, healthy: 0, stuck: 0, offline: 0 });
  const [agentStatusMap, setAgentStatusMap]   = useState({});
  const [pendingMap, setPendingMap]           = useState({});
  const [showSettings, setShowSettings]       = useState(false);
  const [activeBot, setActiveBot]             = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const pendingRef          = useRef({});
  pendingRef.current        = pendingMap;
  // Ref mirror of socketConnected so refreshAll (memoised with []) can read it
  const socketConnectedRef  = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const calculateSummary = (list) => {
    const s = { total: list.length, healthy: 0, stuck: 0, offline: 0 };
    for (const bot of list) {
      if (bot.healthStatus === 'healthy') s.healthy++;
      else if (bot.healthStatus === 'stuck') s.stuck++;
      else s.offline++;
    }
    return s;
  };

  // Full refresh from API (initial load + 15s fallback poll)
  const refreshAll = useCallback(async () => {
    try {
      const botList = await getBots();
      setBots(botList);
      setSummary(calculateSummary(botList));

      // When the socket is live it delivers real-time status via bot:heartbeat /
      // bot:command_ack — polling would only race against those events and cause
      // the "Stopped → Running" flicker.  Only poll when socket is offline.
      if (!socketConnectedRef.current) {
        const statusEntries = await Promise.all(
          botList.map(async (bot) => {
            try {
              const status = await checkBotStatus(bot.botId);
              return [bot.botId, status];
            } catch {
              return [bot.botId, 'unknown'];
            }
          })
        );
        setAgentStatusMap(Object.fromEntries(statusEntries));
      }
    } catch (err) {
      console.error('[refreshAll] error:', err.message);
    }
  }, []);

  // ── Socket.IO ────────────────────────────────────────────────────────────────

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
      console.log('[Socket] Connected to brain');
      setSocketConnected(true);
      socketConnectedRef.current = true;
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from brain');
      setSocketConnected(false);
      socketConnectedRef.current = false;
    });

    // Bot sent a heartbeat — update fields and mark as running instantly.
    // Guard: if this window already knows the bot is being stopped, ignore the
    // 'running' flip — this is the late heartbeat from the dying Electron process.
    socket.on('bot:heartbeat', ({ botId, status, message, jobUrl, lastSeen, healthStatus, stats }) => {
      setBots(prev => prev.map(b =>
        b.botId === botId
          ? { ...b, status, message, jobUrl, lastSeen, healthStatus: healthStatus || b.healthStatus, stats: stats || b.stats }
          : b
      ));
      if (pendingRef.current[botId] !== 'stopping') {
        setAgentStatusMap(prev => ({ ...prev, [botId]: 'running' }));
      }

      // Confirm start if dashboard was waiting
      if (pendingRef.current[botId] === 'starting') {
        setPendingMap(prev => ({ ...prev, [botId]: null }));
        toast.success('Bot is now running');
      }
    });

    // Brain broadcasts this when any dashboard window issues a start/stop command.
    // All open windows (including ones that didn't click the button) update their
    // pending state so their heartbeat guards work correctly too.
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

  // ── Command handler ──────────────────────────────────────────────────────────

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

    // Socket handles confirmation instantly.
    // Safety fallback: if no confirmation in 35s, do one manual check.
    setTimeout(async () => {
      if (pendingRef.current[botId]) {
        try {
          const status = await checkBotStatus(botId);
          setAgentStatusMap(prev => ({ ...prev, [botId]: status }));
          setPendingMap(prev => ({ ...prev, [botId]: null }));
          if (status === expected) {
            toast.success('Bot is now ' + expected);
          } else {
            toast.warning('Status unclear after 35s — showing latest from brain');
          }
        } catch {
          setPendingMap(prev => ({ ...prev, [botId]: null }));
        }
      }
    }, 35000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4">
      <BotSummaryCard summary={summary} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scraper Monitor</h1>
        <span className={cn(
          'text-xs font-medium px-2 py-1 rounded-full',
          socketConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        )}>
          {socketConnected ? 'Live' : 'Polling'}
        </span>
      </div>

      {bots.length === 0 ? (
        <div className="text-center text-gray-500">No bots found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => {
            const agentStatus = agentStatusMap[bot.botId];
            const pending     = pendingMap[bot.botId];
            const isRunning   = agentStatus === 'running';
            const isKnown     = agentStatus !== undefined;
            const isBusy      = !!pending;

            const agentStatusLabel = () => {
              if (pending === 'starting') return 'Starting...';
              if (pending === 'stopping') return 'Stopping...';
              if (!isKnown)              return 'Checking...';
              if (agentStatus === 'running') return 'Running';
              if (agentStatus === 'stopped') return 'Stopped';
              return agentStatus;
            };

            const agentStatusColor = () => {
              if (pending) return 'text-yellow-600';
              if (agentStatus === 'running') return 'text-green-600';
              if (agentStatus === 'stopped') return 'text-red-500';
              return 'text-gray-500';
            };

            return (
              <Card key={bot.botId} className="p-4 shadow-md">

                {/* ── Header ───────────────────────────────────────────── */}
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold text-lg">{bot.botId}</div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      bot.healthStatus === 'offline' ? 'bg-red-100 text-red-700'
                        : bot.healthStatus === 'stuck' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    )}>
                      {bot.healthStatus}
                    </span>
                    <button
                      onClick={() => { setActiveBot(bot); setShowSettings(true); }}
                      className="hover:text-black"
                    >
                      <Settings className="w-5 h-5 ml-1 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* ── Activity status ──────────────────────────────────── */}
                {(bot.healthStatus === 'healthy' || bot.healthStatus === 'stuck') && (
                  <>
                    <div className="text-sm text-gray-800 mb-1">
                      Status: <span className="font-medium">{bot.status}</span>
                    </div>
                    {bot.message && (
                      <div className="text-sm text-gray-700 mb-1">Msg: {bot.message}</div>
                    )}
                  </>
                )}

                {bot.jobUrl && (
                  <div className="text-sm truncate mb-1">
                    Job: <span className="text-gray-800">{bot.jobUrl}</span>
                  </div>
                )}

                {/* ── Stats ────────────────────────────────────────────── */}
                {bot.stats && (
                  <div className="text-xs text-gray-600 mb-2 space-y-2">

                    {/* Last cycle */}
                    <div className="border-t pt-1">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Cycle</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div>New Jobs: <span className="font-semibold text-green-700">{bot.stats.lastCycleJobsScraped ?? 0}</span></div>
                        <div>Found: <span className="font-semibold">{bot.stats.lastCycleFeedFound ?? 0}</span></div>
                        <div>Dupes: <span className="font-semibold">{bot.stats.lastCycleDuplicates ?? 0}</span></div>
                        <div>Filtered: <span className="font-semibold">{bot.stats.lastCycleFiltered ?? 0}</span></div>
                      </div>
                    </div>

                    {/* Lifetime */}
                    <div className="border-t pt-1">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Lifetime</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div>Jobs Scraped: <span className="font-semibold">{bot.stats.jobsScraped ?? 0}</span></div>
                        <div>Cycles: <span className="font-semibold">{bot.stats.cyclesCompleted ?? 0}</span></div>
                        <div>Feed Found: <span className="font-semibold">{bot.stats.feedJobsFound ?? 0}</span></div>
                        <div>Feed Pages: <span className="font-semibold">{bot.stats.feedPagesLoaded ?? 0}</span></div>
                        <div>Dupes Skipped: <span className="font-semibold">{bot.stats.duplicateJobsSkipped ?? 0}</span></div>
                        <div>Filtered: <span className="font-semibold">{bot.stats.jobsFiltered ?? 0}</span></div>
                        <div>Load Errors: <span className="font-semibold text-red-500">{bot.stats.jobLoadErrors ?? 0}</span></div>
                        <div>Cycle Errors: <span className="font-semibold text-red-500">{bot.stats.cycleErrors ?? 0}</span></div>
                        <div>CF Solves: <span className="font-semibold">{bot.stats.cloudflareSolves ?? 0}</span></div>
                        <div>CF Fails: <span className="font-semibold text-red-500">{bot.stats.cloudflareFailures ?? 0}</span></div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ── Last seen + agent status ─────────────────────────── */}
                <div className="text-xs text-gray-500 mb-1">
                  Last Seen: {formatTime(bot.lastSeen, { ago: true })}
                </div>
                <div className={cn('text-xs mb-2 font-medium', agentStatusColor())}>
                  Agent: {agentStatusLabel()}
                </div>

                {/* ── Start / Stop button ───────────────────────────────── */}
                <div className="flex justify-end items-center gap-2">
                  {pending && (
                    <span className="text-xs text-yellow-600 font-medium animate-pulse">
                      {pending === 'starting' ? 'Starting...' : 'Stopping...'}
                    </span>
                  )}
                  <button
                    onClick={() => handleToggle(bot)}
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
                    {isBusy ? (
                      <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                    ) : isRunning ? (
                      <PauseCircle className="w-8 h-8" />
                    ) : (
                      <PlayCircle className="w-8 h-8" />
                    )}
                  </button>
                </div>

              </Card>
            );
          })}

          {showSettings && activeBot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <BotSettingsModal botId={activeBot.botId} onClose={() => setShowSettings(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatTime = (input, opts = { ago: false }) => {
  if (!input) return 'unknown';
  const now  = Date.now();
  const time = typeof input === 'number' ? input : new Date(input).getTime();
  const diff = Math.max(0, opts.ago ? now - time : time);

  const totalSeconds = Math.floor(diff / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours)             parts.push(hours + 'h');
  if (minutes || hours)  parts.push(minutes + 'm');
  parts.push(seconds + 's');

  return opts.ago ? parts.join(' ') + ' ago' : parts.join(' ');
};

export default BotMonitor;
