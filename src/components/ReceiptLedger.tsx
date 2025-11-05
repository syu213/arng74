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
import { Receipt, RECEIPT_CATEGORIES } from "@/types/receipt";
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
    const matchesSearch =
      receipt.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.date.includes(searchQuery) ||
      receipt.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || receipt.category === categoryFilter;

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
                  <SelectItem value="all">All Categories</SelectItem>
                  {RECEIPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
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
                    <TableHead className="font-bold uppercase text-xs">Item Name</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Serial #</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Category</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Borrower</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Date</TableHead>
                    <TableHead className="font-bold uppercase text-xs">Condition</TableHead>
                    <TableHead className="text-right font-bold uppercase text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
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
                      <TableCell className="font-semibold">{receipt.itemName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {receipt.serialNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded text-xs text-primary font-bold uppercase">
                          {receipt.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{receipt.borrowerName}</TableCell>
                      <TableCell className="text-sm">{receipt.date}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {receipt.condition || "—"}
                      </TableCell>
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
                  ))}
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
