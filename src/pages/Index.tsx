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
      <div className="min-h-screen bg-background">
        <header className="armor-panel border-b-2 border-border">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => setActiveView("home")} className="mb-2 hover:bg-muted">
              ← Back
            </Button>
            <h1 className="font-military-heading text-xl text-primary">COMMAND DASHBOARD</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Dashboard receipts={receipts} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="armor-panel border-b-2 border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="military-patch p-3 border-2 border-primary/40">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-military-stencil text-3xl text-primary">ARNG HAND RECEIPT TRACKER</h1>
              <p className="font-tactical text-sm text-accent">EQUIPMENT MANAGEMENT SYSTEM</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="military-patch inline-block px-6 py-3 text-accent text-sm font-bold uppercase tracking-wider mb-8 border-2">
              ★ TACTICAL OPERATIONS READY ★
            </div>
            <h2 className="font-military-display text-6xl text-primary mb-8">
              END THE PAPER CHASE
            </h2>
            <p className="font-tactical text-xl text-foreground mb-4">
              Transform hours of causative research into seconds of search
            </p>
            <p className="font-tactical text-base text-muted-foreground">
              Photo-based hand receipt logging with OCR extraction and digital audit trails
            </p>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="military-card p-6 text-center">
              <p className="font-military-heading text-3xl text-primary">{receipts.length}</p>
              <p className="font-tactical text-sm text-muted-foreground">TOTAL RECEIPTS</p>
            </div>
            <div className="military-card p-6 text-center">
              <p className="font-military-heading text-3xl text-accent">
                {receipts.filter(r => new Date(r.timestamp).getMonth() === new Date().getMonth()).length}
              </p>
              <p className="font-tactical text-sm text-muted-foreground">THIS MONTH</p>
            </div>
            <div className="military-card p-6 text-center">
              <p className="font-military-heading text-3xl text-foreground">
                {new Set(receipts.map(r => r.category)).size}
              </p>
              <p className="font-tactical text-sm text-muted-foreground">CATEGORIES</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <Button
              size="lg"
              className="tactical-button h-auto py-6"
              onClick={() => setActiveView("capture")}
            >
              <Camera className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-military-stencil text-base">NEW RECEIPT</div>
                <div className="font-tactical text-sm opacity-80">PHOTO CAPTURE</div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="military-card border-2 h-auto py-6 hover:bg-muted/50 font-tactical"
              onClick={() => setActiveView("ledger")}
              disabled={receipts.length === 0}
            >
              <FileSpreadsheet className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-military-stencil text-base">LEDGER</div>
                <div className="font-tactical text-sm opacity-80">{receipts.length} ENTRIES</div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="military-card border-2 h-auto py-6 hover:bg-muted/50 font-tactical"
              onClick={() => setActiveView("dashboard")}
              disabled={receipts.length === 0}
            >
              <LayoutDashboard className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-military-stencil text-base">DASHBOARD</div>
                <div className="font-tactical text-sm opacity-80">ANALYTICS</div>
              </div>
            </Button>

            <Button
              size="lg"
              className="military-patch h-auto py-6 font-tactical"
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
              <FileSpreadsheet className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-military-stencil text-base">EXPORT CSV</div>
                <div className="font-tactical text-sm opacity-80">QUICK DOWNLOAD</div>
              </div>
            </Button>
          </div>

          {/* Info Banner */}
          <div className="armor-panel p-8">
            <h4 className="font-military-stencil text-primary mb-6 text-base">★ MISSION BRIEF ★</h4>
            <ol className="space-y-4 font-tactical text-base text-muted-foreground">
              <li className="flex gap-4">
                <span className="font-military-heading text-primary text-lg">01.</span>
                <span><strong className="text-foreground">CAPTURE:</strong> Take a photo of your completed hand receipt (DA 2062)</span>
              </li>
              <li className="flex gap-4">
                <span className="font-military-heading text-primary text-lg">02.</span>
                <span><strong className="text-foreground">EXTRACT:</strong> OCR scans for item name, borrower, and date automatically</span>
              </li>
              <li className="flex gap-4">
                <span className="font-military-heading text-primary text-lg">03.</span>
                <span><strong className="text-foreground">VERIFY:</strong> Review and edit extracted data, add serial numbers and notes</span>
              </li>
              <li className="flex gap-4">
                <span className="font-military-heading text-primary text-lg">04.</span>
                <span><strong className="text-foreground">LOG:</strong> Creates an immutable digital record with photo backup</span>
              </li>
              <li className="flex gap-4">
                <span className="font-military-heading text-primary text-lg">05.</span>
                <span><strong className="text-foreground">DEPLOY:</strong> Search, filter, and export CSV for PBOs and investigations</span>
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="armor-panel border-t-2 border-border mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-military-stencil text-primary">ARNG HAND RECEIPT TRACKER • OPERATION CHECKPOINT • EQUIPMENT MANAGEMENT SYSTEM</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
