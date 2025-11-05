import { Card } from "@/components/ui/card";
import { Receipt, RECEIPT_CATEGORIES } from "@/types/receipt";
import { FileText, Package, TrendingUp, Calendar } from "lucide-react";

interface DashboardProps {
  receipts: Receipt[];
}

export const Dashboard = ({ receipts }: DashboardProps) => {
  const totalReceipts = receipts.length;
  const categoryCounts = RECEIPT_CATEGORIES.map((cat) => ({
    category: cat,
    count: receipts.filter((r) => r.category === cat).length,
  })).filter((c) => c.count > 0);

  const recentReceipts = receipts
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const thisMonth = receipts.filter(
    (r) => new Date(r.timestamp).getMonth() === new Date().getMonth()
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded border border-primary/30">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Total Receipts</p>
              <p className="text-3xl font-bold text-foreground">{totalReceipts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded border border-accent/30">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">This Month</p>
              <p className="text-3xl font-bold text-foreground">{thisMonth}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/40 rounded border border-border">
              <Package className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Categories</p>
              <p className="text-3xl font-bold text-foreground">{categoryCounts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Category Breakdown
        </h3>
        {categoryCounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet</p>
        ) : (
          <div className="space-y-3">
            {categoryCounts.map(({ category, count }) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{category}</span>
                  <span className="text-muted-foreground">{count} items</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(count / totalReceipts) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card className="p-6 bg-card border-2 border-border shadow-[var(--shadow-tactical)]">
        <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
        {recentReceipts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded border border-border"
              >
                <div className="w-12 h-12 rounded overflow-hidden border border-border bg-background">
                  <img
                    src={receipt.photoUrl}
                    alt={receipt.itemName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{receipt.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {receipt.borrowerName} • {new Date(receipt.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="px-2 py-1 bg-primary/20 border border-primary/30 rounded text-xs text-primary font-semibold">
                  {receipt.category}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
