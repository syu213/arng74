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

    const headers = ["ID", "Item Name", "Serial Number", "Category", "Borrower", "Date", "Condition", "Notes", "Timestamp"];
    const csvContent = [
      headers.join(","),
      ...exportReceipts.map((r) =>
        [
          r.id,
          `"${r.itemName}"`,
          r.serialNumber || "",
          r.category,
          `"${r.borrowerName}"`,
          r.date,
          r.condition || "",
          `"${r.notes || ""}"`,
          new Date(r.timestamp).toLocaleString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand-receipts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${exportReceipts.length} receipt(s).`,
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
        <DialogContent className="max-w-3xl bg-card border-2 border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">Receipt Details</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Item Name</p>
                  <p className="font-bold">{selectedReceipt.itemName}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Serial Number</p>
                  <p className="font-bold font-mono">{selectedReceipt.serialNumber || "—"}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Category</p>
                  <p className="font-bold">{selectedReceipt.category}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Borrower</p>
                  <p className="font-bold">{selectedReceipt.borrowerName}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Date</p>
                  <p className="font-bold">{selectedReceipt.date}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Condition</p>
                  <p className="font-bold">{selectedReceipt.condition || "—"}</p>
                </div>
              </div>
              {selectedReceipt.notes && (
                <div className="p-3 bg-muted/30 border border-border rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-xs mb-1">Notes</p>
                  <p className="text-sm">{selectedReceipt.notes}</p>
                </div>
              )}
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
