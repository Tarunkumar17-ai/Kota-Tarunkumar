import React, { useMemo, useState } from 'react';
import ImageDisplay from './ImageDisplay';
import LoadingSpinner from './LoadingSpinner';
import IconButton from './IconButton';
import HistoryPanel from './HistoryPanel';
import DownloadModal from './DownloadModal';
import StyleFilters from './StyleFilters'; // Import the new component
import type { HistoryEntry } from '../types';

interface EditorViewProps {
  originalImage: File;
  editedImage: string | null;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isLoading: boolean;
  error: string | null;
  aiTextResponse: string | null;
  onGenerate: () => void;
  onReset: () => void;
  history: HistoryEntry[];
  onRevert: (entry: HistoryEntry) => void;
  selectedStyle: string | null;
  onStyleSelect: (styleName: string | null) => void;
  onLikeHistory: (entry: HistoryEntry) => void;
  onDislikeHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

const EditorView: React.FC<EditorViewProps> = ({
  originalImage,
  editedImage,
  prompt,
  setPrompt,
  isLoading,
  error,
  aiTextResponse,
  onGenerate,
  onReset,
  history,
  onRevert,
  selectedStyle,
  onStyleSelect,
  onLikeHistory,
  onDislikeHistory,
  onClearHistory,
}) => {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const originalImageUrl = useMemo(() => URL.createObjectURL(originalImage), [originalImage]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };
  
  const handleDownloadClick = () => {
    if (!editedImage) return;
    setIsDownloadModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Controls Column */}
        <div className="lg:w-1/3 xl:w-1/4 space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">Edit Your Image</h2>
            <div className="space-y-4">
               <label htmlFor="prompt" className="block text-sm font-medium text-gray-400">
                1. Describe your changes:
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="e.g., add a wizard hat, make the sky a galaxy..."
                rows={4}
                className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-gray-200 placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                onClick={onGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? <LoadingSpinner /> : 'Generate'}
              </button>
               {error && <p className="text-sm bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{error}</p>}
            </div>
          </div>

          <StyleFilters selectedStyle={selectedStyle} onStyleSelect={onStyleSelect} />
          
           <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg flex items-center justify-between">
             <h3 className="text-lg font-medium">Actions</h3>
             <div className="flex gap-2">
               <IconButton onClick={onReset} icon="reset" tooltip="Start Over" />
               {editedImage && <IconButton onClick={handleDownloadClick} icon="download" tooltip="Download Image" />}
             </div>
           </div>
           {aiTextResponse && (
             <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg">
                <h3 className="text-md font-semibold mb-2 text-purple-300">AI Note</h3>
                <p className="text-sm text-gray-300 italic">{aiTextResponse}</p>
             </div>
            )}
          <HistoryPanel 
            history={history} 
            onRevert={onRevert}
            onLike={onLikeHistory}
            onDislike={onDislikeHistory}
            onClearHistory={onClearHistory}
          />
        </div>

        {/* Images Column */}
        <div className="lg:w-2/3 xl:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageDisplay label="Original" imageUrl={originalImageUrl} />
          <ImageDisplay label="Edited" imageUrl={editedImage} isLoading={isLoading} />
        </div>
      </div>
      {editedImage && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          imageUrl={editedImage}
          fileName={originalImage.name}
        />
      )}
    </>
  );
};

export default EditorView;
