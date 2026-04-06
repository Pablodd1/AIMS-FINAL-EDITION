import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  Square, 
  Play, 
  Pause,
  Upload,
  FileText,
  Save,
  CheckCircle2,
  User,
  Stethoscope,
  Sparkles,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Clock,
  Volume2,
  Wand2,
  X,
  RotateCcw,
  FileAudio,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { SignaturePad, SignatureData } from '@/components/signature-pad';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types
interface CPTCode {
  code: string;
  description: string;
  modifier?: string;
  units: number;
  linkedDx: string[];
}

interface DXCode {
  code: string;
  description: string;
  type: 'primary' | 'secondary';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

// Available note templates
const NOTE_TEMPLATES = [
  { id: 'soap', name: 'SOAP Note', description: 'Standard Subjective, Objective, Assessment, Plan format' },
  { id: 'consultation', name: 'Consultation Note', description: 'Specialist consultation with referral and recommendations' },
  { id: 'followup', name: 'Follow-up Visit', description: 'Progress evaluation and treatment adjustment' },
  { id: 'procedure', name: 'Procedure Note', description: 'Documentation of medical procedures performed' },
  { id: 'physical', name: 'Physical Exam', description: 'Comprehensive annual physical examination' },
  { id: 'psychiatric', name: 'Psychiatric Evaluation', description: 'Mental health assessment with diagnostic criteria' },
  { id: 'discharge', name: 'Discharge Summary', description: 'Hospital discharge with care instructions' },
];

// Medical specialties for context
const SPECIALTIES = [
  { id: 'primary', name: 'Primary Care' },
  { id: 'cardiology', name: 'Cardiology' },
  { id: 'dermatology', name: 'Dermatology' },
  { id: 'orthopedics', name: 'Orthopedics' },
  { id: 'neurology', name: 'Neurology' },
  { id: 'psychiatry', name: 'Psychiatry' },
  { id: 'gastroenterology', name: 'Gastroenterology' },
  { id: 'endocrinology', name: 'Endocrinology' },
  { id: 'pulmonology', name: 'Pulmonology' },
  { id: 'nephrology', name: 'Nephrology' },
  { id: 'rheumatology', name: 'Rheumatology' },
  { id: 'oncology', name: 'Oncology' },
];

export function MedicalScribe() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Transcription state
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptSaved, setTranscriptSaved] = useState(false);
  
  // Note generation state
  const [generatedNote, setGeneratedNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('soap');
  const [selectedSpecialty, setSelectedSpecialty] = useState('primary');
  const [noteContext, setNoteContext] = useState('');
  
  // Coding state
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [dxCodes, setDxCodes] = useState<DXCode[]>([]);
  const [emLevel, setEmLevel] = useState('');
  
  // UI state
  const [activeTab, setActiveTab] = useState('record');
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientDOB, setPatientDOB] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [mrn, setMrn] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript, liveTranscript]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording with live transcription
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setIsTranscribing(true);
      setTranscriptSaved(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start Web Speech API for live transcription
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        let finalTranscriptBuffer = '';
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptBuffer += transcript + ' ';
              setTranscript(prev => prev + transcript + ' ');
              setTranscriptSegments(prev => [...prev, {
                text: transcript,
                isFinal: true,
                timestamp: Date.now()
              }]);
            } else {
              interimTranscript += transcript;
            }
          }
          
          setLiveTranscript(interimTranscript);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            toast({ 
              title: 'Transcription issue', 
              description: `Error: ${event.error}. Try speaking more clearly.`,
              variant: 'destructive'
            });
          }
        };
        
        recognitionRef.current.start();
      } else {
        toast({ 
          title: 'Browser not supported', 
          description: 'Your browser does not support live transcription. Try Chrome or Edge.',
          variant: 'destructive'
        });
      }
      
      // Monitor audio levels
      const checkAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();
      
      toast({ title: 'Recording started', description: 'Speak clearly - transcription is live!' });
    } catch (error) {
      console.error('Recording error:', error);
      toast({ 
        title: 'Recording failed', 
        description: 'Please check microphone permissions and try again',
        variant: 'destructive'
      });
    }
  }, [isRecording, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setIsTranscribing(false);
    setLiveTranscript('');
    setAudioLevel(0);
    
    toast({ title: 'Recording stopped', description: 'Review your transcript and save if accurate' });
  }, [isRecording, toast]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (isPaused) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setIsPaused(false);
      toast({ title: 'Recording resumed' });
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsPaused(true);
      toast({ title: 'Recording paused' });
    }
  }, [isPaused, toast]);

  // Save transcript
  const saveTranscript = () => {
    if (!transcript.trim()) {
      toast({ title: 'Nothing to save', description: 'Record some audio first' });
      return;
    }
    setTranscriptSaved(true);
    toast({ title: 'Transcript saved!', description: 'You can now generate a medical note' });
  };

  // Clear transcript and start over
  const clearTranscript = () => {
    if (window.confirm('Clear all transcription? This cannot be undone.')) {
      setTranscript('');
      setTranscriptSegments([]);
      setTranscriptSaved(false);
      setRecordingTime(0);
      toast({ title: 'Transcript cleared' });
    }
  };

  // Generate SOAP note from transcript
  const generateNote = useCallback(async () => {
    if (!transcript.trim()) {
      toast({ title: 'No transcript', description: 'Please record or enter a consultation first' });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Try Gemini first, fallback to OpenAI
      let endpoint = '/api/gemini/generate-soap';
      let response = await apiRequest('POST', endpoint, {
        transcript,
        noteType: selectedTemplate,
        specialty: selectedSpecialty,
        patientInfo: {
          name: patientName,
          dob: patientDOB,
          chiefComplaint,
          mrn
        },
        context: noteContext
      });
      
      // If Gemini fails, try OpenAI
      if (!response.ok) {
        endpoint = '/api/ai/generate-soap';
        response = await apiRequest('POST', endpoint, {
          transcript,
          noteType: selectedTemplate,
          patientInfo: {
            name: patientName,
            dob: patientDOB,
            chiefComplaint
          }
        });
      }
      
      const data = await response.json();
      
      if (data.success && data.soap) {
        setGeneratedNote(data.soap);
        setActiveTab('note');
        
        // Extract codes if available
        if (data.structuredData) {
          if (data.structuredData.cpt_codes_today) {
            setCptCodes(data.structuredData.cpt_codes_today.map((cpt: any) => ({
              code: cpt.code,
              description: cpt.description,
              units: cpt.units || 1,
              linkedDx: cpt.linked_dx || []
            })));
          }
          
          if (data.structuredData.icd10_codes) {
            setDxCodes(data.structuredData.icd10_codes.map((dx: any, index: number) => ({
              code: dx.code,
              description: dx.description,
              type: index === 0 ? 'primary' : 'secondary'
            })));
          }
          
          if (data.structuredData.note_sections?.evaluation_coding?.em_level) {
            setEmLevel(data.structuredData.note_sections.evaluation_coding.em_level);
          }
        }
        
        toast({ 
          title: 'Note generated!', 
          description: `${NOTE_TEMPLATES.find(t => t.id === selectedTemplate)?.name} created successfully` 
        });
      } else {
        throw new Error(data.soap || 'Failed to generate note');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({ 
        title: 'Generation failed', 
        description: 'Please try again or check your AI configuration',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [transcript, selectedTemplate, selectedSpecialty, patientName, patientDOB, chiefComplaint, mrn, noteContext, toast]);

  // Rest of the functions remain the same...
  // Add CPT code
  const addCptCode = () => {
    setCptCodes([...cptCodes, { code: '', description: '', units: 1, linkedDx: [] }]);
  };

  // Add DX code
  const addDxCode = () => {
    setDxCodes([...dxCodes, { code: '', description: '', type: 'secondary' }]);
  };

  // Update CPT code
  const updateCptCode = (index: number, field: keyof CPTCode, value: any) => {
    const updated = [...cptCodes];
    updated[index] = { ...updated[index], [field]: value };
    setCptCodes(updated);
  };

  // Update DX code
  const updateDxCode = (index: number, field: keyof DXCode, value: any) => {
    const updated = [...dxCodes];
    updated[index] = { ...updated[index], [field]: value };
    setDxCodes(updated);
  };

  // Remove CPT code
  const removeCptCode = (index: number) => {
    setCptCodes(cptCodes.filter((_, i) => i !== index));
  };

  // Remove DX code
  const removeDxCode = (index: number) => {
    setDxCodes(dxCodes.filter((_, i) => i !== index));
  };

  // Chat with AI
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/ai/chat', {
        messages: [
          {
            role: 'system',
            content: `You are a medical assistant. Context: Transcript: ${transcript}\nNote: ${generatedNote}`
          },
          ...chatMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: chatInput }
        ]
      });
      
      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({ title: 'Chat error', description: 'Could not get response' });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Save and sign
  const saveAndSign = async () => {
    if (!signatureData) {
      toast({ title: 'Signature required', description: 'Please sign before saving' });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/medical-notes', {
        content: generatedNote,
        transcript,
        cptCodes,
        dxCodes,
        emLevel,
        providerName: user?.name || 'Provider',
        signed: true,
        signedAt: new Date(),
        signatureData
      });
      
      toast({ title: 'Note saved', description: 'Medical note has been signed and saved' });
      
      // Reset
      setTranscript('');
      setGeneratedNote('');
      setCptCodes([]);
      setDxCodes([]);
      setEmLevel('');
      setRecordingTime(0);
      setSignatureData(null);
      setShowSignature(false);
      setTranscriptSaved(false);
      setActiveTab('record');
    } catch (error) {
      toast({ title: 'Save failed', description: 'Please try again' });
    }
  };

  const handleDownloadWord = async () => {
    if (!generatedNote.trim()) return;
    try {
      setIsDownloading(true);
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const docSections = [];
      
      docSections.push(new Paragraph({ 
        text: `Medical Note - ${patientName || 'Untitled'}`, 
        heading: HeadingLevel.TITLE 
      }));
      
      docSections.push(new Paragraph({
        children: [
          new TextRun({ 
            text: `${selectedTemplate.toUpperCase()} Note • ${new Date().toLocaleDateString()}`, 
            italics: true, 
            size: 20 
          })
        ]
      }));
      
      docSections.push(new Paragraph({ text: "" }));
      
      if (patientName) {
        docSections.push(new Paragraph({ text: "Patient Information", heading: HeadingLevel.HEADING_1 }));
        docSections.push(new Paragraph({
          children: [
            new TextRun({ text: "Name: ", bold: true }),
            new TextRun({ text: patientName }),
          ]
        }));
        if (patientDOB) {
          docSections.push(new Paragraph({
            children: [
              new TextRun({ text: "DOB: ", bold: true }),
              new TextRun({ text: patientDOB }),
            ]
          }));
        }
        docSections.push(new Paragraph({ text: "" }));
      }
      
      docSections.push(new Paragraph({ text: "Medical Note", heading: HeadingLevel.HEADING_1 }));
      generatedNote.split('\n').forEach(line => {
        docSections.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }));
      });
      
      if (cptCodes.length > 0) {
        docSections.push(new Paragraph({ text: "" }));
        docSections.push(new Paragraph({ text: "CPT Codes", heading: HeadingLevel.HEADING_1 }));
        cptCodes.forEach(cpt => {
          docSections.push(new Paragraph({
            children: [
              new TextRun({ text: `${cpt.code}: `, bold: true }),
              new TextRun({ text: cpt.description }),
            ]
          }));
        });
      }

      if (dxCodes.length > 0) {
        docSections.push(new Paragraph({ text: "" }));
        docSections.push(new Paragraph({ text: "ICD-10 Codes", heading: HeadingLevel.HEADING_1 }));
        dxCodes.forEach(dx => {
          docSections.push(new Paragraph({
            children: [
              new TextRun({ text: `${dx.code}: `, bold: true }),
              new TextRun({ text: dx.description }),
            ]
          }));
        });
      }
      
      docSections.push(new Paragraph({ text: "" }));
      docSections.push(new Paragraph({
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()} by AIMS EHR`, italics: true, size: 20 })]
      }));
      
      const doc = new Document({ sections: [{ properties: {}, children: docSections }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-note-${patientName || 'patient'}-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "Note downloaded as Word document" });
    } catch (error) {
      console.error('Word export error:', error);
      toast({ 
        title: "Word Export Failed", 
        description: "Failed to generate Word document. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedNote.trim()) return;
    try {
      setIsDownloadingPdf(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 2 * margin;
      let yPos = 30;

      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.setFont("helvetica", "bold");
      doc.text(`Medical Note - ${patientName || 'Untitled'}`, margin, yPos);
      yPos += 15;

      // Subheader
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.setFont("helvetica", "italic");
      doc.text(`${selectedTemplate.toUpperCase()} Note • ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 15;

      // Patient Info
      if (patientName || patientDOB) {
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "bold");
        doc.text("Patient Information", margin, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        if (patientName) {
          doc.text(`Name: ${patientName}`, margin, yPos);
          yPos += 8;
        }
        if (patientDOB) {
          doc.text(`DOB: ${patientDOB}`, margin, yPos);
          yPos += 8;
        }
        yPos += 10;
      }

      // Content
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Medical Note", margin, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      
      const contentLines = doc.splitTextToSize(generatedNote, maxWidth);
      contentLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 30;
        }
        doc.text(line, margin, yPos);
        yPos += 7;
      });

      // Coding
      if (cptCodes.length > 0 || dxCodes.length > 0) {
        yPos += 15;
        if (yPos > 250) {
          doc.addPage();
          yPos = 30;
        }
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        doc.text("Medical Coding", margin, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        
        if (cptCodes.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("CPT Codes:", margin, yPos);
          yPos += 8;
          doc.setFont("helvetica", "normal");
          cptCodes.forEach(cpt => {
            if (yPos > 270) { doc.addPage(); yPos = 30; }
            doc.text(`${cpt.code}: ${cpt.description}`, margin + 5, yPos);
            yPos += 6;
          });
          yPos += 4;
        }

        if (dxCodes.length > 0) {
          if (yPos > 270) { doc.addPage(); yPos = 30; }
          doc.setFont("helvetica", "bold");
          doc.text("ICD-10 Codes:", margin, yPos);
          yPos += 8;
          doc.setFont("helvetica", "normal");
          dxCodes.forEach(dx => {
            if (yPos > 270) { doc.addPage(); yPos = 30; }
            doc.text(`${dx.code}: ${dx.description}`, margin + 5, yPos);
            yPos += 6;
          });
        }
      }

      // Footer
      yPos += 20;
      if (yPos > 270) { doc.addPage(); yPos = 30; }
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated: ${new Date().toLocaleString()} by AIMS EHR AI Assistance`, margin, yPos);

      doc.save(`medical-note-${patientName || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Downloaded", description: "Note downloaded as PDF document" });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ 
        title: "PDF Export Failed", 
        description: "Failed to generate PDF document. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            Medical Scribe
          </h1>
          <p className="text-gray-600 mt-1">
            Record, transcribe, and generate compliant medical documentation
          </p>
        </div>

        {/* Patient Info Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Patient Name</Label>
                <Input
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Date of Birth</Label>
                <Input
                  type="date"
                  value={patientDOB}
                  onChange={(e) => setPatientDOB(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Chief Complaint</Label>
                <Input
                  placeholder="Primary reason for visit"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">MRN (optional)</Label>
                <Input
                  placeholder="Medical Record Number"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              1. Record
            </TabsTrigger>
            <TabsTrigger value="note" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              2. Review
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              3. Sign
            </TabsTrigger>
          </TabsList>

          {/* Record Tab */}
          <TabsContent value="record" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recording Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Audio Recording
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recording Button */}
                  <div className="flex flex-col items-center justify-center py-8">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={transcriptSaved}
                      className={cn(
                        "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                        transcriptSaved 
                          ? "bg-green-500 cursor-not-allowed"
                          : isRecording 
                            ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30" 
                            : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                      )}
                    >
                      {transcriptSaved ? (
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      ) : isRecording ? (
                        <Square className="h-12 w-12 text-white" />
                      ) : (
                        <Mic className="h-12 w-12 text-white" />
                      )}
                      
                      {isRecording && audioLevel > 0 && (
                        <>
                          <div 
                            className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"
                            style={{ animationDuration: `${Math.max(0.5, 2 - audioLevel / 50)}s` } as React.CSSProperties}
                          />
                          <div 
                            className="absolute -inset-4 rounded-full border-2 border-red-400/20"
                            style={{ 
                              transform: `scale(${1 + audioLevel / 200})`,
                              opacity: audioLevel / 100
                            } as React.CSSProperties}
                          />
                        </>
                      )}
                    </button>
                    
                    <div className="mt-4 text-center">
                      <div className="text-3xl font-mono font-bold text-gray-800">
                        {formatTime(recordingTime)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {transcriptSaved 
                          ? 'Transcript saved ✓'
                          : isRecording 
                            ? (isPaused ? 'Recording paused' : 'Recording... Speak now')
                            : 'Click to start recording'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  {isRecording && (
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={togglePause}
                        className="flex items-center gap-2"
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={stopRecording}
                        className="flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live Transcript Display */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Live Transcription
                    {isTranscribing && (
                      <Badge variant="secondary" className="animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                  {transcript && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearTranscript}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={saveTranscript}
                        disabled={transcriptSaved}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {transcriptSaved ? 'Saved ✓' : 'Save'}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div 
                    ref={transcriptScrollRef}
                    className="bg-gray-100 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto font-mono text-sm"
                  >
                    {transcript || liveTranscript ? (
                      <div className="space-y-2">
                        <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
                        {liveTranscript && (
                          <p className="text-gray-400 italic">{liveTranscript}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Mic className="h-12 w-12 mb-2 opacity-30" />
                        <p>Start recording to see live transcription</p>
                        <p className="text-xs mt-1">Speak clearly for best results</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Manual Edit */}
                  <Textarea
                    placeholder="Or type/paste consultation text here..."
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      setTranscriptSaved(false);
                    }}
                    className="mt-4 min-h-[100px]"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Generate Note Section */}
            {transcriptSaved && (
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-blue-600" />
                    Generate Medical Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Note Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTE_TEMPLATES.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {NOTE_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                      </p>
                    </div>
                    
                    <div>
                      <Label>Specialty</Label>
                      <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALTIES.map(spec => (
                            <SelectItem key={spec.id} value={spec.id}>
                              {spec.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Additional Context (optional)</Label>
                      <Input
                        placeholder="e.g., Follow-up for diabetes"
                        value={noteContext}
                        onChange={(e) => setNoteContext(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={generateNote}
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Generating {NOTE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Medical Note
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Note Tab */}
          <TabsContent value="note" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Medical Note
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save Draft
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generatedNote ? (
                  <Textarea
                    value={generatedNote}
                    onChange={(e) => setGeneratedNote(e.target.value)}
                    className="min-h-[500px] font-mono text-sm"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No note generated yet.</p>
                    <p className="text-sm">Go to the Record tab to create and save a transcript.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Chat */}
            {generatedNote && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Ask AI About This Patient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] border rounded-lg p-4 mb-4">
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">
                        Ask questions about the patient or request changes to the note
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 rounded-lg max-w-[80%]",
                              msg.role === 'user'
                                ? "bg-blue-100 ml-auto"
                                : "bg-gray-100"
                            )}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Add more detail about the physical exam"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    />
                    <Button 
                      onClick={sendChatMessage} 
                      disabled={isChatLoading || !chatInput.trim()}
                    >
                      {isChatLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Codes & Sign Tab */}
          <TabsContent value="codes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPT Codes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>CPT Codes (Procedures)</CardTitle>
                  <Button onClick={addCptCode} variant="outline" size="sm">
                    + Add CPT
                  </Button>
                </CardHeader>
                <CardContent>
                  {emLevel && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-semibold text-blue-800">
                        E/M Level: {emLevel}
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {cptCodes.map((cpt, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="99213"
                            value={cpt.code}
                            onChange={(e) => updateCptCode(idx, 'code', e.target.value)}
                            className="w-24"
                          />
                          <Input
                            placeholder="Description"
                            value={cpt.description}
                            onChange={(e) => updateCptCode(idx, 'description', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="1"
                            value={cpt.units}
                            onChange={(e) => updateCptCode(idx, 'units', parseInt(e.target.value) || 1)}
                            className="w-16"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCptCode(idx)}
                            className="text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {cptCodes.length === 0 && (
                      <p className="text-gray-400 text-center py-8">
                        No CPT codes. Add manually or generate from transcript.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* DX Codes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ICD-10 Codes (Diagnoses)</CardTitle>
                  <Button onClick={addDxCode} variant="outline" size="sm">
                    + Add DX
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {dxCodes.map((dx, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2">
                        <div className="flex gap-2 items-center">
                          <Badge variant={dx.type === 'primary' ? 'default' : 'secondary'}>
                            {dx.type === 'primary' ? 'Primary' : 'Secondary'}
                          </Badge>
                          <Input
                            placeholder="I10"
                            value={dx.code}
                            onChange={(e) => updateDxCode(idx, 'code', e.target.value)}
                            className="w-24"
                          />
                          <Input
                            placeholder="Description"
                            value={dx.description}
                            onChange={(e) => updateDxCode(idx, 'description', e.target.value)}
                            className="flex-1"
                          />
                          <select
                            title="Diagnosis Type"
                            value={dx.type}
                            onChange={(e) => updateDxCode(idx, 'type', e.target.value)}
                            className="p-2 border rounded"
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDxCode(idx)}
                            className="text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {dxCodes.length === 0 && (
                      <p className="text-gray-400 text-center py-8">
                        No diagnosis codes. Add manually or generate from transcript.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sign Section */}
            {generatedNote && (
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Review and Sign
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Review the note and coding above. When ready, sign to finalize the medical record.
                  </p>
                  
                  {!signatureData ? (
                    <div className="flex gap-2">
                      <Button onClick={() => setShowSignature(true)} className="flex-1" size="lg">
                        <User className="h-4 w-4 mr-2" />
                        Sign Medical Note
                      </Button>
                      <Button variant="outline" onClick={handleDownloadWord} disabled={isDownloading} className="px-3">
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="px-3">
                        {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">Signature captured:</p>
                        {signatureData.imageData && (
                          <img 
                            src={signatureData.imageData} 
                            alt="Signature" 
                            className="max-h-24 border bg-white"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowSignature(true)}
                          className="flex-1"
                        >
                          Re-sign
                        </Button>
                        <Button 
                          onClick={saveAndSign}
                          className="flex-1"
                          size="lg"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save & Finalize
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Signature Dialog */}
        <Dialog open={showSignature} onOpenChange={setShowSignature}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sign Medical Note</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <SignaturePad
                onSave={(data) => {
                  setSignatureData(data);
                  setShowSignature(false);
                }}
                onCancel={() => setShowSignature(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default MedicalScribe;
