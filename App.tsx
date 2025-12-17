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
      // Speech ended (either via 5s silence or "开始作画" command)
      
      // Clean transcript: remove the command phrase and trim
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
      alert("AI Painting Failed. Please try again. (API Key valid?)");
      setAppState(AppState.IDLE);
      setTranscript('');
    }
  };

  // Auto open scroll when ready
  useEffect(() => {
    if (appState === AppState.READY_TO_OPEN) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        setAppState(AppState.OPENING);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleReset = () => {
    // Instead of jumping to IDLE, we start the CLOSING animation
    setAppState(AppState.CLOSING);
    // Note: We keep generatedImage to show it rolling up
    setTranscript('');
  };

  const handleClearTranscript = () => {
    setTranscript('');
  };

  const handleAnimationComplete = () => {
    if (appState === AppState.OPENING) {
      setAppState(AppState.OPEN);
    } else if (appState === AppState.CLOSING) {
      // Once closing animation finishes, wait 1 second before showing mic (IDLE)
      setTimeout(() => {
        setAppState(AppState.IDLE);
        // Clean up image after it's fully closed and hidden
        setGeneratedImage(null); 
      }, 1000);
    }
  };

  // Check for background click to reset (optional UX, sticking to button for now)
  
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#262626] wood-texture flex flex-col items-center justify-center">
      {/* Ambient overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

      {/* Decorative Title (fades out when open to focus on art) */}
      <div className={`absolute top-10 transition-opacity duration-1000 ${appState === AppState.OPEN || appState === AppState.OPENING ? 'opacity-0' : 'opacity-100'} z-10`}>
         <h1 className="text-4xl md:text-6xl text-[#d4cbb8] font-['Zhi_Mang_Xing'] drop-shadow-lg tracking-widest opacity-80">
            神嘴马良
         </h1>
      </div>

      <div className="z-10 w-full h-full">
        {/* Pass explicit isOpen based on states where scroll should be expanded */}
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
        onClearTranscript={handleClearTranscript}
      />
      
    </div>
  );
};

export default App;