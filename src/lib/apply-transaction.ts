import type { PaymentMethod } from "./constants";

export interface Balances {
  chase_balance: number;
  cap1_owed: number;
  cash_balance: number;
  snap_balance: number;
}

export function applyDelta(
  b: Balances,
  method: PaymentMethod,
  amount: number,
  adjustAccount?: string | null,
): Balances {
  const n = { ...b };
  const a = Number(amount);
  switch (method) {
    case "Chase Debit":
      n.chase_balance -= a;
      break;
    case "Capital One":
      n.cap1_owed += a;
      break;
    case "Capital One Payment":
      n.chase_balance -= a;
      n.cap1_owed -= a;
      break;
    case "Cash":
      n.cash_balance -= a;
      break;
    case "ATM Withdrawal":
      n.chase_balance -= a;
      n.cash_balance += a;
      break;
    case "Income to Chase":
      n.chase_balance += a;
      break;
    case "SNAP":
      n.snap_balance -= a;
      break;
    case "Manual Adjustment":
      if (adjustAccount === "Chase Checking") n.chase_balance += a;
      else if (adjustAccount === "Capital One") n.cap1_owed += a;
      else if (adjustAccount === "Cash Wallet") n.cash_balance += a;
      else if (adjustAccount === "Ohio SNAP") n.snap_balance += a;
      break;
  }
  return n;
}
