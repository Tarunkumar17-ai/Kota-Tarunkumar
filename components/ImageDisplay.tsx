
import React from 'react';

interface ImageDisplayProps {
  label: string;
  imageUrl: string | null;
  isLoading?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ label, imageUrl, isLoading = false }) => {
  return (
    <div className="bg-gray-800/50 rounded-xl shadow-lg flex flex-col h-full">
      <div className="bg-gray-700/50 px-4 py-2 rounded-t-xl">
        <h3 className="font-semibold text-gray-300">{label}</h3>
      </div>
      <div className="p-4 flex-grow flex items-center justify-center aspect-square">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-gray-400">
             <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg">Brewing pixels...</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-center text-gray-500">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.251.023.501.05.75.082a25.148 25.148 0 016.985 1.502 2.25 2.25 0 011.5 2.183v5.714a2.25 2.25 0 01-.659 1.591L14.25 14.5m-4.5 0a2.25 2.25 0 00-2.25 2.25v3.375c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125v-3.375a2.25 2.25 0 00-2.25-2.25H14.25m-4.5 0h4.5m-4.5 0l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5V21a2.25 2.25 0 01-2.25-2.25v-3.375c0-.621.504-1.125 1.125-1.125h2.25"></path></svg>
            <p className="mt-2">AI-edited image will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDisplay;
