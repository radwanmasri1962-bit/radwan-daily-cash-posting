import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, CheckCircle2, Circle, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { appointmentsQO } from "@/lib/queries";
import type { Database } from "@/integrations/supabase/types";

type Appt = Database["public"]["Tables"]["appointments"]["Row"];

export const Route = createFileRoute("/_authenticated/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { user } = useAuth();
  const { data: appts } = useSuspenseQuery(appointmentsQO(user!.id));
  const [editing, setEditing] = useState<Partial<Appt> | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const buckets = useMemo(() => {
    const todayISO = today.toISOString().slice(0, 10);
    const in7ISO = in7.toISOString().slice(0, 10);
    return {
      today: appts.filter((a) => a.appointment_date === todayISO && !a.completed),
      week: appts.filter(
        (a) => !a.completed && a.appointment_date > todayISO && a.appointment_date <= in7ISO,
      ),
      upcoming: appts.filter((a) => !a.completed && a.appointment_date > in7ISO),
      past: appts.filter((a) => a.completed || a.appointment_date < todayISO),
    };
  }, [appts]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manual calendar for meetings and errands.</p>
        </div>
        <Button onClick={() => setEditing({})} className="gap-2">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      <Tabs defaultValue="week" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({buckets.today.length})</TabsTrigger>
          <TabsTrigger value="week">This Week ({buckets.week.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({buckets.past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <List items={buckets.today} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="week">
          <List items={buckets.week} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="upcoming">
          <List items={buckets.upcoming} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="past">
          <List items={buckets.past} onEdit={setEditing} />
        </TabsContent>
      </Tabs>

      <EditDialog
        value={editing}
        onClose={() => setEditing(null)}
        userId={user!.id}
      />
    </div>
  );
}

function List({
  items,
  onEdit,
}: {
  items: Appt[];
  onEdit: (a: Appt) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  async function toggle(a: Appt) {
    await supabase.from("appointments").update({ completed: !a.completed }).eq("id", a.id);
    await qc.invalidateQueries({ queryKey: ["appointments", user!.id] });
  }
  async function del(id: string) {
    if (!confirm("Delete this appointment?")) return;
    await supabase.from("appointments").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["appointments", user!.id] });
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center text-sm text-muted-foreground">
        No appointments in this range.
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((a) => {
        const d = new Date(a.appointment_date + "T00:00:00");
        const dayLabel = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        return (
          <Card key={a.id} className="flex items-start gap-4 p-4">
            <button onClick={() => toggle(a)} className="mt-0.5 text-muted-foreground hover:text-foreground">
              {a.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1">
              <div className={`text-sm font-medium ${a.completed ? "line-through text-muted-foreground" : ""}`}>
                {a.title}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {dayLabel}
                  {a.appointment_time ? ` · ${formatTime(a.appointment_time)}` : ""}
                </span>
                {a.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {a.address}
                  </span>
                )}
              </div>
              {a.notes && <div className="mt-2 text-xs text-muted-foreground">{a.notes}</div>}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => del(a.id)}>
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function EditDialog({
  value,
  onClose,
  userId,
}: {
  value: Partial<Appt> | null;
  onClose: () => void;
  userId: string;
}) {
  const qc = useQueryClient();
  const open = value !== null;
  const [title, setTitle] = useState(value?.title ?? "");
  const [date, setDate] = useState(value?.appointment_date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(value?.appointment_time ?? "");
  const [address, setAddress] = useState(value?.address ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Re-init on open
  const key = value?.id ?? (open ? "new" : "");
  useEffect(() => {
    setTitle(value?.title ?? "");
    setDate(value?.appointment_date ?? new Date().toISOString().slice(0, 10));
    setTime(value?.appointment_time ?? "");
    setAddress(value?.address ?? "");
    setNotes(value?.notes ?? "");
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      title: title.trim(),
      appointment_date: date,
      appointment_time: time || null,
      address,
      notes,
    };
    if (value?.id) {
      await supabase.from("appointments").update(payload).eq("id", value.id);
    } else {
      await supabase.from("appointments").insert(payload);
    }
    await qc.invalidateQueries({ queryKey: ["appointments", userId] });
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
          <DialogTitle>{value?.id ? "Edit Appointment" : "New Appointment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time ?? ""} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address ?? ""} onChange={(e) => setAddress(e.target.value)} />
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
