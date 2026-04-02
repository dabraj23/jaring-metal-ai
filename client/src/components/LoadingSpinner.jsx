import React from 'react';

export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary-800 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
