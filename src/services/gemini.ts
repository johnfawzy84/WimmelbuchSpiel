import { GoogleGenAI, Modality, Type } from "@google/genai";

export interface HiddenObject {
  name: string;
  description: string;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  found: boolean;
}

export interface GameLevel {
  imageUrl: string;
  objects: HiddenObject[];
}

let manualApiKey: string | null = null;

export function setManualApiKey(key: string) {
  manualApiKey = key;
}

function getAI() {
  // Priority: 1. Manual Key, 2. Selection Dialog Key, 3. Default Env Key
  const apiKey = manualApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export async function generateHiddenPicture(theme: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: `A highly detailed, busy, and colorful hidden-picture style illustration for kids. Theme: ${theme}. The scene should be packed with many different objects, characters, and details, making it perfect for a "find the object" game. High quality, whimsical art style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

export async function analyzeImageForObjects(imageUrl: string): Promise<HiddenObject[]> {
  const ai = getAI();
  const base64Data = imageUrl.split(",")[1];
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png",
          },
        },
        {
          text: `Identify 5 interesting and distinct objects in this image that a child could find. 
          For each object, provide its name, a very brief description, and its bounding box in [ymin, xmin, ymax, xmax] format (normalized 0-1000).
          Return the result as a JSON array of objects with keys: "name", "description", "boundingBox".`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            boundingBox: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              minItems: 4,
              maxItems: 4,
            },
          },
          required: ["name", "description", "boundingBox"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Failed to analyze image");
  
  const objects = JSON.parse(text);
  return objects.map((obj: any) => ({ ...obj, found: false }));
}
