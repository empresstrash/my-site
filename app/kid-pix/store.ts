import type { PaperPattern, Symmetry } from "./engine";
import type { Moopie } from "./deluxe";

const DB_NAME = "et-kid-pix";
const STORE = "kv";
const SHEET_KEY = "sheet";
const BOOK_KEY = "book";

export type SavedSheet = {
  ink: Blob;
  paper: string;
  pattern: PaperPattern;
  symmetry: Symmetry;
};

export type SavedPage = {
  ink: Blob;
  moopies: Moopie[];
};

export type SavedBook = {
  pages: SavedPage[];
  index: number;
  paper: string;
  pattern: PaperPattern;
  symmetry: Symmetry;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readKey<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function loadBook(): Promise<SavedBook | null> {
  try {
    const db = await openDb();
    const book = await readKey<SavedBook>(db, BOOK_KEY);
    if (book?.pages?.length) return book;
    const sheet = await readKey<SavedSheet>(db, SHEET_KEY);
    if (!sheet?.ink) return null;
    return {
      pages: [{ ink: sheet.ink, moopies: [] }],
      index: 0,
      paper: sheet.paper,
      pattern: sheet.pattern,
      symmetry: sheet.symmetry,
    };
  } catch {
    return null;
  }
}

export async function saveBook(book: SavedBook): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put(book, BOOK_KEY);
      store.delete(SHEET_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Drawing still works when this browser blocks storage. */
  }
}

export async function forgetSheet(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.delete(SHEET_KEY);
      store.delete(BOOK_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* nothing stored */
  }
}
