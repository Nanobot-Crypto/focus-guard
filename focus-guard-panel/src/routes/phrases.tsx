import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/phrases")({
  head: () => ({ meta: [{ title: "Phrases — Focus Guard" }] }),
  component: PhrasesPage,
});

function PhrasesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["phrases"], queryFn: api.getPhrases });
  const [text, setText] = useState("");

  useEffect(() => {
    if (data) setText(data.phrases.join("\n"));
  }, [data]);

  const save = useMutation({
    mutationFn: (phrases: string[]) => api.updatePhrases(phrases),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["phrases"] }); toast.success("Phrases saved"); },
    onError: () => toast.error("Save failed"),
  });

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const chars = text.length;

  const onSave = () => {
    if (lines.length === 0) { toast.warning("Add at least one phrase before saving"); return; }
    save.mutate(lines);
  };

  return (
    <>
      <PageHeader title="Phrases" subtitle="Messages displayed during interventions." />

      <SectionCard title="Intervention phrases">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          className="font-mono text-sm leading-relaxed resize-y"
          placeholder="One phrase per line…"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="font-mono text-[11px] text-muted-foreground">
            {lines.length} phrases · {chars} chars
          </div>
          <Button size="sm" onClick={onSave} disabled={save.isPending} className="font-mono uppercase tracking-wider text-xs">
            Save phrases
          </Button>
        </div>
      </SectionCard>

      <div className="mt-4 font-mono text-[11px] text-muted-foreground">
        file · <span className="text-foreground/70">{data?.filePath ?? "—"}</span>
      </div>
    </>
  );
}
