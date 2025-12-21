
import { GoogleGenAI } from "@google/genai";

// 升级到高质量模型
const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const DOUBAO_MODEL = 'doubao-seedream-4-5-251128';
const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

export interface PaintingResult {
  url: string;
  source: 'Gemini' | 'Doubao';
}

/**
 * 安全地获取环境变量
 * 兼容不同的构建工具和 Vercel 注入方式
 */
const getApiKey = (name: string): string | undefined => {
  try {
    // 尝试从 process.env 获取
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
    // 尝试从 window.process.env 获取（针对 polyfill）
    if (typeof window !== 'undefined' && (window as any).process?.env?.[name]) {
      return (window as any).process.env[name];
    }
  } catch (e) {
    console.warn(`Error accessing env ${name}:`, e);
  }
  return undefined;
};

export const generateAncientPainting = async (userPrompt: string): Promise<PaintingResult> => {
  const geminiApiKey = getApiKey('API_KEY');
  const doubaoApiKey = getApiKey('DOUBAO_API_KEY');
  
  console.log("🔑 [Auth] Checking keys:", { 
    hasGeminiKey: !!geminiApiKey, 
    hasDoubaoKey: !!doubaoApiKey 
  });

  const stylePrompt = `Traditional Chinese Painting masterpiece: ${userPrompt}. Ink wash style on aged Xuan paper, museum quality, 16:9 aspect ratio. High detail, masterwork.`;

  // --- 1. 尝试调用 Gemini (升级后的 Gemini 3 Pro Image) ---
  if (geminiApiKey) {
    try {
      console.log(`🎨 [Gemini] 尝试使用 ${GEMINI_MODEL} 生成...`);
      // 每次调用时重新创建实例，确保使用最新的 Key
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: [{ text: stylePrompt }] },
        config: { 
          imageConfig: { 
            aspectRatio: "16:9",
            imageSize: "1K" 
          } 
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            console.log("✅ [Gemini] 生成成功");
            return {
              url: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
              source: 'Gemini'
            };
          }
        }
      }
    } catch (geminiError: any) {
      console.warn("⚠️ [Gemini] 失败:", geminiError.message || geminiError);
      // 如果报错是因为 Entity not found，通常是 Key 权限或模型名问题
      if (geminiError.message?.includes("Requested entity was not found")) {
        throw new Error("模型访问失败：请确保您的 API Key 已启用 Gemini 3 系列模型权限。");
      }
      if (!doubaoApiKey) throw geminiError;
    }
  }

  // --- 2. 备选方案：豆包 ---
  if (doubaoApiKey) {
    try {
      console.log(`🚀 [Doubao] 尝试使用 ${DOUBAO_MODEL} 生成...`);
      const response = await fetch(DOUBAO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${doubaoApiKey}` 
        },
        body: JSON.stringify({
          model: DOUBAO_MODEL,
          prompt: stylePrompt,
          size: "1024x600"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);

      const imageItem = data.data?.[0];
      if (imageItem?.url || imageItem?.b64_json) {
        return {
          url: imageItem.url || `data:image/png;base64,${imageItem.b64_json}`,
          source: 'Doubao'
        };
      }
    } catch (doubaoError: any) {
      console.error("❌ [Doubao] 失败:", doubaoError.message);
      throw new Error(`所有模型调用均失败。最后尝试的错误：${doubaoError.message}`);
    }
  }

  throw new Error("未检测到有效的 API Key。请点击配置按钮设置您的 API Key。");
};
