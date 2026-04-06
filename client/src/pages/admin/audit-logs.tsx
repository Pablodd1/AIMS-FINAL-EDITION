import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, 
  Shield, 
  Search, 
  Filter, 
  Eye, 
  FileEdit, 
  Trash2, 
  LogIn, 
  LogOut,
  Plus,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'wouter';

interface AuditLog {
  id: number;
  userId: number | null;
  userRole: string | null;
  patientId: number | null;
  action: string;
  resource: string;
  resourceId: number | null;
  details: string | null;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

const AuditLogsViewer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs?limit=500', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aims_auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: user?.role === 'admin' || user?.role === 'administrator',
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <FileEdit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'logout':
        return <LogOut className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (action) {
      case 'view':
        return 'secondary';
      case 'create':
        return 'default';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      case 'login':
      case 'logout':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = 
      searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.includes(searchTerm);
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
    
    return matchesSearch && matchesAction && matchesResource;
  });

  const uniqueActions = [...new Set(logs?.map(log => log.action) || [])];
  const uniqueResources = [...new Set(logs?.map(log => log.resource) || [])];

  // Redirect if not admin
  if (user?.role !== 'admin' && user?.role !== 'administrator') {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              Only administrators can view audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            HIPAA-compliant audit trail of all system activities
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline">Back to Admin</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity Logs</CardTitle>
          <CardDescription>
            Complete audit trail of PHI access and system modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {log.resource.replace('_', ' ')}
                          </span>
                          {log.resourceId && (
                            <span className="text-muted-foreground ml-1">
                              (ID: {log.resourceId})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.userId ? (
                            <div>
                              <span className="font-medium">User #{log.userId}</span>
                              {log.userRole && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {log.userRole}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.patientId ? (
                            <span className="font-medium">Patient #{log.patientId}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              )}
            </div>
          )}

          {filteredLogs && filteredLogs.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {filteredLogs.length} of {logs?.length || 0} log entries
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>HIPAA Compliance Information</CardTitle>
          <CardDescription>
            Understanding your audit trail obligations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Access Logging</h4>
              <p className="text-sm text-muted-foreground">
                All access to Protected Health Information (PHI) is logged with user identification, timestamp, and action type.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                Audit logs are retained for a minimum of 6 years as required by HIPAA regulations.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Breach Detection</h4>
              <p className="text-sm text-muted-foreground">
                Regular review of audit logs helps detect unauthorized access and potential data breaches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsViewer;
