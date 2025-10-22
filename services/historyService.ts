// services/historyService.ts
import type { HistoryEntry } from '../types';

const HISTORY_STORAGE_KEY = 'nano-banana-history';

// The stored data will be an object where keys are image names
// and values are arrays of history entries.
type HistoryStore = {
  [imageName: string]: HistoryEntry[];
};

function readHistoryStore(): HistoryStore {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : {};
  } catch (error) {
    console.error("Failed to read history from localStorage", error);
    return {};
  }
}

function writeHistoryStore(store: HistoryStore): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to write history to localStorage", error);
  }
}

export function getHistoryForImage(imageName: string): HistoryEntry[] {
  const store = readHistoryStore();
  // Return entries sorted by id descending (newest first)
  return (store[imageName] || []).sort((a, b) => b.id - a.id);
}

export function addHistoryEntry(imageName: string, entry: HistoryEntry): void {
  const store = readHistoryStore();
  const imageHistory = store[imageName] || [];
  // Prepend new entry to ensure it's at the top
  const updatedHistory = [entry, ...imageHistory];
  store[imageName] = updatedHistory;
  writeHistoryStore(store);
}

export function deleteHistoryEntry(imageName: string, entryId: number): void {
  const store = readHistoryStore();
  if (!store[imageName]) return;

  const updatedHistory = store[imageName].filter(e => e.id !== entryId);

  if (updatedHistory.length > 0) {
    store[imageName] = updatedHistory;
  } else {
    // If no entries are left, remove the key for this image
    delete store[imageName];
  }
  
  writeHistoryStore(store);
}

export function clearHistoryForImage(imageName: string): void {
  const store = readHistoryStore();
  if (store[imageName]) {
    delete store[imageName];
    writeHistoryStore(store);
  }
}
