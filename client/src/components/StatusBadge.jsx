import React from 'react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  extracted: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-indigo-100 text-indigo-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  released: 'bg-teal-100 text-teal-800',
  archived: 'bg-slate-100 text-slate-800'
};

export const StatusBadge = ({ status }) => {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  const displayText = status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);

  return (
    <span className={`status-badge ${colorClass}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
