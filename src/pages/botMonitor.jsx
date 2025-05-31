import React, { useEffect, useState } from 'react';
import { getBots } from '@/apis/bots';
import { Card } from '@/components/ui/card';

const BotMonitor = () => {
//   const [bots, setBots] = useState([]);

  const [bots, setBots] = useState([]);

  const fetchBots = async () => {
    try {
      const botsData = await getBots();
      console.log('[Fetched Bots]', botsData);
      setBots(botsData);
    } catch (err) {
      console.error('[BotMonitor] Failed to load bot statuses', err);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">🧠 Bot Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {bots.map((bot) => {
          const lastSeen = bot.lastSeen ? new Date(bot.lastSeen) : null;
          const ageSeconds = lastSeen ? Math.floor((Date.now() - lastSeen) / 1000) : null;
          const isOffline = ageSeconds === null || ageSeconds > 60;

          return (
            <Card key={bot.botId} className="p-4 shadow-md">
              <div className="font-bold text-lg">{bot.botId}</div>

              <div className="text-sm mt-1">
                Status:{' '}
                <span className={`font-medium ${isOffline ? 'text-red-600' : ''}`}>
                  {isOffline ? 'offline' : bot.status}
                </span>
              </div>

              {bot.message && !isOffline && (
                <div className="text-sm">
                  Message:{' '}
                  <span className="text-gray-700">{bot.message}</span>
                </div>
              )}

              {bot.jobUrl && !isOffline && (
                <div className="text-sm truncate">
                  Job:{' '}
                  <a
                    href={bot.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {bot.jobUrl}
                  </a>
                </div>
              )}

              {lastSeen && (
                <div className="text-sm">Last Seen: {formatTimeAgo(bot.lastSeen)}</div>
              )}

              <div
                className={`font-semibold mt-2 ${
                  isOffline ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {isOffline ? '🔴 Offline' : '✅ Healthy'}
              </div>
            </Card>
          );
        })}
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
