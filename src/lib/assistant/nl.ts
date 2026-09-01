// Deterministic natural-language helpers for the AI Financial Assistant.
// Pure functions only — no data access, no side effects. Used both to make
// matching robust (synonyms, plurals) and as a full offline fallback parser
// when the AI gateway is unavailable.

import type { AssistantIntent, IntentKind } from "./types";

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

export const norm = (s: unknown) => String(s ?? "").toLowerCase().trim();

/** Naive singularizer good enough for category words. */
export function singular(s: string): string {
  if (s.endsWith("ies") && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith("ses") || s.endsWith("xes") || s.endsWith("ches") || s.endsWith("shes"))
    return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) return s.slice(0, -1);
  return s;
}

/* ------------------------------------------------------------------ */
/* Concept map — synonyms expanded case-insensitively for matching      */
/* ------------------------------------------------------------------ */

export const CONCEPTS: Record<string, string[]> = {
  cigarettes: ["cigarette", "tobacco", "vape", "vaping", "nicotine", "smokes", "smoking", "cigs"],
  cannabis: ["weed", "marijuana", "dispensary"],
  groceries: ["grocery", "supermarket", "kroger", "costco", "walmart", "aldi", "snap food", "food shopping"],
  "food out": [
    "eating out", "eat out", "dining", "dining out", "dine out", "restaurant", "restaurants",
    "fast food", "takeout", "take out", "delivery", "breakfast", "lunch", "dinner",
  ],
  coffee: ["cafe", "café", "starbucks", "latte", "espresso"],
  petrol: ["gasoline", "fuel", "gas station", "shell", "bp", "speedway"],
  rideshare: ["uber", "lyft", "ride share"],
  subscriptions: ["subscription", "streaming"],
  utilities: ["utility", "aep", "aep ohio", "columbia gas", "electric", "electricity"],
  pharmacy: ["cvs", "walgreens", "medication", "medicine", "prescription"],
  haircut: ["barber", "salon"],
};

/** Expand user/model terms into their synonym family (plus singular forms). */
export function expandTerms(terms: string[]): string[] {
  const out = new Set<string>();
  for (const raw of terms) {
    const t = norm(raw);
    if (!t) continue;
    out.add(t);
    out.add(singular(t));
    for (const [key, syns] of Object.entries(CONCEPTS)) {
      const family = [key, ...syns];
      if (family.some((f) => f === t || singular(f) === singular(t))) {
        for (const f of family) {
          out.add(f);
          out.add(singular(f));
        }
      }
    }
  }
  return [...out].filter((t) => t.length > 1);
}

/** Case-insensitive, plural-tolerant substring match against expanded terms. */
export function textMatches(value: unknown, expanded: string[]): boolean {
  if (!expanded.length) return true;
  const v = norm(value);
  if (!v) return false;
  const vs = singular(v);
  return expanded.some(
    (q) => v.includes(q) || vs.includes(q) || (v.length > 3 && q.includes(vs)),
  );
}

/* ------------------------------------------------------------------ */
/* Offline fallback parser (used when the AI gateway is unavailable)    */
/* ------------------------------------------------------------------ */

const WORD_NUMS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function numOf(word: string): number | null {
  const n = Number(word);
  if (Number.isFinite(n)) return n;
  return WORD_NUMS[word] ?? null;
}

/** Well-known merchant hints for the offline parser. */
const MERCHANT_HINTS = [
  "amazon", "walmart", "kroger", "costco", "starbucks", "target", "aldi",
  "zaki", "roosters", "jara", "uber", "lyft", "shell", "speedway", "geico",
  "t-mobile", "at&t", "att",
];

export function parseIntentFallback(
  question: string,
  today: Date,
  knownCategories: string[],
): AssistantIntent {
  const q = norm(question).replace(/\s+/g, " ");
  const y = today.getFullYear();
  const m = today.getMonth();

  /* amount */
  const amtMatch =
    q.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/) ??
    q.match(/(?:spend|spent|pay|paying|afford|buy|purchase|cost of|costs?)\s+\$?\s*([\d,]+(?:\.\d{1,2})?)\b/);
  const amount = amtMatch ? Number(amtMatch[1]!.replace(/,/g, "")) : null;

  /* period */
  let start = new Date(y, m, 1);
  let end = new Date(today);
  let rangeLabel = "This month";
  let months: number | null = null;
  let horizonDays: number | null = null;

  const lastN = q.match(/(?:last|past|previous)\s+(\w+)\s+(day|week|month|year)s?/);
  const nextN = q.match(/(?:next|coming|in)\s+(\w+)\s+(day|week)s?/);
  const beforeDate = q.match(
    /(?:before|by|until|through)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/,
  );
  const soloMonth = q.match(
    /\b(?:in|for|during)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
  );

  if (/\btoday\b/.test(q)) {
    start = new Date(today);
    rangeLabel = "Today";
  } else if (/\byesterday\b/.test(q)) {
    start = new Date(y, m, today.getDate() - 1);
    end = new Date(start);
    rangeLabel = "Yesterday";
  } else if (/\bthis week\b/.test(q)) {
    start = new Date(y, m, today.getDate() - 6);
    rangeLabel = "Last 7 days";
  } else if (/\blast month\b/.test(q)) {
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0);
    rangeLabel = "Last month";
  } else if (/\bthis year\b|\byear to date\b|\bytd\b/.test(q)) {
    start = new Date(y, 0, 1);
    rangeLabel = `${y} year to date`;
  } else if (/\blast year\b/.test(q)) {
    start = new Date(y - 1, 0, 1);
    end = new Date(y - 1, 11, 31);
    rangeLabel = `${y - 1}`;
  } else if (lastN) {
    const n = numOf(lastN[1]!) ?? 1;
    const unit = lastN[2]!;
    if (unit === "day") start = new Date(y, m, today.getDate() - n + 1);
    else if (unit === "week") start = new Date(y, m, today.getDate() - n * 7 + 1);
    else if (unit === "month") {
      start = new Date(y, m - (n - 1), 1);
      months = Math.min(Math.max(n, 1), 24);
    } else start = new Date(y - n, m, today.getDate());
    rangeLabel = `Last ${n} ${unit}${n === 1 ? "" : "s"}`;
  } else if (soloMonth && !beforeDate) {
    const mi = MONTH_NAMES.indexOf(soloMonth[1]!);
    const yr = mi > m ? y - 1 : y; // a bare past month name refers to the most recent one
    start = new Date(yr, mi, 1);
    end = new Date(yr, mi + 1, 0);
    rangeLabel = `${soloMonth[1]![0]!.toUpperCase()}${soloMonth[1]!.slice(1)} ${yr}`;
  }

  if (nextN) {
    const n = numOf(nextN[1]!) ?? 7;
    horizonDays = Math.min(Math.max(nextN[2] === "week" ? n * 7 : n, 1), 365);
    end = new Date(y, m, today.getDate() + horizonDays);
    start = new Date(today);
    rangeLabel = `Next ${horizonDays} days`;
  } else if (/\bnext week\b/.test(q)) {
    horizonDays = 7;
    end = new Date(y, m, today.getDate() + 7);
    start = new Date(today);
    rangeLabel = "Next 7 days";
  } else if (/\bnext month\b/.test(q)) {
    const eom = new Date(y, m + 2, 0);
    horizonDays = Math.max(1, Math.round((eom.getTime() - today.getTime()) / 86400000));
    end = eom;
    start = new Date(today);
    rangeLabel = "Through next month";
  } else if (beforeDate) {
    const mi = MONTH_NAMES.indexOf(beforeDate[1]!);
    let target = new Date(y, mi, Number(beforeDate[2]));
    if (target < today) target = new Date(y + 1, mi, Number(beforeDate[2]));
    horizonDays = Math.min(Math.max(Math.round((target.getTime() - today.getTime()) / 86400000), 1), 365);
    end = target;
    start = new Date(today);
    rangeLabel = `Before ${isoOf(target)}`;
  } else if (/\bthis month'?s?\b|\bend of (the |this )?month\b/.test(q) && /\bbill|due|balance|project|after\b/.test(q)) {
    const eom = new Date(y, m + 1, 0);
    horizonDays = Math.max(1, Math.round((eom.getTime() - today.getTime()) / 86400000));
  }

  /* intent kind */
  let kind: IntentKind;
  if (/\bwhat if\b|\bsuppose\b|\bhypothetical/.test(q)) kind = "what_if";
  else if (/\bcan i afford\b|\bafford\b/.test(q)) kind = "affordability";
  else if (/\boverdue\b|\bpast due\b|\bmissed\b/.test(q)) kind = "overdue";
  else if (/\bdue\b|\bbills? (?:are )?(?:due|coming)|\bupcoming\b/.test(q)) kind = "upcoming";
  else if (/\bproject|\bwill my .*balance|\bbalance .*(?:be|after)|\bhow much (?:cash|money) will i have\b|\bforecast\b/.test(q))
    kind = "projection";
  else if (/\bcompare\b|\bversus\b|\bvs\.?\b/.test(q)) kind = "compare_categories";
  else if (/\btop\b.*\bmerchant|where did i spend the most/.test(q)) kind = "top_merchants";
  else if (/\btop\b.*\bcategor|biggest categor/.test(q)) kind = "top_categories";
  else if (/\bbudget\b/.test(q)) kind = "budget_vs_actual";
  else if (/\bemergency fund/.test(q)) kind = "emergency_funds";
  else if (/\bcash flow\b|\bincome\b.*\bexpense|\bnet\b/.test(q)) kind = "cash_flow";
  else if (/\bbalance|\bhow much (?:do i have|money is)\b/.test(q)) kind = "balances";
  else if (/\btrend\b|\bby month\b|\beach month\b|\bper month\b|\bover time\b/.test(q)) kind = "monthly_trend";
  else if (/\bshow\b|\blist\b|\bevery\b|\bfind\b|\ball\b.*\btransactions?\b/.test(q)) kind = "transaction_search";
  else kind = "spending_total";

  /* categories & merchants mentioned */
  const categories: string[] = [];
  const merchants: string[] = [];
  const qs = ` ${singular(q)} ${q} `;

  const candidateCats = [...new Set([...knownCategories, ...Object.keys(CONCEPTS)])];
  for (const c of candidateCats) {
    const cn = norm(c);
    if (cn.length < 3) continue;
    if (qs.includes(cn) || qs.includes(singular(cn))) categories.push(c);
    else {
      const syns = CONCEPTS[cn];
      if (syns?.some((s) => qs.includes(s))) categories.push(c);
    }
  }
  for (const mh of MERCHANT_HINTS) {
    if (qs.includes(mh) && !categories.some((c) => norm(c).includes(mh))) merchants.push(mh);
  }

  /* what-if method */
  let whatIfMethod: string | null = null;
  let whatIfAccount: string | null = null;
  if (kind === "what_if" || kind === "affordability") {
    if (/\bcapital one payment\b|\bpay(?:ing)?\b.*\bcapital one\b|\btoward capital one\b/.test(q))
      whatIfMethod = "Capital One Payment";
    else if (/\bon (?:my )?capital one\b|\bwith (?:my )?capital one\b|\bcredit card\b|\bfrom capital one\b/.test(q))
      whatIfMethod = "Capital One";
    else if (/\bcash\b/.test(q)) whatIfMethod = "Cash";
    else if (/\bsnap\b|\bebt\b/.test(q)) whatIfMethod = "SNAP";
    else if (/\breceive\b|\bincome\b|\bget paid\b|\bdeposit\b/.test(q)) whatIfMethod = "Income to Chase";
    else whatIfMethod = "Chase Debit";
    if (/\bchase\b/.test(q) && whatIfMethod === "Chase Debit") whatIfAccount = "Chase Checking";
    if ((kind === "what_if" || kind === "affordability") && amount === null) {
      kind = "clarify";
    }
  }

  if (kind === "compare_categories" && months === null) months = 6;

  return {
    kind,
    start: isoOf(start <= end ? start : end),
    end: isoOf(start <= end ? end : start),
    rangeLabel,
    categories: categories.slice(0, 8),
    categoryGroups: [],
    merchants: merchants.slice(0, 8),
    descriptions: [],
    paymentMethods: [],
    minAmount: (() => {
      const over = q.match(/\bover \$?\s*([\d,]+(?:\.\d{1,2})?)/);
      return over ? Number(over[1]!.replace(/,/g, "")) : null;
    })(),
    maxAmount: (() => {
      const under = q.match(/\bunder \$?\s*([\d,]+(?:\.\d{1,2})?)/);
      return under ? Number(under[1]!.replace(/,/g, "")) : null;
    })(),
    months,
    horizonDays,
    amount,
    whatIfMethod,
    whatIfAccount,
    clarifyQuestion:
      kind === "clarify"
        ? "What dollar amount should I use for that scenario? For example: “What if I spend $100 on groceries?”"
        : null,
  };
}
