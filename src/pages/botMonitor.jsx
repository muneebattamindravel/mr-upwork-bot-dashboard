'use client';

import React, { useEffect, useRef, useState } from 'react';
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

// How long to wait for a command to be confirmed before giving up (ms)
const COMMAND_CONFIRM_TIMEOUT = 30000;
// How often to re-check status while a command is pending (ms)
const COMMAND_POLL_INTERVAL = 3000;
// How often to refresh bot list + statuses in background (ms)
const REFRESH_INTERVAL = 5000;

const BotMonitor = () => {
  const [bots, setBots]                   = useState([]);
  const [summary, setSummary]             = useState({ total: 0, healthy: 0, stuck: 0, offline: 0 });
  const [agentStatusMap, setAgentStatusMap] = useState({});
  // pendingMap: { [botId]: 'starting' | 'stopping' } — optimistic UI while command propagates
  const [pendingMap, setPendingMap]       = useState({});
  const [showSettings, setShowSettings]   = useState(false);
  const [activeBot, setActiveBot]         = useState(null);

  // Refs to safely access latest state inside setInterval callbacks
  const pendingRef      = useRef({});
  const agentStatusRef  = useRef({});
  pendingRef.current    = pendingMap;
  agentStatusRef.current = agentStatusMap;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const calculateSummary = (list) => {
    const s = { total: list.length, healthy: 0, stuck: 0, offline: 0 };
    for (const bot of list) {
      if (bot.healthStatus === 'healthy') s.healthy++;
      else if (bot.healthStatus === 'stuck') s.stuck++;
      else s.offline++;
    }
    return s;
  };

  // Fetch agent status for a single bot and update state
  const refreshStatus = async (botId) => {
    try {
      const status = await checkBotStatus(botId);
      setAgentStatusMap(prev => ({ ...prev, [botId]: status }));
      return status;
    } catch {
      setAgentStatusMap(prev => ({ ...prev, [botId]: 'unknown' }));
      return 'unknown';
    }
  };

  // Full refresh: bot list + all agent statuses
  const refreshAll = async () => {
    try {
      const botList = await getBots();
      setBots(botList);
      setSummary(calculateSummary(botList));

      await Promise.all(botList.map(bot => refreshStatus(bot.botId)));
    } catch (err) {
      console.error('[refreshAll] ❌', err.message);
    }
  };

  // ── Mount: initial load + polling interval ─────────────────────────────────

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── Command handler ────────────────────────────────────────────────────────

  const handleToggle = async (bot) => {
    const botId     = bot.botId;
    const isRunning = agentStatusMap[botId] === 'running';
    const action    = isRunning ? 'stopping' : 'starting';
    const expected  = isRunning ? 'stopped'  : 'running';

    // Optimistically show pending state immediately
    setPendingMap(prev => ({ ...prev, [botId]: action }));

    try {
      const res = isRunning
        ? await stopBotRemote(botId)
        : await startBotRemote(botId);

      toast.success(res.message || `Command queued — ${action}...`);
    } catch (err) {
      toast.error(`Failed to send command`);
      setPendingMap(prev => ({ ...prev, [botId]: null }));
      return;
    }

    // Poll status until it reaches the expected state or we time out
    const deadline = Date.now() + COMMAND_CONFIRM_TIMEOUT;

    const pollUntilConfirmed = async () => {
      if (Date.now() > deadline) {
        toast.warning(`⚠️ Command sent but status didn't confirm within 30s — check agent`);
        setPendingMap(prev => ({ ...prev, [botId]: null }));
        return;
      }

      const status = await refreshStatus(botId);

      if (status === expected) {
        // Confirmed — clear pending state
        setPendingMap(prev => ({ ...prev, [botId]: null }));
        toast.success(`✅ Bot is now ${expected}`);
        // Also refresh the full bot list to pick up healthStatus changes
        const freshBots = await getBots();
        setBots(freshBots);
        setSummary(calculateSummary(freshBots));
      } else {
        // Not yet — check again after COMMAND_POLL_INTERVAL
        setTimeout(pollUntilConfirmed, COMMAND_POLL_INTERVAL);
      }
    };

    // Give the agent a moment to pick up the command before first check
    setTimeout(pollUntilConfirmed, COMMAND_POLL_INTERVAL);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4">
      <BotSummaryCard summary={summary} />
      <h1 className="text-2xl font-bold mb-4">🧠 Bot Monitor</h1>

      {bots.length === 0 ? (
        <div className="text-center text-gray-500">No bots found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => {
            const agentStatus = agentStatusMap[bot.botId];
            const pending     = pendingMap[bot.botId]; // 'starting' | 'stopping' | undefined
            const isRunning   = agentStatus === 'running';
            const isKnown     = agentStatus !== undefined;
            const isBusy      = !!pending; // disable button while command is in flight

            // What to show in the Agent Status row
            const agentStatusLabel = () => {
              if (pending === 'starting') return '🟡 Starting...';
              if (pending === 'stopping') return '🟡 Stopping...';
              if (!isKnown)              return '⌛ Checking...';
              if (agentStatus === 'running')  return '🟢 Running';
              if (agentStatus === 'stopped')  return '🔴 Stopped';
              return `⚪ ${agentStatus}`;
            };

            return (
              <Card key={bot.botId} className="p-4 shadow-md">

                {/* ── Header: botId + health badge + settings ─────────── */}
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

                {/* ── Activity status + message ────────────────────────── */}
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
                  <div className="text-xs text-gray-600 mb-2 space-y-1">
                    <div>📊 Jobs Scraped: <span className="font-semibold">{bot.stats.jobsScraped ?? 0}</span></div>
                    <div>⏱️ Active Time: <span className="font-semibold">{formatTime(bot.stats.totalActiveTime)}</span></div>
                    <div>🛡️ Cloudflare Hurdles: <span className="font-semibold">{bot.stats.cloudflareHurdles ?? 0}</span></div>
                    <div>✅ Cloudflare Solves: <span className="font-semibold">{bot.stats.cloudflareSolves ?? 0}</span></div>
                    <div>🔐 Login Hurdles: <span className="font-semibold">{bot.stats.loginHurdles ?? 0}</span></div>
                  </div>
                )}

                {/* ── Last seen + agent status ─────────────────────────── */}
                <div className="text-xs text-gray-500 mb-1">
                  Last Seen: {formatTime(bot.lastSeen, { ago: true })}
                </div>

                <div className="text-xs text-gray-500 mb-2 font-medium">
                  Agent: {agentStatusLabel()}
                </div>

                {/* ── Start / Stop button ───────────────────────────────── */}
                <div className="flex justify-end items-center gap-2">
                  {pending && (
                    <span className="text-xs text-yellow-600 font-medium animate-pulse">
                      {pending === 'starting' ? 'Starting bot...' : 'Stopping bot...'}
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
                      !isKnown  ? 'Checking agent status...'
                        : isBusy  ? `${pending}...`
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
  if (hours)           parts.push(`${hours}h`);
  if (minutes || hours) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return opts.ago ? `${parts.join(' ')} ago` : parts.join(' ');
};

export default BotMonitor;
