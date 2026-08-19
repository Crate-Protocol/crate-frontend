export type NotificationType = "sale" | "withdrawal";

export interface SaleNotification {
  id: string;
  type: NotificationType;
  sampleId?: number;
  sampleTitle?: string;
  amountXlm: string;
  counterpartyAddress?: string;
  timestamp: number;
  read: boolean;
  ledger?: number;
  txHash?: string;
}
