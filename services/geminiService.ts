import { GoogleGenAI } from "@google/genai";

const AI_MODEL = 'gemini-2.5-flash-image';

export const generateAncientPainting = async (userPrompt: string): Promise<string> => {
  // Strictly use process.env.API_KEY as per coding guidelines.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key not found. Please set process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Updated prompt logic:
  // 1. Defaults to Black & White Ink Wash (Shanshui) if generic.
  // 2. Adapts to specific styles (Blue-green, Gongbi, Court style) or artists (Qi Baishi, etc.) if requested.
  const stylePrompt = `Generate a high-quality Traditional Chinese Painting based on the user request: "${userPrompt}".

  Directives:
  1. Style Adaptation: 
     - If the user specifies a style (e.g., Blue-green landscape/Qinglü, Gongbi/Fine brush, Northern Song Court style, Figure painting/Portrait) or a specific master (e.g., Qi Baishi, Huang Binhong, Zhang Daqian), STRICTLY follow that style, color palette, and brushwork.
     - If NO specific style/color is mentioned, DEFAULT to: Classic Ink Wash Landscape (Shanshui), Black & White ink on aged yellowed Xuan paper.

  2. General Aesthetic:
     - Medium: Chinese ink/pigments on Xuan paper or Silk.
     - Quality: Ancient masterpiece, museum quality.
     - Texture: Visible texture of paper/silk, authentic brush strokes.
     - Composition: Elegant, classical Chinese composition (Liubai/negative space where appropriate).`;

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