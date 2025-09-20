
// components/PseudoBrowser.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Home, Search } from 'lucide-react';

interface NavigationHistory {
  url: string;
  title?: string;
}

const PseudoBrowser: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<NavigationHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addToHistory = useCallback((url: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ url });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const navigateToUrl = useCallback(async (url: string, addHistory: boolean = true) => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Add protocol if missing
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

      // Check if it's a search query (no dots, or common search patterns)
      const isSearch = !url.includes('.') || url.includes(' ');
      const finalUrl = isSearch
        ? `https://www.google.com/search?q=${encodeURIComponent(url)}`
        : formattedUrl;

      const proxyUrl = `http://localhost:4000/proxy?url=${encodeURIComponent(finalUrl)}`;

      // Test the proxy endpoint
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to load: ${response.statusText}`);
      }

      setCurrentUrl(proxyUrl);

      if (addHistory) {
        addToHistory(finalUrl);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToUrl(inputUrl);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateToUrl(history[newIndex].url, false);
      setInputUrl(history[newIndex].url);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateToUrl(history[newIndex].url, false);
      setInputUrl(history[newIndex].url);
    }
  };

  const refresh = () => {
    if (currentUrl) {
      setIsLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = currentUrl;
      }
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const goHome = () => {
    setInputUrl('google.com');
    navigateToUrl('google.com');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Browser Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center space-x-3">
          {/* Navigation Controls */}
          <div className="flex space-x-1">
            <button
              onClick={goBack}
              disabled={historyIndex <= 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={goForward}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Forward"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={refresh}
              className="p-2 rounded hover:bg-gray-100"
              title="Refresh"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={goHome}
              className="p-2 rounded hover:bg-gray-100"
              title="Home"
            >
              <Home size={18} />
            </button>
          </div>

          {/* Address Bar */}
          <form onSubmit={handleSubmit} className="flex-1 flex">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter URL or search term..."
                className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:border-blue-500"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-medium">Error loading page:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Browser Content */}
      <div className="flex-1 relative">
        {currentUrl ? (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-0"
            title="Browser Content"
            sandbox="allow-same-origin allow-scripts allow-forms allow-links allow-top-navigation"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to Pseudo Browser
              </h2>
              <p className="text-gray-500">
                Enter a URL or search term to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PseudoBrowser;
