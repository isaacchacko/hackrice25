// components/LoadingPage.tsx
'use client';

import { useState, useEffect } from 'react';
import LoadingAnimation from './loading_animation';

interface LoadingPageProps {
  onComplete: () => void;
  message?: string;
  duration?: number; // How long to show the loading page
}

export default function LoadingPage({ 
  onComplete, 
  message = "Loading your results...",
  duration = 2000 
}: LoadingPageProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If duration is very large, don't auto-complete
    if (duration >= 99999) {
      // Just keep the animation running, never call onComplete
      return;
    }

    // Create a progress bar effect for normal durations
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          onComplete();
          return 100;
        }
        return prev + (100 / (duration / 50)); // Update every 50ms
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* Main loading content */}
      <div className="flex flex-col items-center space-y-6">
        {/* Quick animation */}
        <LoadingAnimation 
          duration={800} // Quick 800ms cycles
          loop={true}
        />
        
        {/* Loading message */}
        <p className="text-white text-xl font-medium">
          {message}
        </p>
        
        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-pink-500 transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress percentage */}
        <p className="text-gray-400 text-sm">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}