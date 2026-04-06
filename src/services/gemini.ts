import { GoogleGenAI, Modality, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

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

export async function generateHiddenPicture(theme: string): Promise<string> {
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

export async function generateBackgroundMusic(): Promise<string> {
  const response = await ai.models.generateContentStream({
    model: "lyria-3-clip-preview",
    contents: "A whimsical, happy, and lighthearted background music track for a kids' hidden object game. Playful instruments like xylophones, flutes, and soft percussion. Looping, 30 seconds.",
  });

  let audioBase64 = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
    }
  }

  if (!audioBase64) throw new Error("Failed to generate music");

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
