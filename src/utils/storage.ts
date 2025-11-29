import { Receipt, FormType } from "@/types/receipt";
import { StorageMigrationService } from "./storageMigration";

const NEW_STORAGE_KEY = "arng_form_receipts";
const LEGACY_STORAGE_KEY = "arng_hand_receipts";

export const storage = {
  /**
   * Get all receipts, checking for migration first
   */
  getReceipts: (): Receipt[] => {
    try {
      // Check if migration is needed and perform it
      if (StorageMigrationService.needsMigration()) {
        console.log('🔄 Storage migration needed, performing now...');
        StorageMigrationService.performMigration().then((result) => {
          if (result.success) {
            console.log(`✅ Migration completed: ${result.migratedCount} receipts migrated`);
          } else {
            console.error('❌ Migration failed:', result.errors);
          }
        });
      }

      // Try new format first
      let receipts: Receipt[] = [];
      const newData = localStorage.getItem(NEW_STORAGE_KEY);
      if (newData) {
        receipts = JSON.parse(newData);
      }

      // Fall back to legacy format if new format is empty and legacy exists
      if (receipts.length === 0) {
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyData) {
          console.log('📦 Legacy data found, attempting migration...');
          const migrationResult = StorageMigrationService.performMigration();
          migrationResult.then((result) => {
            if (result.success) {
              console.log(`✅ On-demand migration completed: ${result.migratedCount} receipts migrated`);
              // Reload the data
              return storage.getReceipts();
            }
          });
        }
      }

      return receipts || [];
    } catch (error) {
      console.error("Error loading receipts:", error);
      return [];
    }
  },

  /**
   * Save receipts in new format
   */
  saveReceipts: (receipts: Receipt[]): void => {
    try {
      localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(receipts));
      console.log(`💾 Saved ${receipts.length} receipts in new format`);
    } catch (error) {
      console.error("Error saving receipts:", error);
      throw new Error(`Failed to save receipts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Add a single receipt
   */
  addReceipt: (receipt: Receipt): void => {
    const receipts = storage.getReceipts();
    receipts.push(receipt);
    storage.saveReceipts(receipts);
  },

  /**
   * Update an existing receipt
   */
  updateReceipt: (updatedReceipt: Receipt): void => {
    const receipts = storage.getReceipts();
    const index = receipts.findIndex((r) => r.id === updatedReceipt.id);
    if (index !== -1) {
      receipts[index] = updatedReceipt;
      storage.saveReceipts(receipts);
    } else {
      console.warn(`Receipt with id ${updatedReceipt.id} not found for update`);
    }
  },

  /**
   * Delete a single receipt
   */
  deleteReceipt: (id: string): void => {
    const receipts = storage.getReceipts().filter((r) => r.id !== id);
    storage.saveReceipts(receipts);
    console.log(`🗑️ Deleted receipt with id: ${id}`);
  },

  /**
   * Delete multiple receipts
   */
  deleteReceipts: (ids: string[]): void => {
    const receipts = storage.getReceipts().filter((r) => !ids.includes(r.id));
    storage.saveReceipts(receipts);
    console.log(`🗑️ Deleted ${ids.length} receipts`);
  },

  /**
   * Get receipts by form type
   */
  getReceiptsByFormType: (formType: FormType): Receipt[] => {
    const receipts = storage.getReceipts();
    return receipts.filter((r) => r.formType === formType);
  },

  /**
   * Get receipts by date range
   */
  getReceiptsByDateRange: (startDate: Date, endDate: Date): Receipt[] => {
    const receipts = storage.getReceipts();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return receipts.filter((receipt) => {
      const receiptDate = new Date(receipt.timestamp);
      return receiptDate.getTime() >= startTime && receiptDate.getTime() <= endTime;
    });
  },

  /**
   * Search receipts across all form types
   */
  searchReceipts: (query: string): Receipt[] => {
    const receipts = storage.getReceipts();
    const lowercaseQuery = query.toLowerCase();

    return receipts.filter((receipt) => {
      // Search in notes (common field)
      if (receipt.notes?.toLowerCase().includes(lowercaseQuery)) {
        return true;
      }

      // Form-specific search
      switch (receipt.formType) {
        case 'DA2062':
          return this.searchDA2062(receipt.data, lowercaseQuery);
        case 'DA3161':
          return this.searchDA3161(receipt.data, lowercaseQuery);
        case 'OCIE':
          return this.searchOCIE(receipt.data, lowercaseQuery);
        case 'Generic':
          return this.searchGeneric(receipt.data, lowercaseQuery);
        default:
          return false;
      }
    });
  },

  /**
   * Get storage statistics
   */
  getStorageStats: () => {
    const receipts = storage.getReceipts();
    const stats = {
      total: receipts.length,
      byFormType: {} as Record<FormType, number>,
      oldestReceipt: receipts.length > 0 ? new Date(Math.min(...receipts.map(r => r.timestamp))) : null,
      newestReceipt: receipts.length > 0 ? new Date(Math.max(...receipts.map(r => r.timestamp))) : null,
      storageSize: 0,
      migrationStatus: StorageMigrationService.getMigrationStatus()
    };

    // Count by form type
    (Object.keys(stats.byFormType) as FormType[]).forEach(formType => {
      stats.byFormType[formType] = 0;
    });

    receipts.forEach(receipt => {
      stats.byFormType[receipt.formType] = (stats.byFormType[receipt.formType] || 0) + 1;
    });

    // Calculate storage size
    try {
      const data = localStorage.getItem(NEW_STORAGE_KEY);
      stats.storageSize = data ? new Blob([data]).size : 0;
    } catch (error) {
      console.error("Error calculating storage size:", error);
    }

    return stats;
  },

  /**
   * Export receipts for backup
   */
  exportReceipts: (receiptIds?: string[]) => {
    const receipts = storage.getReceipts();
    const exportData = receiptIds
      ? receipts.filter((r) => receiptIds.includes(r.id))
      : receipts;

    return {
      receipts: exportData,
      exportDate: new Date().toISOString(),
      version: "2.0.0",
      count: exportData.length
    };
  },

  /**
   * Import receipts from backup
   */
  importReceipts: (importData: { receipts: Receipt[] }, replace: boolean = false): boolean => {
    try {
      if (!importData.receipts || !Array.isArray(importData.receipts)) {
        throw new Error('Invalid import data format');
      }

      let receipts: Receipt[];
      if (replace) {
        receipts = importData.receipts;
        console.log(`📥 Imported ${receipts.length} receipts (replace mode)`);
      } else {
        receipts = [...storage.getReceipts(), ...importData.receipts];
        console.log(`📥 Imported ${importData.receipts.length} receipts (append mode)`);
      }

      storage.saveReceipts(receipts);
      return true;
    } catch (error) {
      console.error("Error importing receipts:", error);
      return false;
    }
  },

  // Private search helpers
  searchDA2062: (data: any, query: string): boolean => {
    return (
      data.handReceiptNumber?.toLowerCase().includes(query) ||
      data.from?.toLowerCase().includes(query) ||
      data.to?.toLowerCase().includes(query) ||
      data.items?.some((item: any) =>
        item.stockNumber?.toLowerCase().includes(query) ||
        item.itemDescription?.toLowerCase().includes(query)
      )
    );
  },

  searchDA3161: (data: any, query: string): boolean => {
    return (
      data.requestNumber?.toLowerCase().includes(query) ||
      data.voucherNumber?.toLowerCase().includes(query) ||
      data.sendTo?.toLowerCase().includes(query) ||
      data.requestFrom?.toLowerCase().includes(query) ||
      data.dodAAC?.toLowerCase().includes(query) ||
      data.items?.some((item: any) =>
        item.stockNumber?.toLowerCase().includes(query) ||
        item.itemDescription?.toLowerCase().includes(query)
      )
    );
  },

  searchOCIE: (data: any, query: string): boolean => {
    return (
      data.soldierName?.toLowerCase().includes(query) ||
      data.rankGrade?.toLowerCase().includes(query) ||
      data.ssnPid?.toLowerCase().includes(query) ||
      data.unit?.toLowerCase().includes(query) ||
      data.cifCode?.toLowerCase().includes(query) ||
      data.items?.some((item: any) =>
        item.lin?.toLowerCase().includes(query) ||
        item.size?.toLowerCase().includes(query) ||
        item.nomenclature?.toLowerCase().includes(query) ||
        item.nsn?.toLowerCase().includes(query)
      )
    );
  },

  searchGeneric: (data: any, query: string): boolean => {
    return (
      data.itemName?.toLowerCase().includes(query) ||
      data.borrowerName?.toLowerCase().includes(query) ||
      data.date?.includes(query) ||
      data.serialNumber?.toLowerCase().includes(query) ||
      data.category?.toLowerCase().includes(query) ||
      data.condition?.toLowerCase().includes(query) ||
      data.notes?.toLowerCase().includes(query)
    );
  },
};
