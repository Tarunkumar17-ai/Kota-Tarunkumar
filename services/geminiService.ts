

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { EditImageResult, ChatResult, Base64File } from '../types';
import { fileToBase64, blobToBase64, getVideoFrames } from "../utils/fileUtils";

if (!process.env.API_KEY) {
    // This is a fallback; the VEO model requires its own key selection flow.
    console.warn("API_KEY environment variable not set. Some features may not work.");
}

// A global AI instance for non-VEO models.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<EditImageResult> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
         throw new Error(`Request was blocked by the API. Reason: ${finishReason}`);
      }
      throw new Error("Invalid response from Gemini API.");
    }

    let imageUrl: string | null = null;
    let textResponse = '';
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textResponse += part.text;
      }
    }

    if (!imageUrl) throw new Error("API did not return an image.");
    return { imageUrl, text: textResponse.trim() };

  } catch (error) {
    console.error("Error calling Gemini API (editImage):", error);
    throw error;
  }
}

export async function generateImage(prompt: string, aspectRatio: string): Promise<string> {
    try {
        const ai = getAI();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });

        const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("API did not return an image.");
        }
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error calling Gemini API (generateImage):", error);
        throw error;
    }
}

export async function generateVideo(prompt: string, aspectRatio: string, image?: Base64File): Promise<string> {
    // VEO requires its own AI instance to ensure the latest selected API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: image ? { imageBytes: image.base64, mimeType: image.mimeType } : undefined,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio as '16:9' | '9:16'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed or did not return a valid link.");
    }
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export async function getChatResponse(prompt: string, mode: 'lite' | 'flash' | 'pro' | 'search' | 'maps'): Promise<ChatResult> {
    const modelMap = {
        lite: 'gemini-2.5-flash-lite',
        flash: 'gemini-2.5-flash',
        pro: 'gemini-2.5-pro',
        search: 'gemini-2.5-flash',
        maps: 'gemini-2.5-flash',
    };

    const config: any = {};
    if (mode === 'pro') config.thinkingConfig = { thinkingBudget: 32768 };
    if (mode === 'search') config.tools = [{ googleSearch: {} }];
    if (mode === 'maps') config.tools = [{ googleMaps: {} }];
    
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: modelMap[mode],
            contents: prompt,
            config: Object.keys(config).length > 0 ? config : undefined,
        });

        return {
            text: response.text,
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
    } catch (error) {
        console.error(`Error calling Gemini API (getChatResponse - ${mode}):`, error);
        throw error;
    }
}

export async function analyzeContent(file: File, prompt: string): Promise<string> {
    const model = file.type.startsWith('video/') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    // FIX: Explicitly type 'parts' as any[] to allow pushing both text and inlineData objects.
    const parts: any[] = [{ text: prompt }];

    if (file.type.startsWith('image/')) {
        const { base64, mimeType } = await fileToBase64(file);
        parts.push({ inlineData: { data: base64, mimeType } });
    } else if (file.type.startsWith('video/')) {
        const frames = await getVideoFrames(file, 10); // Extract 10 frames
        for (const frame of frames) {
            parts.push({ inlineData: { data: frame.base64, mimeType: frame.mimeType } });
        }
    }

    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model,
            contents: { parts }
        });
        return response.text;
    } catch(error) {
        console.error("Error calling Gemini API (analyzeContent):", error);
        throw error;
    }
}

export async function textToSpeech(text: string): Promise<string> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("API did not return audio data.");
        return base64Audio;
    } catch (error) {
        console.error("Error calling Gemini API (textToSpeech):", error);
        throw error;
    }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
        const ai = getAI();
        const { base64, mimeType } = await blobToBase64(audioBlob);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{ inlineData: { data: base64, mimeType } }]
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API (transcribeAudio):", error);
        throw error;
    }
}