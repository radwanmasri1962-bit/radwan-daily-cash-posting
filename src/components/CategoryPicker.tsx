import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { categoriesQO } from "@/lib/queries";
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

  const { favorites, others } = useMemo(() => {
    const active = cats.filter((c) => !c.is_archived);
    active.sort((a, b) => a.name.localeCompare(b.name));
    return {
      favorites: active.filter((c) => c.is_favorite),
      others: active.filter((c) => !c.is_favorite),
    };
  }, [cats]);

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
          <CommandList className="max-h-72">
            <CommandEmpty>No category found.</CommandEmpty>
            {favorites.length > 0 && (
              <>
                <CommandGroup heading="Favorites">
                  {favorites.map((c) => (
                    <Row
                      key={c.id}
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
            <CommandGroup heading="All categories">
              {others.map((c) => (
                <Row
                  key={c.id}
                  name={c.name}
                  selected={value === c.name}
                  onSelect={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
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
