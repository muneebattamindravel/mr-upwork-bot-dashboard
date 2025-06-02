import React from 'react';

const BotSummaryCard = ({ summary }) => {
  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-900 text-center">
        <h3 className="text-xl font-semibold">Total Bots</h3>
        <p className="text-2xl mt-2">{summary.total}</p>
      </div>
      <div className="p-4 rounded-2xl shadow-md bg-green-100 dark:bg-green-900 text-center">
        <h3 className="text-xl font-semibold">Online</h3>
        <p className="text-2xl mt-2 text-green-800 dark:text-green-200">{summary.online}</p>
      </div>
      <div className="p-4 rounded-2xl shadow-md bg-red-100 dark:bg-red-900 text-center">
        <h3 className="text-xl font-semibold">Offline</h3>
        <p className="text-2xl mt-2 text-red-800 dark:text-red-200">{summary.offline}</p>
      </div>
    </div>
  );
};

export default BotSummaryCard;
