import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2,
  CheckCircle,
  User,
  Phone, 
  Mail, 
  ArrowRight,
  ClipboardCheck,
  Calendar
} from "lucide-react";
import { SignaturePad, SignatureData } from "@/components/signature-pad";
import { format } from "date-fns";
import { Patient, Appointment } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { Globe } from "lucide-react";

export default function KioskPage() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState<'welcome' | 'form' | 'signature' | 'success'>('welcome');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [matchedAppointment, setMatchedAppointment] = useState<Appointment | null>(null);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      // Use the dedicated kiosk registration endpoint
      const res = await fetch("/api/kiosk/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-token": "kiosk-access-token" // In a real app, this would be an env var or secure cookie
        },
        body: JSON.stringify({
          ...formData,
          reasonForVisit: "Check-in",
          checkInTime: new Date().toISOString(),
          kioskId: "main-lobby",
          signatureData: signature?.signatureImage
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Check-in failed. Please see the front desk.");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setStep('success');
      toast({
        title: "Check-in Successful",
        description: "Please have a seat. The doctor will be with you shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 'welcome') setStep('form');
    else if (step === 'form') {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast({ title: "Required Fields", description: "Please fill in all required fields.", variant: "destructive" });
        return;
      }
      setStep('signature');
    }
  };

  const handleCheckIn = () => {
    if (!signature) {
      toast({ title: "Signature Required", description: "Please sign to complete check-in.", variant: "destructive" });
      return;
    }
    checkInMutation.mutate();
  };

  const resetKiosk = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    setSignature(null);
    setStep('welcome');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex gap-2">
        <Button
          variant={language === 'en' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLanguage('en')}
        >
          English
        </Button>
        <Button
          variant={language === 'es' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLanguage('es')}
        >
          Español
        </Button>
      </div>

      <Card className="w-full max-w-2xl shadow-2xl border-t-8 border-t-primary">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <ClipboardCheck className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold text-slate-800">Clinic Check-In</CardTitle>
          <CardDescription className="text-lg">
            {step === 'welcome' && "Welcome! Please tap below to begin."}
            {step === 'form' && "Please enter your information to find your appointment."}
            {step === 'signature' && "Please provide your signature to confirm check-in."}
            {step === 'success' && "You're all set!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'welcome' && (
            <div className="flex flex-col items-center gap-8 py-12">
              <div className="text-center space-y-2">
                <p className="text-2xl font-medium text-slate-600">Today is</p>
                <p className="text-4xl font-bold text-primary">{format(new Date(), "EEEE, MMMM d")}</p>
              </div>
              <Button size="lg" className="w-64 h-20 text-2xl rounded-full shadow-xl animate-pulse" onClick={handleNext}>
                Tap to Start <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          )}

          {step === 'form' && (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-lg">First Name *</Label>
                  <Input
                    id="firstName"
                    className="h-12 text-lg"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-lg">Last Name *</Label>
                  <Input
                    id="lastName"
                    className="h-12 text-lg"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-lg">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="h-12 pl-10 text-lg"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-lg">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="h-12 pl-10 text-lg"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" size="lg" className="flex-1 h-14 text-xl" onClick={() => setStep('welcome')}>Back</Button>
                <Button size="lg" className="flex-1 h-14 text-xl" onClick={handleNext}>Next</Button>
              </div>
            </div>
          )}

          {step === 'signature' && (
            <div className="space-y-6">
              <div className="p-4 border-2 border-dashed rounded-xl bg-white">
                <SignaturePad
                  documentTitle="Check-In Confirmation"
                  patientName={`${formData.firstName} ${formData.lastName}`}
                  onSignatureComplete={setSignature}
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="flex-1 h-14 text-xl" onClick={() => setStep('form')}>Back</Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 text-xl bg-green-600 hover:bg-green-700"
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <ClipboardCheck className="w-6 h-6 mr-2" />}
                  Confirm Check-In
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-8 py-12 text-center animate-in zoom-in duration-500">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-20 h-20 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-slate-800">Check-In Complete</h3>
                <p className="text-xl text-slate-600">Thank you, {formData.firstName}. Your arrival has been recorded.</p>
                <p className="text-slate-500">Please take a seat in the waiting area.</p>
              </div>
              <Button size="lg" variant="outline" className="w-48 h-14 text-lg mt-4" onClick={resetKiosk}>
                Finish
              </Button>
            </div>
          )}
        </CardContent>

        <div className="p-6 bg-slate-100/50 rounded-b-xl border-t text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <User className="w-4 h-4" /> Secure Patient Access
          </p>
        </div>
      </Card>
    </div>
  );
}
