/**
 * Persistent store for in-flight CCTP transfers.
 *
 * Uses localStorage so transfers survive page refreshes. When the user
 * comes back, the pending-badge in the Navbar picks up where it left off.
 */

import type { CCTPTransfer } from "./cctp";

const STORAGE_KEY = "crate_cctp_transfers";

// ─── Read / Write ─────────────────────────────────────────────────────────────

function loadAll(): CCTPTransfer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CCTPTransfer[]) : [];
  } catch {
    return [];
  }
}

function saveAll(transfers: CCTPTransfer[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get every transfer (pending + completed). */
export function getAllTransfers(): CCTPTransfer[] {
  return loadAll();
}

/** Get only in-flight transfers (not completed, not failed). */
export function getPendingTransfers(): CCTPTransfer[] {
  return loadAll().filter(t => t.status !== "completed" && t.status !== "failed");
}

/** Get a single transfer by ID. */
export function getTransfer(id: string): CCTPTransfer | undefined {
  return loadAll().find(t => t.id === id);
}

/** Add a new transfer to the store. */
export function addTransfer(transfer: CCTPTransfer): void {
  const all = loadAll();
  all.unshift(transfer); // newest first
  saveAll(all);
}

/** Update fields on an existing transfer. */
export function updateTransfer(id: string, patch: Partial<CCTPTransfer>): void {
  const all = loadAll();
  const idx = all.findIndex(t => t.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
  saveAll(all);
}

/** Remove a transfer (e.g. user dismisses a failed one). */
export function removeTransfer(id: string): void {
  saveAll(loadAll().filter(t => t.id !== id));
}

/** Clear all completed/failed transfers. Keep pending ones. */
export function clearFinished(): void {
  saveAll(loadAll().filter(t => t.status !== "completed" && t.status !== "failed"));
}

/** Count of in-flight transfers (for the navbar badge). */
export function getPendingCount(): number {
  return getPendingTransfers().length;
}
