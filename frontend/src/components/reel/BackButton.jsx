import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ className = '', style = {} }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Back"
      className={`rounded-full bg-black/40 backdrop-blur px-2 py-2 text-white hover:bg-black/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`}
      style={{
        position: 'absolute',
        top: 'env(safe-area-inset-top, 12px)',
        left: 'env(safe-area-inset-left, 12px)',
        zIndex: 60,
        ...style,
      }}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
