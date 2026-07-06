import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { tasksQO } from "@/lib/queries";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "text-rose-400" },
  normal: { label: "Normal", color: "text-muted-foreground" },
  low: { label: "Low", color: "text-sky-400" },
};

function TasksPage() {
  const { user } = useAuth();
  const { data: tasks } = useSuspenseQuery(tasksQO(user!.id));
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const buckets = useMemo(
    () => ({
      today: tasks.filter((t) => !t.completed && (!t.due_date || t.due_date <= todayISO)),
      upcoming: tasks.filter((t) => !t.completed && t.due_date && t.due_date > todayISO),
      completed: tasks.filter((t) => t.completed),
    }),
    [tasks, todayISO],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Simple checklist for daily focus.</p>
        </div>
        <Button onClick={() => setEditing({})} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({buckets.today.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({buckets.completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <List items={buckets.today} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="upcoming">
          <List items={buckets.upcoming} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="completed">
          <List items={buckets.completed} onEdit={setEditing} />
        </TabsContent>
      </Tabs>

      <EditDialog value={editing} onClose={() => setEditing(null)} userId={user!.id} />
    </div>
  );
}

function List({ items, onEdit }: { items: Task[]; onEdit: (t: Task) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  async function toggle(t: Task) {
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    await qc.invalidateQueries({ queryKey: ["tasks", user!.id] });
  }
  async function del(id: string) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["tasks", user!.id] });
  }

  if (items.length === 0)
    return (
      <Card className="p-12 text-center text-sm text-muted-foreground">
        Nothing here.
      </Card>
    );
  return (
    <div className="space-y-2">
      {items.map((t) => {
        const p = PRIORITY_LABEL[t.priority] ?? PRIORITY_LABEL.normal;
        return (
          <Card key={t.id} className="flex items-start gap-3 p-4">
            <Checkbox
              checked={t.completed}
              onCheckedChange={() => toggle(t)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}
              >
                {t.title}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className={`font-medium ${p.color}`}>{p.label} Priority</span>
                {t.due_date && <span>Due {t.due_date}</span>}
              </div>
              {t.notes && <div className="mt-2 text-xs text-muted-foreground">{t.notes}</div>}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => del(t.id)}>
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EditDialog({
  value,
  onClose,
  userId,
}: {
  value: Partial<Task> | null;
  onClose: () => void;
  userId: string;
}) {
  const qc = useQueryClient();
  const open = value !== null;
  const [title, setTitle] = useState(value?.title ?? "");
  const [priority, setPriority] = useState(value?.priority ?? "normal");
  const [dueDate, setDueDate] = useState(value?.due_date ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const key = value?.id ?? (open ? "new" : "");
  useEffect(() => {
    setTitle(value?.title ?? "");
    setPriority(value?.priority ?? "normal");
    setDueDate(value?.due_date ?? "");
    setNotes(value?.notes ?? "");
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      title: title.trim(),
      priority,
      due_date: dueDate || null,
      notes,
    };
    if (value?.id) {
      await supabase.from("tasks").update(payload).eq("id", value.id);
    } else {
      await supabase.from("tasks").insert(payload);
    }
    await qc.invalidateQueries({ queryKey: ["tasks", userId] });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            void save();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{value?.id ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Task</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
