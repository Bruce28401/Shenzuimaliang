
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const DOUBAO_MODEL = 'doubao-seedream-4-5-251128';
const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

export interface PaintingResult {
  url: string;
  source: 'Gemini' | 'Doubao';
}

export const generateAncientPainting = async (userPrompt: string): Promise<PaintingResult> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key not found. Please set process.env.API_KEY.");
  }

  const stylePrompt = `Traditional Chinese Painting masterpiece: ${userPrompt}. Ink wash style on aged Xuan paper, museum quality, 16:9 aspect ratio.`;

  // --- 尝试 Gemini ---
  try {
    console.log("🎨 [System] 尝试调用 Gemini 模型...");
    const ai = new GoogleGenAI({ apiKey });
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
    throw new Error("Gemini returned no image.");
  } catch (geminiError) {
    console.warn("⚠️ [Warn] Gemini 调用失败，正在切换至 豆包 (Doubao)...", geminiError);

    // --- Fallback to Doubao ---
    try {
      console.log(`🚀 [System] 正在向豆包发送请求: ${DOUBAO_MODEL}`);
      const response = await fetch(DOUBAO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}` 
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
        console.error("❌ [Error] 豆包 API 返回错误:", errorData);
        throw new Error(`Doubao API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const imageItem = data.data?.[0];
      
      if (imageItem?.url || imageItem?.b64_json) {
        console.log("✨ [Success] 豆包调用成功！使用的模型:", DOUBAO_MODEL);
        return {
          url: imageItem.url || `data:image/png;base64,${imageItem.b64_json}`,
          source: 'Doubao'
        };
      }
      
      throw new Error("Doubao returned empty image data.");
    } catch (doubaoError) {
      console.error("💀 [Fatal] 所有模型均调用失败");
      throw doubaoError;
    }
  }
};
