
export interface EditImageResult {
  imageUrl: string;
  text: string;
}

export interface HistoryEntry {
  id: number; // Using timestamp for simplicity
  prompt: string;
  imageUrl: string;
  text: string;
  style?: string | null;
}

export interface Base64File {
  base64: string;
  mimeType: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
}

export interface ChatResult {
  text: string;
  groundingChunks: GroundingChunk[];
}
