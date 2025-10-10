
import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import EditorView from './components/EditorView';
import { editImage } from './services/geminiService';
import type { EditImageResult } from './types';
import { fileToBase64 } from './utils/fileUtils';

// Header Component defined outside App to prevent re-renders
const AppHeader: React.FC = () => (
  <header className="py-4 px-6 md:px-8 border-b border-gray-700/50 shadow-lg bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
    <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text animate-gradient-text">
      NanoBanana Studio
    </h1>
  </header>
);

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiTextResponse, setAiTextResponse] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    setOriginalImage(file);
    setEditedImage(null);
    setPrompt('');
    setError(null);
    setAiTextResponse(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Please provide an image and a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    setAiTextResponse(null);

    try {
      const { base64, mimeType } = await fileToBase64(originalImage);
      const result: EditImageResult = await editImage(base64, mimeType, prompt);
      
      setEditedImage(result.imageUrl);
      if(result.text) {
        setAiTextResponse(result.text);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error generating image:', errorMessage);
      setError(`Failed to edit image. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt]);

  const handleReset = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
    setAiTextResponse(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <AppHeader />
      <main className="p-4 md:p-8">
        {!originalImage ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <EditorView
            originalImage={originalImage}
            editedImage={editedImage}
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isLoading}
            error={error}
            aiTextResponse={aiTextResponse}
            onGenerate={handleGenerate}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
};

export default App;
