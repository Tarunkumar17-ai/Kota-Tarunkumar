import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type, LiveServerMessage, Blob as GenAIBlob } from "@google/genai";

// Re-importing original components for the Image Edit Studio
import ImageUploader from './components/ImageUploader';
import EditorView from './components/EditorView';
import { editImage as nanoBananaEditImage, generateImage, generateVideo, getChatResponse, analyzeContent, textToSpeech, transcribeAudio } from './services/geminiService';
import { addHistoryEntry, getHistoryForImage, deleteHistoryEntry, clearHistoryForImage } from './services/historyService';
import type { EditImageResult, HistoryEntry, ChatMessage, GroundingChunk } from './types';
import { fileToBase64, blobToBase64, decode, encode, decodeAudioData } from './utils/fileUtils';
import { STYLE_PRESETS } from './constants/styles';


// --- TYPES ---
type Studio = 'Chat' | 'Image' | 'Video' | 'Audio' | 'Vision';
type ImageStudioTab = 'Edit' | 'Generate';
type AudioStudioTab = 'Transcribe' | 'Converse';
type ChatMode = 'lite' | 'flash' | 'pro' | 'search' | 'maps';

// --- HELPER & UI COMPONENTS ---

const AppHeader: React.FC = () => (
  <header className="py-4 px-6 md:px-8 border-b border-gray-700/50 shadow-lg bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
    <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text animate-gradient-text">
      Gemini AI Studio
    </h1>
  </header>
);

const MainTabs: React.FC<{ activeStudio: Studio, onSelectStudio: (studio: Studio) => void }> = ({ activeStudio, onSelectStudio }) => {
  const studios: Studio[] = ['Chat', 'Image', 'Video', 'Audio', 'Vision'];
  return (
    <nav className="flex justify-center items-center p-2 bg-gray-800/60 rounded-lg max-w-xl mx-auto mb-8 sticky top-[80px] z-10 backdrop-blur-sm">
      {studios.map(studio => (
        <button
          key={studio}
          onClick={() => onSelectStudio(studio)}
          className={`px-4 py-2 text-sm md:text-base font-semibold rounded-md transition-colors duration-200 ${activeStudio === studio ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          {studio}
        </button>
      ))}
    </nav>
  );
};

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center text-gray-400">
    <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg">{text}</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <p className="text-sm bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{message}</p>
);

// --- STUDIO COMPONENTS ---

const ChatStudio: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ChatMode>('flash');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const result = await getChatResponse(input, mode);
            const aiMessage: ChatMessage = { role: 'model', text: result.text, groundingChunks: result.groundingChunks };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to get chat response: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlayTTS = async (text: string) => {
        try {
            const audioData = await textToSpeech(text);
            // FIX: Cast window to any to support webkitAudioContext for older browsers without TypeScript errors.
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        } catch (err) {
            console.error("TTS Error:", err);
            setError(`Failed to play audio: ${err instanceof Error ? err.message : "An unknown error occurred."}`);
        }
    };

    const modeConfig = {
      lite: { name: 'Speedy', model: 'gemini-2.5-flash-lite' },
      flash: { name: 'Balanced', model: 'gemini-2.5-flash' },
      pro: { name: 'Advanced', model: 'gemini-2.5-pro' },
      search: { name: 'Web Search', model: 'gemini-2.5-flash' },
      maps: { name: 'Maps Search', model: 'gemini-2.5-flash' },
    };

    return (
        <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-xl shadow-lg p-4 flex flex-col h-[calc(100vh-200px)]">
            <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                <h2 className="text-xl font-semibold text-purple-300">Chat Studio</h2>
                <select value={mode} onChange={e => setMode(e.target.value as ChatMode)} className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-purple-500 focus:border-purple-500">
                    {Object.entries(modeConfig).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
                </select>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-slide-up`}>
                        <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-purple-700' : 'bg-gray-700'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                                <div className="mt-2 border-t border-gray-600 pt-2">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-1">Sources:</h4>
                                    <ul className="text-xs space-y-1">
                                        {msg.groundingChunks.map((chunk, i) => (
                                            <li key={i}>
                                                <a href={chunk.web?.uri || chunk.maps?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">
                                                    {chunk.web?.title || chunk.maps?.title || 'Source'}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {msg.role === 'model' && (
                                <button onClick={() => handlePlayTTS(msg.text)} className="mt-2 text-gray-400 hover:text-white" title="Read aloud">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v1.333a1 1 0 01-.527.882l-2.5 1.25a1 1 0 01-1.473-.882V4a1 1 0 011-1h2zm-3 0a1 1 0 011 1v1.333a1 1 0 01-.527.882l-2.5 1.25a1 1 0 01-1.473-.882V4a1 1 0 011-1h2zM15 4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1.333a1 1 0 00.527.882l2.5 1.25a1 1 0 001.473-.882V4z" /><path d="M3 8.5a1.5 1.5 0 013 0V15a1 1 0 01-1 1H5a1 1 0 01-1-1V8.5zM9 8.5a1.5 1.5 0 013 0V15a1 1 0 01-1 1h-1a1 1 0 01-1-1V8.5zM15 8.5a1.5 1.5 0 013 0V15a1 1 0 01-1 1h-1a1 1 0 01-1-1V8.5z" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-fade-in-slide-up">
                        <div className="p-3 rounded-lg bg-gray-700 flex items-center space-x-1.5 h-[40px]">
                            <div className="w-2 h-2 bg-purple-300 rounded-full animate-typing-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-purple-300 rounded-full animate-typing-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-purple-300 rounded-full animate-typing-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {error && <div className="mt-2"><ErrorDisplay message={error} /></div>}
            <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-4">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type your message..."
                    className="flex-grow bg-gray-700/80 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 transition text-gray-200"
                    rows={2}
                />
                <button onClick={handleSend} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-gray-600">
                    Send
                </button>
            </div>
        </div>
    );
};

const ImageEditStudio: React.FC = () => {
    // This component encapsulates all the logic from the original App.tsx
    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [aiTextResponse, setAiTextResponse] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  
    const handleImageUpload = (file: File) => {
      setOriginalImage(file);
      setEditedImage(null);
      setPrompt('');
      setError(null);
      setAiTextResponse(null);
      setSelectedStyle(null);
      setHistory(getHistoryForImage(file.name));
    };
  
    const handleGenerate = useCallback(async () => {
      if (!originalImage || !prompt.trim()) {
        setError('Please provide an image and a prompt.');
        return;
      }
  
      setIsLoading(true);
      setError(null);
      setAiTextResponse(null);
  
      try {
        const stylePreset = STYLE_PRESETS.find(p => p.name === selectedStyle);
        const fullPrompt = `${prompt}${stylePreset ? stylePreset.promptSuffix : ''}`;
        const { base64, mimeType } = await fileToBase64(originalImage);
        const result: EditImageResult = await nanoBananaEditImage(base64, mimeType, fullPrompt);
        setEditedImage(result.imageUrl);
        if (result.text) {
          setAiTextResponse(result.text);
        }
        const newEntry: HistoryEntry = { id: Date.now(), prompt, style: selectedStyle, imageUrl: result.imageUrl, text: result.text || '' };
        addHistoryEntry(originalImage.name, newEntry);
        setHistory(prev => [newEntry, ...prev]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to edit image: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }, [originalImage, prompt, selectedStyle]);
  
    const handleReset = () => {
      setOriginalImage(null);
      setEditedImage(null);
      setPrompt('');
      setError(null);
      setAiTextResponse(null);
      setIsLoading(false);
      setHistory([]);
      setSelectedStyle(null);
    };
  
    const handleRevert = (entry: HistoryEntry) => {
      setEditedImage(entry.imageUrl);
      setPrompt(entry.prompt);
      setAiTextResponse(entry.text || null);
      setSelectedStyle(entry.style || null);
    };
  
    const handleLike = useCallback((entry: HistoryEntry) => {
      if (!originalImage) return;
      const link = document.createElement('a');
      link.download = `liked_image_${entry.id}.png`;
      link.href = entry.imageUrl;
      link.click();
    }, [originalImage]);
  
    const handleDislike = useCallback((entry: HistoryEntry) => {
      if (!originalImage) return;
      deleteHistoryEntry(originalImage.name, entry.id);
      setHistory(prev => prev.filter(e => e.id !== entry.id));
    }, [originalImage]);
  
    const handleClearHistory = useCallback(() => {
      if (!originalImage) return;
      clearHistoryForImage(originalImage.name);
      setHistory([]);
    }, [originalImage]);

    if (!originalImage) {
        return <ImageUploader onImageUpload={handleImageUpload} />;
    }
  
    return (
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
        history={history}
        onRevert={handleRevert}
        selectedStyle={selectedStyle}
        onStyleSelect={setSelectedStyle}
        onLikeHistory={handleLike}
        onDislikeHistory={handleDislike}
        onClearHistory={handleClearHistory}
      />
    );
};

const ImageGenerateStudio: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await generateImage(prompt, aspectRatio);
            setGeneratedImage(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate image: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-purple-300">Image Generation Studio</h2>
                <div className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g., A robot holding a red skateboard."
                        rows={3}
                        className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500"
                        disabled={isLoading}
                    />
                    <select
                        value={aspectRatio}
                        onChange={e => setAspectRatio(e.target.value)}
                        className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500"
                        disabled={isLoading}
                    >
                        <option value="1:1">Square (1:1)</option>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                        <option value="4:3">Standard (4:3)</option>
                        <option value="3:4">Tall (3:4)</option>
                    </select>
                    <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition disabled:bg-gray-600">
                        {isLoading ? 'Generating...' : 'Generate Image'}
                    </button>
                    {error && <ErrorDisplay message={error} />}
                </div>
            </div>
            {(isLoading || generatedImage) && (
                 <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg flex justify-center items-center aspect-square">
                    {isLoading && <LoadingSpinner text="Generating image..." />}
                    {generatedImage && <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-lg"/>}
                </div>
            )}
        </div>
    );
};

const ImageStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ImageStudioTab>('Edit');
    return (
        <div className="space-y-6">
            <div className="flex justify-center gap-2 p-1 bg-gray-800 rounded-lg max-w-xs mx-auto">
                <button onClick={() => setActiveTab('Edit')} className={`w-full py-2 rounded-md transition ${activeTab === 'Edit' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>Edit Image</button>
                <button onClick={() => setActiveTab('Generate')} className={`w-full py-2 rounded-md transition ${activeTab === 'Generate' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>Generate Image</button>
            </div>
            {activeTab === 'Edit' && <ImageEditStudio />}
            {activeTab === 'Generate' && <ImageGenerateStudio />}
        </div>
    );
};

const VideoStudio: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [image, setImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        await window.aistudio?.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race conditions
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && !image) {
            setError('Please enter a prompt or upload an image.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Initializing video generation...');
        setError(null);
        setGeneratedVideo(null);

        try {
            const imagePayload = image ? await fileToBase64(image) : undefined;
            const videoUrl = await generateVideo(prompt, aspectRatio, imagePayload);
            setGeneratedVideo(videoUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate video: ${errorMessage}`);
            if(errorMessage.includes("Requested entity was not found")){
                setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    if (!apiKeySelected) {
        return (
            <div className="max-w-2xl mx-auto text-center bg-gray-800/50 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-purple-300 mb-4">API Key Required for Video Generation</h2>
                <p className="text-gray-300 mb-6">The Veo video generation model requires you to select a project with billing enabled.</p>
                <p className="text-sm text-gray-400 mb-6">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">billing documentation</a>.</p>
                <button onClick={handleSelectKey} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition">Select API Key</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-purple-300">Video Generation Studio</h2>
                <div className="space-y-4">
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A neon hologram of a cat driving at top speed" rows={3} className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3" disabled={isLoading} />
                    <input type="file" accept="image/*" onChange={e => setImage(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" disabled={isLoading}/>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3" disabled={isLoading}>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                    </select>
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition disabled:bg-gray-600">
                        {isLoading ? 'Generating...' : 'Generate Video'}
                    </button>
                    {error && <ErrorDisplay message={error} />}
                </div>
            </div>
            {(isLoading || generatedVideo) && (
                <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg flex justify-center items-center">
                    {isLoading && <LoadingSpinner text="Generating video... this may take a few minutes." />}
                    {generatedVideo && <video src={generatedVideo} controls className="max-w-full rounded-lg" />}
                </div>
            )}
        </div>
    );
};

const AudioTranscribeStudio: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<globalThis.Blob[]>([]);
    const [copySuccess, setCopySuccess] = useState('');

    const handleStartRecording = async () => {
        setTranscription('');
        setError(null);
        setCopySuccess('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new globalThis.Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                setIsLoading(true);
                setError(null);
                setTranscription('');
                try {
                    const result = await transcribeAudio(audioBlob);
                    setTranscription(result);
                } catch(err) {
                    setError(`Transcription failed: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
                } finally {
                    setIsLoading(false);
                }
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError("Microphone access was denied. Please allow microphone permissions in your browser settings.");
        }
    };
    
    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleCopy = () => {
        if (!transcription) return;
        navigator.clipboard.writeText(transcription).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 bg-gray-800/50 p-6 rounded-xl shadow-lg">
             <h2 className="text-xl font-semibold text-purple-300">Transcription Studio</h2>
            <div className="flex justify-center">
                <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`px-6 py-3 font-bold rounded-lg text-white transition ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
            </div>
            {isRecording && <p className="text-center text-yellow-400 animate-pulse">Recording...</p>}
            {isLoading && <LoadingSpinner text="Transcribing..." />}
            {error && <ErrorDisplay message={error} />}
            {transcription && (
                <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Transcription Result:</h3>
                        <button onClick={handleCopy} className="flex items-center gap-2 px-2 py-1 rounded-md text-sm bg-gray-600 hover:bg-gray-500 text-purple-300 transition-colors disabled:text-gray-500 disabled:bg-gray-800">
                            {copySuccess ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    {copySuccess}
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-200">{transcription}</p>
                </div>
            )}
        </div>
    );
};

const AudioConverseStudio: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptions, setTranscriptions] = useState<{user: string, model: string}[]>([]);
    
    const sessionRef = useRef<any>(null); // To hold the session object
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if(streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if(scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if(sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        
        // Check state before closing to prevent error from multiple calls (e.g., from onerror and onclose)
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;

        setIsSessionActive(false);
    }, []);

    const handleStartConversation = async () => {
        if (isSessionActive) return;
        setIsSessionActive(true);
        setError(null);
        setTranscriptions([]);

        let nextStartTime = 0;
        let currentInputTranscription = '';
        let currentOutputTranscription = '';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // FIX: Cast window to any to support webkitAudioContext for older browsers without TypeScript errors.
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        sourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }
                         if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscription;
                            const fullOutput = currentOutputTranscription;
                            setTranscriptions(prev => [...prev, { user: fullInput, model: fullOutput }]);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                         }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e: ErrorEvent) => { setError(`An error occurred during the session: ${e.message || 'Please check your connection.'}`); stopSession(); },
                    onclose: (e: CloseEvent) => { stopSession(); },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                },
            });
            sessionPromise.then(session => sessionRef.current = session);

        } catch (err) {
            setError(`Failed to start conversation: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
            stopSession();
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto space-y-6 bg-gray-800/50 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-purple-300">Live Conversation Studio</h2>
            <div className="flex justify-center">
                <button onClick={isSessionActive ? stopSession : handleStartConversation} className={`px-6 py-3 font-bold rounded-lg text-white transition ${isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    {isSessionActive ? 'Stop Conversation' : 'Start Conversation'}
                </button>
            </div>
            {isSessionActive && <p className="text-center text-green-400 animate-pulse">Live... say something!</p>}
             <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {transcriptions.map((t, i) => (
                    <div key={i}>
                        <p><span className="font-bold text-purple-400">You:</span> {t.user}</p>
                        <p><span className="font-bold text-pink-400">Gemini:</span> {t.model}</p>
                    </div>
                ))}
            </div>
            {error && <ErrorDisplay message={error} />}
        </div>
    );
};


const AudioStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AudioStudioTab>('Transcribe');
    return (
        <div className="space-y-6">
            <div className="flex justify-center gap-2 p-1 bg-gray-800 rounded-lg max-w-xs mx-auto">
                <button onClick={() => setActiveTab('Transcribe')} className={`w-full py-2 rounded-md transition ${activeTab === 'Transcribe' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>Transcribe</button>
                <button onClick={() => setActiveTab('Converse')} className={`w-full py-2 rounded-md transition ${activeTab === 'Converse' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>Converse</button>
            </div>
            {activeTab === 'Transcribe' && <AudioTranscribeStudio />}
            {activeTab === 'Converse' && <AudioConverseStudio />}
        </div>
    );
};

const VisionStudio: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [analysis, setAnalysis] = useState('');
    const fileUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
    
    const handleAnalyze = async () => {
        if (!file || !prompt.trim()) {
            setError('Please upload a file and enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');
        try {
            const result = await analyzeContent(file, prompt);
            setAnalysis(result);
        } catch (err) {
            setError(`Analysis failed: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-purple-300">Vision Studio</h2>
                <div className="space-y-4">
                    <ImageUploader onImageUpload={setFile} accept="image/*,video/*" />
                    {fileUrl && (
                        <div className="flex justify-center">
                            {file.type.startsWith('image/') && <img src={fileUrl} className="max-h-60 rounded-lg" />}
                            {file.type.startsWith('video/') && <video src={fileUrl} className="max-h-60 rounded-lg" controls />}
                        </div>
                    )}
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., What is in this image? or Summarize this video." rows={3} className="w-full bg-gray-700/80 border border-gray-600 rounded-md p-3" disabled={isLoading}/>
                    <button onClick={handleAnalyze} disabled={isLoading || !file || !prompt.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition disabled:bg-gray-600">
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </div>
            </div>
            {isLoading && <div className="flex justify-center"><LoadingSpinner text="Analyzing content..." /></div>}
            {error && <ErrorDisplay message={error} />}
            {analysis && (
                 <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                     <h3 className="font-semibold mb-2 text-purple-300">Analysis Result:</h3>
                     <p className="whitespace-pre-wrap">{analysis}</p>
                 </div>
            )}
        </div>
    );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [activeStudio, setActiveStudio] = useState<Studio>('Chat');

  const renderStudio = () => {
    switch (activeStudio) {
      case 'Chat': return <ChatStudio />;
      case 'Image': return <ImageStudio />;
      case 'Video': return <VideoStudio />;
      case 'Audio': return <AudioStudio />;
      case 'Vision': return <VisionStudio />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <AppHeader />
      <main className="p-4 md:p-8">
        <MainTabs activeStudio={activeStudio} onSelectStudio={setActiveStudio} />
        {renderStudio()}
      </main>
    </div>
  );
};

export default App;