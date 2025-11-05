import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Camera, FileSpreadsheet, LayoutDashboard } from "lucide-react";
import { CaptureReceipt } from "@/components/CaptureReceipt";
import { ReceiptLedger } from "@/components/ReceiptLedger";
import { Dashboard } from "@/components/Dashboard";
import { Receipt } from "@/types/receipt";
import { storage } from "@/utils/storage";

const Index = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeView, setActiveView] = useState<"home" | "capture" | "ledger" | "dashboard">("home");

  useEffect(() => {
    setReceipts(storage.getReceipts());
  }, []);

  const handleReceiptSaved = (receipt: Receipt) => {
    storage.addReceipt(receipt);
    setReceipts(storage.getReceipts());
    setActiveView("ledger");
  };

  const handleReceiptsDeleted = (ids: string[]) => {
    storage.deleteReceipts(ids);
    setReceipts(storage.getReceipts());
  };

  if (activeView === "capture") {
    return <CaptureReceipt onCancel={() => setActiveView("home")} onSave={handleReceiptSaved} />;
  }

  if (activeView === "ledger") {
    return (
      <ReceiptLedger
        receipts={receipts}
        onBack={() => setActiveView("home")}
        onDelete={handleReceiptsDeleted}
      />
    );
  }

  if (activeView === "dashboard") {
    return (
      <div className="min-h-screen bg-background" style={{ backgroundImage: 'var(--grid-pattern)' }}>
        <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => setActiveView("home")} className="mb-2 hover:bg-muted">
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-foreground uppercase tracking-wider">Command Dashboard</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Dashboard receipts={receipts} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: 'var(--grid-pattern)' }}>
      {/* Header */}
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 border-2 border-primary/40 rounded">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground uppercase tracking-wider">ARNG Hand Receipt Tracker</h1>
              <p className="text-xs text-muted-foreground font-semibold">DIGITAL CAUSATIVE RESEARCH TOOL</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1 bg-accent/20 border border-accent/40 rounded-full text-accent text-xs font-bold uppercase tracking-wider mb-4">
              Tactical Operations Ready
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4 uppercase tracking-tight">
              End the Paper Chase
            </h2>
            <p className="text-lg text-muted-foreground mb-2 font-medium">
              Transform hours of causative research into seconds of search.
            </p>
            <p className="text-sm text-muted-foreground">
              Photo-based hand receipt logging with OCR extraction and digital audit trails.
            </p>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-card/60 border-2 border-border rounded p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-primary">{receipts.length}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Total Receipts</p>
            </div>
            <div className="bg-card/60 border-2 border-border rounded p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-accent">
                {receipts.filter(r => new Date(r.timestamp).getMonth() === new Date().getMonth()).length}
              </p>
              <p className="text-xs text-muted-foreground font-semibold uppercase">This Month</p>
            </div>
            <div className="bg-card/60 border-2 border-border rounded p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">
                {new Set(receipts.map(r => r.category)).size}
              </p>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Categories</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider border-2 border-primary/40 shadow-[var(--shadow-tactical)] h-auto py-6"
              onClick={() => setActiveView("capture")}
            >
              <Camera className="mr-2 h-6 w-6" />
              <div className="text-left">
                <div>New Receipt</div>
                <div className="text-xs opacity-80 font-normal normal-case">Photo capture</div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-2 font-bold uppercase tracking-wider shadow-[var(--shadow-tactical)] h-auto py-6 hover:bg-muted/50"
              onClick={() => setActiveView("ledger")}
              disabled={receipts.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-6 w-6" />
              <div className="text-left">
                <div>Ledger</div>
                <div className="text-xs opacity-80 font-normal normal-case">{receipts.length} entries</div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-2 font-bold uppercase tracking-wider shadow-[var(--shadow-tactical)] h-auto py-6 hover:bg-muted/50"
              onClick={() => setActiveView("dashboard")}
              disabled={receipts.length === 0}
            >
              <LayoutDashboard className="mr-2 h-6 w-6" />
              <div className="text-left">
                <div>Dashboard</div>
                <div className="text-xs opacity-80 font-normal normal-case">Analytics</div>
              </div>
            </Button>

            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase tracking-wider border-2 border-accent/40 shadow-[var(--shadow-tactical)] h-auto py-6"
              onClick={() => {
                if (receipts.length === 0) return;
                const csvContent = [
                  ["ID", "Item Name", "Serial Number", "Category", "Borrower", "Date", "Condition", "Notes", "Logged At"].join(","),
                  ...receipts.map((r) =>
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
              }}
              disabled={receipts.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-6 w-6" />
              <div className="text-left">
                <div>Export CSV</div>
                <div className="text-xs opacity-80 font-normal normal-case">Quick download</div>
              </div>
            </Button>
          </div>

          {/* Info Banner */}
          <div className="bg-card/60 border-2 border-border rounded p-6 backdrop-blur-sm shadow-[var(--shadow-tactical)]">
            <h4 className="font-bold text-foreground mb-3 uppercase tracking-wider text-sm">Mission Brief</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">01.</span>
                <span><strong className="text-foreground">Capture:</strong> Take a photo of your completed hand receipt (DA 2062)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">02.</span>
                <span><strong className="text-foreground">Extract:</strong> OCR scans for item name, borrower, and date automatically</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">03.</span>
                <span><strong className="text-foreground">Verify:</strong> Review and edit extracted data, add serial numbers and notes</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">04.</span>
                <span><strong className="text-foreground">Log:</strong> Creates an immutable digital record with photo backup</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">05.</span>
                <span><strong className="text-foreground">Deploy:</strong> Search, filter, and export CSV for PBOs and investigations</span>
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border mt-16 py-6 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground font-semibold">
          <p className="uppercase tracking-wider">ARNG Hand Receipt Tracker MVP • No-Cost Standalone Solution • No GCSS-Army Integration Required</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
