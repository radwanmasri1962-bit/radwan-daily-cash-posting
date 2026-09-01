import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { categoriesQO, type CategoryRow } from "@/lib/queries";
import { GROUP_ORDER, groupOf } from "@/lib/category-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  const { user } = useAuth();
  const { data: cats } = useSuspenseQuery(categoriesQO(user!.id));
  const [open, setOpen] = useState(false);

  const { favorites, groups, legacySelected } = useMemo(() => {
    const active = cats.filter((c) => !c.is_archived);
    const favorites = active
      .filter((c) => c.is_favorite)
      .sort((a, b) => a.name.localeCompare(b.name));

    const map = new Map<string, CategoryRow[]>();
    for (const c of active) {
      const g = groupOf(c.name, c.category_group);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    const ordered = [...map.entries()].sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a[0] as never);
      const ib = GROUP_ORDER.indexOf(b[0] as never);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const [, list] of ordered) list.sort((a, b) => a.name.localeCompare(b.name));

    const legacySelected =
      value && !active.some((c) => c.name === value) ? value : null;

    return { favorites, groups: ordered, legacySelected };
  }, [cats, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value || "Select category…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category…" />
          <CommandList className="max-h-80">
            <CommandEmpty>No category found.</CommandEmpty>
            {legacySelected && (
              <>
                <CommandGroup heading="Current (archived)">
                  <Row
                    name={legacySelected}
                    selected
                    onSelect={() => setOpen(false)}
                  />
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {favorites.length > 0 && (
              <>
                <CommandGroup heading="Favorites">
                  {favorites.map((c) => (
                    <Row
                      key={`fav-${c.id}`}
                      name={c.name}
                      favorite
                      selected={value === c.name}
                      onSelect={() => {
                        onChange(c.name);
                        setOpen(false);
                      }}
                    />
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {groups.map(([group, list]) => (
              <CommandGroup key={group} heading={group.toUpperCase()}>
                {list.map((c) => (
                  <Row
                    key={c.id}
                    name={c.name}
                    favorite={c.is_favorite}
                    selected={value === c.name}
                    onSelect={() => {
                      onChange(c.name);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  name,
  favorite,
  selected,
  onSelect,
}: {
  name: string;
  favorite?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={name} onSelect={onSelect} className="cursor-pointer">
      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{name}</span>
      {favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
    </CommandItem>
  );
}
