export const CATEGORIES = [
  "Rent", "Utilities", "Electricity", "Water", "Gas Utility", "Internet", "Phone",
  "Groceries", "Restaurants", "Coffee", "Gasoline", "Car Payment", "Car Insurance",
  "Car Maintenance", "Parking", "Uber / Taxi", "Health", "Pharmacy", "Doctor",
  "Dental", "Gym", "Clothing", "Laundry", "Household Supplies", "Personal Care",
  "Software & AI", "Subscriptions", "Entertainment", "Streaming", "Travel",
  "Family", "Gifts", "Business", "JARA AI", "Bank Fees", "Credit Card Payment",
  "Cash Withdrawal", "SNAP Food", "Miscellaneous",
] as const;

export const PAYMENT_METHODS = [
  "Chase Debit",
  "Capital One",
  "Cash",
  "SNAP",
  "Income to Chase",
  "ATM Withdrawal",
  "Capital One Payment",
  "Manual Adjustment",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ACCOUNTS = ["Chase Checking", "Capital One", "Cash Wallet", "Ohio SNAP"] as const;
export type AccountName = (typeof ACCOUNTS)[number];

export const DEFAULT_SUBSCRIPTIONS = [
  { name: "Claude AI", amount: 25, pay_method: "Chase", pay_day: 21, status: "Active" },
  { name: "ChatGPT Pro", amount: 21, pay_method: "Chase", pay_day: 3, status: "Active" },
  { name: "Gemini", amount: 20, pay_method: "Chase", pay_day: 9, status: "Active" },
  { name: "Lovable", amount: 25, pay_method: "Chase", pay_day: 11, status: "Active" },
  { name: "Spotify Standard", amount: 14, pay_method: "Chase", pay_day: 26, status: "Active" },
  { name: "Microsoft 365", amount: 10, pay_method: "Chase", pay_day: 2, status: "Active" },
  { name: "Fubo TV", amount: 45, pay_method: "Chase", pay_day: 10, status: "Active" },
  { name: "T-Mobile", amount: 97, pay_method: "Chase", pay_day: 9, status: "Active" },
  { name: "Canva Pro", amount: 13, pay_method: "Capital One", pay_day: 16, status: "Cancel / Watch" },
  { name: "iCloud", amount: 3, pay_method: "Chase", pay_day: 29, status: "Active" },
];

export const DEFAULT_SETTINGS = {
  chase_balance: 0,
  cap1_owed: 0,
  cap1_limit: 0,
  cap1_min_payment: 0,
  cap1_due_day: 1,
  cash_balance: 0,
  snap_balance: 0,
  snap_deposit_amount: 285,
  snap_deposit_day: 12,
};
