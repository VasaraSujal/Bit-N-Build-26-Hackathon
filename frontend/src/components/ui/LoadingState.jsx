import React from 'react';
import { Spinner } from './Spinner';

export const LoadingState = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center gap-3 ${className}`}>
      <Spinner size="lg" />
      <p className="text-sm text-content-secondary font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingState;
