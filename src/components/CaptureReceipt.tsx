import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Upload, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Receipt, FormType, FORM_TYPE_LABELS, RECEIPT_CATEGORIES } from "@/types/receipt";
import { CameraCapture } from "./CameraCapture";
import { enhancedFormDetectionService } from "@/services/enhancedFormDetection";
import { storage } from "@/utils/storage";

interface CaptureReceiptProps {
  onCancel: () => void;
  onSave: (receipt: Receipt) => void;
}

export const CaptureReceipt = ({ onCancel, onSave }: CaptureReceiptProps) => {
  const { toast } = useToast();

  // Create initial form data based on selected type
  const createInitialFormData = (formType: FormType) => {
    switch (formType) {
      case 'Generic':
        return {
          itemName: "",
          borrowerName: "",
          date: "",
          serialNumber: "",
          category: "Other" as Receipt["category"],
          condition: "",
          notes: "",
        };
      case 'DA2062':
        return {
          handReceiptNumber: "",
          from: "",
          to: "",
          publicationDate: "",
          items: [],
          page: "",
          totalPages: ""
        };
      case 'DA3161':
        return {
          requestNumber: "",
          voucherNumber: "",
          sendTo: "",
          dateRequired: "",
          dodAAC: "",
          priority: "",
          requestFrom: "",
          transactionType: "ISSUE",
          items: [],
          signature: "",
          date: ""
        };
      case 'OCIE':
        return {
          soldierName: "",
          rankGrade: "",
          ssnPid: "",
          unit: "",
          cifCode: "",
          reportDate: "",
          items: [],
          signature: "",
          statementDate: ""
        };
      default:
        return {
          itemName: "",
          borrowerName: "",
          date: "",
          serialNumber: "",
          category: "Other" as Receipt["category"],
          condition: "",
          notes: "",
        };
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFormType, setSelectedFormType] = useState<FormType>('Generic');
  const [detectedFormType, setDetectedFormType] = useState<FormType | null>(null);
  const [userManuallySelected, setUserManuallySelected] = useState(false);
  const [extractedData, setExtractedData] = useState({
    formType: selectedFormType,
    data: createInitialFormData(selectedFormType)
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to update OCIE items
  const updateOCIEItem = (index: number, field: string, value: any) => {
    const currentData = extractedData.data as any;
    const updatedItems = [...(currentData.items || [])];

    if (!updatedItems[index]) {
      updatedItems[index] = {};
    }

    // Handle nested updates
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedItems[index] = {
        ...updatedItems[index],
        [parent]: {
          ...(updatedItems[index]?.[parent] || {}),
          [child]: value
        }
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }

    setExtractedData({
      ...extractedData,
      data: {
        ...currentData,
        items: updatedItems
      }
    });
  };

  // Convert generic OCR data to specific form type structure
  const convertGenericToFormType = (genericData: any, formType: FormType) => {
    switch (formType) {
      case 'DA2062':
        return {
          handReceiptNumber: genericData.serialNumber || '',
          from: '', // Will need to be filled manually
          to: genericData.borrowerName || '',
          publicationDate: genericData.date || '',
          items: genericData.itemName ? [{
            stockNumber: genericData.serialNumber || '',
            itemDescription: genericData.itemName || '',
            model: '',
            securityCode: '',
            unitOfIssue: '',
            quantityAuth: 1,
            quantities: { A: 1, B: 0, C: 0, D: 0, E: 0, F: 0 }
          }] : [],
          page: '',
          totalPages: ''
        };
      case 'DA3161':
        return {
          requestNumber: genericData.serialNumber || '',
          voucherNumber: '',
          sendTo: '', // Will need to be filled manually
          dateRequired: genericData.date || '',
          dodAAC: '',
          priority: '',
          requestFrom: genericData.borrowerName || '',
          transactionType: 'ISSUE',
          items: genericData.itemName ? [{
            itemNumber: 1,
            stockNumber: genericData.serialNumber || '',
            itemDescription: genericData.itemName || '',
            unitOfIssue: '',
            quantity: 1,
            code: '',
            supplyAction: '',
            unitPrice: 0,
            totalCost: 0
          }] : [],
          signature: '',
          date: genericData.date || ''
        };
      case 'OCIE':
        return {
          soldierName: genericData.borrowerName || '',
          rankGrade: '', // Extract from borrowerName if it contains rank
          ssnPid: genericData.serialNumber || '',
          unit: '', // Will need to be filled manually
          cifCode: '',
          reportDate: genericData.date || '',
          items: genericData.itemName ? [{
            issuingCif: '',
            lin: '',
            size: '',
            nomenclature: genericData.itemName || '',
            nsn: genericData.serialNumber || '',
            onHandQty: 1,
            pcsTrans: false,
            etsTrans: false
          }] : [],
          signature: '',
          statementDate: genericData.date || ''
        };
      default:
        return genericData;
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Perform enhanced form detection and extraction
      const ocrResult = await enhancedFormDetectionService.extractDataFromImage(file);
      console.log("Enhanced Form Detection Result:", ocrResult);

      setDetectedFormType(ocrResult.formType);

      // Only override user selection if they haven't manually selected a form type
      // or if the detected form matches what they manually selected
      if (!userManuallySelected || selectedFormType === ocrResult.formType) {
        setSelectedFormType(ocrResult.formType);
        // Set extracted data based on detected form type
        setExtractedData({
          formType: ocrResult.formType,
          data: ocrResult.data
        });

        toast({
          title: `${FORM_TYPE_LABELS[ocrResult.formType]} Detected`,
          description: `Form detected and data extracted using AI. Please review and edit.`,
        });
      } else {
        // User manually selected a different form type - convert generic OCR data to match their selection
        const convertedData = convertGenericToFormType(ocrResult.data, selectedFormType);

        setExtractedData({
          formType: selectedFormType,
          data: convertedData
        });

        toast({
          title: `${FORM_TYPE_LABELS[selectedFormType]} Selected`,
          description: `Using your manually selected form type. OCR data mapped to form fields.`,
        });
      }
    } catch (error) {
      console.error("Enhanced Form Detection Error:", error);
      toast({
        title: "AI OCR Failed",
        description: error instanceof Error ? error.message : "Could not extract data. Please enter manually.",
        variant: "destructive",
      });

      // Reset to empty state on error
      setDetectedFormType(null);
      setExtractedData({
        formType: selectedFormType,
        data: {
          itemName: "",
          borrowerName: "",
          date: "",
          serialNumber: "",
          category: "Other",
          condition: "",
          notes: "",
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCapture = (photoUrl: string) => {
    setPhotoPreview(photoUrl);
    setShowCamera(false);

    // Convert blob URL to File for processing
    fetch(photoUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        processImage(file);
      })
      .catch(error => {
        console.error('Error converting camera capture to file:', error);
        toast({
          title: "Camera Error",
          description: "Failed to process camera capture. Please try again.",
          variant: "destructive",
        });
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleSave = () => {
    // Validate based on form type
    const missingFields: string[] = [];

    if (extractedData.formType === 'Generic') {
      const genericData = extractedData.data as { itemName: string; borrowerName: string; date: string; category: string; };
      if (!genericData.itemName) missingFields.push('Item Name');
      if (!genericData.borrowerName) missingFields.push('Borrower Name');
      if (!genericData.date) missingFields.push('Date');
      if (!genericData.category) missingFields.push('Category');
    } else if (extractedData.formType === 'DA2062') {
      const da2062Data = extractedData.data as any;
      // Only require recipient name - the other fields can be filled later
      if (!da2062Data.to) missingFields.push('Recipient Name (TO:)');
      // Don't require from, handReceiptNumber for auto-extraction since they may not be visible
    } else if (extractedData.formType === 'DA3161') {
      const da3161Data = extractedData.data as any;
      if (!da3161Data.sendTo) missingFields.push('Send To Unit');
      if (!da3161Data.requestFrom) missingFields.push('Request From Unit');
      if (!da3161Data.requestNumber) missingFields.push('Request Number');
    } else if (extractedData.formType === 'OCIE') {
      const ocieData = extractedData.data as any;
      if (!ocieData.soldierName) missingFields.push('Soldier Name');
      if (!ocieData.rankGrade) missingFields.push('Rank/Grade');
      if (!ocieData.ssnPid) missingFields.push('SSN/PID');
      if (!ocieData.unit) missingFields.push('Unit');
    } else {
      // For specific Army forms, we'll rely on form-specific validation
      // For now, just check if photo exists
    }

    if (missingFields.length > 0) {
      toast({
        title: "Missing Data",
        description: `Please fill in: ${missingFields.join(', ')}.`,
        variant: "destructive",
      });
      return;
    }

    if (!photoPreview) {
      toast({
        title: "No Photo",
        description: "Please capture or upload a photo first.",
        variant: "destructive",
      });
      return;
    }

    const receipt: Receipt = {
      id: `receipt-${Date.now()}`,
      formType: extractedData.formType,
      photoUrl: photoPreview,
      timestamp: Date.now(),
      data: extractedData.data,
      notes: extractedData.data.notes
    };

    onSave(receipt);
    toast({
      title: "Receipt Saved",
      description: `${FORM_TYPE_LABELS[extractedData.formType]} successfully logged.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onCancel} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-foreground">Capture Army Form</h1>
          <p className="text-sm text-muted-foreground font-semibold mt-1">
            {detectedFormType ? `🎯 ${FORM_TYPE_LABELS[detectedFormType]} Detected` : '📷 Select form type or let AI detect automatically'}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Form Type Selection Section */}
        <Card className="p-6 mb-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <h2 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">Form Type</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="formType">Select Form Type</Label>
              <Select
                value={selectedFormType}
                onValueChange={(value) => {
                  setSelectedFormType(value as FormType);
                  setUserManuallySelected(true);
                  // Reset extracted data when form type changes
                  setExtractedData({
                    formType: value as FormType,
                    data: createInitialFormData(value as FormType)
                  });
                  // Clear detected form type if user manually selects
                  if (detectedFormType) {
                    setDetectedFormType(null);
                  }
                }}
                disabled={isProcessing}
              >
                <SelectTrigger id="formType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FORM_TYPE_LABELS) as FormType[]).map((formType) => (
                    <SelectItem key={formType} value={formType}>
                      {FORM_TYPE_LABELS[formType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {detectedFormType && (
                <p className="text-xs text-primary mt-2 font-semibold">
                  ✅ Form automatically detected. Change selection if needed.
                </p>
              )}
            </div>
          </div>
        </Card>
        {/* Photo Capture Section */}
        <Card className="p-6 mb-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <h2 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">Step 1: Capture Photo</h2>
          
          {!photoPreview ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <Button
                onClick={() => setShowCamera(true)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Open Camera (AI Enhanced)
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload from Gallery
              </Button>
            </div>
          ) : (
            <div>
              <img
                src={photoPreview}
                alt="Receipt preview"
                className="w-full rounded-lg border border-border mb-4"
              />
              <Button
                onClick={() => {
                  setPhotoPreview(null);
                  setExtractedData({ 
                    itemName: "", 
                    borrowerName: "", 
                    date: "",
                    serialNumber: "",
                    category: "Other" as Receipt["category"],
                    condition: "",
                    notes: "",
                  });
                }}
                variant="outline"
                size="sm"
              >
                Retake Photo
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing with Gemini AI OCR...</span>
            </div>
          )}
        </Card>

        {/* Data Extraction Section */}
        {photoPreview && !isProcessing && (
          <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
            <h2 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">Step 2: Review & Edit Data</h2>

            <div className="space-y-4">
              {selectedFormType === 'Generic' ? (
                // Generic receipt form (original functionality)
                <>
                  <div>
                    <Label htmlFor="itemName">Item Name / Description *</Label>
                    <Input
                      id="itemName"
                      value={(extractedData.data as any).itemName || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, itemName: e.target.value }
                      })}
                      placeholder="e.g., M4 Rifle, SINCGARS Radio"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="borrowerName">Borrower Name *</Label>
                    <Input
                      id="borrowerName"
                      value={(extractedData.data as any).borrowerName || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, borrowerName: e.target.value }
                      })}
                      placeholder="e.g., SGT John Smith"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={(extractedData.data as any).date || ''}
                        onChange={(e) => setExtractedData({
                          ...extractedData,
                          data: { ...extractedData.data, date: e.target.value }
                        })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={(extractedData.data as any).category || 'Other'}
                        onValueChange={(value) => setExtractedData({
                          ...extractedData,
                          data: { ...extractedData.data, category: value }
                        })}
                      >
                        <SelectTrigger id="category" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECEIPT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serialNumber">Serial Number / NSN</Label>
                    <Input
                      id="serialNumber"
                      value={(extractedData.data as any).serialNumber || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, serialNumber: e.target.value }
                      })}
                      placeholder="e.g., W123456789, 1005-01-231-0001"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Input
                      id="condition"
                      value={(extractedData.data as any).condition || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, condition: e.target.value }
                      })}
                      placeholder="e.g., Serviceable, Damaged, Missing parts"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={(extractedData.data as any).notes || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, notes: e.target.value }
                      })}
                      placeholder="Any additional information..."
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                </>
              ) : selectedFormType === 'DA2062' ? (
                // DA 2062 Hand Receipt form fields
                <>
                  <div>
                    <Label htmlFor="handReceiptNumber">Hand Receipt/Annex Number</Label>
                    <Input
                      id="handReceiptNumber"
                      value={(extractedData.data as any).handReceiptNumber || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, handReceiptNumber: e.target.value }
                      })}
                      placeholder="e.g., 1234-1"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="from">From (Issuing Unit)</Label>
                    <Input
                      id="from"
                      value={(extractedData.data as any).from || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, from: e.target.value }
                      })}
                      placeholder="e.g., HHC 337th EN BN"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="to">To (Recipient Name)</Label>
                    <Input
                      id="to"
                      value={(extractedData.data as any).to || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, to: e.target.value }
                      })}
                      placeholder="e.g., SGT John Smith"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="publicationDate">Publication Date</Label>
                    <Input
                      id="publicationDate"
                      type="date"
                      value={(extractedData.data as any).publicationDate || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: { ...extractedData.data, publicationDate: e.target.value }
                      })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="items">Items</Label>
                    <Textarea
                      id="items"
                      value={(extractedData.data as any).items?.map((item: any) =>
                        `${item.itemDescription || item.nomenclature || 'Item'}${item.stockNumber || item.nsn ? ' (' + (item.stockNumber || item.nsn) + ')' : ''}`
                      ).join('\n') || ''}
                      onChange={(e) => setExtractedData({
                        ...extractedData,
                        data: {
                          ...extractedData.data,
                          items: e.target.value.split('\n').map((line: string) => ({
                            stockNumber: '',
                            itemDescription: line,
                            model: '',
                            securityCode: '',
                            unitOfIssue: 'EA',
                            quantityAuth: 1,
                            quantities: { A: 1, B: 0, C: 0, D: 0, E: 0, F: 0 }
                          }))
                        }
                      })}
                      placeholder="e.g., M4 Carbine (1005-01-231-0001), PEQ-15 Laser, ACH Helmet"
                      className="mt-1 min-h-[120px]"
                    />
                  </div>
                </>
              ) : selectedFormType === 'OCIE' ? (
                // Enhanced OCIE Record form
                <div className="space-y-6">
                  {/* Header Section */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">Soldier Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="soldierName">Soldier Name *</Label>
                        <Input
                          id="soldierName"
                          value={(extractedData.data as any).soldierName || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, soldierName: e.target.value }
                          })}
                          placeholder="Last, First Middle"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rankGrade">Rank/Grade *</Label>
                        <Input
                          id="rankGrade"
                          value={(extractedData.data as any).rankGrade || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, rankGrade: e.target.value }
                          })}
                          placeholder="SGT/E-5"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ssnPid">SSN/PID *</Label>
                        <Input
                          id="ssnPid"
                          value={(extractedData.data as any).ssnPid || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, ssnPid: e.target.value }
                          })}
                          placeholder="Last 4 digits or DOD ID"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit *</Label>
                        <Input
                          id="unit"
                          value={(extractedData.data as any).unit || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, unit: e.target.value }
                          })}
                          placeholder="HHC 337th EN BN"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cifCode">CIF Code</Label>
                        <Input
                          id="cifCode"
                          value={(extractedData.data as any).cifCode || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, cifCode: e.target.value }
                          })}
                          placeholder="G3MS00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reportDate">Report Date</Label>
                        <Input
                          id="reportDate"
                          type="date"
                          value={(extractedData.data as any).reportDate || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, reportDate: e.target.value }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">Equipment Items</h3>
                    <div className="space-y-4">
                      {(extractedData.data as any).items?.length > 0 ? (
                        (extractedData.data as any).items.map((item: any, index: number) => (
                          <div key={index} className="border border-border rounded-lg p-3 bg-muted/20">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-semibold">Item {index + 1}</h4>
                              {item.confidence && (
                                <div className="text-xs px-2 py-1 rounded-full bg-primary/20 text-foreground">
                                  {item.confidence.overall}% confidence
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-4 gap-2 mb-2">
                              <div>
                                <Label className="text-xs">LIN</Label>
                                <Input
                                  value={item.lin || ''}
                                  onChange={(e) => updateOCIEItem(index, 'lin', e.target.value)}
                                  className="text-xs h-8"
                                  placeholder="B05008"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Size</Label>
                                <Input
                                  value={item.size || ''}
                                  onChange={(e) => updateOCIEItem(index, 'size', e.target.value)}
                                  className="text-xs h-8"
                                  placeholder="LRG OCP TAN"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Partial NSN</Label>
                                <Input
                                  value={item.partialNsn || ''}
                                  onChange={(e) => updateOCIEItem(index, 'partialNsn', e.target.value)}
                                  className="text-xs h-8"
                                  placeholder="1016"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">NSN</Label>
                                <Input
                                  value={item.nsn || ''}
                                  onChange={(e) => updateOCIEItem(index, 'nsn', e.target.value)}
                                  className="text-xs h-8"
                                  placeholder="8415-01-530-0000"
                                />
                              </div>
                            </div>

                            <div className="mb-2">
                              <Label className="text-xs">Nomenclature</Label>
                              <Input
                                value={item.nomenclature || ''}
                                onChange={(e) => updateOCIEItem(index, 'nomenclature', e.target.value)}
                                className="text-xs"
                                placeholder="BODY ARMOR FRAGMENTATION PROTECTION"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <Label className="text-xs">Auth Qty</Label>
                                <Input
                                  type="number"
                                  value={item.quantities?.authorized || ''}
                                  onChange={(e) => updateOCIEItem(index, 'quantities', {
                                    ...item.quantities,
                                    authorized: parseInt(e.target.value) || 0
                                  })}
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">OH Qty</Label>
                                <Input
                                  type="number"
                                  value={item.quantities?.onHand || ''}
                                  onChange={(e) => updateOCIEItem(index, 'quantities', {
                                    ...item.quantities,
                                    onHand: parseInt(e.target.value) || 0
                                  })}
                                  className="text-xs h-8 font-bold text-primary"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Due Out</Label>
                                <Input
                                  type="number"
                                  value={item.quantities?.dueOut || ''}
                                  onChange={(e) => updateOCIEItem(index, 'quantities', {
                                    ...item.quantities,
                                    dueOut: parseInt(e.target.value) || 0
                                  })}
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <label className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.flags?.pcsTrans || false}
                                  onChange={(e) => updateOCIEItem(index, 'flags', {
                                    ...item.flags,
                                    pcsTrans: e.target.checked
                                  })}
                                  className="mr-1"
                                />
                                PCS TRANS
                              </label>
                              <label className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.flags?.etsTrans || false}
                                  onChange={(e) => updateOCIEItem(index, 'flags', {
                                    ...item.flags,
                                    etsTrans: e.target.checked
                                  })}
                                  className="mr-1"
                                />
                                ETS TRANS
                              </label>
                            </div>

                            {/* Validation Issues */}
                            {item.issues?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.issues.map((issue: string, issueIndex: number) => (
                                  <div key={issueIndex} className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded">
                                    ⚠️ {issue}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No equipment items found. This could indicate an OCR issue.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OCR Warnings */}
                  {(extractedData.data as any).extractionWarnings?.length > 0 && (
                    <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
                      <h3 className="text-sm font-bold mb-2 uppercase tracking-wider text-destructive">OCR Warnings</h3>
                      <ul className="text-xs space-y-1">
                        {(extractedData.data as any).extractionWarnings.map((warning: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-destructive mr-2">⚠️</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Footer Information */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">Verification</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="totalValue">Total Value</Label>
                        <Input
                          id="totalValue"
                          type="number"
                          step="0.01"
                          value={(extractedData.data as any).totalValue || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, totalValue: parseFloat(e.target.value) || 0 }
                          })}
                          placeholder="12437.56"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="statementDate">Statement Date</Label>
                        <Input
                          id="statementDate"
                          type="date"
                          value={(extractedData.data as any).statementDate || ''}
                          onChange={(e) => setExtractedData({
                            ...extractedData,
                            data: { ...extractedData.data, statementDate: e.target.value }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="signature">Signature</Label>
                      <Input
                        id="signature"
                        value={(extractedData.data as any).signatureText || ''}
                        onChange={(e) => setExtractedData({
                          ...extractedData,
                          data: { ...extractedData.data, signatureText: e.target.value }
                        })}
                        placeholder="Signature line text"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Other Army-specific forms (placeholder for Phase 2)
                <div className="text-center py-8">
                  <div className="mb-4 text-lg font-bold text-primary">
                    {FORM_TYPE_LABELS[selectedFormType]}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Form-specific data entry coming in Phase 2.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For now, the AI-extracted data will be saved as-is.
                  </p>
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                    <h3 className="text-sm font-bold mb-2 uppercase">Extracted Data Preview:</h3>
                    <pre className="text-xs text-left bg-background p-2 rounded border overflow-auto max-h-40">
                      {JSON.stringify(extractedData.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Save {FORM_TYPE_LABELS[selectedFormType]}
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};
