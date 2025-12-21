
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const DOUBAO_MODEL = 'doubao-seedream-4-5-251128';
const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

export interface PaintingResult {
  url: string;
  source: 'Gemini' | 'Doubao';
}

export const generateAncientPainting = async (userPrompt: string): Promise<PaintingResult> => {
  // 获取 API Keys
  const geminiApiKey = process.env.API_KEY;
  const doubaoApiKey = (process.env as any).DOUBAO_API_KEY;
  
  // 打印调试信息（仅检查是否存在，不泄露内容）
  console.log("🔑 [Auth] Checking keys:", { 
    hasGeminiKey: !!geminiApiKey, 
    hasDoubaoKey: !!doubaoApiKey 
  });

  if (!geminiApiKey && !doubaoApiKey) {
    throw new Error("未检测到 API Key 配置。请在 Vercel 环境变量中设置 API_KEY 或 DOUBAO_API_KEY。");
  }

  const stylePrompt = `Traditional Chinese Painting masterpiece: ${userPrompt}. Ink wash style on aged Xuan paper, museum quality, 16:9 aspect ratio.`;

  // --- 1. 优先尝试调用 Gemini ---
  if (geminiApiKey) {
    try {
      console.log("🎨 [Gemini] 尝试生成图片...");
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ parts: [{ text: stylePrompt }] }],
        config: { imageConfig: { aspectRatio: "16:9" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            console.log("✅ [Gemini] 成功生成图片");
            return {
              url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
              source: 'Gemini'
            };
          }
        }
      }
      throw new Error("Gemini 返回数据中不包含图片内容。");
    } catch (geminiError: any) {
      console.warn("⚠️ [Gemini] 失败:", geminiError.message || geminiError);
      // 如果只有 Gemini Key 且失败了，直接抛出，否则尝试豆包
      if (!doubaoApiKey) throw new Error(`Gemini 调用失败: ${geminiError.message || '未知错误'}`);
    }
  }

  // --- 2. 备选方案：尝试调用 豆包 (Doubao) ---
  if (doubaoApiKey) {
    try {
      console.log(`🚀 [Doubao] 正在调用模型: ${DOUBAO_MODEL}`);
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
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status}`;
        throw new Error(`豆包 API 错误: ${msg}`);
      }

      const data = await response.json();
      const imageItem = data.data?.[0];
      
      if (imageItem?.url || imageItem?.b64_json) {
        console.log("✨ [Doubao] 成功生成图片");
        return {
          url: imageItem.url || `data:image/png;base64,${imageItem.b64_json}`,
          source: 'Doubao'
        };
      }
      throw new Error("豆包 API 未返回有效的图片数据。");
    } catch (doubaoError: any) {
      console.error("❌ [Doubao] 失败:", doubaoError.message || doubaoError);
      throw new Error(`所有模型均失败。豆包错误: ${doubaoError.message || '网络或跨域错误'}`);
    }
  }

  throw new Error("无可用的 API 配置或模型调用全部失败。");
};
