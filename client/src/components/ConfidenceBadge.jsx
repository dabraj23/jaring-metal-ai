import React from 'react';

export const ConfidenceBadge = ({ score }) => {
  let bgColor = 'bg-green-100 text-green-800';

  if (score < 0.6) {
    bgColor = 'bg-red-100 text-red-800';
  } else if (score < 0.7) {
    bgColor = 'bg-yellow-100 text-yellow-800';
  } else if (score < 0.85) {
    bgColor = 'bg-blue-100 text-blue-800';
  }

  const percentage = Math.round(score * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${bgColor.split(' ')[0]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className={`status-badge ${bgColor}`}>
        {percentage}%
      </span>
    </div>
  );
};

export default ConfidenceBadge;
