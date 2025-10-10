
import React, { useMemo } from 'react';
import ImageDisplay from './ImageDisplay';
import LoadingSpinner from './LoadingSpinner';
import IconButton from './IconButton';

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
}) => {
  const originalImageUrl = useMemo(() => URL.createObjectURL(originalImage), [originalImage]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };
  
  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited_${originalImage.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Controls Column */}
      <div className="lg:w-1/3 xl:w-1/4 space-y-6">
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">Edit Your Image</h2>
          <div className="space-y-4">
             <label htmlFor="prompt" className="block text-sm font-medium text-gray-400">
              Describe the changes you want to make:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="e.g., add a wizard hat, make the sky look like a galaxy, change the season to winter..."
              rows={5}
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
         <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg flex items-center justify-between">
           <h3 className="text-lg font-medium">Actions</h3>
           <div className="flex gap-2">
             {/* FIX: Changed handleReset to onReset to correctly use the prop passed to the component. */}
             <IconButton onClick={onReset} icon="reset" tooltip="Start Over" />
             {editedImage && <IconButton onClick={handleDownload} icon="download" tooltip="Download Image" />}
           </div>
         </div>
         {aiTextResponse && (
           <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg">
              <h3 className="text-md font-semibold mb-2 text-purple-300">AI Note</h3>
              <p className="text-sm text-gray-300 italic">{aiTextResponse}</p>
           </div>
          )}
      </div>

      {/* Images Column */}
      <div className="lg:w-2/3 xl:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <ImageDisplay label="Original" imageUrl={originalImageUrl} />
        <ImageDisplay label="Edited" imageUrl={editedImage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default EditorView;
