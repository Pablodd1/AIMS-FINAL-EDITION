import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';

interface VoiceCommand {
  id: string;
  phrase: string[];
  action: string;
  description: string;
  category: 'recording' | 'navigation' | 'notes' | 'telemedicine' | 'intake' | 'general';
  page?: string[];
  icon?: string;
}

interface VoiceCommandState {
  isEnabled: boolean;
  isListening: boolean;
  lastCommand: string | null;
  recognizedCommand: VoiceCommand | null;
  confidence: number;
  supportedCommands: VoiceCommand[];
}

interface VoiceCommandContextType extends VoiceCommandState {
  enableVoiceCommands: () => void;
  disableVoiceCommands: () => void;
  toggleVoiceCommands: () => void;
  startListening: () => void;
  stopListening: () => void;
  addCustomCommand: (command: VoiceCommand) => void;
  removeCustomCommand: (id: string) => void;
  executeCommand: (command: string) => boolean;
}

// Global voice commands available across the application
const GLOBAL_VOICE_COMMANDS: VoiceCommand[] = [
  // Recording Commands
  {
    id: 'start_recording',
    phrase: ['start recording', 'begin recording', 'record now', 'start consultation', 'empezar grabación', 'iniciar grabación', 'grabar ahora'],
    action: 'START_RECORDING',
    description: 'Start recording consultation',
    category: 'recording',
    page: ['notes', 'quick-notes', 'telemedicine', 'patient-intake'],
    icon: 'Mic'
  },
  {
    id: 'stop_recording',
    phrase: ['stop recording', 'end recording', 'stop consultation', 'finish recording', 'detener grabación', 'terminar grabación', 'parar grabación'],
    action: 'STOP_RECORDING',
    description: 'Stop recording consultation',
    category: 'recording',
    page: ['notes', 'quick-notes', 'telemedicine', 'patient-intake'],
    icon: 'StopCircle'
  },
  {
    id: 'pause_recording',
    phrase: ['pause recording', 'pause', 'pausar grabación', 'pausa'],
    action: 'PAUSE_RECORDING',
    description: 'Pause recording',
    category: 'recording',
    page: ['notes', 'quick-notes', 'telemedicine'],
    icon: 'Pause'
  },
  {
    id: 'resume_recording',
    phrase: ['resume recording', 'resume', 'continue recording', 'reanudar grabación', 'continuar grabación', 'reanudar'],
    action: 'RESUME_RECORDING',
    description: 'Resume recording',
    category: 'recording',
    page: ['notes', 'quick-notes', 'telemedicine'],
    icon: 'Play'
  },

  // Notes Commands
  {
    id: 'generate_notes',
    phrase: ['generate notes', 'create notes', 'make soap notes', 'generate soap', 'generar notas', 'crear notas', 'generar soap'],
    action: 'GENERATE_NOTES',
    description: 'Generate medical notes from transcript',
    category: 'notes',
    page: ['notes', 'quick-notes', 'telemedicine'],
    icon: 'FileText'
  },
  {
    id: 'save_notes',
    phrase: ['save notes', 'save', 'save document', 'guardar notas', 'guardar', 'guardar documento'],
    action: 'SAVE_NOTES',
    description: 'Save current notes',
    category: 'notes',
    page: ['notes', 'quick-notes'],
    icon: 'Save'
  },
  {
    id: 'preview_notes',
    phrase: ['preview notes', 'show preview', 'preview', 'vista previa', 'ver vista previa'],
    action: 'PREVIEW_NOTES',
    description: 'Preview medical notes',
    category: 'notes',
    page: ['notes', 'quick-notes'],
    icon: 'Eye'
  },
  {
    id: 'download_notes',
    phrase: ['download notes', 'download document', 'export notes', 'descargar notas', 'descargar documento', 'exportar notas'],
    action: 'DOWNLOAD_NOTES',
    description: 'Download notes as document',
    category: 'notes',
    page: ['notes', 'quick-notes'],
    icon: 'Download'
  },

  // Navigation Commands
  {
    id: 'go_to_notes',
    phrase: ['go to notes', 'open notes', 'medical notes', 'ir a notas', 'abrir notas', 'notas médicas'],
    action: 'NAVIGATE_NOTES',
    description: 'Navigate to medical notes page',
    category: 'navigation',
    icon: 'FileText'
  },
  {
    id: 'go_to_patients',
    phrase: ['go to patients', 'open patients', 'show patients', 'ir a pacientes', 'abrir pacientes', 'mostrar pacientes'],
    action: 'NAVIGATE_PATIENTS',
    description: 'Navigate to patients page',
    category: 'navigation',
    icon: 'Users'
  },
  {
    id: 'go_to_appointments',
    phrase: ['go to appointments', 'open appointments', 'show appointments', 'ir a citas', 'abrir citas', 'mostrar citas'],
    action: 'NAVIGATE_APPOINTMENTS',
    description: 'Navigate to appointments page',
    category: 'navigation',
    icon: 'Calendar'
  },
  {
    id: 'go_to_dashboard',
    phrase: ['go to dashboard', 'open dashboard', 'home', 'ir al panel', 'abrir panel', 'inicio'],
    action: 'NAVIGATE_DASHBOARD',
    description: 'Navigate to dashboard',
    category: 'navigation',
    icon: 'Activity'
  },
  {
    id: 'go_to_telemedicine',
    phrase: ['go to telemedicine', 'open telemedicine', 'video call', 'ir a telemedicina', 'abrir telemedicina', 'videollamada'],
    action: 'NAVIGATE_TELEMEDICINE',
    description: 'Navigate to telemedicine',
    category: 'navigation',
    icon: 'Video'
  },
  {
    id: 'go_to_analytics',
    phrase: ['go to analytics', 'open analytics', 'show data', 'ir a analítica', 'abrir analítica', 'mostrar datos'],
    action: 'NAVIGATE_ANALYTICS',
    description: 'Navigate to analytics',
    category: 'navigation',
    icon: 'BarChart'
  },
  {
    id: 'go_to_settings',
    phrase: ['go to settings', 'open settings', 'config', 'ir a configuración', 'abrir configuración', 'ajustes'],
    action: 'NAVIGATE_SETTINGS',
    description: 'Navigate to settings',
    category: 'navigation',
    icon: 'Settings'
  },
  {
    id: 'go_to_assistant',
    phrase: ['go to assistant', 'open assistant', 'ai helper', 'ir al asistente', 'abrir asistente', 'ayudante ai'],
    action: 'NAVIGATE_ASSISTANT',
    description: 'Navigate to AI assistant',
    category: 'navigation',
    icon: 'Sparkles'
  },

  // Telemedicine Commands
  {
    id: 'start_video',
    phrase: ['start video call', 'begin video', 'start consultation', 'iniciar videollamada', 'empezar video', 'iniciar consulta'],
    action: 'START_VIDEO_CALL',
    description: 'Start video consultation',
    category: 'telemedicine',
    page: ['telemedicine'],
    icon: 'Video'
  },
  {
    id: 'end_video_call',
    phrase: ['end video call', 'end call', 'hang up', 'disconnect', 'terminar videollamada', 'terminar llamada', 'colgar', 'desconectar'],
    action: 'END_VIDEO_CALL',
    description: 'End video consultation',
    category: 'telemedicine',
    page: ['telemedicine'],
    icon: 'Phone'
  },

  // Intake Commands
  {
    id: 'start_intake',
    phrase: ['start intake', 'begin intake', 'new intake form', 'iniciar admisión', 'empezar admisión', 'nuevo formulario de admisión'],
    action: 'START_INTAKE',
    description: 'Start patient intake form',
    category: 'intake',
    page: ['patient-intake'],
    icon: 'ClipboardList'
  },
  {
    id: 'voice_intake',
    phrase: ['voice intake', 'voice form', 'fill with voice', 'admisión por voz', 'formulario de voz', 'llenar con voz'],
    action: 'VOICE_INTAKE',
    description: 'Start voice-based intake',
    category: 'intake',
    page: ['patient-intake'],
    icon: 'Mic'
  },

  // Medical Scribe Commands
  {
    id: 'open_medical_scribe',
    phrase: ['open medical scribe', 'start scribe', 'medical scribe', 'scribe mode', 'abrir scrib médico', 'iniciar scrib', 'scrib médico'],
    action: 'NAVIGATE_MEDICAL_SCRIBE',
    description: 'Navigate to Medical Scribe for audio recording',
    category: 'navigation',
    icon: 'FileText'
  },
  {
    id: 'start_transcription',
    phrase: ['start transcription', 'begin transcription', 'transcribe', 'iniciar transcripción', 'transcribir'],
    action: 'START_TRANSCRIPTION',
    description: 'Start live transcription',
    category: 'notes',
    page: ['medical-scribe'],
    icon: 'Mic'
  },
  {
    id: 'stop_transcription',
    phrase: ['stop transcription', 'end transcription', 'finish transcription', 'detener transcripción', 'terminar transcripción'],
    action: 'STOP_TRANSCRIPTION',
    description: 'Stop transcription',
    category: 'notes',
    page: ['medical-scribe'],
    icon: 'StopCircle'
  },
  {
    id: 'generate_soap',
    phrase: ['generate soap notes', 'create soap', 'make soap', 'generar soap', 'crear soap', 'notas soap'],
    action: 'GENERATE_SOAP',
    description: 'Generate SOAP notes from transcript',
    category: 'notes',
    page: ['medical-scribe'],
    icon: 'FileText'
  },

  // Code Manager Commands
  {
    id: 'open_code_manager',
    phrase: ['open code manager', 'cpt codes', 'icd codes', 'billing codes', 'abrir gestor de códigos', 'códigos cpt', 'códigos icd'],
    action: 'NAVIGATE_CODE_MANAGER',
    description: 'Navigate to CPT/ICD-10 Code Manager',
    category: 'navigation',
    icon: 'Code'
  },
  {
    id: 'add_cpt_code',
    phrase: ['add cpt code', 'new cpt', 'create cpt', 'agregar código cpt', 'nuevo cpt', 'crear cpt'],
    action: 'ADD_CPT_CODE',
    description: 'Add a new CPT billing code',
    category: 'general',
    page: ['medical-codes-manager'],
    icon: 'Plus'
  },
  {
    id: 'add_diagnosis_code',
    phrase: ['add diagnosis code', 'add icd code', 'new diagnosis', 'agregar código de diagnóstico', 'nuevo icd'],
    action: 'ADD_ICD_CODE',
    description: 'Add a new ICD-10 diagnosis code',
    category: 'general',
    page: ['medical-codes-manager'],
    icon: 'Plus'
  },

  // Patient Import Commands
  {
    id: 'open_patient_import',
    phrase: ['import patients', 'patient import', 'load patients', 'excel import', 'importar pacientes', 'cargar pacientes'],
    action: 'NAVIGATE_PATIENT_IMPORT',
    description: 'Navigate to Patient Import page',
    category: 'navigation',
    icon: 'Upload'
  },
  {
    id: 'upload_excel',
    phrase: ['upload excel', 'select file', 'choose file', 'subir excel', 'seleccionar archivo'],
    action: 'UPLOAD_EXCEL',
    description: 'Upload Excel file for patient import',
    category: 'general',
    page: ['patient-import'],
    icon: 'FileSpreadsheet'
  },

  // Documents Commands
  {
    id: 'upload_document',
    phrase: ['upload document', 'add document', 'new document', 'subir documento', 'agregar documento', 'nuevo documento'],
    action: 'UPLOAD_DOCUMENT',
    description: 'Upload a patient document',
    category: 'general',
    icon: 'File'
  },
  {
    id: 'view_documents',
    phrase: ['view documents', 'show documents', 'list documents', 'ver documentos', 'mostrar documentos', 'lista de documentos'],
    action: 'VIEW_DOCUMENTS',
    description: 'View patient documents',
    category: 'general',
    icon: 'Folder'
  },

  // HPI (History of Present Illness) Commands
  {
    id: 'start_hpi',
    phrase: ['start hpi', 'new hpi', 'begin hpi', 'iniciar hpi', 'nuevo hpi', 'historial de enfermedad actual'],
    action: 'START_HPI',
    description: 'Start HPI (History of Present Illness) interview',
    category: 'intake',
    page: ['patient-intake', 'patient-intake-voice'],
    icon: 'ClipboardList'
  },
  {
    id: 'record_hpi',
    phrase: ['record hpi', 'document hpi', 'note hpi', 'registrar hpi', 'documentar hpi', 'anotar hpi'],
    action: 'RECORD_HPI',
    description: 'Record HPI notes',
    category: 'intake',
    icon: 'Mic'
  },
  {
    id: 'add_medical_history',
    phrase: ['add medical history', 'new history', 'update history', 'agregar historial médico', 'nuevo historial'],
    action: 'ADD_MEDICAL_HISTORY',
    description: 'Add patient medical history',
    category: 'general',
    icon: 'History'
  },

  // Visit/Consultation Commands
  {
    id: 'new_visit',
    phrase: ['new visit', 'start visit', 'begin visit', 'new consultation', 'nueva visita', 'iniciar visita', 'nueva consulta'],
    action: 'NEW_VISIT',
    description: 'Start a new patient visit',
    category: 'recording',
    icon: 'Calendar'
  },
  {
    id: 'add_visit_note',
    phrase: ['add visit note', 'visit note', 'progress note', 'nota de visita', 'nota de progreso'],
    action: 'ADD_VISIT_NOTE',
    description: 'Add a visit progress note',
    category: 'notes',
    icon: 'FileText'
  },

  // Lab & Tests Commands
  {
    id: 'open_lab',
    phrase: ['open lab', 'lab interpreter', 'lab results', 'abrir laboratorio', 'intérprete de laboratorio', 'resultados de laboratorio'],
    action: 'NAVIGATE_LAB',
    description: 'Navigate to Lab Interpreter',
    category: 'navigation',
    icon: 'TestTube'
  },
  {
    id: 'analyze_lab',
    phrase: ['analyze lab', 'interpret lab', 'lab analysis', 'analizar laboratorio', 'interpretar laboratorio'],
    action: 'ANALYZE_LAB',
    description: 'Analyze lab results',
    category: 'general',
    page: ['lab-interpreter'],
    icon: 'Activity'
  },

  // Medicare Compliance Commands
  {
    id: 'check_compliance',
    phrase: ['check compliance', 'medicare compliance', 'verify compliance', 'verificar cumplimiento', 'cumplimiento medicare'],
    action: 'CHECK_COMPLIANCE',
    description: 'Check Medicare compliance for notes',
    category: 'notes',
    icon: 'Shield'
  },

  // Patient Intake Voice Commands
  {
    id: 'open_intake_voice',
    phrase: ['voice intake', 'patient interview', 'voice interview', 'entrevista por voz', 'entrevista de paciente'],
    action: 'NAVIGATE_INTAKE_VOICE',
    description: 'Navigate to Patient Intake Voice',
    category: 'navigation',
    page: ['patient-intake-voice'],
    icon: 'Mic'
  },
  {
    id: 'start_interview',
    phrase: ['start interview', 'begin interview', 'start practice', 'iniciar entrevista', 'empezar entrevista'],
    action: 'START_INTERVIEW',
    description: 'Start practice interview',
    category: 'intake',
    page: ['patient-intake-voice'],
    icon: 'Play'
  },

  // General Commands
  {
    id: 'help',
    phrase: ['help', 'what can i say', 'voice commands', 'commands', 'ayuda', 'qué puedo decir', 'comandos de voz', 'comandos'],
    action: 'SHOW_HELP',
    description: 'Show available voice commands',
    category: 'general',
    icon: 'HelpCircle'
  },
  {
    id: 'toggle_voice',
    phrase: ['toggle voice commands', 'enable voice', 'disable voice', 'activar voz', 'desactivar voz'],
    action: 'TOGGLE_VOICE',
    description: 'Toggle voice commands on/off',
    category: 'general',
    icon: 'Mic'
  },
  {
    id: 'clear_form',
    phrase: ['clear form', 'reset form', 'start over', 'limpiar formulario', 'reiniciar formulario', 'empezar de nuevo'],
    action: 'CLEAR_FORM',
    description: 'Clear current form',
    category: 'general',
    page: ['patient-intake', 'notes', 'quick-notes'],
    icon: 'RefreshCw'
  },
  {
    id: 'click_element',
    phrase: ['click'],
    action: 'CLICK',
    description: 'Click on a button or link by name (e.g., "click save")',
    category: 'general',
    icon: 'MousePointer'
  }
];

const VoiceCommandContext = createContext<VoiceCommandContextType | undefined>(undefined);

export const VoiceCommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [recognizedCommand, setRecognizedCommand] = useState<VoiceCommand | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [supportedCommands, setSupportedCommands] = useState<VoiceCommand[]>(GLOBAL_VOICE_COMMANDS);

  const recognitionRef = useRef<any>(null);
  const currentPageRef = useRef<string>('');
  const isEnabledRef = useRef(false);
  const isListeningRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Get current page from URL
  useEffect(() => {
    const path = window.location.pathname;
    const pageName = path.split('/')[1] || 'dashboard';
    currentPageRef.current = pageName;
  }, []);

  // Filter commands based on current page
  const getAvailableCommands = useCallback(() => {
    const currentPage = currentPageRef.current;
    return supportedCommands.filter(cmd =>
      !cmd.page || cmd.page.includes(currentPage) || cmd.category === 'general'
    );
  }, [supportedCommands]);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'es' ? 'es-VE' : 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();

        if (event.results[last].isFinal) {
          setLastCommand(transcript);
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        // Don't show errors for recoverable situations
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Silently recover - onend handler will restart
          return;
        }
        if (event.error === 'network') {
          console.log('Network error in voice commands - will retry automatically');
          return;
        }

        setIsListening(false);

        let errorMessage = 'Voice recognition error occurred';
        switch (event.error) {
          case 'audio-capture':
            errorMessage = 'Microphone not available. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        toast({
          title: "Voice Command Error",
          description: errorMessage,
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        // Auto-restart if still enabled (use ref to avoid stale closure)
        if (isEnabledRef.current) {
          setTimeout(() => {
            if (isEnabledRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
                isListeningRef.current = true;
              } catch (e) {
                console.log('Voice command restart failed, will retry:', e);
                // Try again after a longer delay
                setTimeout(() => {
                  if (isEnabledRef.current && recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                      setIsListening(true);
                      isListeningRef.current = true;
                    } catch (e2) {
                      console.error('Voice command restart failed permanently:', e2);
                    }
                  }
                }, 1000);
              }
            }
          }, 300); // Reduced delay for faster response
        }
      };

      recognitionRef.current = recognition;
    }
  }, [toast, language]);

  // Execute click on element
  const executeClick = useCallback((text: string) => {
    const elements = document.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"]');
    const targetText = text.toLowerCase().trim();

    for (const el of Array.from(elements)) {
      const elText = el.textContent?.toLowerCase().trim() || '';
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';

      if (elText.includes(targetText) || ariaLabel.includes(targetText)) {
        (el as HTMLElement).click();
        toast({
          title: "Voice Click",
          description: `Clicked on "${text}"`,
          duration: 2000
        });
        return true;
      }
    }
    return false;
  }, [toast]);

  // Show voice command help
  const showVoiceCommandHelp = useCallback(() => {
    const availableCommands = getAvailableCommands();
    const commandList = availableCommands
      .map(cmd => `• "${cmd.phrase[0]}" - ${cmd.description}`)
      .join('\n');

    toast({
      title: "Available Voice Commands",
      description: commandList,
      duration: 10000
    });
  }, [getAvailableCommands, toast]);

  // Execute voice action (defined before processVoiceCommand to avoid forward reference)
  const executeVoiceAction = useCallback((action: string) => {
    console.log(`Executing voice command: ${action}`);

    try {
      switch (action) {
        // Recording Actions
        case 'START_RECORDING':
          if (window.startRecording) window.startRecording();
          break;
        case 'STOP_RECORDING':
          if (window.stopRecording) window.stopRecording();
          break;
        case 'PAUSE_RECORDING':
          if (window.pauseRecording) window.pauseRecording();
          break;
        case 'RESUME_RECORDING':
          if (window.resumeRecording) window.resumeRecording();
          break;

        // Notes Actions
        case 'GENERATE_NOTES':
          if (window.generateNotes) window.generateNotes();
          break;
        case 'SAVE_NOTES':
          if (window.saveNotes) window.saveNotes();
          break;
        case 'PREVIEW_NOTES':
          if (window.previewNotes) window.previewNotes();
          break;
        case 'DOWNLOAD_NOTES':
          if (window.downloadNotes) window.downloadNotes();
          break;

        // Navigation Actions
        case 'NAVIGATE_NOTES':
          window.location.href = '/notes';
          break;
        case 'NAVIGATE_PATIENTS':
          window.location.href = '/patients';
          break;
        case 'NAVIGATE_APPOINTMENTS':
          window.location.href = '/appointments';
          break;
        case 'NAVIGATE_DASHBOARD':
          window.location.href = '/dashboard';
          break;
        case 'NAVIGATE_TELEMEDICINE':
          window.location.href = '/telemedicine';
          break;
        case 'NAVIGATE_ANALYTICS':
          window.location.href = '/analytics';
          break;
        case 'NAVIGATE_SETTINGS':
          window.location.href = '/settings';
          break;
        case 'NAVIGATE_ASSISTANT':
          window.location.href = '/assistant';
          break;

        // Telemedicine Actions
        case 'START_VIDEO_CALL':
          if (window.startVideoCall) window.startVideoCall();
          break;
        case 'END_VIDEO_CALL':
          if (window.endVideoCall) window.endVideoCall();
          break;

        // Intake Actions
        case 'START_INTAKE':
          if (window.startIntake) window.startIntake();
          break;
        case 'VOICE_INTAKE':
          if (window.voiceIntake) window.voiceIntake();
          break;

        // Medical Scribe Navigation
        case 'NAVIGATE_MEDICAL_SCRIBE':
          window.location.href = '/medical-scribe';
          break;
        case 'START_TRANSCRIPTION':
          if (window.startTranscription) window.startTranscription();
          break;
        case 'STOP_TRANSCRIPTION':
          if (window.stopTranscription) window.stopTranscription();
          break;
        case 'GENERATE_SOAP':
          if (window.generateSoapNotes) window.generateSoapNotes();
          break;

        // Code Manager Navigation
        case 'NAVIGATE_CODE_MANAGER':
          window.location.href = '/medical-codes-manager';
          break;
        case 'ADD_CPT_CODE':
          if (window.addCptCode) window.addCptCode();
          break;
        case 'ADD_ICD_CODE':
          if (window.addIcdCode) window.addIcdCode();
          break;

        // Patient Import Navigation
        case 'NAVIGATE_PATIENT_IMPORT':
          window.location.href = '/patients/import';
          break;
        case 'UPLOAD_EXCEL':
          if (window.uploadExcel) window.uploadExcel();
          break;

        // Documents Actions
        case 'UPLOAD_DOCUMENT':
          if (window.uploadDocument) window.uploadDocument();
          break;
        case 'VIEW_DOCUMENTS':
          if (window.viewDocuments) window.viewDocuments();
          break;

        // HPI Actions
        case 'START_HPI':
          window.location.href = '/patient-intake-voice';
          break;
        case 'RECORD_HPI':
          if (window.recordHpi) window.recordHpi();
          break;
        case 'ADD_MEDICAL_HISTORY':
          if (window.addMedicalHistory) window.addMedicalHistory();
          break;

        // Visit/Consultation Actions
        case 'NEW_VISIT':
          if (window.newVisit) window.newVisit();
          break;
        case 'ADD_VISIT_NOTE':
          if (window.addVisitNote) window.addVisitNote();
          break;

        // Lab Navigation
        case 'NAVIGATE_LAB':
          window.location.href = '/lab-interpreter';
          break;
        case 'ANALYZE_LAB':
          if (window.analyzeLab) window.analyzeLab();
          break;

        // Medicare Compliance
        case 'CHECK_COMPLIANCE':
          if (window.checkCompliance) window.checkCompliance();
          break;

        // Patient Intake Voice
        case 'NAVIGATE_INTAKE_VOICE':
          window.location.href = '/patient-intake-voice';
          break;
        case 'START_INTERVIEW':
          if (window.startInterview) window.startInterview();
          break;

        // General Actions
        case 'SHOW_HELP':
          showVoiceCommandHelp();
          break;
        case 'CLEAR_FORM':
          if (window.clearForm) window.clearForm();
          break;

        default:
          console.warn(`Unknown voice action: ${action}`);
      }

      toast({
        title: "Voice Command Executed",
        description: `${action.replace(/_/g, ' ').toLowerCase()}`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error executing voice command:', error);
      toast({
        title: "Voice Command Failed",
        description: "Failed to execute voice command",
        variant: "destructive"
      });
    }
  }, [toast, showVoiceCommandHelp]);

  // Process voice command
  const processVoiceCommand = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Check for dynamic "click [text]", "open [text]", or "go to [text]" command
    const activationKeywords = ['click ', 'open ', 'go to ', 'clic ', 'haz clic en ', 'abre ', 've a '];
    for (const keyword of activationKeywords) {
      if (lowerTranscript.startsWith(keyword)) {
        const target = lowerTranscript.replace(keyword, '').trim();
        if (target && executeClick(target)) {
          setLastCommand(transcript);
          return true;
        }
      }
    }

    const availableCommands = getAvailableCommands();

    for (const command of availableCommands) {
      for (const phrase of command.phrase) {
        if (lowerTranscript.includes(phrase.toLowerCase())) {
          setRecognizedCommand(command);
          setConfidence(0.9);
          executeVoiceAction(command.action);
          return true;
        }
      }
    }

    return false;
  }, [getAvailableCommands, executeClick, executeVoiceAction]);

  // Voice control functions
  const enableVoiceCommands = useCallback(() => {
    const isSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    
    if (!isSupported) {
      toast({
        title: "Browser Not Supported",
        description: "Voice commands are primarily supported in Chrome and Edge. Firefox and Safari may have limited or no support. Please use a Chromium-based browser for the best experience.",
        variant: "destructive"
      });
      return;
    }

    if (!recognitionRef.current) {
      initializeRecognition();
    }
    setIsEnabled(true);
    isEnabledRef.current = true;
    // Start listening immediately
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        console.log('Could not start recognition immediately, will retry:', e);
      }
    }
    toast({
      title: "Voice Commands Enabled",
      description: "Listening for voice commands. Say 'help' to see all commands.",
    });
  }, [initializeRecognition, toast]);

  const disableVoiceCommands = useCallback(() => {
    setIsEnabled(false);
    isEnabledRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    setIsListening(false);
    isListeningRef.current = false;
    toast({
      title: "Voice Commands Disabled",
      description: "Voice commands have been turned off.",
    });
  }, [toast]);

  const toggleVoiceCommands = useCallback(() => {
    if (isEnabledRef.current) {
      disableVoiceCommands();
    } else {
      enableVoiceCommands();
    }
  }, [enableVoiceCommands, disableVoiceCommands]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        console.log('startListening failed:', e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  const addCustomCommand = useCallback((command: VoiceCommand) => {
    setSupportedCommands(prev => [...prev, command]);
    toast({
      title: "Custom Voice Command Added",
      description: `"${command.phrase[0]}" has been added to voice commands.`,
    });
  }, [toast]);

  const removeCustomCommand = useCallback((id: string) => {
    setSupportedCommands(prev => prev.filter(cmd => cmd.id !== id));
    toast({
      title: "Voice Command Removed",
      description: "Custom voice command has been removed.",
    });
  }, [toast]);

  const executeCommand = useCallback((command: string): boolean => {
    return processVoiceCommand(command.toLowerCase());
  }, [processVoiceCommand]);

  // Initialize recognition on mount
  useEffect(() => {
    initializeRecognition();
  }, [initializeRecognition]);

  // Update current page when URL changes
  useEffect(() => {
    const updatePage = () => {
      const path = window.location.pathname;
      const pageName = path.split('/')[1] || 'dashboard';
      currentPageRef.current = pageName;
    };
    updatePage();
    window.addEventListener('popstate', updatePage);
    return () => window.removeEventListener('popstate', updatePage);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const value: VoiceCommandContextType = {
    isEnabled,
    isListening,
    lastCommand,
    recognizedCommand,
    confidence,
    supportedCommands,
    enableVoiceCommands,
    disableVoiceCommands,
    toggleVoiceCommands,
    startListening,
    stopListening,
    addCustomCommand,
    removeCustomCommand,
    executeCommand,
  };

  return (
    <VoiceCommandContext.Provider value={value}>
      {children}
    </VoiceCommandContext.Provider>
  );
};

export const useVoiceCommands = () => {
  const context = useContext(VoiceCommandContext);
  if (context === undefined) {
    throw new Error('useVoiceCommands must be used within a VoiceCommandProvider');
  }
  return context;
};

// Extend global Window interface for voice command callbacks
declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
    pauseRecording?: () => void;
    resumeRecording?: () => void;
    generateNotes?: () => void;
    saveNotes?: () => void;
    previewNotes?: () => void;
    downloadNotes?: () => void;
    startVideoCall?: () => void;
    endVideoCall?: () => void;
    startIntake?: () => void;
    voiceIntake?: () => void;
    clearForm?: () => void;
    // Medical Scribe
    startTranscription?: () => void;
    stopTranscription?: () => void;
    generateSoapNotes?: () => void;
    // Code Manager
    addCptCode?: () => void;
    addIcdCode?: () => void;
    // Patient Import
    uploadExcel?: () => void;
    // Documents
    uploadDocument?: () => void;
    viewDocuments?: () => void;
    // HPI
    recordHpi?: () => void;
    addMedicalHistory?: () => void;
    // Visit/Consultation
    newVisit?: () => void;
    addVisitNote?: () => void;
    // Lab
    analyzeLab?: () => void;
    // Medicare Compliance
    checkCompliance?: () => void;
    // Patient Intake Voice
    startInterview?: () => void;
  }
}