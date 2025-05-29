'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

const LoadingButton = ({
  loading,
  onClick,
  disabled,
  children,
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-primary min-w-[140px] h-10 px-4 flex items-center justify-center gap-2 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

export default LoadingButton;
