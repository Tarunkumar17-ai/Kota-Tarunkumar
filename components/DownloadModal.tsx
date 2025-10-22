import React, { useEffect, useCallback } from 'react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, imageUrl, fileName }) => {
  const handleDownload = useCallback((format: 'png' | 'jpeg') => {
    if (!imageUrl) return;

    const download = (url: string, extension: string) => {
      const link = document.createElement('a');
      const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      link.download = `edited_${baseName}.${extension}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    };

    if (format === 'png') {
      // The source is already a data URL, suitable for PNG download
      download(imageUrl, 'png');
    } else {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error("Could not get canvas context for image conversion.");
          onClose();
          return;
        }
        
        // Fill background with white for JPG format to handle transparency from PNGs
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Get data URL as JPEG with 90% quality
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);
        download(jpegUrl, 'jpg');
      };
      img.onerror = () => {
        console.error("Failed to load image for conversion.");
        onClose();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, fileName, onClose]);
  
  // Handle Escape key to close the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm transform transition-all relative"
        onClick={e => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <h2 id="download-modal-title" className="text-2xl font-bold text-center mb-6 text-purple-300">Choose Format</h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleDownload('png')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Download as PNG
          </button>
          <button
            onClick={() => handleDownload('jpeg')}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Download as JPG
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DownloadModal;
