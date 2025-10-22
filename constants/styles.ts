// constants/styles.ts
export interface StylePreset {
  name: string;
  promptSuffix: string;
  thumbnailUrl: string; // A representative image for the style
}

export const STYLE_PRESETS: StylePreset[] = [
  { 
    name: 'Cinematic', 
    promptSuffix: '. Style: cinematic, dramatic lighting, high detail, photorealistic, film grain.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_cinematic.png'
  },
  { 
    name: 'Anime', 
    promptSuffix: '. Style: vibrant anime, cel-shaded, detailed digital illustration, 90s anime aesthetic.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_anime.png'
  },
  { 
    name: '3D Render', 
    promptSuffix: '. Style: 3D digital render, high resolution, octane render, detailed, trending on artstation.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_3d.png'
  },
  { 
    name: 'Cartoon', 
    promptSuffix: '. Style: colorful cartoon, bold lines, flat colors, fun and whimsical.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_cartoon.png'
  },
  { 
    name: 'Pixel Art', 
    promptSuffix: '. Style: 16-bit pixel art, retro gaming aesthetic, vibrant color palette.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_pixel.png'
  },
  { 
    name: 'Fantasy Art', 
    promptSuffix: '. Style: digital painting, fantasy concept art, epic, detailed, matte painting.',
    thumbnailUrl: 'https://storage.googleapis.com/aistudio-hosting/templates/official/nanobanana/style_fantasy.png'
  },
];
