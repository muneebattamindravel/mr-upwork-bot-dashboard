'use client';

import React, { useEffect, useState } from 'react';
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
import { PlayCircle, PauseCircle, Settings } from 'lucide-react';

import BotSettingsModal from '../components/botSettingsModal';

const BotMonitor = () => {
  const [bots, setBots] = useState([]);
  const [summary, setSummary] = useState({ total: 0, healthy: 0, stuck: 0, offline: 0 });
  const [loadingMap, setLoadingMap] = useState({});
  const [agentStatusMap, setAgentStatusMap] = useState({}); // Track agent status per bot


  const [showSettings, setShowSettings] = useState(false);
  const [activeBot, setActiveBot] = useState(null);

  // 🔁 Load bots and update their agent status once
  const loadBots = async () => {
    try {
      const botList = await getBots();
      setBots(botList);
      setSummary(calculateSummary(botList));

      const newAgentStatusMap = {};
      await Promise.all(
        botList.map(async (bot) => {
          try {
            const statusRes = await checkBotStatus(bot.botId);
            newAgentStatusMap[bot.botId] = statusRes.status || 'unknown';
          } catch {
            newAgentStatusMap[bot.botId] = 'unreachable';
            toast.error(`Agent unreachable for "${bot.botId}"`);
          }
        })
      );
      setAgentStatusMap(newAgentStatusMap);
    } catch (err) {
      console.error('[loadBots] ❌', err.message);
      toast.error('Failed to fetch bots');
    }
  };

  const calculateSummary = (list) => {
    const summaryStats = { total: list.length, healthy: 0, stuck: 0, offline: 0 };
    for (const bot of list) {
      if (bot.healthStatus === 'healthy') summaryStats.healthy++;
      else if (bot.healthStatus === 'stuck') summaryStats.stuck++;
      else summaryStats.offline++;
    }
    return summaryStats;
  };

  useEffect(() => {
    // Initial load: fetch bots and agent statuses
    const init = async () => {
      try {
        const botList = await getBots();
        setBots(botList);
        setSummary(calculateSummary(botList));

        const newAgentStatusMap = {};

        await Promise.all(
          botList.map(async (bot) => {
            try {
              const status = await checkBotStatus(bot.botId); // returns "running" or "stopped"
              newAgentStatusMap[bot.botId] = status;
            } catch {
              newAgentStatusMap[bot.botId] = 'unreachable';
              toast.error(`Agent unreachable for "${bot.botId}"`);
            }
          })
        );

        setAgentStatusMap(newAgentStatusMap);
      } catch (err) {
        console.error('[Initial loadBots] ❌', err.message);
        toast.error('Failed to fetch bots');
      }
    };

    init();

    // Periodic bot list refresh only (not agent status)
    const interval = setInterval(async () => {
      try {
        const freshBots = await getBots();
        setBots(freshBots);
        setSummary(calculateSummary(freshBots));
      } catch (err) {
        console.error('[Interval Refresh] ❌', err.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);



  const handleToggle = async (bot) => {
    const botId = bot.botId;
    const isRunning = agentStatusMap[botId] === 'running';

    setLoadingMap((prev) => ({ ...prev, [botId]: true }));

    try {
      const res = isRunning
        ? await stopBotRemote(botId)
        : await startBotRemote(botId);

      toast.success(res.message || `Bot ${isRunning ? 'stopped' : 'started'}`);

      // ✅ Immediately fetch updated bot list
      const freshBots = await getBots();
      setBots(freshBots);
      setSummary(calculateSummary(freshBots));

      // ✅ Then update individual agent status for this bot
      const updatedStatus = await checkBotStatus(botId);
      setAgentStatusMap((prev) => ({ ...prev, [botId]: updatedStatus }));
    } catch (err) {
      toast.error(`Failed to ${isRunning ? 'stop' : 'start'} bot`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [botId]: false }));
    }
  };

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
            const isRunning = agentStatus === 'running';
            const isUnreachable = agentStatus === 'unreachable';
            const isLoading = loadingMap[bot.botId];
            const isAgentKnown = agentStatus !== undefined;

            return (
              <Card key={bot.botId} className="p-4 shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold text-lg">{bot.botId}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        bot.healthStatus === 'offline'
                          ? 'bg-red-100 text-red-700'
                          : bot.healthStatus === 'stuck'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      )}
                    >
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


                {bot.stats && (
                  <div className="text-xs text-gray-600 mb-2 space-y-1">
                    <div>📊 Jobs Scraped: <span className="font-semibold">{bot.stats.jobsScraped ?? 0}</span></div>

                    <div>⏱️ Active Time: <span className="font-semibold">
                      {formatTime(bot.stats.totalActiveTime)}
                    </span></div>

                    <div>🛡️ Cloudflare Hurdles: <span className="font-semibold">{bot.stats.cloudflareHurdles ?? 0}</span></div>
                    <div>✅ Cloudflare Solves: <span className="font-semibold">{bot.stats.cloudflareSolves ?? 0}</span></div>

                    <div>🔐 Login Hurdles: <span className="font-semibold">{bot.stats.loginHurdles ?? 0}</span></div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-2">
                  Last Seen : {formatTime(bot.lastSeen, { ago: true })}
                </div>

                <div className="text-xs text-gray-500 mb-1">
                  Agent Status:{' '}
                  {!isAgentKnown
                    ? '⌛ Checking...'
                    : isUnreachable
                      ? '❌ Unreachable'
                      : agentStatus}
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  Agent URL: <span className="text-blue-700">{bot.agentUrl}</span>
                </div>


                <div className="flex justify-end">
                  <button
                    onClick={() => handleToggle(bot)}
                    disabled={!isAgentKnown || isLoading || isUnreachable}
                    className={cn(
                      'text-blue-600 hover:text-blue-800',
                      (!isAgentKnown || isUnreachable) && 'cursor-not-allowed opacity-50'
                    )}
                    title={
                      !isAgentKnown
                        ? 'Checking agent status...'
                        : isUnreachable
                          ? 'Agent unreachable'
                          : isRunning
                            ? 'Stop Bot'
                            : 'Start Bot'
                    }
                  >
                    {isLoading ? (
                      <div className="animate-spin h-6 w-6 border-t-2 border-blue-600 rounded-full" />
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

  const now = Date.now();
  const time = typeof input === 'number' ? input : new Date(input).getTime();
  const diff = Math.max(0, opts.ago ? now - time : time); // ⬅ prevent -ve durations

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || hours) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return opts.ago ? `${parts.join(' ')} ago` : parts.join(' ');
};


export default BotMonitor;
