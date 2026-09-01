// Streamlined V2 category system (grouped). Historical categories remain in the
// database as archived rows so old transactions and reports stay intact.

export const GROUP_ORDER = [
  "Housing",
  "Utilities",
  "Food",
  "Transportation",
  "Personal",
  "Health",
  "Business",
  "Financial",
  "Income",
  "Other",
] as const;

export type GroupName = (typeof GROUP_ORDER)[number];

export const ACTIVE_CATEGORIES: { name: string; group: GroupName }[] = [
  { name: "Rent", group: "Housing" },
  { name: "Rent Deposit", group: "Housing" },
  { name: "Rent Processing Fee", group: "Housing" },
  { name: "Furniture", group: "Housing" },
  { name: "Cleaning Supplies", group: "Housing" },
  { name: "Home Maintenance", group: "Housing" },

  { name: "AEP Ohio", group: "Utilities" },
  { name: "Columbia Gas", group: "Utilities" },
  { name: "AT&T", group: "Utilities" },
  { name: "Internet", group: "Utilities" },

  { name: "Groceries", group: "Food" },
  { name: "Food Out", group: "Food" },
  { name: "Coffee", group: "Food" },
  { name: "Snacks", group: "Food" },

  { name: "Petrol", group: "Transportation" },
  { name: "GEICO", group: "Transportation" },
  { name: "Car Maintenance", group: "Transportation" },
  { name: "Car Registration", group: "Transportation" },
  { name: "Car Wash", group: "Transportation" },
  { name: "Parking", group: "Transportation" },
  { name: "Uber", group: "Transportation" },
  { name: "Lyft", group: "Transportation" },

  { name: "Cigarettes", group: "Personal" },
  { name: "Cannabis", group: "Personal" },
  { name: "Haircut", group: "Personal" },
  { name: "Personal Care", group: "Personal" },
  { name: "Gym", group: "Personal" },

  { name: "Doctor", group: "Health" },
  { name: "Dental", group: "Health" },
  { name: "Pharmacy", group: "Health" },
  { name: "Vitamins", group: "Health" },

  { name: "JARA AI", group: "Business" },
  { name: "Zaki Project", group: "Business" },
  { name: "Roosters Project", group: "Business" },
  { name: "Software & AI", group: "Business" },
  { name: "Marketing", group: "Business" },
  { name: "Office Supplies", group: "Business" },
  { name: "Professional Services", group: "Business" },
  { name: "Other Client", group: "Business" },

  { name: "Capital One Payment", group: "Financial" },
  { name: "ATM Withdrawal", group: "Financial" },
  { name: "ATM Fee", group: "Financial" },
  { name: "Bank Fees", group: "Financial" },
  { name: "Interest Charges", group: "Financial" },
  { name: "Transfer", group: "Financial" },
  { name: "Taxes", group: "Financial" },
  { name: "Insurance", group: "Financial" },

  { name: "Other Income", group: "Income" },
  { name: "Refund", group: "Income" },
  { name: "Interest Income", group: "Income" },
  { name: "Gift Received", group: "Income" },

  { name: "Miscellaneous", group: "Other" },
];

const FOOD_OUT = ["Breakfast", "Lunch", "Dinner", "Fast Food", "Restaurant", "Delivery", "Takeout", "Other"];
const BUSINESS = [
  "JARA AI",
  "Zaki Project",
  "Roosters Project",
  "Other Client",
  "Software",
  "Marketing",
  "Supplies",
  "Professional Service",
];
const UTILITY = ["Monthly Bill", "Past Due Balance", "Deposit", "Installation", "Equipment", "Late Fee"];

/** Suggested descriptions for a given category (empty = free text only). */
export function descriptionOptions(category: string, group?: string): string[] {
  if (category === "Food Out") return FOOD_OUT;
  if (group === "Business") return BUSINESS;
  if (group === "Utilities") return UTILITY;
  return [];
}

export function groupOf(category: string, dbGroup?: string): string {
  if (dbGroup && dbGroup !== "Other") return dbGroup;
  return ACTIVE_CATEGORIES.find((c) => c.name === category)?.group ?? dbGroup ?? "Other";
}

export function merchantKey(name: string): string {
  return name.trim().toLowerCase();
}
