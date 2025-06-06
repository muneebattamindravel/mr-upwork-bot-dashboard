'use client';

import React, { useEffect, useState } from 'react';
import { getBots, getBotsSummary } from '@/apis/bots';
import { Card } from '@/components/ui/card';
import BotSummaryCard from '@/components/botSummaryCard';
import { cn } from '@/lib/utils';

const BotMonitor = () => {
  const [bots, setBots] = useState([]);
  const [summary, setSummary] = useState({ total: 0, healthy: 0, stuck: 0, offline: 0 });

  useEffect(() => {
    const refresh = async () => {
      try {
        const botsData = await getBots();
        setBots(botsData);

        const summaryCount = {
          total: botsData.length,
          healthy: 0,
          stuck: 0,
          offline: 0
        };

        botsData.forEach(bot => {
          if (bot.healthStatus === 'healthy') summaryCount.healthy++;
          else if (bot.healthStatus === 'stuck') summaryCount.stuck++;
          else if (bot.healthStatus === 'offline') summaryCount.offline++;
        });

        setSummary(summaryCount);
      } catch (err) {
        console.error('[BotMonitor] Failed to load bots or summary', err);
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <BotSummaryCard summary={summary} />

      <h1 className="text-2xl font-bold mb-4">🧠 Bot Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.map((bot) => (
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
                {bot.healthStatus === 'offline'
                  ? '❌ Offline'
                  : bot.healthStatus === 'stuck'
                    ? '⚠️ Stuck'
                    : '✅ Healthy'}
              </span>
            </div>

            <div className="text-sm">
              Status: <span className="text-gray-800 font-medium">{bot.status}</span>
            </div>

            {bot.message && (
              <div className="text-sm">
                Message: <span className="text-gray-700">{bot.message}</span>
              </div>
            )}

            {bot.jobUrl && (
              <div className="text-sm truncate">
                Job: <a href={bot.jobUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{bot.jobUrl}</a>
              </div>
            )}

            <div className="text-sm text-gray-500 mt-1">
              Last Seen: {formatTimeAgo(bot.lastSeen)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BotMonitor;

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'unknown';

  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);

  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minute(s) ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour(s) ago`;

  return 'Yesterday';
};
