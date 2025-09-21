// components/LoadingWrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import LoadingAnimation from './loading_animation';

interface LoadingWrapperProps {
  children: React.ReactNode;
  minLoadingTime?: number; // Minimum time to show loading (in ms)
  showLoading?: boolean; // External loading state
}

export default function LoadingWrapper({ 
  children, 
  minLoadingTime = 2000,
  showLoading 
}: LoadingWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Set minimum loading time
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime]);

  useEffect(() => {
    // If external loading state is provided, use it
    if (typeof showLoading === 'boolean') {
      setIsLoading(showLoading);
    } else {
      // Auto-hide loading after minimum time + animation cycles
      if (minTimeElapsed) {
        setIsLoading(false);
      }
    }
  }, [showLoading, minTimeElapsed]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-black">
        <LoadingAnimation 
          duration={2000} // 2000ms per cycle
          loop={true}
          onComplete={() => {
            if (minTimeElapsed && typeof showLoading === 'undefined') {
              setIsLoading(false);
            }
          }}
        />
        <p className="text-slate-400 mt-4 text-lg">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}