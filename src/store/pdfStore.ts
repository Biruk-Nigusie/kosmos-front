import { create } from "zustand";

const DB_NAME = "kosmos_pdf";
const STORE_NAME = "files";
const FILE_KEY = "current";
const META_KEY = "pdf_meta";

export const saveFileToIDB = (buf: ArrayBuffer, name: string) =>
  new Promise<void>((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ buf, name }, FILE_KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    };
    req.onerror = () => rej(req.error);
  });

export const loadFileFromIDB = (): Promise<{ buf: ArrayBuffer; name: string } | null> =>
  new Promise((res) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, "readonly");
      const get = tx.objectStore(STORE_NAME).get(FILE_KEY);
      get.onsuccess = () => res(get.result ?? null);
      get.onerror = () => res(null);
    };
    req.onerror = () => res(null);
  });

export const clearFileFromIDB = () =>
  new Promise<void>((res) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(FILE_KEY);
      tx.oncomplete = () => res();
    };
    req.onerror = () => res();
  });

interface PdfMeta { page: number; scale: number; }

export const saveMeta = (m: PdfMeta) =>
  localStorage.setItem(META_KEY, JSON.stringify(m));

export const loadMeta = (): PdfMeta =>
  (() => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? "null"); } catch { return null; } })() ?? { page: 1, scale: 1.2 };

export const clearMeta = () => localStorage.removeItem(META_KEY);

interface PdfState {
  fileName: string;
  page: number;
  scale: number;
  numPages: number;
  setFileName: (n: string) => void;
  setPage: (p: number) => void;
  setScale: (s: number) => void;
  setNumPages: (n: number) => void;
  reset: () => void;
}

export const usePdfStore = create<PdfState>((set) => ({
  fileName: "",
  page: 1,
  scale: 1.2,
  numPages: 0,
  setFileName: (fileName) => set({ fileName }),
  setPage: (page) => set({ page }),
  setScale: (scale) => set({ scale }),
  setNumPages: (numPages) => set({ numPages }),
  reset: () => set({ fileName: "", page: 1, scale: 1.2, numPages: 0 }),
}));
