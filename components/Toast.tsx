
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-24 right-4 sm:right-6 lg:right-8 z-50 bg-emerald-600 text-white py-3 px-5 rounded-lg shadow-lg flex items-center animate-fade-in"
      role="alert"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 text-emerald-100 hover:text-white text-xl font-bold">&times;</button>
    </div>
  );
}
