import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Mic, 
  FileText, 
  Code, 
  Users, 
  Upload, 
  Settings,
  Stethoscope,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ScribeWorkflowStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  description: string;
}

const workflowSteps: ScribeWorkflowStep[] = [
  {
    id: 'record',
    label: 'Record',
    icon: <Mic className="h-4 w-4" />,
    path: '/medical-scribe',
    description: 'Record consultation audio'
  },
  {
    id: 'review',
    label: 'Review Note',
    icon: <FileText className="h-4 w-4" />,
    path: '/medical-scribe?tab=note',
    description: 'Review generated SOAP note'
  },
  {
    id: 'codes',
    label: 'Coding',
    icon: <Code className="h-4 w-4" />,
    path: '/medical-scribe?tab=codes',
    description: 'Add CPT & ICD-10 codes'
  },
  {
    id: 'sign',
    label: 'Sign & Save',
    icon: <CheckCircle2 className="h-4 w-4" />,
    path: '/medical-scribe?tab=codes',
    description: 'Sign and finalize note'
  }
];

export function MedicalScribeNav({ 
  currentStep = 'record',
  hasRecording = false,
  hasNote = false,
  hasCodes = false
}: { 
  currentStep?: string;
  hasRecording?: boolean;
  hasNote?: boolean;
  hasCodes?: boolean;
}) {
  const [location] = useLocation();
  
  const getStepStatus = (stepId: string) => {
    const stepIndex = workflowSteps.findIndex(s => s.id === stepId);
    const currentIndex = workflowSteps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) {
      // Completed step
      if (stepId === 'record' && hasRecording) return 'completed';
      if (stepId === 'review' && hasNote) return 'completed';
      if (stepId === 'codes' && hasCodes) return 'completed';
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'current';
    }
    return 'pending';
  };

  const getProgress = () => {
    const currentIndex = workflowSteps.findIndex(s => s.id === currentStep);
    return ((currentIndex + 1) / workflowSteps.length) * 100;
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-lg">Medical Scribe Workflow</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          Step {workflowSteps.findIndex(s => s.id === currentStep) + 1} of {workflowSteps.length}
        </Badge>
      </div>
      
      <Progress value={getProgress()} className="mb-4" />
      
      <div className="grid grid-cols-4 gap-2">
        {workflowSteps.map((step) => {
          const status = getStepStatus(step.id);
          
          return (
            <Link key={step.id} href={step.path}>
              <div
                className={cn(
                  "flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all",
                  status === 'current' && "bg-blue-100 border-2 border-blue-500",
                  status === 'completed' && "bg-green-50 border border-green-200",
                  status === 'pending' && "bg-gray-50 border border-gray-200 opacity-60"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full mb-2",
                  status === 'current' && "bg-blue-500 text-white",
                  status === 'completed' && "bg-green-500 text-white",
                  status === 'pending' && "bg-gray-200 text-gray-500"
                )}>
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium text-center",
                  status === 'current' && "text-blue-700",
                  status === 'completed' && "text-green-700"
                )}>
                  {step.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// Quick Actions Panel
export function ScribeQuickActions() {
  const actions = [
    { 
      label: 'New Recording', 
      icon: <Mic className="h-4 w-4" />, 
      path: '/medical-scribe',
      color: 'bg-blue-500'
    },
    { 
      label: 'Manage Codes', 
      icon: <Code className="h-4 w-4" />, 
      path: '/medical-scribe/codes',
      color: 'bg-purple-500'
    },
    { 
      label: 'Import Patients', 
      icon: <Upload className="h-4 w-4" />, 
      path: '/medical-scribe/import',
      color: 'bg-green-500'
    },
    { 
      label: 'Settings', 
      icon: <Settings className="h-4 w-4" />, 
      path: '/settings',
      color: 'bg-gray-500'
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link key={action.label} href={action.path}>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-auto py-3"
            >
              <div className={cn("p-1.5 rounded text-white", action.color)}>
                {action.icon}
              </div>
              <span className="text-sm">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// Compliance Check Panel
export function ComplianceCheck({ 
  hasTranscript,
  hasNote,
  hasSignature,
  hasCptCodes,
  hasDxCodes
}: {
  hasTranscript: boolean;
  hasNote: boolean;
  hasSignature: boolean;
  hasCptCodes: boolean;
  hasDxCodes: boolean;
}) {
  const checks = [
    { label: 'Audio/Transcript', complete: hasTranscript, required: true },
    { label: 'SOAP Note Generated', complete: hasNote, required: true },
    { label: 'CPT Codes', complete: hasCptCodes, required: true },
    { label: 'ICD-10 Codes', complete: hasDxCodes, required: true },
    { label: 'Provider Signature', complete: hasSignature, required: true },
  ];

  const completedCount = checks.filter(c => c.complete).length;
  const requiredCount = checks.filter(c => c.required).length;
  const allRequiredComplete = checks.filter(c => c.required).every(c => c.complete);

  return (
    <Card className={cn(
      "p-4",
      allRequiredComplete ? "border-green-300 bg-green-50/30" : "border-yellow-300 bg-yellow-50/30"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          {allRequiredComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          Medicare Compliance Check
        </h3>
        <Badge variant={allRequiredComplete ? "default" : "secondary"}>
          {completedCount}/{requiredCount}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {checks.map((check) => (
          <div 
            key={check.label} 
            className="flex items-center justify-between text-sm"
          >
            <span className={cn(
              check.complete ? "text-green-700" : "text-gray-500"
            )}>
              {check.label}
              {check.required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {check.complete ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
          </div>
        ))}
      </div>
      
      {!allRequiredComplete && (
        <p className="text-xs text-yellow-700 mt-3">
          Complete all required items before signing to ensure Medicare compliance.
        </p>
      )}
    </Card>
  );
}

export default MedicalScribeNav;
