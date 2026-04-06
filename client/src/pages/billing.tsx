import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Plus, DollarSign, FileText, CreditCard, Calendar, Edit, FileCheck, Pencil, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Patient, Invoice } from "@shared/schema";
import { format } from "date-fns";

// Extended interface for invoices with patient data
interface ExtendedInvoice extends Invoice {
  patient?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  }
}
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Form schema for creating a new invoice
const invoiceFormSchema = z.object({
  patientId: z.coerce.number().min(1, "Please select a patient"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative").optional(),
  description: z.string().min(5, "Description must be at least 5 characters"),
  dueDate: z.union([
    z.string().min(1, "Please select a due date"),
    z.date({ required_error: "Please select a due date" })
  ]),
  invoiceNumber: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// Form schema for updating payment
const paymentFormSchema = z.object({
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
  status: z.enum(["paid", "partial", "unpaid", "overdue"]),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function Billing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ExtendedInvoice | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isMarkedAsPaid, setIsMarkedAsPaid] = useState(false);
  
  // Fetch invoices
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<ExtendedInvoice[]>({
    queryKey: ['/api/invoices'],
  });
  
  // Fetch patients for the dropdown
  const { data: patients, isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });
  
  // Form setup for creating a new invoice
  const invoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      amount: 0,
      amountPaid: 0,
      description: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  
  // Form setup for updating payment
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amountPaid: 0,
      status: "unpaid",
    },
  });
  
  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      // Generate invoice number if not provided
      const invoiceNumber = `INV-${new Date().toISOString().slice(0,10)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Use simple date format as a string
      let dueDate = data.dueDate;
      // Convert date object to string if needed
      let dueDateStr = '';
      if (typeof dueDate === 'object' && dueDate instanceof Date) {
        // Convert to YYYY-MM-DD format
        dueDateStr = dueDate.toISOString().split('T')[0];
      } else {
        dueDateStr = String(dueDate);
      }
      
      const res = await apiRequest("POST", "/api/invoices", {
        ...data,
        doctorId: user?.id, // Explicitly add the doctor ID from the logged-in user
        // Convert amount to cents
        amount: Math.round(data.amount * 100),
        amountPaid: Math.round((data.amountPaid || 0) * 100),
        // Use a simple date string format
        dueDate: dueDateStr,
        // Add the invoice number
        invoiceNumber,
        // Add status if not provided
        status: data.amountPaid && data.amountPaid >= data.amount ? 'paid' : data.amountPaid ? 'partial' : 'unpaid',
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice created",
        description: "The invoice has been created successfully.",
      });
      setShowNewInvoiceForm(false);
      invoiceForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { id: number, amountPaid: number }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${data.id}/payment`, {
        // Convert amount to cents
        amountPaid: Math.round(data.amountPaid * 100),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Payment updated",
        description: "The payment has been updated successfully.",
      });
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      paymentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${data.id}/status`, {
        status: data.status,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Status updated",
        description: "The invoice status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Submit handler for new invoice form
  const onSubmitNewInvoice = (data: InvoiceFormValues) => {
    createInvoiceMutation.mutate(data);
  };
  
  // Submit handler for payment form
  const onSubmitPayment = (data: PaymentFormValues) => {
    if (selectedInvoice) {
      updatePaymentMutation.mutate({
        id: selectedInvoice.id,
        amountPaid: data.amountPaid,
      });
    }
  };
  
  // Open payment dialog for an invoice
  const handleUpdatePayment = (invoice: ExtendedInvoice) => {
    setSelectedInvoice(invoice);
    paymentForm.reset({
      // Convert cents to dollars for display
      amountPaid: invoice.amountPaid / 100,
      status: invoice.status as any,
    });
    setShowPaymentDialog(true);
  };
  
  // Calculate metrics for the summary cards
  const totalRevenue = invoices?.reduce((sum, invoice) => sum + invoice.amountPaid, 0) || 0;
  const pendingPayments = invoices?.filter(invoice => invoice.status === "unpaid" || invoice.status === "partial").length || 0;
  const outstandingAmount = invoices?.reduce((sum, invoice) => {
    const remaining = invoice.amount - invoice.amountPaid;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0) || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('billing.title')}</h1>
          <p className="text-muted-foreground">{t('billing.subtitle')}</p>
        </div>
        <Button onClick={() => setShowNewInvoiceForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('billing.newInvoice')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t('billing.revenueDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.pendingPayments')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">{t('billing.pendingDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.outstanding')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(outstandingAmount / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t('billing.outstandingDesc')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('billing.recentInvoices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.invoiceNumber')}</TableHead>
                  <TableHead>{t('billing.patient')}</TableHead>
                  <TableHead>{t('billing.totalAmount')}</TableHead>
                  <TableHead>{t('billing.paid')}</TableHead>
                  <TableHead>{t('billing.remaining')}</TableHead>
                  <TableHead>{t('billing.status')}</TableHead>
                  <TableHead>{t('billing.dueDate')}</TableHead>
                  <TableHead>{t('billing.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvoices ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : !invoices || invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No invoices found. Create a new invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const remaining = invoice.amount - invoice.amountPaid;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName || ''}` : `Patient #${invoice.patientId}`}</TableCell>
                        <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>${(invoice.amountPaid / 100).toFixed(2)}</TableCell>
                        <TableCell>${(remaining / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              invoice.status === "paid"
                                ? "bg-medical-yellow text-black"
                                : invoice.status === "partial"
                                ? "bg-medical-dark-blue text-white"
                                : invoice.status === "unpaid"
                                ? "border-2 border-medical-dark-blue text-medical-dark-blue"
                                : "bg-medical-red text-white"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.dueDate}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdatePayment(invoice)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            {t('billing.update')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={showNewInvoiceForm} onOpenChange={setShowNewInvoiceForm}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{t('billing.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('billing.createDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...invoiceForm}>
            <form onSubmit={invoiceForm.handleSubmit(onSubmitNewInvoice)} className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3">
                <div className="text-sm font-medium text-muted-foreground">{t('billing.invoiceNumber')}</div>
                <div className="text-lg font-bold">{t('billing.autoGenerated')}</div>
              </div>

              <FormField
                control={invoiceForm.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billing.patient')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('billing.selectPatient')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {`${patient.firstName} ${patient.lastName || ''}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={invoiceForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('billing.totalAmount')} ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (isMarkedAsPaid) {
                              const val = parseFloat(e.target.value);
                              invoiceForm.setValue("amountPaid", isNaN(val) ? 0 : val);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={invoiceForm.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('billing.amountPaid')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="markAsPaid"
                  checked={isMarkedAsPaid}
                  onCheckedChange={(checked) => {
                    setIsMarkedAsPaid(!!checked);
                    if (checked) {
                      const amount = invoiceForm.getValues("amount");
                      invoiceForm.setValue("amountPaid", amount);
                    } else {
                      invoiceForm.setValue("amountPaid", 0);
                    }
                  }}
                />
                <label
                  htmlFor="markAsPaid"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('billing.markAsPaid')}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('billing.status')}:</span>
                {(() => {
                  const amount = invoiceForm.watch("amount");
                  const amountPaid = invoiceForm.watch("amountPaid") || 0;
                  let status = "unpaid";
                  if (amount > 0 && amountPaid >= amount) status = "paid";
                  else if (amountPaid > 0) status = "partial";

                  return (
                    <Badge
                      className={
                        status === "paid"
                          ? "bg-medical-yellow text-black"
                          : status === "partial"
                          ? "bg-medical-dark-blue text-white"
                          : "border-2 border-medical-dark-blue text-medical-dark-blue"
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  );
                })()}
              </div>
              
              <FormField
                control={invoiceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billing.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={invoiceForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('billing.dueDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              typeof field.value === 'string' 
                                ? format(new Date(field.value), "PPP") 
                                : format(field.value, "PPP")
                            ) : (
                              <span>{t('billing.pickDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={
                            field.value ? 
                              (typeof field.value === 'string' ? 
                                new Date(field.value) : 
                                field.value as Date) 
                              : undefined
                          }
                          onSelect={(date) => {
                            // Store as a YYYY-MM-DD string instead of a Date object
                            if (date) {
                              // Convert to string in YYYY-MM-DD format
                              const dateStr = date.toISOString().split('T')[0];
                              field.onChange(dateStr);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewInvoiceForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvoiceMutation.isPending}>
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('billing.updatePayment')}</DialogTitle>
            <DialogDescription>
              {t('billing.updatePaymentDesc')} {selectedInvoice?.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{t('billing.invoiceDetails')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('billing.patient')}:</p>
                      <p>{selectedInvoice.patient ? `${selectedInvoice.patient.firstName} ${selectedInvoice.patient.lastName || ''}` : `Patient #${selectedInvoice.patientId}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('billing.totalAmount')}:</p>
                      <p>${(selectedInvoice.amount / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('billing.dueDate')}:</p>
                      <p>{selectedInvoice.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('billing.currentStatus')}:</p>
                      <Badge
                        className={
                          selectedInvoice.status === "paid"
                            ? "bg-medical-yellow text-black"
                            : selectedInvoice.status === "partial"
                            ? "bg-medical-dark-blue text-white"
                            : selectedInvoice.status === "unpaid"
                            ? "border-2 border-medical-dark-blue text-medical-dark-blue"
                            : "bg-medical-red text-white"
                        }
                      >
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <FormField
                  control={paymentForm.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>{t('billing.amountPaid')}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            const totalAmount = selectedInvoice.amount / 100;
                            field.onChange(totalAmount);
                            paymentForm.setValue("status", "paid");
                          }}
                        >
                          {t('billing.payFull')}
                        </Button>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Auto-update status based on amount paid
                            const val = parseFloat(e.target.value);
                            const totalAmount = selectedInvoice.amount / 100;
                            if (val >= totalAmount) {
                              paymentForm.setValue("status", "paid");
                            } else if (val > 0) {
                              paymentForm.setValue("status", "partial");
                            } else {
                              paymentForm.setValue("status", "unpaid");
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('billing.amountPaidDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={paymentForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('billing.status')}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPaymentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePaymentMutation.isPending}>
                    {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}