import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, MicOff, Check, Radio, Volume2, VolumeX, AlertCircle, RefreshCw, ShieldCheck, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/language-context";

// Question field IDs
const INTAKE_FIELDS = [
  { id: 1, field: "full_name", required: true },
  { id: 2, field: "date_of_birth", required: true },
  { id: 3, field: "phone", required: true },
  { id: 4, field: "email", required: true },
  { id: 5, field: "emergency_contact", required: true },
  { id: 6, field: "reason_for_visit", required: true },
  { id: 7, field: "current_medications", required: false },
  { id: 8, field: "allergies", required: true },
  { id: 9, field: "chronic_conditions", required: false },
  { id: 10, field: "past_surgeries", required: false },
  { id: 11, field: "family_history", required: false },
  { id: 12, field: "symptoms", required: false },
  { id: 13, field: "symptom_duration", required: false },
  { id: 14, field: "insurance_provider", required: false },
  { id: 15, field: "insurance_policy", required: false },
];

// Format recording duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Audio waveform visualization
const AudioWaveform: React.FC<{ level: number }> = ({ level }) => {
  const bars = 12;
  const activeCount = Math.floor((level / 100) * bars);

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = i < activeCount;
        const height = isActive ? Math.random() * 60 + 40 : 20;
        return (
          <div
            key={i}
            className={`w-2 rounded-full transition-all duration-100 ${isActive ? 'bg-red-500' : 'bg-gray-300'
              }`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
};

// Check browser compatibility
const checkBrowserCompatibility = () => {
  const checks = {
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    speechRecognition: !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition,
    audioContext: !!(window.AudioContext || (window as any).webkitAudioContext)
  };
  
  return {
    isCompatible: checks.mediaDevices && checks.mediaRecorder,
    checks,
    issues: Object.entries(checks)
      .filter(([_, supported]) => !supported)
      .map(([feature]) => feature)
  };
};

export default function PatientIntakeVoice() {
  const { uniqueLink } = useParams();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Memoized questions with translations
  const INTAKE_QUESTIONS = useMemo(() => INTAKE_FIELDS.map(q => ({
    ...q,
    label: t(`intake.field.${q.field}`)
  })), [t]);

  // States
  const [step, setStep] = useState<'intro' | 'consent' | 'recording' | 'review' | 'complete'>('intro');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasAudioInput, setHasAudioInput] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});
  const [completionProgress, setCompletionProgress] = useState(0);
  const [browserSupport, setBrowserSupport] = useState<{isCompatible: boolean; checks: any; issues: string[]} | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [useManualMode, setUseManualMode] = useState(false);

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser compatibility on mount
  useEffect(() => {
    const compatibility = checkBrowserCompatibility();
    setBrowserSupport(compatibility);
    
    if (!compatibility.isCompatible) {
      console.warn("Browser compatibility issues:", compatibility.issues);
      setUseManualMode(true);
    }
  }, []);

  // Fetch intake form
  const { data: formData, isLoading } = useQuery<any>({
    queryKey: [`/api/public/intake-form/${uniqueLink}`],
    enabled: !!uniqueLink,
  });

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Calculate completion progress
  useEffect(() => {
    const requiredFields = INTAKE_QUESTIONS.filter(q => q.required);
    const filledRequired = requiredFields.filter(q => extractedData[q.field]?.trim()).length;
    const progress = (filledRequired / requiredFields.length) * 100;
    setCompletionProgress(progress);
  }, [extractedData, INTAKE_QUESTIONS]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllRecording();
    };
  }, []);

  // Stop all recording resources
  const stopAllRecording = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("Error stopping media recorder:", e);
      }
    }
    mediaRecorderRef.current = null;

    // Stop all tracks in stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Error stopping speech recognition:", e);
      }
      recognitionRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }

    // Clear timer
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  // Monitor audio levels
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 128) * 100);
    
    setAudioLevel(normalizedLevel);
    setHasAudioInput(normalizedLevel > 5);

    if (isRecording) {
      requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording]);

  // Start recording with live transcription
  const handleStartRecording = async () => {
    try {
      setRecordingError(null);
      setLiveTranscript("");

      // Check browser support
      if (!browserSupport?.isCompatible) {
        toast({
          title: "Browser not supported",
          description: "Your browser doesn't support voice recording. Please use manual mode.",
          variant: "destructive"
        });
        setUseManualMode(true);
        return;
      }

      // Get microphone permission
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (err) {
        console.error("Microphone access error:", err);
        setRecordingError("Microphone access denied. Please allow microphone permissions.");
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive"
        });
        return;
      }

      // Set up MediaRecorder with fallback for mimeType
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up audio analysis
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          
          // Start monitoring audio levels
          requestAnimationFrame(monitorAudioLevel);
        }
      } catch (e) {
        console.error("Audio analysis setup failed:", e);
      }

      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);

      // Set up speech recognition for live transcription
      if (browserSupport?.checks.speechRecognition) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = language === 'es' ? 'es-VE' : 'en-US';

          let finalTranscriptBuffer = '';

          recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscriptBuffer += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }

            const fullTranscript = finalTranscriptBuffer + interimTranscript;
            setLiveTranscript(fullTranscript);
            
            // Auto-extract fields
            if (fullTranscript.length > 50) {
              autoExtractFields(fullTranscript);
            }
          };

          recognitionRef.current.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'network') {
              console.error("Speech recognition error:", event.error);
            }
          };

          recognitionRef.current.onend = () => {
            if (isRecording && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log("Could not restart speech recognition");
              }
            }
          };

          recognitionRef.current.start();
        } catch (speechError) {
          console.error("Speech recognition failed:", speechError);
        }
      }

      // Set safety timeout (10 minutes max)
      recordingTimerRef.current = setTimeout(() => {
        if (isRecording) {
          handleStopRecording();
          toast({
            title: "Recording stopped",
            description: "Maximum recording time reached (10 minutes)."
          });
        }
      }, 10 * 60 * 1000);

      setRetryAttempt(0);
      toast({ title: 'Recording started', description: 'Speak clearly into your microphone' });

    } catch (error) {
      console.error("Recording error:", error);
      setIsRecording(false);
      setRecordingError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please try again or use manual mode.",
        variant: "destructive"
      });
    }
  };

  // Stop recording and process
  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);

    try {
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping speech recognition:", e);
        }
        recognitionRef.current = null;
      }

      // Get transcript from live transcription
      let finalTranscript = liveTranscript.trim();

      // Stop media recorder and get audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => resolve();
            mediaRecorderRef.current.stop();
          } else {
            resolve();
          }
        });
      }

      // If no live transcript, try to transcribe the audio file
      if (!finalTranscript && audioChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("language", language === 'es' ? 'es-VE' : 'en-US');

          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            finalTranscript = data.transcript || '';
          }
        } catch (transcribeError) {
          console.error("Server transcription failed:", transcribeError);
        }
      }

      // Clean up resources
      stopAllRecording();

      if (!finalTranscript) {
        throw new Error("No transcript captured. Please try again or enter text manually.");
      }

      setLiveTranscript(finalTranscript);

      // Extract all fields using AI
      const response = await apiRequest("POST", "/api/ai/extract-intake-answers", {
        transcript: finalTranscript,
        language: language === 'es' ? 'es-VE' : 'en-US'
      });

      const data = await response.json();

      if (data.answers) {
        setExtractedData(data.answers);
        setStep('review');
        toast({
          title: "Processing Complete!",
          description: "Your information has been organized. Please review.",
        });
      } else {
        throw new Error("Could not extract information from recording");
      }

    } catch (error) {
      console.error("Processing error:", error);
      setRecordingError(error instanceof Error ? error.message : "Processing failed");
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Could not process your recording. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry recording
  const handleRetryRecording = async () => {
    setRetryAttempt(prev => prev + 1);
    setRecordingError(null);
    setLiveTranscript("");

    toast({
      title: "Retrying...",
      description: `Attempt ${retryAttempt + 1} - Please allow microphone access`,
    });

    setTimeout(() => {
      handleStartRecording();
    }, 1000);
  };

  // Auto-extract fields as transcript grows
  const autoExtractFields = useCallback(async (transcript: string) => {
    if (transcript.length < 50) return;

    try {
      const response = await apiRequest("POST", "/api/ai/extract-intake-answers", {
        transcript,
        language: language === 'es' ? 'es-VE' : 'en-US'
      });

      const data = await response.json();

      if (data.answers) {
        setExtractedData(prev => ({ ...prev, ...data.answers }));
      }
    } catch (error) {
      console.log("Auto-extract error:", error);
    }
  }, [language]);

  // Process manual transcript
  const processManualTranscript = async () => {
    if (!manualTranscript.trim()) {
      toast({
        title: "Empty transcript",
        description: "Please enter the patient information.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await apiRequest("POST", "/api/ai/extract-intake-answers", {
        transcript: manualTranscript,
        language: language === 'es' ? 'es-VE' : 'en-US'
      });

      const data = await response.json();

      if (data.answers) {
        setExtractedData(data.answers);
        setStep('review');
        toast({
          title: "Processing Complete!",
          description: "Information extracted from text.",
        });
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Failed",
        description: "Could not process the text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData) return;

    setIsProcessing(true);

    try {
      await apiRequest("POST", `/api/public/intake-form/${formData.id}/submit-continuous`, {
        answers: extractedData,
        summary: `Patient intake completed via ${useManualMode ? 'manual entry' : 'voice recording'}. ${Object.keys(extractedData).length} fields captured.`,
        transcript: liveTranscript || manualTranscript,
        language: language === 'es' ? 'es-VE' : 'en-US',
        consentGiven: true,
        signature: `Consent given at ${new Date().toISOString()}`,
      });

      await apiRequest("POST", `/api/public/intake-form/${formData.id}/complete`);

      setStep('complete');

      toast({
        title: "Success!",
        description: "Your intake form has been submitted.",
      });

    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Intake form not found. Please contact your healthcare provider.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // INTRO STEP
  if (step === 'intro') {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4 p-6">
            <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">{t('intake.voice.title')}</CardTitle>
            <CardDescription className="text-base sm:text-lg">
              {t('intake.voice.welcome')} - {formData.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Browser Compatibility Warning */}
            {browserSupport && !browserSupport.isCompatible && (
              <Alert className="border-amber-300 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Browser Compatibility</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  Your browser has limited support for voice recording. You can still use manual text entry mode.
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {t('intake.voice.howItWorks')}
              </h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>{t('intake.voice.step1')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>{t('intake.voice.step2')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>{t('intake.voice.step3')}</span>
                </li>
              </ol>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">{t('intake.voice.include')}</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <li>✓ {t('intake.voice.item1')}</li>
                <li>✓ {t('intake.voice.item2')}</li>
                <li>✓ {t('intake.voice.item3')}</li>
                <li>✓ {t('intake.voice.item4')}</li>
                <li>✓ {t('intake.voice.item5')}</li>
                <li>✓ {t('intake.voice.item6')}</li>
                <li>✓ {t('intake.voice.item7')}</li>
                <li>✓ {t('intake.voice.item8')}</li>
              </ul>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              ⏱️ Takes only 2-3 minutes  •  🔒 Completely secure  •  🌐 Works on any device
            </p>

            <Button
              onClick={() => setStep('consent')}
              className="w-full h-14 text-lg touch-manipulation"
              size="lg"
            >
              {t('intake.voice.getStarted')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CONSENT STEP
  if (step === 'consent') {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl sm:text-2xl">{t('intake.voice.consentTitle')}</CardTitle>
            <CardDescription>{t('intake.voice.consentDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Alert className="border-green-300 bg-green-50">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">{t('intake.voice.privacyProtected')}</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                {t('intake.voice.privacyDesc')}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-2 flex-1">
                  <Label htmlFor="consent" className="text-base font-medium cursor-pointer leading-tight">
                    {t('intake.voice.consentLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('intake.voice.understand')}
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    <li>• {t('intake.voice.point1')}</li>
                    <li>• {t('intake.voice.point2')}</li>
                    <li>• {t('intake.voice.point3')}</li>
                    <li>• {t('intake.voice.point4')}</li>
                    <li>• {t('intake.voice.point5')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('intro')}
                className="w-full sm:w-auto touch-manipulation"
              >
                {t('notes.back')}
              </Button>
              <Button
                onClick={() => setStep('recording')}
                disabled={!consentGiven}
                className="w-full sm:flex-1 h-12 touch-manipulation"
              >
                {consentGiven ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('intake.voice.continue')}
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {t('intake.voice.acceptConsent')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RECORDING STEP
  if (step === 'recording') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">{t('intake.voice.recordingTitle')}</CardTitle>
            <CardDescription className="text-sm">
              {useManualMode ? 'Enter patient information manually' : 'Record your voice to fill the form automatically'}
              <span className="block mt-1 text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded">
                AI Generated - Verify Accuracy
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">

            {/* Mode Toggle */}
            {browserSupport?.isCompatible && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant={useManualMode ? "outline" : "default"}
                  size="sm"
                  onClick={() => setUseManualMode(false)}
                >
                  <Mic className="h-4 w-4 mr-1" />
                  Voice Mode
                </Button>
                <Button
                  variant={useManualMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseManualMode(true)}
                >
                  Manual Mode
                </Button>
              </div>
            )}

            {/* Voice Recording Interface */}
            {!useManualMode && (
              <>
                {/* Recording Controls */}
                <div className="text-center space-y-4">
                  {!isRecording && !isProcessing && (
                    <Button
                      onClick={handleStartRecording}
                      className="h-24 w-24 rounded-full bg-primary hover:bg-primary/90 touch-manipulation"
                      size="lg"
                    >
                      <Mic className="h-10 w-10" />
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      onClick={handleStopRecording}
                      variant="destructive"
                      className="h-24 w-24 rounded-full shadow-lg shadow-red-500/30 touch-manipulation"
                    >
                      <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />
                      <MicOff className="h-10 w-10 relative z-10" />
                    </Button>
                  )}

                  {isProcessing && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">{t('intake.voice.processing')}</p>
                    </div>
                  )}

                  {!isRecording && !isProcessing && (
                    <p className="text-sm text-muted-foreground">
                      {t('intake.voice.clickToStart')}
                    </p>
                  )}
                </div>

                {/* Recording Status */}
                {isRecording && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-bold text-red-600">{language === 'es' ? 'GRABANDO' : 'RECORDING'}</span>
                      </div>
                      <div className="font-mono text-lg text-red-600 bg-white px-3 py-1 rounded border border-red-200">
                        {formatDuration(recordingDuration)}
                      </div>
                    </div>

                    <div className="bg-white rounded p-2">
                      <AudioWaveform level={audioLevel} />
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {hasAudioInput ? (
                        <>
                          <Volume2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-700">{t('intake.voice.detected')}</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4 text-amber-500 animate-pulse" />
                          <span className="text-amber-700">{t('intake.voice.waiting')}</span>
                        </>
                      )}
                    </div>

                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                        style={{ width: `${Math.max(5, audioLevel)}%` }}
                      />
                    </div>

                    {liveTranscript && (
                      <div className="bg-white rounded border border-green-200 p-3 max-h-32 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                          <span className="text-xs font-medium text-green-700">{t('intake.voice.liveTranscript')}</span>
                        </div>
                        <p className="text-xs text-gray-700">{liveTranscript}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Error with Retry */}
                {recordingError && !isRecording && !isProcessing && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recording Error</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>{recordingError}</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Check microphone permissions in your browser</li>
                        <li>Make sure your microphone is not muted</li>
                        <li>Try using Manual Mode instead</li>
                      </ul>
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={handleRetryRecording}
                          variant="outline"
                          className="flex-1"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                        <Button
                          onClick={() => setUseManualMode(true)}
                          variant="secondary"
                          className="flex-1"
                        >
                          Use Manual Mode
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Manual Entry Mode */}
            {useManualMode && (
              <div className="space-y-4">
                <Alert className="border-blue-300 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Manual Entry Mode</AlertTitle>
                  <AlertDescription className="text-blue-700 text-sm">
                    Type or paste the patient information below. The AI will extract the relevant details.
                  </AlertDescription>
                </Alert>

                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Enter patient information here... Example: My name is John Doe, born January 15, 1980. I'm here for a follow-up on my diabetes..."
                  className="w-full h-48 p-4 border rounded-lg font-mono text-sm resize-none"
                />

                <Button
                  onClick={processManualTranscript}
                  disabled={isProcessing || !manualTranscript.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Process Information
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* All 15 Questions Displayed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">{t('intake.voice.autoFill')}</h3>
                <div className="flex items-center gap-2">
                  <Progress value={completionProgress} className="w-24" />
                  <span className="text-xs text-muted-foreground">{Math.round(completionProgress)}%</span>
                </div>
              </div>

              <div className="grid gap-2">
                {INTAKE_QUESTIONS.map((question) => {
                  const filled = extractedData[question.field];
                  return (
                    <div
                      key={question.id}
                      className={`p-3 rounded-md border transition-all ${filled
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 mt-0.5">
                          {question.id}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">
                              {question.label}
                              {question.required && <span className="text-red-500">*</span>}
                            </p>
                            {filled && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 break-words">
                            {filled || <span className="italic text-gray-400">{t('intake.voice.waitingInfo')}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              {!isRecording && Object.keys(extractedData).length > 0 && (
                <Button
                  onClick={() => setStep('review')}
                  className="w-full h-12 touch-manipulation"
                >
                  {t('intake.voice.reviewSubmit')}
                </Button>
              )}

              {!isRecording && !isProcessing && (
                <Button
                  variant="outline"
                  onClick={() => setStep('consent')}
                  className="w-full touch-manipulation"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // REVIEW STEP
  if (step === 'review') {
    const requiredFields = INTAKE_QUESTIONS.filter(q => q.required);
    const missingRequired = requiredFields.filter(q => !extractedData[q.field]?.trim());
    const canSubmit = missingRequired.length === 0;

    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl">{t('intake.voice.reviewTitle')}</CardTitle>
            <CardDescription>
              {t('intake.voice.reviewDesc')}
              <span className="block mt-1 text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded">
                AI Generated - Verify Accuracy
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">

            {!canSubmit && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">{t('intake.voice.missingInfo')}</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  {t('intake.voice.missingDesc')} {missingRequired.map(q => q.label).join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {INTAKE_QUESTIONS.map((question) => {
                const value = extractedData[question.field];
                const isMissing = question.required && !value?.trim();

                return (
                  <div
                    key={question.id}
                    className={`p-3 rounded-md border ${isMissing ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                      }`}
                  >
                    <div className="text-sm font-medium mb-1 flex items-center gap-2">
                      {question.label}
                      {question.required && <span className="text-red-500">*</span>}
                      {isMissing && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="text-sm text-gray-700">
                      {value || <span className="italic text-red-500">{language === 'es' ? 'No proporcionado' : 'Not provided'}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('recording')}
                className="w-full sm:w-auto touch-manipulation"
              >
                {t('intake.voice.reRecord')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isProcessing}
                className="w-full sm:flex-1 h-12 touch-manipulation"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'es' ? 'Enviando...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('intake.voice.submit')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // COMPLETE STEP
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader className="text-center p-6 space-y-4">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">{t('intake.voice.completeTitle')}</CardTitle>
          <CardDescription className="text-base">
            {t('intake.voice.completeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-center">
          <p className="text-sm">
            {t('intake.voice.submittedTo')} {formData.name}.
          </p>
          <p className="text-sm text-muted-foreground">
            {t('intake.voice.reviewNotice')}
          </p>
          <div className="pt-4">
            <p className="text-xs text-muted-foreground">
              {t('intake.voice.closeNotice')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
