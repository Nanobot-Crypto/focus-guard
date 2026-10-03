import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/whitelist")({
  head: () => ({ meta: [{ title: "Whitelist — Focus Guard" }] }),
  component: WhitelistPage,
});

function WhitelistPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["whitelist"], queryFn: api.getWhitelist });
  const [sites, setSites] = useState<string[]>([]);
  const [apps, setApps] = useState<string[]>([]);

  useEffect(() => {
    if (data) { setSites(data.sites); setApps(data.apps); }
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.updateWhitelist({ sites, apps }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whitelist"] }); toast.success("Whitelist saved"); },
    onError: () => toast.error("Save failed"),
  });

  return (
    <>
      <PageHeader
        title="Whitelist"
        subtitle="Sites and applications exempt from detection."
        actions={
          <Button size="sm" onClick={() => save.mutate()} className="font-mono uppercase tracking-wider text-xs">Save</Button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <TagColumn title="Whitelisted sites" placeholder="github.com" items={sites} setItems={setSites} />
        <TagColumn title="Whitelisted apps" placeholder="firefox" items={apps} setItems={setApps} />
      </div>
    </>
  );
}

function TagColumn({
  title, placeholder, items, setItems,
}: {
  title: string;
  placeholder: string;
  items: string[];
  setItems: (i: string[]) => void;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    setItems([...items, v]);
    setVal("");
  };
  return (
    <SectionCard title={title}>
      <div className="flex gap-2 mb-4">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="font-mono text-xs h-8"
        />
        <Button size="sm" variant="secondary" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <div className="text-xs text-muted-foreground">No entries.</div>}
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 bg-secondary border border-border">
            {it}
            <button onClick={() => setItems(items.filter((x) => x !== it))} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </SectionCard>
  );
}
