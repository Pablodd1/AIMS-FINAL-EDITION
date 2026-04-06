import { useQuery } from "@tanstack/react-query";
import { Patient, Appointment, User, MedicalNote, IntakeForm } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { format } from "date-fns";
import { Calendar, Users, Clock, Stethoscope, Activity, Plus, FileText, Video, PenTool, UserPlus, CalendarPlus, ClipboardList, CheckCircle2, TrendingUp, FileCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch medical notes for completed visits count
  const { data: medicalNotes } = useQuery<MedicalNote[]>({
    queryKey: ["/api/medical-notes"],
  });

  // Fetch intake forms
  const { data: intakeForms } = useQuery<IntakeForm[]>({
    queryKey: ["/api/intake-forms"],
  });

  const todayAppointments = appointments?.filter(a => 
    new Date(a.date).toDateString() === new Date().toDateString()
  ) || [];

  // Calculate completed visits (appointments with status 'completed' or medical notes created)
  const completedAppointments = appointments?.filter(a => a.status === 'completed') || [];
  const completedVisitsCount = medicalNotes?.length || completedAppointments.length || 0;

  // Completed intake forms
  const completedIntakeForms = intakeForms?.filter(f => f.status === 'completed') || [];
  const pendingIntakeForms = intakeForms?.filter(f => f.status === 'pending') || [];

  const stats = [
    {
      title: t('dashboard.stats.patients'),
      value: patients?.length || 0,
      icon: Users,
      trend: "+5%",
      description: t('dashboard.stats.trend.month'),
      color: "text-blue-500"
    },
    {
      title: t('dashboard.stats.appointments'),
      value: todayAppointments.length,
      icon: Calendar,
      trend: "+2%",
      description: t('dashboard.stats.trend.yesterday'),
      color: "text-purple-500"
    },
    {
      title: t('dashboard.stats.completed'),
      value: completedVisitsCount,
      icon: CheckCircle2,
      trend: `+${medicalNotes?.filter(n => {
        const noteDate = new Date(n.createdAt);
        const today = new Date();
        return noteDate.toDateString() === today.toDateString();
      }).length || 0} ${t('common.today')}`,
      description: t('dashboard.stats.documented'),
      color: "text-green-500"
    },
    {
      title: t('dashboard.stats.intake'),
      value: `${completedIntakeForms.length}/${intakeForms?.length || 0}`,
      icon: FileCheck,
      trend: `${pendingIntakeForms.length} ${t('common.pending')}`,
      description: t('dashboard.stats.completedForms'),
      color: "text-orange-500"
    },
    {
      title: t('dashboard.stats.upcoming'),
      value: appointments?.filter(a => new Date(a.date) > new Date()).length || 0,
      icon: Clock,
      trend: "0%",
      description: t('dashboard.stats.scheduled'),
      color: "text-indigo-500"
    },
    {
      title: t('dashboard.stats.weeklyNotes'),
      value: medicalNotes?.filter(n => {
        const noteDate = new Date(n.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return noteDate >= weekAgo;
      }).length || 0,
      icon: TrendingUp,
      trend: "+3%",
      description: t('dashboard.stats.trend.week'),
      color: "text-emerald-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.welcome')} {user?.name}!</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.trend.startsWith("+") ? "text-green-500" : stat.trend.includes("pending") ? "text-orange-500" : "text-muted-foreground"}>
                  {stat.trend}
                </span>
                {" "}{stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('dashboard.quickActions')}
          </CardTitle>
          <CardDescription>{t('dashboard.quickActions.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/patients">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <UserPlus className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.newPatient')}</span>
              </Button>
            </Link>
            <Link href="/appointments">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <CalendarPlus className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.newAppointment')}</span>
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <FileText className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.medicalNotes')}</span>
              </Button>
            </Link>
            <Link href="/quick-notes">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <PenTool className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.quickNotes')}</span>
              </Button>
            </Link>
            <Link href="/telemedicine">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Video className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.telemedicine')}</span>
              </Button>
            </Link>
            <Link href="/patient-intake">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <ClipboardList className="h-5 w-5" />
                <span className="text-xs">{t('dashboard.action.patientIntake')}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.todayAppointments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {todayAppointments.map((appointment) => {
                  const patient = patients?.find(p => p.id === appointment.patientId);
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{patient?.firstName ? patient.firstName.charAt(0) : ''}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{patient ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown Patient'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge>{appointment.status}</Badge>
                    </div>
                  );
                })}
                {todayAppointments.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {t('dashboard.noAppointments')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivities')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {[
                  { title: t('dashboard.activity.newPatient'), time: "10 minutes ago" },
                  { title: t('dashboard.activity.consultation'), time: "1 hour ago" },
                  { title: t('dashboard.activity.updatedRecords'), time: "2 hours ago" },
                  { title: t('dashboard.activity.aiNotes'), time: "3 hours ago" },
                  { title: t('dashboard.activity.followUp'), time: "4 hours ago" }
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}