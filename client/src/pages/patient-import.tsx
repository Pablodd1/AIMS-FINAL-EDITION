import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Users,
  RefreshCw,
  X,
  Table
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  matchedColumns: Record<string, string>;
  unmatchedColumns?: string[];
  requiredFieldsPresent: {
    firstName: boolean;
    lastName: boolean;
  };
}

export function PatientImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/patients/import/validate', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Validation failed');
      return res.json();
    },
    onSuccess: (data) => {
      setValidation(data);
      setIsValidating(false);
    },
    onError: () => {
      toast({ title: 'Validation failed', variant: 'destructive' });
      setIsValidating(false);
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/patients/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Import failed');
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data.results);
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({ 
        title: 'Import completed', 
        description: `${data.results.imported} patients imported successfully` 
      });
      setIsImporting(false);
    },
    onError: () => {
      toast({ title: 'Import failed', variant: 'destructive' });
      setIsImporting(false);
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      setValidation(null);
      setImportResult(null);
      setIsValidating(true);
      validateMutation.mutate(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleImport = () => {
    if (!file) return;
    setIsImporting(true);
    importMutation.mutate(file);
  };

  const downloadTemplate = () => {
    window.open('/api/patients/import/template', '_blank');
  };

  const reset = () => {
    setFile(null);
    setValidation(null);
    setImportResult(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Import Patients
        </h1>
        <p className="text-gray-600 mt-1">
          Bulk import patients from Excel or CSV files
        </p>
      </div>

      {/* Template Download */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Table className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Download Template</h3>
                <p className="text-sm text-gray-600">
                  Use our Excel template to ensure proper formatting
                </p>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      {!importResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Drag and drop your Excel or CSV file, or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400",
                file && "border-green-500 bg-green-50"
              )}
            >
              <input {...getInputProps()} />
              
              {file ? (
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="h-12 w-12 text-green-600 mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="font-medium">
                    {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {isValidating && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span>Analyzing file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {validation && !importResult && (
        <Card className={cn(
          "mb-6",
          validation.valid ? "border-green-300" : "border-yellow-300"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              File Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{validation.totalRows}</p>
                <p className="text-sm text-gray-600">Total Rows</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {Object.keys(validation.matchedColumns).length}
                </p>
                <p className="text-sm text-gray-600">Columns Matched</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {validation.requiredFieldsPresent.firstName && validation.requiredFieldsPresent.lastName 
                    ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-gray-600">Required Fields</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Mapped Columns</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(validation.matchedColumns).map(([field, header]) => (
                  <div key={field} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{field}:</span>
                    <span className="text-gray-600">{header}</span>
                  </div>
                ))}
              </div>
            </div>

            {validation.unmatchedColumns && validation.unmatchedColumns.length > 0 && (
              <>
                <Separator />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unrecognized columns: {validation.unmatchedColumns.join(', ')}
                  </AlertDescription>
                </Alert>
              </>
            )}

            {!validation.requiredFieldsPresent.firstName && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  First Name column is required but not found. Please check your file.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleImport}
              disabled={!validation.valid || isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validation.totalRows} Patients
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className="mb-6 border-green-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-700">{importResult.imported}</p>
                <p className="text-sm text-gray-600">Imported</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-700">{importResult.skipped}</p>
                <p className="text-sm text-gray-600">Skipped (duplicates)</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-700">{importResult.errors.length}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 text-red-600">
                    Errors ({importResult.errors.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, idx) => (
                      <div key={idx} className="p-2 bg-red-50 rounded text-sm">
                        <span className="font-medium">Row {error.row}:</span>
                        <span className="text-red-600 ml-2">{error.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button onClick={reset} variant="outline" className="w-full">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Columns</CardTitle>
          <CardDescription>
            Your Excel file can include any of these columns. Column names are flexible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">First Name</span>
              <span className="text-red-500 ml-1">*</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Last Name</span>
              <span className="text-red-500 ml-1">*</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Email</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Phone</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Date of Birth</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Gender</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Address</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">City</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">State</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Zip Code</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Insurance</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Policy Number</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Emergency Contact</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">MRN</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Required fields. Duplicate patients (matching name + DOB) will be skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default PatientImport;
