export type TxKind = "income" | "expense" | "transfer";

const TRANSFERS = new Set([
  "ATM Withdrawal",
  "Capital One Payment",
  "Manual Adjustment",
]);

export function amountKind(paymentMethod: string): TxKind {
  if (paymentMethod === "Income to Chase") return "income";
  if (TRANSFERS.has(paymentMethod)) return "transfer";
  return "expense";
}
