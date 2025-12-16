import React from 'react';
import { AppState } from '../types';

interface ControlPanelProps {
  appState: AppState;
  onStartListening: () => void;
  transcript: string;
  onReset: () => void;
  onClearTranscript: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  appState, 
  onStartListening, 
  transcript,
  onReset,
  onClearTranscript
}) => {
  const isListening = appState === AppState.LISTENING;
  const isGenerating = appState === AppState.GENERATING;
  
  // Visibility Logic for Transitions
  // Mic is visible in IDLE, LISTENING, GENERATING
  const isMicVisible = appState === AppState.IDLE || appState === AppState.LISTENING || appState === AppState.GENERATING;
  
  // Close button is visible ONLY in OPEN state. 
  // When switching to CLOSING (on click), it will fade out.
  const isCloseVisible = appState === AppState.OPEN;

  return (
    <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center z-50 pointer-events-none">
      
      {/* Container for buttons to overlap precisely and handle transitions */}
      <div className="relative flex items-center justify-center h-24 w-full">
        
        {/* Mic Button Wrapper */}
        <div 
            className={`
                absolute transform transition-all duration-1000 ease-in-out pointer-events-auto
                ${isMicVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}
            `}
        >
           <button
             onClick={onStartListening}
             disabled={!isMicVisible || isListening || isGenerating}
             className={`
               group relative flex items-center justify-center w-20 h-20 rounded-full 
               transition-all duration-300 transform hover:scale-105 active:scale-95
               ${isListening ? 'bg-red-900 shadow-[0_0_30px_rgba(220,38,38,0.6)]' : 'bg-amber-900 shadow-[0_0_20px_rgba(120,53,15,0.5)]'}
               border-2 border-amber-700/50 text-amber-100
             `}
           >
             {isListening ? (
               <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping"></div>
             ) : null}
             
             {isGenerating ? (
               <svg className="animate-spin h-8 w-8 text-amber-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
               </svg>
             )}
           </button>
        </div>

        {/* Close Button Wrapper */}
        <div
            className={`
                absolute transform transition-all duration-1000 ease-in-out pointer-events-auto
                ${isCloseVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}
            `}
        >
           <button
             onClick={onReset}
             disabled={!isCloseVisible}
             className={`
               px-6 py-2 bg-amber-900/80 hover:bg-amber-800 text-amber-100 
               rounded-full border border-amber-700 backdrop-blur-sm 
               transition-all duration-500 font-serif text-lg tracking-widest shadow-lg
             `}
           >
             合轴
           </button>
        </div>

      </div>
    </div>
  );
};