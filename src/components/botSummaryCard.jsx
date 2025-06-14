'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

const BotSummaryCard = ({ summary }) => {
  const { total, healthy, stuck, offline } = summary;

  const cardClass = 'flex flex-col items-center justify-center p-4 rounded-xl shadow-md';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card className={`${cardClass} bg-gray-100`}>
        <div className="text-2xl font-bold text-gray-800">{total}</div>
        <div className="text-sm text-gray-600">Total Bots</div>
      </Card>

      <Card className={`${cardClass} bg-green-100`}>
        <div className="text-2xl font-bold text-green-800">{healthy}</div>
        <div className="text-sm text-green-700">Online (Healthy)</div>
      </Card>

      <Card className={`${cardClass} bg-red-100`}>
        <div className="text-2xl font-bold text-red-800">{offline}</div>
        <div className="text-sm text-red-700">Offline</div>
      </Card>
    </div>
  );
};

export default BotSummaryCard;
