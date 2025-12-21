
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import { Scroll } from './components/Scroll';
import { ControlPanel } from './components/ControlPanel';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateAncientPainting } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true); // 默认假设有，报错时检查
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    setTranscript 
  } = useSpeechRecognition();

  // 检查是否已选择 API Key (针对 Gemini 3)
  const checkKeyStatus = async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
      return selected;
    }
    // 如果没有 aistudio 环境（纯 Vercel），则检查环境变量
    const envKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
    const dbKey = (window as any).process?.env?.DOUBAO_API_KEY;
    const exists = !!(envKey || dbKey);
    setHasKey(exists);
    return exists;
  };

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // 假设选择成功并重试
      setHasKey(true);
    } else {
      alert("请在 Vercel 环境变量中设置 API_KEY 或 DOUBAO_API_KEY 并重新部署。");
    }
  };

  useEffect(() => {
    if (isListening) {
      setAppState(AppState.LISTENING);
    } else if (!isListening && appState === AppState.LISTENING) {
      const cleanPrompt = transcript.replace(/开始作画/g, '').trim();
      if (cleanPrompt.length > 0) {
        handleGeneration(cleanPrompt);
      } else {
        setAppState(AppState.IDLE);
      }
    }
  }, [isListening, transcript, appState]);

  const handleGeneration = async (prompt: string) => {
    setAppState(AppState.GENERATING);
    try {
      const result = await generateAncientPainting(prompt);
      setGeneratedImage(result.url);
      setCurrentSource(result.source);
      setAppState(AppState.READY_TO_OPEN);
    } catch (error: any) {
      console.error("Generation Error:", error);
      
      // 如果是 Key 缺失错误，引导用户
      if (error.message.includes("未检测到有效的 API Key")) {
        setHasKey(false);
      } else {
        alert(`作画失败: ${error.message}`);
      }
      
      setAppState(AppState.IDLE);
      setTranscript('');
    }
  };

  useEffect(() => {
    if (appState === AppState.READY_TO_OPEN) {
      setTimeout(() => setAppState(AppState.OPENING), 500);
    }
  }, [appState]);

  const handleReset = () => {
    setAppState(AppState.CLOSING);
    setTranscript('');
  };

  const handleAnimationComplete = () => {
    if (appState === AppState.OPENING) setAppState(AppState.OPEN);
    else if (appState === AppState.CLOSING) {
      setTimeout(() => {
        setAppState(AppState.IDLE);
        setGeneratedImage(null); 
        setCurrentSource(null);
      }, 1000);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#262626] wood-texture flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

      {/* 顶部标题 */}
      <div className={`absolute top-10 transition-opacity duration-1000 ${appState === AppState.OPEN || appState === AppState.OPENING ? 'opacity-0' : 'opacity-100'} z-10 text-center`}>
         <h1 className="text-4xl md:text-6xl text-[#d4cbb8] font-['Zhi_Mang_Xing'] drop-shadow-lg tracking-widest opacity-80">
            神嘴马良
         </h1>
         {!hasKey && (
           <button 
             onClick={handleOpenKeyDialog}
             className="mt-4 px-4 py-1 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200/70 text-sm rounded border border-amber-900/30 transition-colors pointer-events-auto"
           >
             点此配置 API Key
           </button>
         )}
      </div>

      {currentSource && (
        <div className="absolute top-4 right-4 z-50 px-3 py-1 bg-black/50 text-xs text-amber-200/50 font-mono rounded border border-amber-900/30">
          Engine: {currentSource}
        </div>
      )}

      <div className="z-10 w-full h-full">
        <Scroll 
          isOpen={appState === AppState.OPENING || appState === AppState.OPEN} 
          imageUrl={generatedImage}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>

      <ControlPanel 
        appState={appState}
        onStartListening={startListening}
        transcript={transcript}
        onReset={handleReset}
        onClearTranscript={() => setTranscript('')}
      />

      {/* 计费说明文档链接 (按规范要求) */}
      {!hasKey && (
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 text-[10px] text-amber-200/30 hover:underline z-50"
        >
          Billing Documentation
        </a>
      )}
    </div>
  );
};

export default App;
