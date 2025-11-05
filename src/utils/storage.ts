import { Receipt } from "@/types/receipt";

const STORAGE_KEY = "arng_hand_receipts";

export const storage = {
  getReceipts: (): Receipt[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading receipts:", error);
      return [];
    }
  },

  saveReceipts: (receipts: Receipt[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
    } catch (error) {
      console.error("Error saving receipts:", error);
    }
  },

  addReceipt: (receipt: Receipt): void => {
    const receipts = storage.getReceipts();
    receipts.push(receipt);
    storage.saveReceipts(receipts);
  },

  deleteReceipt: (id: string): void => {
    const receipts = storage.getReceipts().filter((r) => r.id !== id);
    storage.saveReceipts(receipts);
  },

  deleteReceipts: (ids: string[]): void => {
    const receipts = storage.getReceipts().filter((r) => !ids.includes(r.id));
    storage.saveReceipts(receipts);
  },
};
