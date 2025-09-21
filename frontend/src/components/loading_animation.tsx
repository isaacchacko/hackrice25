// components/LoadingAnimation.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LoadingAnimationProps {
  onComplete?: () => void;
  duration?: number; // Total animation duration in ms
  loop?: boolean;
}

export default function LoadingAnimation({ 
  onComplete, 
  duration = 1200, 
  loop = true 
}: LoadingAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Array of your frame images - adjust paths as needed
  const frames = [
    '/images/frame-0.png',
    '/images/frame-1.png',
    '/images/frame-2.png',
    '/images/frame-3.png',
    '/images/frame-4.png',
    '/images/frame-5.png'
  ];

  const frameDelay = duration / frames.length;

  useEffect(() => {
    if (isComplete && !loop) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const nextFrame = (prev + 1) % frames.length;
        
        // If we've completed one cycle and not looping
        if (nextFrame === 0 && !loop) {
          setIsComplete(true);
          if (onComplete) onComplete();
          return prev; // Stay on last frame
        }
        
        return nextFrame;
      });
    }, frameDelay);

    return () => clearInterval(interval);
  }, [frameDelay, frames.length, isComplete, loop, onComplete]);

  return (
    <div className="flex items-center justify-center">
      <Image
        src={frames[currentFrame]}
        alt={`Loading frame ${currentFrame + 1}`}
        width={100}
        height={100}
        className="w-24 h-24 sm:w-32 sm:h-32"
        priority // Preload for smooth animation
      />
    </div>
  );
}