import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceCommands } from '@/contexts/voice-command-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';

const BOUNCE_DELAY_0 = { animationDelay: '0ms' } as const;
const BOUNCE_DELAY_150 = { animationDelay: '150ms' } as const;
const BOUNCE_DELAY_300 = { animationDelay: '300ms' } as const;

interface VoiceButtonProps {
  className?: string;
  onVoiceResult?: (transcript: string) => void;
}

export function VoiceButton({ className, onVoiceResult }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const { language } = useLanguage();
  const { toast } = useToast();
  const {
    isEnabled,
    toggleVoiceCommands
  } = useVoiceCommands();

  const handleStartListening = useCallback(() => {
    if (!isEnabled) {
      toggleVoiceCommands();
    }
    setIsListening(true);
    setShowFeedback(true);
    
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'es' ? 'es-VE' : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        setLastTranscript(transcript);
        
        if (event.results[0].isFinal) {
          processVoiceCommand(transcript);
          onVoiceResult?.(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setTimeout(() => setShowFeedback(false), 2000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setShowFeedback(false), 3000);
      };

      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    } else {
      toast({
        title: "Browser Not Supported",
        description: "Voice commands are primarily supported in Chrome and Edge. Firefox and Safari may have limited or no support. Please use a Chromium-based browser for the best experience.",
        variant: "destructive"
      });
      setIsListening(false);
      setShowFeedback(false);
    }
  }, [isEnabled, language, toggleVoiceCommands, onVoiceResult, toast]);

  const processVoiceCommand = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    const commandMap: Record<string, () => void> = {
      // Recording
      'start recording': () => window.startRecording?.(),
      'stop recording': () => window.stopRecording?.(),
      'pause': () => window.pauseRecording?.(),
      'resume': () => window.resumeRecording?.(),
      // Notes
      'generate notes': () => window.generateNotes?.(),
      'generate soap': () => window.generateSoapNotes?.(),
      'save notes': () => window.saveNotes?.(),
      'save': () => window.saveNotes?.(),
      'preview': () => window.previewNotes?.(),
      'download': () => window.downloadNotes?.(),
      'download notes': () => window.downloadNotes?.(),
      // Forms
      'clear': () => window.clearForm?.(),
      'clear form': () => window.clearForm?.(),
      // Intake
      'start intake': () => window.startIntake?.(),
      'voice intake': () => window.voiceIntake?.(),
      // Medical Scribe
      'start transcription': () => window.startTranscription?.(),
      'stop transcription': () => window.stopTranscription?.(),
      // HPI
      'start hpi': () => window.recordHpi?.(),
      'start interview': () => window.startInterview?.(),
      // Visit
      'new visit': () => window.newVisit?.(),
      'add visit note': () => window.addVisitNote?.(),
      // Lab
      'analyze lab': () => window.analyzeLab?.(),
      // Compliance
      'check compliance': () => window.checkCompliance?.(),
    };

    for (const [phrase, action] of Object.entries(commandMap)) {
      if (lowerTranscript.includes(phrase)) {
        action();
        return;
      }
    }

    const clickMatch = lowerTranscript.match(/(?:click|press|tap|open)\s+(.+)/);
    if (clickMatch) {
      const targetText = clickMatch[1];
      clickElementByText(targetText);
      return;
    }

    const navMatch = lowerTranscript.match(/(?:go to|navigate to)\s+(.+)/);
    if (navMatch) {
      const page = navMatch[1].replace(/\s+/g, '-');
      navigateToPage(page);
    }
  };

  const clickElementByText = (text: string) => {
    const elements = document.querySelectorAll('button, a, [role="button"]');
    for (const el of elements) {
      if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
        (el as HTMLElement).click();
        return;
      }
    }
  };

  const navigateToPage = (page: string) => {
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'home': '/dashboard',
      'patients': '/patients',
      'appointments': '/appointments',
      'calendar': '/appointments',
      'notes': '/notes',
      'medical notes': '/notes',
      'telemedicine': '/telemedicine',
      'video': '/telemedicine',
      'video call': '/telemedicine',
      'analytics': '/analytics',
      'settings': '/settings',
      'intake': '/patient-intake',
      'patient intake': '/patient-intake',
      'lab': '/lab-interpreter',
      'lab interpreter': '/lab-interpreter',
      'assistant': '/assistant',
      'ai': '/assistant',
      'medical scribe': '/medical-scribe',
      'scribe': '/medical-scribe',
      'code manager': '/medical-codes-manager',
      'cpt codes': '/medical-codes-manager',
      'icd codes': '/medical-codes-manager',
      'import patients': '/patients/import',
      'patient import': '/patients/import',
      'voice intake': '/patient-intake-voice',
      'patient interview': '/patient-intake-voice',
    };
    
    const route = routes[page.toLowerCase()] || `/${page}`;
    window.location.href = route;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleStartListening();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartListening]);

  return (
    <>
      <Button
        onClick={handleStartListening}
        className={cn(
          "fixed left-6 bottom-6 z-[60] h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
          "text-white border-2 border-white/20",
          "transition-all duration-200 hover:scale-105",
          "flex items-center justify-center",
          isListening && "animate-pulse bg-gradient-to-br from-red-500 to-red-600",
          className
        )}
        title={language === 'es' ? 'Presiona para hablar (Alt+V)' : 'Press to speak (Alt+V)'}
      >
        {isListening ? (
          <Volume2 className="h-6 w-6 animate-pulse" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {showFeedback && (
        <div className={cn(
          "fixed left-6 bottom-24 z-[60]",
          "bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]",
          "border border-blue-200 dark:border-blue-800",
          "animate-in fade-in slide-in-from-bottom-2 duration-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
              {isListening ? (
                <>
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  {language === 'es' ? 'Escuchando...' : 'Listening...'}
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3" />
                  {language === 'es' ? 'Comando:' : 'Command:'}
                </>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setShowFeedback(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {lastTranscript && (
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              "{lastTranscript}"
            </p>
          )}
          {isListening && (
            <div className="flex gap-1 mt-2">
              <div 
                className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" 
                style={BOUNCE_DELAY_0} 
              />
              <div 
                className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" 
                style={BOUNCE_DELAY_150} 
              />
              <div 
                className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" 
                style={BOUNCE_DELAY_300} 
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default VoiceButton;
