import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Star, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  FileText,
  Upload,
  Download,
  Code,
  Activity,
  Calculator,
  DollarSign,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface CPTCode {
  id?: number;
  code: string;
  description: string;
  category: string;
  modifier?: string;
  rvu?: number;
  isFavorite?: boolean;
}

interface ICD10Code {
  id?: number;
  code: string;
  description: string;
  category: string;
  laterality?: string;
  isFavorite?: boolean;
}

export function MedicalCodesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('cpt');
  
  // Medicare Fee Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcCode, setCalcCode] = useState<CPTCode | null>(null);
  const [calcUnits, setCalcUnits] = useState(1);
  const [calcGPCI, setCalcGPCI] = useState({ work: 1.0, pe: 1.0, mp: 1.0 });
  
  // 2024 Medicare Conversion Factor (updated annually)
  const CONVERSION_FACTOR = 33.2875;
  
  const calculateMedicareFee = () => {
    if (!calcCode?.rvu) return null;
    const workRVU = calcCode.rvu * calcGPCI.work;
    const peRVU = calcCode.rvu * calcGPCI.pe * 0.8; // PE typically 80%
    const mpRVU = calcCode.rvu * calcGPCI.mp * 0.1; // MP typically 10%
    const totalRVU = workRVU + peRVU + mpRVU;
    return (totalRVU * CONVERSION_FACTOR * calcUnits).toFixed(2);
  };
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<CPTCode | ICD10Code | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Fetch CPT codes
  const { data: cptCodes = [], isLoading: loadingCpt } = useQuery<CPTCode[]>({
    queryKey: ['/api/medical-codes/cpt'],
  });

  // Fetch ICD-10 codes
  const { data: icd10Codes = [], isLoading: loadingIcd } = useQuery<ICD10Code[]>({
    queryKey: ['/api/medical-codes/icd10'],
  });

  // Fetch favorites
  const { data: favorites = [] } = useQuery<{ codeId: number; codeType: string }[]>({
    queryKey: ['/api/medical-codes/favorites'],
  });

  // Add CPT code mutation
  const addCptMutation = useMutation({
    mutationFn: (code: Partial<CPTCode>) => 
      apiRequest('POST', '/api/medical-codes/cpt', code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-codes/cpt'] });
      toast({ title: 'CPT code added successfully' });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: 'Failed to add CPT code', variant: 'destructive' });
    }
  });

  // Add ICD-10 code mutation
  const addIcdMutation = useMutation({
    mutationFn: (code: Partial<ICD10Code>) => 
      apiRequest('POST', '/api/medical-codes/icd10', code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-codes/icd10'] });
      toast({ title: 'ICD-10 code added successfully' });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: 'Failed to add ICD-10 code', variant: 'destructive' });
    }
  });

  // Delete code mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: string }) => 
      apiRequest('DELETE', `/api/medical-codes/${type}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-codes'] });
      toast({ title: 'Code deleted successfully' });
    }
  });

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: ({ codeId, codeType }: { codeId: number; codeType: string }) => 
      apiRequest('POST', '/api/medical-codes/favorites', { codeId, codeType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-codes/favorites'] });
    }
  });

  const filteredCptCodes = cptCodes.filter(code => 
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIcdCodes = icd10Codes.filter(code => 
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFavorite = (codeId: number, type: string) => 
    favorites.some(f => f.codeId === codeId && f.codeType === type);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Code className="h-8 w-8 text-blue-600" />
          Medical Codes Manager
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your CPT and ICD-10 code database for billing and documentation
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total CPT Codes</p>
                <p className="text-2xl font-bold">{cptCodes.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total ICD-10 Codes</p>
                <p className="text-2xl font-bold">{icd10Codes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Favorites</p>
                <p className="text-2xl font-bold">{favorites.length}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">
                  {new Set([...cptCodes.map(c => c.category), ...icd10Codes.map(c => c.category)]).size}
                </p>
              </div>
              <Code className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medicare Fee Calculator */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Medicare Fee Calculator (2024)</CardTitle>
            </div>
            <Button 
              variant={showCalculator ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
            >
              {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
            </Button>
          </div>
        </CardHeader>
        {showCalculator && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Select CPT Code</Label>
                <Select 
                  value={calcCode?.id?.toString() || ''} 
                  onValueChange={(val) => {
                    const code = cptCodes.find(c => c.id === parseInt(val));
                    setCalcCode(code || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select code..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cptCodes.map(code => (
                      <SelectItem key={code.id} value={code.id!.toString()}>
                        {code.code} - {code.description.substring(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Units</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={calcUnits}
                  onChange={(e) => setCalcUnits(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Work GPCI (default 1.0)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={calcGPCI.work}
                  onChange={(e) => setCalcGPCI({...calcGPCI, work: parseFloat(e.target.value) || 1.0})}
                />
              </div>
              <div>
                <Label>Estimated Reimbursement</Label>
                <div className="flex items-center gap-2 h-10 px-3 bg-green-50 rounded-md border border-green-200">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xl font-bold text-green-700">
                    ${calculateMedicareFee() || '0.00'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Conversion Factor: ${CONVERSION_FACTOR} (2024) | Based on national average
            </div>
          </CardContent>
        )}
      </Card>

      {/* Search and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search codes by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Code
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="cpt">CPT Codes ({filteredCptCodes.length})</TabsTrigger>
          <TabsTrigger value="icd10">ICD-10 Codes ({filteredIcdCodes.length})</TabsTrigger>
          <TabsTrigger value="favorites">
            Favorites ({favorites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cpt">
          <CodesTable 
            codes={filteredCptCodes}
            type="cpt"
            isLoading={loadingCpt}
            isFavorite={isFavorite}
            onToggleFavorite={(id) => favoriteMutation.mutate({ codeId: id, codeType: 'cpt' })}
            onDelete={(id) => deleteMutation.mutate({ id, type: 'cpt' })}
            onEdit={setEditingCode}
          />
        </TabsContent>

        <TabsContent value="icd10">
          <CodesTable 
            codes={filteredIcdCodes}
            type="icd10"
            isLoading={loadingIcd}
            isFavorite={isFavorite}
            onToggleFavorite={(id) => favoriteMutation.mutate({ codeId: id, codeType: 'icd10' })}
            onDelete={(id) => deleteMutation.mutate({ id, type: 'icd10' })}
            onEdit={setEditingCode}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-3">Favorite CPT Codes</h3>
              <CodesTable 
                codes={cptCodes.filter(c => isFavorite(c.id!, 'cpt'))}
                type="cpt"
                isLoading={loadingCpt}
                isFavorite={() => true}
                onToggleFavorite={(id) => favoriteMutation.mutate({ codeId: id, codeType: 'cpt' })}
                onDelete={(id) => deleteMutation.mutate({ id, type: 'cpt' })}
                onEdit={setEditingCode}
                compact
              />
            </div>
            <div>
              <h3 className="font-semibold mb-3">Favorite ICD-10 Codes</h3>
              <CodesTable 
                codes={icd10Codes.filter(c => isFavorite(c.id!, 'icd10'))}
                type="icd10"
                isLoading={loadingIcd}
                isFavorite={() => true}
                onToggleFavorite={(id) => favoriteMutation.mutate({ codeId: id, codeType: 'icd10' })}
                onDelete={(id) => deleteMutation.mutate({ id, type: 'icd10' })}
                onEdit={setEditingCode}
                compact
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Code Dialog */}
      <AddCodeDialog 
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAddCpt={addCptMutation.mutate}
        onAddIcd={addIcdMutation.mutate}
        defaultType={activeTab === 'icd10' ? 'icd10' : 'cpt'}
      />

      {/* Import Dialog */}
      <ImportCodesDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}

// Codes Table Component
function CodesTable({ 
  codes, 
  type, 
  isLoading,
  isFavorite,
  onToggleFavorite,
  onDelete,
  onEdit,
  compact = false
}: {
  codes: (CPTCode | ICD10Code)[];
  type: 'cpt' | 'icd10';
  isLoading: boolean;
  isFavorite: (id: number, type: string) => boolean;
  onToggleFavorite: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (code: CPTCode | ICD10Code) => void;
  compact?: boolean;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading codes...</div>;
  }

  if (codes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Code className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No {type.toUpperCase()} codes found.</p>
        <p className="text-sm">Add codes manually or import from a file.</p>
      </div>
    );
  }

  return (
    <Card>
      <ScrollArea className={compact ? "h-[300px]" : "h-[500px]"}>
        <div className="divide-y">
          {codes.map((code) => (
            <div 
              key={code.id} 
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {code.code}
                  </Badge>
                  {code.category && (
                    <Badge variant="secondary" className="text-xs">
                      {code.category}
                    </Badge>
                  )}
                  {'rvu' in code && code.rvu && (
                    <span className="text-xs text-gray-500">
                      RVU: {code.rvu}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1">{code.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(code.id!)}
                  className={cn(
                    isFavorite(code.id!, type) && "text-yellow-500"
                  )}
                >
                  <Star className={cn(
                    "h-4 w-4",
                    isFavorite(code.id!, type) && "fill-current"
                  )} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(code)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(code.id!)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Add Code Dialog
function AddCodeDialog({ 
  open, 
  onClose, 
  onAddCpt, 
  onAddIcd,
  defaultType 
}: { 
  open: boolean; 
  onClose: () => void; 
  onAddCpt: (code: Partial<CPTCode>) => void;
  onAddIcd: (code: Partial<ICD10Code>) => void;
  defaultType: string;
}) {
  const [type, setType] = useState(defaultType);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [modifier, setModifier] = useState('');
  const [rvu, setRvu] = useState('');
  const [laterality, setLaterality] = useState('');

  useEffect(() => {
    setType(defaultType);
  }, [defaultType, open]);

  const handleSubmit = () => {
    if (!code || !description) return;

    if (type === 'cpt') {
      onAddCpt({
        code: code.toUpperCase(),
        description,
        category,
        modifier: modifier || undefined,
        rvu: rvu ? parseFloat(rvu) : undefined
      });
    } else {
      onAddIcd({
        code: code.toUpperCase(),
        description,
        category,
        laterality: laterality || undefined
      });
    }

    // Reset form
    setCode('');
    setDescription('');
    setCategory('General');
    setModifier('');
    setRvu('');
    setLaterality('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Code Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="cpt">CPT (Procedure)</option>
              <option value="icd10">ICD-10 (Diagnosis)</option>
            </select>
          </div>

          <div>
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={type === 'cpt' ? "e.g., 99213" : "e.g., I10"}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Code description"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., E/M, Surgery, Cardiology"
              className="mt-1"
            />
          </div>

          {type === 'cpt' && (
            <>
              <div>
                <Label>Modifier (optional)</Label>
                <Input
                  value={modifier}
                  onChange={(e) => setModifier(e.target.value)}
                  placeholder="e.g., 25, 59"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>RVU (optional)</Label>
                <Input
                  type="number"
                  value={rvu}
                  onChange={(e) => setRvu(e.target.value)}
                  placeholder="Relative Value Unit"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {type === 'icd10' && (
            <div>
              <Label>Laterality (optional)</Label>
              <select
                value={laterality}
                onChange={(e) => setLaterality(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">None</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="bilateral">Bilateral</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!code || !description}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import Codes Dialog
function ImportCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      setImporting(true);
      const lines = importData.trim().split('\n');
      const cptCodes: Partial<CPTCode>[] = [];
      const icd10Codes: Partial<ICD10Code>[] = [];

      lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const type = parts[0].toLowerCase();
          const code = parts[1];
          const description = parts[2];
          const category = parts[3] || 'General';

          if (type === 'cpt') {
            cptCodes.push({ code, description, category });
          } else if (type === 'icd10') {
            icd10Codes.push({ code, description, category });
          }
        }
      });

      await apiRequest('POST', '/api/medical-codes/bulk-import', {
        cptCodes,
        icd10Codes
      });

      queryClient.invalidateQueries({ queryKey: ['/api/medical-codes'] });
      toast({ title: `Imported ${cptCodes.length} CPT and ${icd10Codes.length} ICD-10 codes` });
      setImportData('');
      onClose();
    } catch (error) {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Codes</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-2">
            Paste codes in format: <code className="bg-gray-100 px-1 rounded">TYPE[tab]CODE[tab]DESCRIPTION[tab]CATEGORY</code>
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Example:<br />
            cpt[tab]99213[tab]Office visit, established patient[tab]E/M<br />
            icd10[tab]I10[tab]Essential hypertension[tab]Cardiovascular
          </p>
          
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            className="w-full h-64 p-3 border rounded-md font-mono text-sm"
            placeholder="Paste your codes here..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleImport}
            disabled={!importData.trim() || importing}
          >
            {importing ? 'Importing...' : 'Import Codes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MedicalCodesManager;
