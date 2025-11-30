import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Search, Eye, Trash2, Filter } from "lucide-react";
import { Receipt, FormType, FORM_TYPE_LABELS, RECEIPT_CATEGORIES } from "@/types/receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface ReceiptLedgerProps {
  receipts: Receipt[];
  onBack: () => void;
  onDelete: (ids: string[]) => void;
}

export const ReceiptLedger = ({ receipts, onBack, onDelete }: ReceiptLedgerProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const filteredReceipts = receipts.filter((receipt) => {
    // Search in notes (common field)
    const matchesNotes = receipt.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    // Form-specific search
    let matchesFormData = false;
    switch (receipt.formType) {
      case 'Generic':
        const genericData = receipt.data as any;
        matchesFormData =
          genericData.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          genericData.borrowerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          genericData.date?.includes(searchQuery) ||
          genericData.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          genericData.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          genericData.condition?.toLowerCase().includes(searchQuery.toLowerCase());
        break;
      case 'DA2062':
        const da2062Data = receipt.data as any;
        matchesFormData =
          da2062Data.handReceiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da2062Data.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da2062Data.to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da2062Data.items?.some((item: any) =>
            item.stockNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.itemDescription?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        break;
      case 'DA3161':
        const da3161Data = receipt.data as any;
        matchesFormData =
          da3161Data.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da3161Data.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da3161Data.sendTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da3161Data.requestFrom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da3161Data.dodAAC?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          da3161Data.items?.some((item: any) =>
            item.stockNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.itemDescription?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        break;
      case 'OCIE':
        const ocieData = receipt.data as any;
        matchesFormData =
          ocieData.soldierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ocieData.rankGrade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ocieData.ssnPid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ocieData.unit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ocieData.cifCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ocieData.items?.some((item: any) =>
            item.lin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nomenclature?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.nsn?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        break;
    }

    const matchesSearch = matchesNotes || matchesFormData;
    const matchesCategory = categoryFilter === "all" || receipt.formType === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleExportCSV = (selected: boolean = false) => {
    const exportReceipts = selected
      ? receipts.filter((r) => selectedIds.includes(r.id))
      : receipts;

    if (exportReceipts.length === 0) {
      toast({
        title: "No Data",
        description: "No receipts to export.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced CSV export with form-specific flattening
    const flattenReceipt = (receipt: Receipt): string[] => {
      const baseInfo = [
        receipt.id,
        receipt.formType,
        FORM_TYPE_LABELS[receipt.formType],
        new Date(receipt.timestamp).toLocaleString(),
        `"${receipt.notes || ""}"`,
      ];

      switch (receipt.formType) {
        case 'Generic': {
          const data = receipt.data as any;
          return [
            ...baseInfo,
            `"${data.itemName || ""}"`,
            `"${data.borrowerName || ""}"`,
            data.date || "",
            `"${data.serialNumber || ""}"`,
            `"${data.category || ""}"`,
            `"${data.condition || ""}"`,
            "", // Soldier-specific fields
            "",
            "",
            "",
            "" // OCIE-specific fields
          ];
        }
        case 'DA2062': {
          const data = receipt.data as any;
          return [
            ...baseInfo,
            `"${data.to || ""}"`, // Recipient
            `"${data.handReceiptNumber || ""}"`,
            data.publicationDate || "",
            `"${data.from || ""}"`,
            data.items?.length || 0,
            "", // Serial number (not applicable)
            "", // Category (not applicable)
            "", // Condition (not applicable)
            "", // Soldier-specific fields
            "",
            "",
            "",
            "" // OCIE-specific fields
          ];
        }
        case 'DA3161': {
          const data = receipt.data as any;
          return [
            ...baseInfo,
            `"${data.sendTo || ""}"`,
            `"${data.requestNumber || ""}"`,
            data.dateRequired || "",
            `"${data.requestFrom || ""}"`,
            data.transactionType || "",
            `"${data.dodAAC || ""}"`,
            data.items?.length || 0,
            "", // Serial number (not applicable)
            "", // Category (not applicable)
            "", // Condition (not applicable)
            "", // Soldier-specific fields
            "",
            "",
            "",
            "" // OCIE-specific fields
          ];
        }
        case 'OCIE': {
          const data = receipt.data as any;
          const mainItems = data.items || [];
          // For OCIE with multiple items, we create one row per item
          if (mainItems.length === 0) {
            return [
              ...baseInfo,
              `"${data.soldierName || ""}"`,
              `"${data.rankGrade || ""}"`,
              data.reportDate || "",
              `"${data.unit || ""}"`,
              `"${data.ssnPid || ""}"`,
              `"${data.cifCode || ""}"`,
              "", // Serial number (not applicable)
              "", // Category (OCIE)
              "", // Condition (not applicable)
              "", // Additional OCIE fields below
              "",
              "",
              "",
              ""
            ];
          }
          // Return multiple rows for OCIE items - this will be handled below
          return [];
        }
        default:
          return baseInfo;
      }
    };

    // Special handling for OCIE Records with multiple items
    const csvRows: string[] = [];

    // CSV Headers
    const headers = [
      "ID", "Form Type", "Form Description", "Timestamp", "Notes",
      "Primary Field 1", "Reference 1", "Date 1", "Primary Field 2", "Count",
      "Serial Number", "Category", "Condition",
      "Soldier Name", "Rank/Grade", "Report Date", "Unit", "SSN/PID", "CIF Code",
      "OCIE LIN", "OCIE Size", "OCIE Nomenclature", "OCIE NSN", "OCIE Auth Qty", "OCIE OH Qty", "OCIE Due Out", "OCIE PCS TRANS", "OCIE ETS TRANS"
    ];
    csvRows.push(headers.join(","));

    // Process receipts
    exportReceipts.forEach((receipt) => {
      if (receipt.formType === 'OCIE') {
        const data = receipt.data as any;
        const mainItems = data.items || [];

        if (mainItems.length === 0) {
          // OCIE with no items
          csvRows.push([
            receipt.id,
            "OCIE",
            "OCIE Record - DA Form 3645",
            new Date(receipt.timestamp).toLocaleString(),
            `"${receipt.notes || ""}"`,
            `"${data.soldierName || ""}"`,
            `"${data.rankGrade || ""}"`,
            data.reportDate || "",
            `"${data.unit || ""}"`,
            mainItems.length,
            "", // Serial number (not applicable)
            "OCIE",
            "", // Condition (not applicable)
            `"${data.soldierName || ""}"`,
            `"${data.rankGrade || ""}"`,
            data.reportDate || "",
            `"${data.unit || ""}"`,
            `"${data.ssnPid || ""}"`,
            `"${data.cifCode || ""}"`,
            "", "", "", "", "", "", "", ""
          ].join(","));
        } else {
          // OCIE with multiple items - one row per item
          mainItems.forEach((item: any) => {
            csvRows.push([
              receipt.id,
              "OCIE",
              "OCIE Record - DA Form 3645",
              new Date(receipt.timestamp).toLocaleString(),
              `"${receipt.notes || ""}"`,
              `"${data.soldierName || ""}"`,
              `"${data.ssnPid || ""}"`,
              data.reportDate || "",
              `"${data.unit || ""}"`,
              mainItems.length,
              `"${item.nsn || ""}"`,
              "OCIE",
              "", // Condition (not applicable)
              `"${data.soldierName || ""}"`,
              `"${data.rankGrade || ""}"`,
              data.reportDate || "",
              `"${data.unit || ""}"`,
              `"${data.ssnPid || ""}"`,
              `"${data.cifCode || ""}"`,
              `"${item.lin || ""}"`,
              `"${item.size || ""}"`,
              `"${item.nomenclature || ""}"`,
              `"${item.nsn || ""}"`,
              item.quantities?.authorized || 0,
              item.quantities?.onHand || 0,
              item.quantities?.dueOut || 0,
              item.flags?.pcsTrans ? "YES" : "NO",
              item.flags?.etsTrans ? "YES" : "NO"
            ].join(","));
          });
        }
      } else {
        // Non-OCIE forms
        const flatData = flattenReceipt(receipt);
        if (flatData.length > 0) {
          csvRows.push(flatData.join(","));
        }
      }
    });

    const csvContent = csvRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand-receipts-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${exportReceipts.length} receipt(s) with OCIE item expansion.`,
    });
  };

  const handleDelete = () => {
    onDelete(selectedIds);
    setSelectedIds([]);
    setDeleteDialogOpen(false);
    toast({
      title: "Deleted",
      description: `Removed ${selectedIds.length} receipt(s).`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReceipts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReceipts.map((r) => r.id));
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: 'var(--grid-pattern)' }}>
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-2 hover:bg-muted">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-foreground uppercase tracking-wider">Digital Ledger</h1>
          <p className="text-sm text-muted-foreground font-semibold">
            {receipts.length} RECEIPT{receipts.length !== 1 ? "S" : ""} LOGGED • {selectedIds.length} SELECTED
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search, Filter, and Actions */}
        <Card className="p-4 mb-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item, borrower, serial number, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-input">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms & Categories</SelectItem>
                  <SelectItem value="DA2062">DA Form 2062</SelectItem>
                  <SelectItem value="DA3161">DA Form 3161</SelectItem>
                  <SelectItem value="OCIE">OCIE Record</SelectItem>
                  <SelectItem value="Generic">Generic Receipts</SelectItem>
                  <SelectItem value="Weapons">Weapons</SelectItem>
                  <SelectItem value="Optics">Optics</SelectItem>
                  <SelectItem value="Radios/Comms">Radios/Comms</SelectItem>
                  <SelectItem value="PPE">PPE</SelectItem>
                  <SelectItem value="Tools">Tools</SelectItem>
                  <SelectItem value="Vehicles">Vehicles</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleExportCSV(false)}
                disabled={receipts.length === 0}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
              <Button
                onClick={() => handleExportCSV(true)}
                disabled={selectedIds.length === 0}
                variant="outline"
                className="border-2 font-semibold"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedIds.length})
              </Button>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                disabled={selectedIds.length === 0}
                variant="outline"
                className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          </div>
        </Card>

        {/* Receipts Table */}
        {filteredReceipts.length === 0 ? (
          <Card className="p-12 text-center bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
            <p className="text-muted-foreground font-semibold uppercase tracking-wider">
              {searchQuery || categoryFilter !== "all" ? "No receipts match your filters." : "No receipts logged yet."}
            </p>
          </Card>
        ) : (
          <Card className="bg-card border-2 border-border shadow-[var(--shadow-tactical)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredReceipts.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-bold uppercase text-xs">Form Type</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Description</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Reference #</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Person/Unit</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Date</TableHead>
                    <TableHead className="text-right font-bold uppercase text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => {
                    // Extract display data based on form type
                    let displayInfo = {
                      description: '',
                      reference: '',
                      person: '',
                      date: ''
                    };

                    switch (receipt.formType) {
                      case 'Generic':
                        const genericData = receipt.data as any;
                        displayInfo = {
                          description: genericData.itemName || '',
                          reference: genericData.serialNumber || '',
                          person: genericData.borrowerName || '',
                          date: genericData.date || ''
                        };
                        break;
                      case 'DA2062':
                        const da2062Data = receipt.data as any;
                        displayInfo = {
                          description: da2062Data.to || '',
                          reference: da2062Data.handReceiptNumber || '',
                          person: da2062Data.from || '',
                          date: da2062Data.publicationDate || ''
                        };
                        break;
                      case 'DA3161':
                        const da3161Data = receipt.data as any;
                        displayInfo = {
                          description: `${da3161Data.transactionType || ''} Request`,
                          reference: da3161Data.requestNumber || '',
                          person: da3161Data.sendTo || '',
                          date: da3161Data.dateRequired || ''
                        };
                        break;
                      case 'OCIE':
                        const ocieData = receipt.data as any;
                        displayInfo = {
                          description: `${ocieData.rankGrade || ''} ${ocieData.soldierName || ''}`.trim(),
                          reference: ocieData.ssnPid || '',
                          person: ocieData.unit || '',
                          date: ocieData.reportDate || ''
                        };
                        break;
                    }

                    return (
                    <TableRow key={receipt.id} className="border-b border-border">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(receipt.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds([...selectedIds, receipt.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== receipt.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 border rounded text-xs font-bold uppercase ${
                          receipt.formType === 'DA2062' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          receipt.formType === 'DA3161' ? 'bg-green-100 text-green-800 border-green-200' :
                          receipt.formType === 'OCIE' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {receipt.formType}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{displayInfo.description}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {displayInfo.reference || "—"}
                      </TableCell>
                      <TableCell className="font-medium">{displayInfo.person}</TableCell>
                      <TableCell className="text-sm">{displayInfo.date || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReceipt(receipt)}
                          className="hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-4xl bg-card border-2 border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">
              {selectedReceipt && FORM_TYPE_LABELS[selectedReceipt.formType]} Details
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-6">
              <div className="border-2 border-border rounded overflow-hidden">
                <img
                  src={selectedReceipt.photoUrl}
                  alt="Receipt"
                  className="w-full"
                />
              </div>

              {/* Form-Specific Details */}
              {selectedReceipt.formType === 'OCIE' ? (
                // Enhanced OCIE Record Display
                <div className="space-y-4">
                  {/* Header Information */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 uppercase tracking-wider">Soldier Information</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Soldier Name</p>
                        <p className="font-bold">{(selectedReceipt.data as any).soldierName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Rank/Grade</p>
                        <p className="font-bold">{(selectedReceipt.data as any).rankGrade || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">SSN/PID</p>
                        <p className="font-bold font-mono">{(selectedReceipt.data as any).ssnPid || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Unit</p>
                        <p className="font-bold">{(selectedReceipt.data as any).unit || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">CIF Code</p>
                        <p className="font-bold font-mono">{(selectedReceipt.data as any).cifCode || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Report Date</p>
                        <p className="font-bold">{(selectedReceipt.data as any).reportDate || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Equipment Items */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 uppercase tracking-wider">Equipment Items ({(selectedReceipt.data as any).items?.length || 0})</h3>
                    {(selectedReceipt.data as any).items?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="border border-border px-2 py-1 text-xs font-bold text-left">LIN</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-left">Size</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-left">Nomenclature</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-left">Partial NSN</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-left">NSN</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-center">Auth Qty</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-center">OH Qty</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-center">Due Out</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-center">PCS</th>
                              <th className="border border-border px-2 py-1 text-xs font-bold text-center">ETS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedReceipt.data as any).items.map((item: any, index: number) => (
                              <tr key={index} className="border-b border-border">
                                <td className="border border-border px-2 py-1 text-sm">{item.lin || "—"}</td>
                                <td className="border border-border px-2 py-1 text-sm">{item.size || "—"}</td>
                                <td className="border border-border px-2 py-1 text-sm font-medium">{item.nomenclature || "—"}</td>
                                <td className="border border-border px-2 py-1 text-sm font-mono">{item.partialNsn || "—"}</td>
                                <td className="border border-border px-2 py-1 text-sm font-mono">{item.nsn || "—"}</td>
                                <td className="border border-border px-2 py-1 text-sm text-center">{item.quantities?.authorized || 0}</td>
                                <td className="border border-border px-2 py-1 text-sm text-center font-bold text-primary">{item.quantities?.onHand || 0}</td>
                                <td className="border border-border px-2 py-1 text-sm text-center">{item.quantities?.dueOut || 0}</td>
                                <td className="border border-border px-2 py-1 text-sm text-center">
                                  {item.flags?.pcsTrans ? "✓" : "✗"}
                                </td>
                                <td className="border border-border px-2 py-1 text-sm text-center">
                                  {item.flags?.etsTrans ? "✓" : "✗"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No equipment items found</p>
                    )}
                  </div>

                  {/* OCR Confidence */}
                  {(selectedReceipt.data as any).ocrConfidence && (
                    <div className="border border-border rounded-lg p-4">
                      <h3 className="text-lg font-bold mb-3 uppercase tracking-wider">OCR Analysis</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Overall Confidence</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(selectedReceipt.data as any).ocrConfidence?.overall || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{(selectedReceipt.data as any).ocrConfidence?.overall || 0}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Header Accuracy</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(selectedReceipt.data as any).ocrConfidence?.header || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{(selectedReceipt.data as any).ocrConfidence?.header || 0}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Items Accuracy</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${(selectedReceipt.data as any).ocrConfidence?.items || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{(selectedReceipt.data as any).ocrConfidence?.items || 0}%</span>
                          </div>
                        </div>
                      </div>

                      {/* OCR Warnings */}
                      {(selectedReceipt.data as any).extractionWarnings?.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-destructive">Warnings</h4>
                          <ul className="text-xs space-y-1">
                            {(selectedReceipt.data as any).extractionWarnings.map((warning: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="text-destructive mr-2">⚠️</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Information */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {(selectedReceipt.data as any).totalValue && (
                      <div>
                        <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Total Value</p>
                        <p className="font-bold">${(selectedReceipt.data as any).totalValue.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Statement Date</p>
                      <p className="font-bold">{(selectedReceipt.data as any).statementDate || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Signature</p>
                      <p className="font-bold font-mono text-xs">{(selectedReceipt.data as any).signatureText || "—"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Original Generic and other form types display
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Form Type</p>
                    <p className="font-bold uppercase">{selectedReceipt.formType}</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Primary Information</p>
                    <p className="font-bold">
                      {(() => {
                        switch (selectedReceipt.formType) {
                          case 'Generic':
                            return (selectedReceipt.data as any).itemName || '—';
                          case 'DA2062':
                            return (selectedReceipt.data as any).to || '—';
                          case 'DA3161':
                            return (selectedReceipt.data as any).sendTo || '—';
                          default:
                            return '—';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Reference Number</p>
                    <p className="font-bold font-mono">
                      {(() => {
                        switch (selectedReceipt.formType) {
                          case 'Generic':
                            return (selectedReceipt.data as any).serialNumber || '—';
                          case 'DA2062':
                            return (selectedReceipt.data as any).handReceiptNumber || '—';
                          case 'DA3161':
                            return (selectedReceipt.data as any).requestNumber || '—';
                          default:
                            return '—';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Date</p>
                    <p className="font-bold">
                      {(() => {
                        switch (selectedReceipt.formType) {
                          case 'Generic':
                            return (selectedReceipt.data as any).date || '—';
                          case 'DA2062':
                            return (selectedReceipt.data as any).publicationDate || '—';
                          case 'DA3161':
                            return (selectedReceipt.data as any).dateRequired || '—';
                          default:
                            return '—';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Organization</p>
                    <p className="font-bold">
                      {(() => {
                        switch (selectedReceipt.formType) {
                          case 'Generic':
                            return (selectedReceipt.data as any).borrowerName || '—';
                          case 'DA2062':
                            return (selectedReceipt.data as any).from || '—';
                          case 'DA3161':
                            return (selectedReceipt.data as any).requestFrom || '—';
                          default:
                            return '—';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border rounded">
                    <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Items Count</p>
                    <p className="font-bold">{(selectedReceipt.data as any).items?.length || 0}</p>
                  </div>
                </div>
              )}

              {/* Notes (Common Field) */}
              {selectedReceipt.notes && (
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Notes</p>
                  <p className="text-sm">{selectedReceipt.notes}</p>
                </div>
              )}

              {/* Timestamp */}
              <div className="p-3 bg-muted/30 border border-border rounded">
                <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Logged At</p>
                <p className="font-mono text-sm">{new Date(selectedReceipt.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-2 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase tracking-wider">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} receipt(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
