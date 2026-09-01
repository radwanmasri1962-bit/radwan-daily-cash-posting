import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { categoriesQO, type CategoryRow } from "@/lib/queries";
import { GROUP_ORDER, groupOf } from "@/lib/category-system";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, Archive, ArchiveRestore, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export function CategoriesManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useSuspenseQuery(categoriesQO(user!.id));
  const [newName, setNewName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...cats].sort((a, b) => a.name.localeCompare(b.name));
  const active = sorted.filter((c) => !c.is_archived);
  const archived = sorted.filter((c) => c.is_archived);

  const activeGroups = (() => {
    const map = new Map<string, CategoryRow[]>();
    for (const c of active) {
      const g = groupOf(c.name, c.category_group);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a[0] as never);
      const ib = GROUP_ORDER.indexOf(b[0] as never);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  })();

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["categories", user!.id] });
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase
      .from("categories")
      .insert({ user_id: user!.id, name });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Category already exists" : error.message);
      return;
    }
    setNewName("");
    toast.success("Category added");
    await refresh();
  }

  async function toggleFavorite(c: CategoryRow) {
    const { error } = await supabase
      .from("categories")
      .update({ is_favorite: !c.is_favorite })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function toggleArchive(c: CategoryRow) {
    const { error } = await supabase
      .from("categories")
      .update({ is_archived: !c.is_archived })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.is_archived ? "Restored" : "Archived");
    await refresh();
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setEditValue(c.name);
  }

  async function saveEdit(c: CategoryRow) {
    const name = editValue.trim();
    if (!name || name === c.name) {
      setEditingId(null);
      return;
    }
    // Rename category and cascade to existing transactions so history stays consistent
    const { error } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", c.id);
    if (error) {
      toast.error(error.code === "23505" ? "Name already in use" : error.message);
      return;
    }
    await supabase
      .from("transactions")
      .update({ category: name })
      .eq("user_id", user!.id)
      .eq("category", c.name);
    setEditingId(null);
    toast.success("Renamed");
    await qc.invalidateQueries();
  }

  function renderRow(c: CategoryRow) {
    const isEditing = editingId === c.id;
    return (
      <li key={c.id} className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => toggleFavorite(c)}
          aria-label={c.is_favorite ? "Unfavorite" : "Favorite"}
          className="shrink-0"
        >
          <Star
            className={
              c.is_favorite
                ? "h-4 w-4 fill-amber-400 text-amber-400"
                : "h-4 w-4 text-muted-foreground hover:text-amber-400"
            }
          />
        </button>
        {isEditing ? (
          <>
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(c);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-8"
            />
            <Button size="icon" variant="ghost" onClick={() => saveEdit(c)} aria-label="Save">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel">
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <span className={"flex-1 truncate text-sm " + (c.is_archived ? "text-muted-foreground line-through" : "")}>
              {c.name}
            </span>
            {!c.is_archived && (
              <Button size="icon" variant="ghost" onClick={() => startEdit(c)} aria-label="Rename">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleArchive(c)}
              aria-label={c.is_archived ? "Restore" : "Archive"}
            >
              {c.is_archived ? (
                <ArchiveRestore className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Archive className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </>
        )}
      </li>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Categories</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
        </Button>
      </div>
      <form onSubmit={addCategory} className="mb-3 flex gap-2">
        <Input
          placeholder="Add new category…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={60}
        />
        <Button type="submit" disabled={busy || !newName.trim()}>
          Add
        </Button>
      </form>
      <p className="mb-2 text-xs text-muted-foreground">
        Star to favorite (favorites appear at the top when adding a transaction). Rename cascades to
        existing transactions. Archive hides a category without deleting its history.
      </p>
      <div className="space-y-3">
        {activeGroups.map(([group, list]) => (
          <div key={group}>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group}
            </div>
            <div className="rounded-md border">
              <ul className="divide-y">{list.map(renderRow)}</ul>
            </div>
          </div>
        ))}
      </div>
      {showArchived && archived.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Archived
          </div>
          <div className="rounded-md border">
            <ul className="divide-y">{archived.map(renderRow)}</ul>
          </div>
        </div>
      )}
    </Card>
  );
}
