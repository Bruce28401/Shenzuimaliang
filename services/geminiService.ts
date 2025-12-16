import { GoogleGenAI } from "@google/genai";

const AI_MODEL = 'gemini-2.5-flash-image';

export const generateAncientPainting = async (userPrompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Simplified and direct prompt to encourage image generation and reduce text-based refusals
  const stylePrompt = `Traditional Chinese ink wash painting (Guohua) depicting ${userPrompt}. 
  Style: Ancient masterpiece, ink on aged yellowed Xuan paper.
  Composition: Minimalist, elegant usage of negative space (Liubai).
  Texture: Visible paper grain, soft brush strokes fading into the background.
  Colors: Sepia, black ink, earthy tones.`;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [
        {
          parts: [
            { text: stylePrompt }
          ]
        }
      ],
      config: {
        imageConfig: {
          aspectRatio: "16:9", 
        }
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // Check for inlineData (image)
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${base64Data}`;
          }
        }
        
        // If no image found, check for text to log potential refusal reasons
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          console.warn("Model returned text instead of image:", textPart.text);
        }
      }
    }

    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};