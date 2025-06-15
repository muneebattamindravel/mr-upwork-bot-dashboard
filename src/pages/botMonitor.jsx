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
import { PlayCircle, PauseCircle } from 'lucide-react';

const BotMonitor = () => {
  const [bots, setBots] = useState([]);
  const [summary, setSummary] = useState({ total: 0, healthy: 0, stuck: 0, offline: 0 });
  const [loadingMap, setLoadingMap] = useState({});
  const [agentStatusMap, setAgentStatusMap] = useState({}); // Track agent status per bot

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
            const statusRes = await checkBotStatus(bot.agentUrl);
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
      await loadBots(); // calls getBots + checkBotStatus for each bot
    };

    init();

    // Only refresh bot list (not agent status) every 5 seconds
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
    const isRunning = agentStatusMap[bot.botId] === 'running';
    const botId = bot.botId;

    setLoadingMap((prev) => ({ ...prev, [botId]: true }));

    try {
      const res = isRunning
        ? await stopBotRemote(bot.agentUrl)
        : await startBotRemote(bot.agentUrl);

      toast.success(res.message || `Bot ${isRunning ? 'stopped' : 'started'}`);

      // 🔁 Refresh bots and agent status only after toggle
      await loadBots();
    } catch (err) {
      toast.error(`Failed to ${isRunning ? 'stop' : 'start'} bot`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [botId]: false }));
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'unknown';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    return `${Math.floor(diff / 60)} min ago`;
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
                </div>

                <div className="text-sm text-gray-800 mb-1">
                  Status: <span className="font-medium">{bot.status}</span>
                </div>

                {bot.message && (
                  <div className="text-sm text-gray-700 mb-1">Msg: {bot.message}</div>
                )}

                {bot.jobUrl && (
                  <div className="text-sm truncate mb-1">
                    Job:{' '}
                    <a
                      href={bot.jobUrl}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {bot.jobUrl}
                    </a>
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-2">
                  Last Seen : {formatTimeAgo(bot.lastSeen)}
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
        </div>
      )}
    </div>
  );
};

export default BotMonitor;
