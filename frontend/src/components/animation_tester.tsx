// components/AnimationTester.tsx (for testing purposes)
'use client';

import { useState } from 'react';
import LoadingAnimation from './loading_animation';

export default function AnimationTester() {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationSettings, setAnimationSettings] = useState({
    duration: 1200,
    loop: true
  });

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Animation Tester</h1>
      
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Duration (ms): {animationSettings.duration}
          </label>
          <input
            type="range"
            min="300"
            max="3000"
            step="100"
            value={animationSettings.duration}
            onChange={(e) => setAnimationSettings(prev => ({ 
              ...prev, 
              duration: parseInt(e.target.value) 
            }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={animationSettings.loop}
              onChange={(e) => setAnimationSettings(prev => ({ 
                ...prev, 
                loop: e.target.checked 
              }))}
            />
            <span>Loop animation</span>
          </label>
        </div>
        
        <button
          onClick={() => setShowAnimation(!showAnimation)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAnimation ? 'Stop Animation' : 'Start Animation'}
        </button>
      </div>

      {/* Animation Display */}
      <div className="bg-black p-8 rounded-lg">
        {showAnimation ? (
          <LoadingAnimation
            duration={animationSettings.duration}
            loop={animationSettings.loop}
            onComplete={() => {
              console.log('Animation completed!');
              if (!animationSettings.loop) {
                setShowAnimation(false);
              }
            }}
          />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center text-white">
            Animation stopped
          </div>
        )}
      </div>
      
      {/* Frame Info */}
      <div className="mt-4 text-sm text-gray-600">
        <p>Frame duration: {Math.round(animationSettings.duration / 6)}ms per frame</p>
        <p>Total cycle time: {animationSettings.duration}ms</p>
      </div>
    </div>
  );
}