import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Calendar, Pill, User, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PatientProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  medicalHistory: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  dateTime: string;
  duration: number;
  type: string;
  status: string;
  notes: string;
}

interface Prescription {
  id: number;
  patientId: number;
  doctorId: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: string;
  createdAt: string;
}

const PatientPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientProfile>>({});

  // Fetch patient profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<PatientProfile>({
    queryKey: ['/api/patient-portal/profile'],
    queryFn: async () => {
      const res = await fetch('/api/patient-portal/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aims_auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: user?.role === 'patient',
  });

  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['/api/patient-portal/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/patient-portal/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aims_auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    },
    enabled: user?.role === 'patient',
  });

  // Fetch prescriptions
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery<Prescription[]>({
    queryKey: ['/api/patient-portal/prescriptions'],
    queryFn: async () => {
      const res = await fetch('/api/patient-portal/prescriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aims_auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch prescriptions');
      return res.json();
    },
    enabled: user?.role === 'patient',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<PatientProfile>) => {
      const res = await fetch('/api/patient-portal/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aims_auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient-portal/profile'] });
      setIsEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your information has been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'There was an error updating your profile.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
      });
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'no_show':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getPrescriptionStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'discontinued':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Redirect if not a patient
  if (user?.role !== 'patient') {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              This portal is only available for patients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your current role: <Badge variant="secondary">{user?.role}</Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Patient Portal</h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.name}. Manage your health information here.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            My Profile
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4 mr-2" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill className="h-4 w-4 mr-2" />
            Prescriptions
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>View and update your personal details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                ) : (
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProfile ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date of Birth</Label>
                      <p className="font-medium">
                        {profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMMM d, yyyy') : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Gender</Label>
                      <p className="font-medium capitalize">{profile.gender || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Medical History</Label>
                      <p className="font-medium">{profile.medicalHistory || 'No known conditions'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!isEditing ? (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{profile.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone</Label>
                          <p className="font-medium">{profile.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Address</Label>
                          <p className="font-medium">{profile.address || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Emergency Contact</Label>
                          <p className="font-medium">
                            {profile.emergencyContactName || 'Not provided'}
                            {profile.emergencyContactPhone && ` - ${profile.emergencyContactPhone}`}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Insurance</Label>
                          <p className="font-medium">
                            {profile.insuranceProvider || 'Not provided'}
                            {profile.insurancePolicyNumber && ` (Policy: ${profile.insurancePolicyNumber})`}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={editForm.address || ''}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                          <Input
                            id="emergencyContactName"
                            value={editForm.emergencyContactName || ''}
                            onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                          <Input
                            id="emergencyContactPhone"
                            value={editForm.emergencyContactPhone || ''}
                            onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No profile found. Please contact your healthcare provider.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>My Appointments</CardTitle>
              <CardDescription>View your upcoming and past appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{appointment.type || 'Appointment'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.dateTime), 'MMMM d, yyyy at h:mm a')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {appointment.duration} minutes
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {appointment.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Notes: {appointment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments found</p>
                  <p className="text-sm">Contact your healthcare provider to schedule an appointment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle>My Prescriptions</CardTitle>
              <CardDescription>View your current and past prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPrescriptions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : prescriptions && prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <div key={prescription.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{prescription.medication}</h4>
                          <p className="text-sm text-muted-foreground">
                            Dosage: {prescription.dosage || 'As directed'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Frequency: {prescription.frequency || 'As needed'}
                          </p>
                          {prescription.duration && (
                            <p className="text-sm text-muted-foreground">
                              Duration: {prescription.duration}
                            </p>
                          )}
                        </div>
                        <Badge variant={getPrescriptionStatusBadgeVariant(prescription.status)}>
                          {prescription.status}
                        </Badge>
                      </div>
                      {prescription.instructions && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Instructions:</p>
                          <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Prescribed: {format(new Date(prescription.createdAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No prescriptions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientPortal;
