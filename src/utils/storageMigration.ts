import { Receipt, LegacyReceipt, FormType, GenericReceiptData } from "@/types/receipt";

const LEGACY_STORAGE_KEY = "arng_hand_receipts";
const NEW_STORAGE_KEY = "arng_form_receipts";
const MIGRATION_VERSION_KEY = "arng_storage_migration_version";

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  version: string;
}

export class StorageMigrationService {
  private static readonly CURRENT_VERSION = "2.0.0";

  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    try {
      const currentVersion = localStorage.getItem(MIGRATION_VERSION_KEY);
      return currentVersion !== this.CURRENT_VERSION;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false; // Assume no migration needed on error
    }
  }

  /**
   * Perform complete storage migration
   */
  static async performMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: [],
      version: this.CURRENT_VERSION
    };

    try {
      console.log('🔄 Starting storage migration...');

      // Step 1: Check if legacy receipts exist
      const legacyReceipts = this.getLegacyReceipts();
      if (legacyReceipts.length === 0) {
        console.log('ℹ️ No legacy receipts found - updating version only');
        this.updateMigrationVersion();
        result.success = true;
        return result;
      }

      console.log(`📦 Found ${legacyReceipts.length} legacy receipts to migrate`);

      // Step 2: Migrate receipts
      const migratedReceipts: Receipt[] = [];

      for (const legacyReceipt of legacyReceipts) {
        try {
          const migratedReceipt = this.migrateLegacyReceipt(legacyReceipt);
          migratedReceipts.push(migratedReceipt);
          result.migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate receipt ${legacyReceipt.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 3: Check for existing new format receipts
      const existingNewReceipts = this.getNewFormatReceipts();
      if (existingNewReceipts.length > 0) {
        console.log(`📦 Found ${existingNewReceipts.length} existing new format receipts`);
        // Combine with migrated receipts
        migratedReceipts.push(...existingNewReceipts);
      }

      // Step 4: Save migrated receipts
      this.saveNewFormatReceipts(migratedReceipts);

      // Step 5: Create backup of legacy data
      this.createLegacyBackup(legacyReceipts);

      // Step 6: Clear legacy storage
      this.clearLegacyStorage();

      // Step 7: Update migration version
      this.updateMigrationVersion();

      console.log(`✅ Migration completed: ${result.migratedCount} receipts migrated, ${result.errors.length} errors`);
      result.success = true;

    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    return result;
  }

  /**
   * Migrate a single legacy receipt to new format
   */
  private static migrateLegacyReceipt(legacyReceipt: LegacyReceipt): Receipt {
    const genericData: GenericReceiptData = {
      itemName: legacyReceipt.itemName,
      borrowerName: legacyReceipt.borrowerName,
      date: legacyReceipt.date,
      serialNumber: legacyReceipt.serialNumber,
      category: legacyReceipt.category,
      condition: legacyReceipt.condition,
      notes: legacyReceipt.notes
    };

    return {
      id: legacyReceipt.id,
      formType: 'Generic',
      photoUrl: legacyReceipt.photoUrl,
      timestamp: legacyReceipt.timestamp,
      notes: legacyReceipt.notes,
      data: genericData
    };
  }

  /**
   * Get legacy receipts from old storage
   */
  private static getLegacyReceipts(): LegacyReceipt[] {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!data) {
        return [];
      }

      const receipts = JSON.parse(data);

      // Validate that this is legacy format
      if (Array.isArray(receipts) && receipts.length > 0) {
        const firstReceipt = receipts[0];
        if ('itemName' in firstReceipt && 'borrowerName' in firstReceipt && !('formType' in firstReceipt)) {
          return receipts as LegacyReceipt[];
        }
      }

      return [];
    } catch (error) {
      console.error("Error loading legacy receipts:", error);
      return [];
    }
  }

  /**
   * Get existing new format receipts
   */
  private static getNewFormatReceipts(): Receipt[] {
    try {
      const data = localStorage.getItem(NEW_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading new format receipts:", error);
      return [];
    }
  }

  /**
   * Save receipts in new format
   */
  private static saveNewFormatReceipts(receipts: Receipt[]): void {
    try {
      localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(receipts));
      console.log(`💾 Saved ${receipts.length} receipts in new format`);
    } catch (error) {
      console.error("Error saving new format receipts:", error);
      throw new Error(`Failed to save new format receipts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create backup of legacy data
   */
  private static createLegacyBackup(legacyReceipts: LegacyReceipt[]): void {
    try {
      const backupKey = `${LEGACY_STORAGE_KEY}_backup_${Date.now()}`;
      const backupData = {
        receipts: legacyReceipts,
        migrationDate: new Date().toISOString(),
        version: "1.0.0"
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`💾 Created legacy backup with key: ${backupKey}`);

      // Also keep only one backup to prevent storage bloat
      this.cleanupOldBackups();
    } catch (error) {
      console.error("Error creating legacy backup:", error);
      // Don't throw error - backup failure shouldn't stop migration
    }
  }

  /**
   * Clean up old backups (keep only the most recent)
   */
  private static cleanupOldBackups(): void {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key => key.startsWith(`${LEGACY_STORAGE_KEY}_backup_`));

      if (backupKeys.length > 1) {
        // Sort by date (they include timestamp)
        backupKeys.sort();

        // Remove all except the most recent
        const toRemove = backupKeys.slice(0, -1);
        toRemove.forEach(key => localStorage.removeItem(key));

        console.log(`🗑️ Removed ${toRemove.length} old backup files`);
      }
    } catch (error) {
      console.error("Error cleaning up backups:", error);
    }
  }

  /**
   * Clear legacy storage
   */
  private static clearLegacyStorage(): void {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('🗑️ Cleared legacy storage');
    } catch (error) {
      console.error("Error clearing legacy storage:", error);
      // Don't throw error - this shouldn't stop migration
    }
  }

  /**
   * Update migration version
   */
  private static updateMigrationVersion(): void {
    try {
      localStorage.setItem(MIGRATION_VERSION_KEY, this.CURRENT_VERSION);
      console.log(`📝 Updated migration version to ${this.CURRENT_VERSION}`);
    } catch (error) {
      console.error("Error updating migration version:", error);
      throw new Error(`Failed to update migration version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get migration status information
   */
  static getMigrationStatus(): {
    needsMigration: boolean;
    currentVersion: string | null;
    latestVersion: string;
    legacyReceiptCount: number;
    newReceiptCount: number;
  } {
    try {
      const currentVersion = localStorage.getItem(MIGRATION_VERSION_KEY);
      const legacyCount = this.getLegacyReceipts().length;
      const newCount = this.getNewFormatReceipts().length;

      return {
        needsMigration: this.needsMigration(),
        currentVersion,
        latestVersion: this.CURRENT_VERSION,
        legacyReceiptCount: legacyCount,
        newReceiptCount: newCount
      };
    } catch (error) {
      console.error("Error getting migration status:", error);
      return {
        needsMigration: false,
        currentVersion: null,
        latestVersion: this.CURRENT_VERSION,
        legacyReceiptCount: 0,
        newReceiptCount: 0
      };
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  static async rollbackMigration(): Promise<boolean> {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key => key.startsWith(`${LEGACY_STORAGE_KEY}_backup_`));

      if (backupKeys.length === 0) {
        console.log('❌ No backup found for rollback');
        return false;
      }

      // Get the most recent backup
      backupKeys.sort();
      const latestBackupKey = backupKeys[backupKeys.length - 1];
      const backupData = JSON.parse(localStorage.getItem(latestBackupKey) || '{}');

      if (!backupData.receipts || !Array.isArray(backupData.receipts)) {
        console.log('❌ Invalid backup data');
        return false;
      }

      // Clear current storage
      localStorage.removeItem(NEW_STORAGE_KEY);
      localStorage.removeItem(MIGRATION_VERSION_KEY);

      // Restore legacy data
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(backupData.receipts));

      console.log(`✅ Rollback completed: Restored ${backupData.receipts.length} legacy receipts`);
      return true;

    } catch (error) {
      console.error("Error during rollback:", error);
      return false;
    }
  }

  /**
   * Force re-migration (useful for testing)
   */
  static async forceRemigration(): Promise<MigrationResult> {
    try {
      // Clear migration version to force re-migration
      localStorage.removeItem(MIGRATION_VERSION_KEY);

      // Try to restore from backup if available
      const rollbackSuccess = await this.rollbackMigration();
      if (rollbackSuccess) {
        console.log('🔄 Restored from backup, starting re-migration...');
      }

      // Perform migration
      return await this.performMigration();
    } catch (error) {
      console.error("Error during forced re-migration:", error);
      return {
        success: false,
        migratedCount: 0,
        errors: [`Force re-migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        version: this.CURRENT_VERSION
      };
    }
  }
}