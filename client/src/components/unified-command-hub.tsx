/**
 * Unified Command Hub - A single floating button that controls ALL features
 * No overlapping buttons - everything accessible from one place
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useRecording } from '@/contexts/recording-context';
import { useVoiceCommands } from '@/contexts/voice-command-context';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import {
    Mic,
    MicOff,
    Play,
    Pause,
    Square,
    X,
    Command,
    Keyboard,
    Calendar,
    Users,
    FileText,
    Video,
    Settings,
    BarChart3,
    MessageSquare,
    ClipboardList,
    Home,
    ChevronUp,
    ChevronDown,
    Volume2,
    VolumeX,
    CircleDot,
    Sparkles,
    Navigation,
    Activity,
    Zap,
    HelpCircle,
    Download,
    Save,
    Eye,
    RefreshCw
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    labelEs: string;
    icon: React.ReactNode;
    action: () => void;
    category: 'recording' | 'navigation' | 'notes' | 'general';
    requiresRecording?: boolean;
    disabled?: boolean;
}

export function UnifiedCommandHub() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'actions' | 'voice' | 'shortcuts'>('actions');
    const { t, language } = useLanguage();

    const {
        isRecording,
        isPaused,
        duration,
        audioLevel,
        patientInfo,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
    } = useRecording();

    const {
        isEnabled: voiceEnabled,
        isListening,
        lastCommand,
        confidence,
        toggleVoiceCommands,
        supportedCommands
    } = useVoiceCommands();

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Quick actions organized by category
    const quickActions: QuickAction[] = [
        // Recording Controls
        {
            id: 'start_recording',
            label: 'Start Recording',
            labelEs: 'Iniciar Grabación',
            icon: <Mic className="h-4 w-4" />,
            action: () => startRecording(),
            category: 'recording',
            disabled: isRecording
        },
        {
            id: 'stop_recording',
            label: 'Stop Recording',
            labelEs: 'Detener Grabación',
            icon: <Square className="h-4 w-4" />,
            action: async () => await stopRecording(),
            category: 'recording',
            requiresRecording: true,
            disabled: !isRecording
        },
        {
            id: 'pause_resume',
            label: isPaused ? 'Resume' : 'Pause',
            labelEs: isPaused ? 'Reanudar' : 'Pausar',
            icon: isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />,
            action: () => isPaused ? resumeRecording() : pauseRecording(),
            category: 'recording',
            requiresRecording: true,
            disabled: !isRecording
        },

        // Navigation
        {
            id: 'nav_dashboard',
            label: 'Dashboard',
            labelEs: 'Panel',
            icon: <Home className="h-4 w-4" />,
            action: () => window.location.href = '/dashboard',
            category: 'navigation'
        },
        {
            id: 'nav_patients',
            label: 'Patients',
            labelEs: 'Pacientes',
            icon: <Users className="h-4 w-4" />,
            action: () => window.location.href = '/patients',
            category: 'navigation'
        },
        {
            id: 'nav_appointments',
            label: 'Appointments',
            labelEs: 'Citas',
            icon: <Calendar className="h-4 w-4" />,
            action: () => window.location.href = '/appointments',
            category: 'navigation'
        },
        {
            id: 'nav_notes',
            label: 'Medical Notes',
            labelEs: 'Notas Médicas',
            icon: <FileText className="h-4 w-4" />,
            action: () => window.location.href = '/notes',
            category: 'navigation'
        },
        {
            id: 'nav_telemedicine',
            label: 'Telemedicine',
            labelEs: 'Telemedicina',
            icon: <Video className="h-4 w-4" />,
            action: () => window.location.href = '/telemedicine',
            category: 'navigation'
        },
        {
            id: 'nav_analytics',
            label: 'Analytics',
            labelEs: 'Analíticas',
            icon: <BarChart3 className="h-4 w-4" />,
            action: () => window.location.href = '/analytics',
            category: 'navigation'
        },
        {
            id: 'nav_assistant',
            label: 'AI Assistant',
            labelEs: 'Asistente IA',
            icon: <Sparkles className="h-4 w-4" />,
            action: () => window.location.href = '/assistant',
            category: 'navigation'
        },
        {
            id: 'nav_settings',
            label: 'Settings',
            labelEs: 'Configuración',
            icon: <Settings className="h-4 w-4" />,
            action: () => window.location.href = '/settings',
            category: 'navigation'
        },

        // Notes Actions
        {
            id: 'generate_notes',
            label: 'Generate SOAP',
            labelEs: 'Generar SOAP',
            icon: <Zap className="h-4 w-4" />,
            action: () => window.generateNotes?.(),
            category: 'notes'
        },
        {
            id: 'save_notes',
            label: 'Save Notes',
            labelEs: 'Guardar Notas',
            icon: <Save className="h-4 w-4" />,
            action: () => window.saveNotes?.(),
            category: 'notes'
        },
        {
            id: 'preview_notes',
            label: 'Preview',
            labelEs: 'Vista Previa',
            icon: <Eye className="h-4 w-4" />,
            action: () => window.previewNotes?.(),
            category: 'notes'
        },
        {
            id: 'download_notes',
            label: 'Download',
            labelEs: 'Descargar',
            icon: <Download className="h-4 w-4" />,
            action: () => window.downloadNotes?.(),
            category: 'notes'
        },

        // General
        {
            id: 'clear_form',
            label: 'Clear Form',
            labelEs: 'Limpiar',
            icon: <RefreshCw className="h-4 w-4" />,
            action: () => window.clearForm?.(),
            category: 'general'
        },
        {
            id: 'help',
            label: 'Help',
            labelEs: 'Ayuda',
            icon: <HelpCircle className="h-4 w-4" />,
            action: () => {
                // Show help toast or modal
            },
            category: 'general'
        }
    ];

    // Keyboard shortcuts
    const keyboardShortcuts = [
        { key: 'Alt + R', action: language === 'es' ? 'Iniciar/Detener grabación' : 'Start/Stop Recording' },
        { key: 'Alt + P', action: language === 'es' ? 'Pausar/Reanudar' : 'Pause/Resume' },
        { key: 'Alt + G', action: language === 'es' ? 'Generar Notas' : 'Generate Notes' },
        { key: 'Alt + S', action: language === 'es' ? 'Guardar' : 'Save' },
        { key: 'Alt + V', action: language === 'es' ? 'Activar/Desactivar Voz' : 'Toggle Voice' },
        { key: 'Alt + H', action: language === 'es' ? 'Ayuda' : 'Help' },
        { key: 'Esc', action: language === 'es' ? 'Cerrar panel' : 'Close panel' },
    ];

    // Register keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'r':
                        e.preventDefault();
                        isRecording ? stopRecording() : startRecording();
                        break;
                    case 'p':
                        e.preventDefault();
                        if (isRecording) {
                            isPaused ? resumeRecording() : pauseRecording();
                        }
                        break;
                    case 'g':
                        e.preventDefault();
                        window.generateNotes?.();
                        break;
                    case 's':
                        e.preventDefault();
                        window.saveNotes?.();
                        break;
                    case 'v':
                        e.preventDefault();
                        toggleVoiceCommands();
                        break;
                    case 'h':
                        e.preventDefault();
                        setIsExpanded(true);
                        setActiveTab('shortcuts');
                        break;
                }
            }
            if (e.key === 'Escape' && isExpanded) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRecording, isPaused]);

    // Main floating button content
    const getButtonContent = () => {
        if (isRecording) {
            return (
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-3 w-3 rounded-full",
                        isPaused ? "bg-yellow-400" : "bg-red-500 animate-pulse"
                    )} />
                    <span className="font-mono text-sm">{formatDuration(duration)}</span>
                </div>
            );
        }

        if (voiceEnabled && isListening) {
            return (
                <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-green-400 animate-pulse" />
                    <span className="text-xs">Listening...</span>
                </div>
            );
        }

        return <Command className="h-5 w-5" />;
    };

    return (
        <>
            {/* Main Floating Action Button */}
            <div className={cn(
                "fixed z-50 transition-all duration-300",
                isExpanded ? "bottom-4 right-4" : "bottom-6 right-6"
            )}>
                {/* Expanded Panel */}
                {isExpanded && (
                    <Card className="mb-4 w-80 sm:w-96 shadow-2xl border-2 animate-in slide-in-from-bottom-4 duration-300">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="flex items-center justify-between text-base">
                                <div className="flex items-center gap-2">
                                    <Command className="h-5 w-5 text-primary" />
                                    <span>{language === 'es' ? 'Centro de Comandos' : 'Command Hub'}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setIsExpanded(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardTitle>

                            {/* Recording Status Banner */}
                            {isRecording && (
                                <div className={cn(
                                    "mt-2 p-2 rounded-lg flex items-center justify-between",
                                    isPaused ? "bg-yellow-100 dark:bg-yellow-900/20" : "bg-red-100 dark:bg-red-900/20"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                                        )} />
                                        <span className="text-xs font-medium">
                                            {isPaused
                                                ? (language === 'es' ? 'Pausado' : 'Paused')
                                                : (language === 'es' ? 'Grabando' : 'Recording')
                                            }
                                        </span>
                                        <span className="font-mono text-xs">{formatDuration(duration)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => isPaused ? resumeRecording() : pauseRecording()}
                                        >
                                            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-600"
                                            onClick={async () => await stopRecording()}
                                        >
                                            <Square className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Voice Status */}
                            <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                    {voiceEnabled ? (
                                        <Volume2 className={cn("h-4 w-4", isListening && "text-green-500 animate-pulse")} />
                                    ) : (
                                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-xs">
                                        {language === 'es' ? 'Comandos de Voz' : 'Voice Commands'}
                                    </span>
                                    {confidence > 0 && (
                                        <Badge variant="outline" className="text-[10px] px-1">
                                            {Math.round(confidence * 100)}%
                                        </Badge>
                                    )}
                                </div>
                                <Switch
                                    checked={voiceEnabled}
                                    onCheckedChange={toggleVoiceCommands}
                                    className="scale-75"
                                />
                            </div>

                            {/* Last Voice Command */}
                            {lastCommand && voiceEnabled && (
                                <div className="mt-1 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-xs">
                                    <span className="text-blue-600 dark:text-blue-400">"{lastCommand}"</span>
                                </div>
                            )}
                        </CardHeader>

                        {/* Tab Navigation */}
                        <div className="px-4 flex gap-1 border-b">
                            {[
                                { id: 'actions', label: language === 'es' ? 'Acciones' : 'Actions', icon: <Zap className="h-3 w-3" /> },
                                { id: 'voice', label: language === 'es' ? 'Voz' : 'Voice', icon: <Mic className="h-3 w-3" /> },
                                { id: 'shortcuts', label: language === 'es' ? 'Atajos' : 'Shortcuts', icon: <Keyboard className="h-3 w-3" /> },
                            ].map(tab => (
                                <Button
                                    key={tab.id}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "flex-1 text-xs gap-1 rounded-none border-b-2 border-transparent pb-2",
                                        activeTab === tab.id && "border-primary text-primary"
                                    )}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </Button>
                            ))}
                        </div>

                        <CardContent className="p-3">
                            <ScrollArea className="h-[280px]">
                                {/* Actions Tab */}
                                {activeTab === 'actions' && (
                                    <div className="space-y-3">
                                        {/* Recording Section */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                <CircleDot className="h-3 w-3" />
                                                {language === 'es' ? 'Grabación' : 'Recording'}
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                {quickActions.filter(a => a.category === 'recording').map(action => (
                                                    <Button
                                                        key={action.id}
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex flex-col gap-1 h-14 text-[10px]"
                                                        onClick={action.action}
                                                        disabled={action.disabled}
                                                    >
                                                        {action.icon}
                                                        <span>{language === 'es' ? action.labelEs : action.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Navigation Section */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                <Navigation className="h-3 w-3" />
                                                {language === 'es' ? 'Navegación' : 'Navigation'}
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                {quickActions.filter(a => a.category === 'navigation').map(action => (
                                                    <Button
                                                        key={action.id}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex flex-col gap-1 h-12 text-[9px] hover:bg-primary/10"
                                                        onClick={action.action}
                                                    >
                                                        {action.icon}
                                                        <span className="truncate w-full text-center">
                                                            {language === 'es' ? action.labelEs : action.label}
                                                        </span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Notes Section */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {language === 'es' ? 'Notas Médicas' : 'Medical Notes'}
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                {quickActions.filter(a => a.category === 'notes').map(action => (
                                                    <Button
                                                        key={action.id}
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex flex-col gap-1 h-12 text-[9px]"
                                                        onClick={action.action}
                                                    >
                                                        {action.icon}
                                                        <span>{language === 'es' ? action.labelEs : action.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Voice Commands Tab */}
                                {activeTab === 'voice' && (
                                    <div className="space-y-2">
                                        <div className="text-xs text-muted-foreground mb-3">
                                            {language === 'es'
                                                ? 'Di cualquiera de estos comandos cuando la voz esté activada:'
                                                : 'Say any of these commands when voice is enabled:'
                                            }
                                        </div>
                                        {['recording', 'notes', 'navigation', 'general'].map(category => {
                                            const commands = supportedCommands.filter(c => c.category === category);
                                            if (commands.length === 0) return null;
                                            return (
                                                <div key={category} className="mb-3">
                                                    <div className="text-xs font-semibold text-primary capitalize mb-1">
                                                        {category}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {commands.slice(0, 4).map(cmd => (
                                                            <div
                                                                key={cmd.id}
                                                                className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-xs"
                                                            >
                                                                <span className="font-mono text-[10px]">"{cmd.phrase[0]}"</span>
                                                                <span className="text-muted-foreground text-[9px] truncate max-w-[120px]">
                                                                    {cmd.description}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Keyboard Shortcuts Tab */}
                                {activeTab === 'shortcuts' && (
                                    <div className="space-y-2">
                                        <div className="text-xs text-muted-foreground mb-3">
                                            {language === 'es'
                                                ? 'Usa estos atajos de teclado para acceso rápido:'
                                                : 'Use these keyboard shortcuts for quick access:'
                                            }
                                        </div>
                                        {keyboardShortcuts.map((shortcut, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 rounded bg-muted/30"
                                            >
                                                <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border">
                                                    {shortcut.key}
                                                </kbd>
                                                <span className="text-xs text-muted-foreground">{shortcut.action}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {/* Main FAB Button */}
                <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "rounded-full shadow-lg transition-all duration-300",
                        isRecording
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-primary hover:bg-primary/90",
                        isExpanded ? "h-12 w-12" : "h-14 w-14",
                        voiceEnabled && isListening && !isRecording && "ring-2 ring-green-400 ring-offset-2"
                    )}
                    size="lg"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                    ) : (
                        getButtonContent()
                    )}
                </Button>

                {/* Audio Level Indicator (when recording) */}
                {isRecording && !isExpanded && (
                    <div className="absolute -top-1 -right-1 h-4 w-4">
                        <div
                            className="h-full w-full rounded-full bg-red-500 animate-ping opacity-75"
                            style={{ animationDuration: `${Math.max(0.3, 1 - audioLevel / 100)}s` }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default UnifiedCommandHub;
