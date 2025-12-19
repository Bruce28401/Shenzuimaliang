import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  // Use any to avoid type issues with NodeJS.Timeout vs number in browser environment
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
    }
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // abort is faster than stop for cleanup
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    setError(null);
    setIsListening(true);
    setTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'zh-CN'; 
    recognition.continuous = true; // Allow continuous input to detect pauses manually
    recognition.interimResults = true; // Needed for real-time command detection

    // Helper to reset the silence timer
    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // Stop recognition after 5 seconds of silence
        recognition.stop();
      }, 5000);
    };

    recognition.onstart = () => {
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      // User spoke, reset timer
      resetSilenceTimer();

      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      setTranscript(fullTranscript);

      // Check for command "开始作画"
      if (fullTranscript.includes('开始作画')) {
        recognition.stop();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setError(event.error);
      // If error occurs (e.g. no speech detected), stop listening state
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.start();
  }, [isSupported]);

  return { isListening, transcript, error, startListening, isSupported, setTranscript };
};