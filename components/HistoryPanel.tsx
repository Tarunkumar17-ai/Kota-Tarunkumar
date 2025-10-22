import React from 'react';
import type { HistoryEntry } from '../types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onRevert: (entry: HistoryEntry) => void;
  onLike: (entry: HistoryEntry) => void;
  onDislike: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRevert, onLike, onDislike, onClearHistory }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-purple-300">Edit History</h3>
      </div>
      
      {history.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Your edits for this image will appear here.</p>
      ) : (
        <>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-700/50 group"
              >
                <button 
                  onClick={() => onRevert(entry)}
                  className="flex-grow flex items-center gap-3 text-left focus:outline-none rounded-md"
                  aria-label={`Revert to edit with prompt: ${entry.prompt}`}
                >
                  <img 
                    src={entry.imageUrl} 
                    alt="History thumbnail" 
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  />
                  <p className="text-sm text-gray-300 truncate group-hover:text-purple-300 transition-colors">
                    {entry.prompt}
                  </p>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => onLike(entry)} 
                    className="p-1.5 rounded-full hover:bg-green-500/20 text-green-400"
                    aria-label="Like and Download"
                    title="Like and Download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.364a1 1 0 00.949-.684l2.713-6.331A1 1 0 0016 9.5h-1.333V6.5a1 1 0 00-1-1h-1.333a1 1 0 00-1 1v1.333h-1.334a1 1 0 00-1 1v2.333H6z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => onDislike(entry)} 
                    className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400"
                    aria-label="Dislike and Delete"
                    title="Dislike and Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1h-6.364a1 1 0 00-.949.684L2.973 8.999A1 1 0 004 10.5h1.333V13.5a1 1 0 001 1h1.333a1 1 0 001-1V12.167h1.334a1 1 0 001-1V8.833H14z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <button
              onClick={onClearHistory}
              className="w-full text-center text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-md transition-colors"
            >
              Clear All History
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryPanel;
