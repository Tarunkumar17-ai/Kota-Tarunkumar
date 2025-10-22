
interface Base64File {
  base64: string;
  mimeType: string;
}

export const fileToBase64 = (file: File): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve({ base64, mimeType: file.type });
      } else {
        reject(new Error("Failed to extract base64 from file."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToBase64 = (blob: Blob): Promise<Base64File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (base64) {
                resolve({ base64, mimeType: blob.type });
            } else {
                reject(new Error("Failed to extract base64 from blob."));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

export const getVideoFrames = (file: File, frameCount: number): Promise<Base64File[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        video.onloadedmetadata = () => {
            const duration = video.duration;
            const interval = duration / frameCount;
            const frames: Base64File[] = [];
            let processedFrames = 0;

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            const captureFrame = (time: number) => {
                video.currentTime = time;
            };
            
            video.onseeked = () => {
                if (processedFrames < frameCount) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    const base64 = dataUrl.split(',')[1];
                    if (base64) {
                        frames.push({ base64, mimeType: 'image/jpeg' });
                    }
                    processedFrames++;
                    if (processedFrames < frameCount) {
                        captureFrame(processedFrames * interval);
                    } else {
                        URL.revokeObjectURL(video.src);
                        resolve(frames);
                    }
                }
            };
            
            captureFrame(0);
        };
        
        video.onerror = (error) => {
            reject(error);
        };
    });
};

// --- AUDIO UTILS FOR LIVE API ---
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
