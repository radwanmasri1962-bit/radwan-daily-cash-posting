// Shared types for the AI Financial Assistant (read-only analysis).
// The language model may only choose an intent from this allowlist; all
// financial arithmetic happens deterministically in server code.

export const INTENT_KINDS = [
  "spending_total",
  "transaction_search",
  "compare_categories",
  "monthly_trend",
  "top_categories",
  "top_merchants",
  "cash_flow",
  "upcoming",
  "balances",
  "budget_vs_actual",
  "emergency_funds",
  "projection",
  "clarify",
  "unsupported",
] as const;

export type IntentKind = (typeof INTENT_KINDS)[number];

export interface AssistantIntent {
  kind: IntentKind;
  /** ISO yyyy-mm-dd */
  start: string;
  /** ISO yyyy-mm-dd */
  end: string;
  rangeLabel: string;
  categories: string[];
  categoryGroups: string[];
  merchants: string[];
  descriptions: string[];
  paymentMethods: string[];
  minAmount: number | null;
  maxAmount: number | null;
  months: number | null;
  horizonDays: number | null;
  clarifyQuestion: string | null;
}

export interface TxRow {
  id: string;
  tx_date: string;
  description: string | null;
  merchant: string | null;
  category: string | null;
  payment_method: string;
  amount: number;
}

export interface TableBlock {
  type: "table";
  title: string;
  rows: TxRow[];
  totalCount: number;
  totalAmount: number;
}

export interface StatsBlock {
  type: "stats";
  title: string;
  items: { label: string; value: string; hint?: string }[];
}

export interface SeriesBlock {
  type: "series";
  title: string;
  chart: boolean;
  points: { label: string; value: number; note?: string }[];
}

export interface TimelineBlock {
  type: "timeline";
  title: string;
  events: {
    date: string;
    label: string;
    account: string;
    amount: number;
    direction: "in" | "out";
    source: string;
  }[];
}

export interface NoteBlock {
  type: "note";
  title: string;
  lines: string[];
}

export type AnswerBlock = TableBlock | StatsBlock | SeriesBlock | TimelineBlock | NoteBlock;

export interface AssistantAnswer {
  status: "ok" | "clarify" | "unsupported";
  question: string;
  headline: string;
  narrative: string;
  rangeLabel: string;
  basedOn: string;
  blocks: AnswerBlock[];
  followUps: string[];
  intent: AssistantIntent;
}

export interface ProjectionResult {
  horizonLabel: string;
  start: string;
  end: string;
  opening: Record<string, number>;
  closing: Record<string, number>;
  inflows: number;
  outflows: number;
  lowestChase: { amount: number; date: string } | null;
  events: TimelineBlock["events"];
  assumptions: string[];
  notIncluded: { label: string; reason: string }[];
  scenarioLabel: string | null;
}

export const ACCOUNT_KEYS = [
  "Chase Checking",
  "Cash Wallet",
  "Ohio SNAP",
  "Capital One Owed",
  "Capital One Available",
] as const;
