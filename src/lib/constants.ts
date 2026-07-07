// Default seed list used only when creating a new account.
// After sign-up, categories are user-owned rows in the `categories` table
// (add / rename / archive / favorite via Settings).
export const DEFAULT_CATEGORIES = [
  "Alcohol", "Amazon", "Bank Fees", "Beverages", "Business", "Business Income",
  "Cannabis", "Car Insurance", "Car Maintenance", "Car Payment", "Car Registration", "Car Wash",
  "Cash Deposit", "Cash Withdrawal", "Charity", "Child Expenses", "Cigarettes", "Cleaning Supplies",
  "Clothing", "Coffee", "Credit Card Payment", "Debt Payment", "Dental", "Dining Out", "Doctor",
  "Electricity", "Electronics", "Entertainment", "Family", "Fast Food", "Freelance", "Furniture",
  "Gas Utility", "Gasoline", "General Shopping", "Gift Received", "Gifts", "Gifts Given", "Groceries",
  "Gym", "Health", "Household Items", "Household Supplies", "Interest Charges", "Interest Income",
  "Internet", "JARA AI", "Laundry", "Loan Payment", "Marketing", "Miscellaneous", "Office Supplies",
  "Other Income", "Parking", "Parking Permit", "Personal Care", "Pharmacy", "Prescriptions",
  "Professional Services", "Refund", "Rent", "Rent Deposit", "Rent Processing Fee", "Restaurants",
  "Ride Share (Uber/Lyft)", "Salary", "SNAP Food", "Snacks", "Software & AI", "Streaming",
  "Subscriptions", "T-Mobile", "Tolls", "Transfer Between Accounts", "Travel",
  "Uber / Taxi", "Utilities", "Vape / Tobacco", "Vitamins & Supplements", "Water",
] as const;

// Legacy static export kept for any remaining imports. Prefer categoriesQO.
export const CATEGORIES = DEFAULT_CATEGORIES;

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
