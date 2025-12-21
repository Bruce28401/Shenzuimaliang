
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import { Scroll } from './components/Scroll';
import { ControlPanel } from './components/ControlPanel';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateAncientPainting } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    setTranscript 
  } = useSpeechRecognition();

  // Handle Speech to Text Flow
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
      const imageUrl = await generateAncientPainting(prompt);
      setGeneratedImage(imageUrl);
      setAppState(AppState.READY_TO_OPEN);
    } catch (error) {
      console.error("Failed to generate", error);
      alert("AI Painting Failed. Please ensure API Key is set in environment.");
      setAppState(AppState.IDLE);
      setTranscript('');
    }
  };

  useEffect(() => {
    if (appState === AppState.READY_TO_OPEN) {
      const timer = setTimeout(() => {
        setAppState(AppState.OPENING);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleReset = () => {
    setAppState(AppState.CLOSING);
    setTranscript('');
  };

  const handleAnimationComplete = () => {
    if (appState === AppState.OPENING) {
      setAppState(AppState.OPEN);
    } else if (appState === AppState.CLOSING) {
      setTimeout(() => {
        setAppState(AppState.IDLE);
        setGeneratedImage(null); 
      }, 1000);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#262626] wood-texture flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

      <div className={`absolute top-10 transition-opacity duration-1000 ${appState === AppState.OPEN || appState === AppState.OPENING ? 'opacity-0' : 'opacity-100'} z-10`}>
         <h1 className="text-4xl md:text-6xl text-[#d4cbb8] font-['Zhi_Mang_Xing'] drop-shadow-lg tracking-widest opacity-80">
            神嘴马良
         </h1>
      </div>

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
    </div>
  );
};

export default App;
