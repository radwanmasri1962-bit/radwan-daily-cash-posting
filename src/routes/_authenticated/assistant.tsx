import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { money } from "@/lib/format";
import { askAssistant, runCashProjection } from "@/lib/assistant.functions";
import type {
  AnswerBlock,
  AssistantAnswer,
  HistoryItem,
  ProjectionResult,
} from "@/lib/assistant/types";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "AI Financial Assistant — Radwan Daily Cash Position" },
      {
        name: "description",
        content:
          "Ask natural-language questions about your spending, balances, bills and projected cash position.",
      },
      { property: "og:title", content: "AI Financial Assistant" },
      {
        property: "og:description",
        content: "Spending insights and conservative cash projections from your own recorded data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STARTERS = [
  "How much did I spend on cigarettes this year?",
  "Compare groceries for the last six months",
  "What bills are due in the next 7 days?",
  "What will my Chase balance be after this month's bills?",
  "What if I spend $100 on groceries?",
  "Show my top spending categories this month",
];

const DISCLAIMER =
  "Informational only. Projections and what-if scenarios are estimates based on the data recorded in this app and are never saved.";

type ChatItem =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: AssistantAnswer }
  | { id: number; role: "error"; text: string; retry: string };

let nextId = 1;

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const project = useServerFn(runCashProjection);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showProjection, setShowProjection] = useState(false);
  const [horizon, setHorizon] = useState(30);
  const [targetDate, setTargetDate] = useState("");
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function buildHistory(list: ChatItem[]): HistoryItem[] {
    return list
      .filter((m): m is Extract<ChatItem, { role: "assistant" }> => m.role === "assistant")
      .slice(-3)
      .map((m) => ({
        question: m.answer.question,
        headline: m.answer.headline,
        rangeLabel: m.answer.rangeLabel,
      }));
  }

  async function submit(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setQuestion("");
    setMessages((prev) => [...prev, { id: nextId++, role: "user", text }]);
    try {
      const history = buildHistory(messages);
      const res = await ask({ data: { question: text, history } });
      setMessages((prev) => [...prev, { id: nextId++, role: "assistant", answer: res }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "error",
          text: e instanceof Error ? e.message : "Something went wrong. Please retry.",
          retry: text,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function loadProjection(days: number, date?: string) {
    setProjLoading(true);
    setProjError(null);
    try {
      const res = await project({
        data: { horizonDays: days, targetDate: date && date.length ? date : null },
      });
      setProjection(res);
    } catch (e) {
      setProjError(e instanceof Error ? e.message : "Could not build the projection. Please retry.");
    } finally {
      setProjLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Financial Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about spending, bills, balances, what-if scenarios, and projected cash — answered
          from your own recorded data, read-only.
        </p>
      </div>

      <Card className="flex min-h-[55vh] flex-col overflow-hidden p-0">
        {/* Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">What would you like to know?</p>
              <p className="max-w-md text-xs text-muted-foreground">
                I analyze the transactions, bills, subscriptions, budgets and balances already
                recorded in this app. I never change anything, and what-if scenarios are never
                saved. If no matching data exists, I&apos;ll say so.
              </p>
              <div className="mt-2 flex max-w-xl flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void submit(s)}
                    disabled={loading}
                    className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => {
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {m.text}
                  </div>
                </div>
              );
            }
            if (m.role === "error") {
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="flex max-w-[95%] flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span>{m.text}</span>
                    <Button size="sm" variant="outline" onClick={() => void submit(m.retry)} disabled={loading}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                    </Button>
                  </div>
                </div>
              );
            }
            return <AnswerCard key={m.id} answer={m.answer} onFollowUp={(q) => void submit(q)} />;
          })}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your data…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 p-3 sm:p-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(question);
            }}
          >
            <Textarea
              ref={inputRef}
              value={question}
              maxLength={500}
              rows={1}
              placeholder="e.g. How much did I spend on groceries last month?"
              className="max-h-32 min-h-[42px] flex-1 resize-none"
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(question);
                }
              }}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !question.trim()} size="icon" className="h-[42px] w-[42px] shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for a new line. {DISCLAIMER}
          </p>
        </div>
      </Card>

      {/* Cash Projection tool */}
      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowProjection((v) => !v)}
        >
          <div>
            <h2 className="text-lg font-semibold">Cash Projection tool</h2>
            <p className="text-xs text-muted-foreground">
              Conservative estimate from your saved balances plus known scheduled obligations.
            </p>
          </div>
          {showProjection ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showProjection ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[7, 14, 30].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={horizon === d && !targetDate ? "default" : "outline"}
                  onClick={() => {
                    setHorizon(d);
                    setTargetDate("");
                    void loadProjection(d);
                  }}
                >
                  {d} days
                </Button>
              ))}
              <Input
                type="date"
                value={targetDate}
                className="h-9 w-[150px]"
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  if (e.target.value) void loadProjection(horizon, e.target.value);
                }}
              />
            </div>

            {projLoading ? (
              <p className="text-sm text-muted-foreground">Building projection…</p>
            ) : projError ? (
              <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <span>{projError}</span>
                <Button size="sm" variant="outline" onClick={() => void loadProjection(horizon, targetDate)}>
                  Retry
                </Button>
              </div>
            ) : projection ? (
              <ProjectionView p={projection} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Pick a horizon to see a dated timeline and projected closing balances.
              </p>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function AnswerCard({
  answer,
  onFollowUp,
}: {
  answer: AssistantAnswer;
  onFollowUp: (q: string) => void;
}) {
  return (
    <Card className="space-y-4 border-border/60 p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold sm:text-lg">{answer.headline}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{answer.narrative}</p>
      </div>

      {answer.status === "ok" ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {answer.rangeLabel ? <span>Date range: {answer.rangeLabel}</span> : null}
          <span>Based on: {answer.basedOn}</span>
        </div>
      ) : null}

      {answer.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}

      {answer.followUps.length ? (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {answer.followUps.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowUp(f)}
              className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {f}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Block({ block }: { block: AnswerBlock }) {
  if (block.type === "stats") {
    if (!block.items.length) return null;
    return (
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {block.items.map((it) => (
            <div key={it.label} className="rounded-md border border-border/60 p-3">
              <div className="text-[11px] text-muted-foreground">{it.label}</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{it.value}</div>
              {it.hint ? <div className="text-[10px] text-muted-foreground">{it.hint}</div> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "series") {
    if (!block.points.length) return null;
    const max = Math.max(...block.points.map((p) => Math.abs(p.value)), 1);
    return (
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</div>
        <div className="space-y-2">
          {block.points.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <div className="w-32 shrink-0 truncate text-xs">{p.label}</div>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(Math.abs(p.value) / max) * 100}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-xs tabular-nums">{money(p.value)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "timeline") {
    if (!block.events.length)
      return (
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</div>
          <p className="text-sm text-muted-foreground">No scheduled items in this window.</p>
        </div>
      );
    return (
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {block.events.map((e, i) => (
                <tr key={`${e.label}-${e.date}-${i}`} className="border-b border-border/40">
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{e.date}</td>
                  <td className="py-2 pr-3">{e.label}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{e.account}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{e.source}</td>
                  <td
                    className={`py-2 text-right tabular-nums ${e.direction === "in" ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {e.direction === "in" ? "+" : "−"}
                    {money(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block.type === "note") {
    if (!block.lines.length) return null;
    return (
      <div className="rounded-md border border-border/60 p-3">
        <div className="text-xs font-medium">{block.title}</div>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {block.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    );
  }

  // table
  if (!block.rows.length)
    return (
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</div>
        <p className="text-sm text-muted-foreground">No transactions matched these filters.</p>
      </div>
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">{block.title}</span>
        <span>
          Showing {Math.min(block.rows.length, block.totalCount)} of {block.totalCount} · total{" "}
          {money(block.totalAmount)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Merchant</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Method</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((t) => (
              <tr key={t.id} className="border-b border-border/40">
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{t.tx_date}</td>
                <td className="max-w-[160px] truncate py-2 pr-3">{t.description}</td>
                <td className="max-w-[140px] truncate py-2 pr-3 text-muted-foreground">{t.merchant}</td>
                <td className="py-2 pr-3 text-muted-foreground">{t.category}</td>
                <td className="py-2 pr-3 text-muted-foreground">{t.payment_method}</td>
                <td className="py-2 text-right tabular-nums">{money(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectionView({ p }: { p: ProjectionResult }) {
  return (
    <>
      {p.scenarioLabel ? (
        <div className="rounded-md border border-border/60 px-3 py-2 text-xs">{p.scenarioLabel}</div>
      ) : null}
      <Block
        block={{
          type: "stats",
          title: `Projected ${p.start} → ${p.end} (estimate)`,
          items: [
            { label: "Chase Checking", value: money(p.closing["Chase Checking"] ?? 0), hint: `opening ${money(p.opening["Chase Checking"] ?? 0)}` },
            { label: "Cash Wallet", value: money(p.closing["Cash Wallet"] ?? 0), hint: `opening ${money(p.opening["Cash Wallet"] ?? 0)}` },
            { label: "Ohio SNAP", value: money(p.closing["Ohio SNAP"] ?? 0), hint: "Restricted funds" },
            { label: "Capital One owed", value: money(p.closing["Capital One Owed"] ?? 0) },
            { label: "Capital One available", value: money(p.closing["Capital One Available"] ?? 0), hint: "Credit, not cash" },
            { label: "Known inflows", value: money(p.inflows) },
            { label: "Known outflows", value: money(p.outflows) },
            ...(p.lowestChase
              ? [{ label: "Lowest Chase", value: money(p.lowestChase.amount), hint: `on ${p.lowestChase.date}` }]
              : []),
          ],
        }}
      />
      <Block block={{ type: "timeline", title: "Event timeline", events: p.events }} />
      <Block block={{ type: "note", title: "Assumptions", lines: p.assumptions }} />
      {p.notIncluded.length ? (
        <Block
          block={{
            type: "note",
            title: "Not included",
            lines: p.notIncluded.map((n) => `${n.label} — ${n.reason}`),
          }}
        />
      ) : null}
      <p className="text-[11px] text-muted-foreground">{DISCLAIMER}</p>
    </>
  );
}
