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
import { Receipt, RECEIPT_CATEGORIES } from "@/types/receipt";
import Tesseract from "tesseract.js";

interface CaptureReceiptProps {
  onCancel: () => void;
  onSave: (receipt: Receipt) => void;
}

export const CaptureReceipt = ({ onCancel, onSave }: CaptureReceiptProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState({
    itemName: "",
    borrowerName: "",
    date: "",
    serialNumber: "",
    category: "Other" as Receipt["category"],
    condition: "",
    notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setIsProcessing(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Perform OCR
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text;
      console.log("OCR Result:", text);

      // Simple extraction logic (can be improved with better patterns)
      const lines = text.split("\n").filter((line) => line.trim());
      
      // Try to extract item name (often appears near "ITEM" or "DESCRIPTION")
      const itemMatch = lines.find(line => 
        line.toLowerCase().includes("item") || 
        line.toLowerCase().includes("description") ||
        line.toLowerCase().includes("property")
      );
      
      // Try to extract name (often appears near "NAME" or after "TO:")
      const nameMatch = lines.find(line => 
        line.toLowerCase().includes("name") || 
        line.toLowerCase().includes("to:") ||
        line.toLowerCase().includes("borrower")
      );
      
      // Try to extract date (look for date patterns)
      const dateMatch = lines.find(line => 
        /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(line) ||
        line.toLowerCase().includes("date")
      );

      setExtractedData({
        itemName: itemMatch ? itemMatch.replace(/item|description|property/gi, "").trim() : "",
        borrowerName: nameMatch ? nameMatch.replace(/name|to:|borrower/gi, "").trim() : "",
        date: dateMatch ? dateMatch.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/)?.[0] || "" : "",
        serialNumber: "",
        category: "Other" as Receipt["category"],
        condition: "",
        notes: "",
      });

      toast({
        title: "OCR Complete",
        description: "Please review and edit the extracted data.",
      });
    } catch (error) {
      console.error("OCR Error:", error);
      toast({
        title: "OCR Failed",
        description: "Could not extract data. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleSave = () => {
    if (!extractedData.itemName || !extractedData.borrowerName || !extractedData.date || !extractedData.category) {
      toast({
        title: "Missing Data",
        description: "Please fill in all required fields (item, borrower, date, category).",
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
      itemName: extractedData.itemName,
      borrowerName: extractedData.borrowerName,
      date: extractedData.date,
      photoUrl: photoPreview,
      timestamp: Date.now(),
      serialNumber: extractedData.serialNumber || undefined,
      category: extractedData.category,
      condition: extractedData.condition || undefined,
      notes: extractedData.notes || undefined,
    };

    onSave(receipt);
    toast({
      title: "Receipt Saved",
      description: "Hand receipt successfully logged.",
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
          <h1 className="text-xl font-bold text-foreground">Capture Hand Receipt</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Photo Capture Section */}
        <Card className="p-6 mb-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <h2 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">Step 1: Capture Photo</h2>
          
          {!photoPreview ? (
            <div className="space-y-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
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
              <span>Processing with OCR...</span>
            </div>
          )}
        </Card>

        {/* Data Extraction Section */}
        {photoPreview && !isProcessing && (
          <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
            <h2 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">Step 2: Review & Edit Data</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemName">Item Name / Description *</Label>
                <Input
                  id="itemName"
                  value={extractedData.itemName}
                  onChange={(e) => setExtractedData({ ...extractedData, itemName: e.target.value })}
                  placeholder="e.g., M4 Rifle, SINCGARS Radio"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="borrowerName">Borrower Name *</Label>
                <Input
                  id="borrowerName"
                  value={extractedData.borrowerName}
                  onChange={(e) => setExtractedData({ ...extractedData, borrowerName: e.target.value })}
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
                    value={extractedData.date}
                    onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={extractedData.category}
                    onValueChange={(value) => setExtractedData({ ...extractedData, category: value as Receipt["category"] })}
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
                  value={extractedData.serialNumber}
                  onChange={(e) => setExtractedData({ ...extractedData, serialNumber: e.target.value })}
                  placeholder="e.g., W123456789, 1005-01-231-0001"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  value={extractedData.condition}
                  onChange={(e) => setExtractedData({ ...extractedData, condition: e.target.value })}
                  placeholder="e.g., Serviceable, Damaged, Missing parts"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={extractedData.notes}
                  onChange={(e) => setExtractedData({ ...extractedData, notes: e.target.value })}
                  placeholder="Any additional information..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Save Receipt
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};
