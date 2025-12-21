
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const DOUBAO_MODEL = 'doubao-seedream-4-5-251128';
const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

export interface PaintingResult {
  url: string;
  source: 'Gemini' | 'Doubao';
}

export const generateAncientPainting = async (userPrompt: string): Promise<PaintingResult> => {
  // Gemini 使用默认的 API_KEY
  const geminiApiKey = process.env.API_KEY;
  // 豆包使用独立的 DOUBAO_API_KEY
  const doubaoApiKey = (process.env as any).DOUBAO_API_KEY || geminiApiKey; 
  
  const stylePrompt = `Traditional Chinese Painting masterpiece: ${userPrompt}. Ink wash style on aged Xuan paper, museum quality, 16:9 aspect ratio.`;

  // --- 1. 尝试调用 Gemini ---
  if (geminiApiKey) {
    try {
      console.log("🎨 [System] 尝试调用 Gemini 模型...");
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ parts: [{ text: stylePrompt }] }],
        config: { imageConfig: { aspectRatio: "16:9" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            console.log("✅ [Success] Gemini 调用成功！");
            return {
              url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
              source: 'Gemini'
            };
          }
        }
      }
    } catch (geminiError) {
      console.warn("⚠️ [Warn] Gemini 调用失败:", geminiError);
    }
  } else {
    console.warn("⚠️ [Warn] 未配置 Gemini API_KEY，跳过。");
  }

  // --- 2. 备选方案：尝试调用 豆包 (Doubao) ---
  if (doubaoApiKey) {
    try {
      console.log(`🚀 [System] 正在调用豆包模型: ${DOUBAO_MODEL}`);
      const response = await fetch(DOUBAO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${doubaoApiKey}` 
        },
        body: JSON.stringify({
          model: DOUBAO_MODEL,
          prompt: stylePrompt,
          size: "1024x600",
          n: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Doubao API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const imageItem = data.data?.[0];
      
      if (imageItem?.url || imageItem?.b64_json) {
        console.log("✨ [Success] 豆包调用成功！");
        return {
          url: imageItem.url || `data:image/png;base64,${imageItem.b64_json}`,
          source: 'Doubao'
        };
      }
      throw new Error("Doubao returned empty image data.");
    } catch (doubaoError) {
      console.error("❌ [Error] 豆包模型调用也失败了:", doubaoError);
      throw new Error("所有作画模型均不可用，请检查 API Key 配置。");
    }
  } else {
    throw new Error("未检测到有效的 API Key 配置（API_KEY 或 DOUBAO_API_KEY）。");
  }
};
