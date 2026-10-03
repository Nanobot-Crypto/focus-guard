import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";
import { api, type Category } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — Focus Guard" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Category> }) => api.updateCategory(id, patch),
    onSuccess: () => { invalidate(); toast.success("Category updated"); },
    onError: () => toast.error("Update failed"),
  });
  const create = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => { invalidate(); toast.success("Category created"); setAdding(false); },
    onError: () => toast.error("Create failed"),
  });
  const del = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => { invalidate(); toast.success("Category deleted"); },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Detection categories and their keyword triggers."
        actions={
          <Button size="sm" onClick={() => setAdding(true)} className="font-mono uppercase tracking-wider text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add category
          </Button>
        }
      />

      {adding && <AddForm onCancel={() => setAdding(false)} onCreate={(c) => create.mutate(c)} />}

      <div className="grid grid-cols-2 gap-4">
        {cats.map((c) => (
          <CategoryCard
            key={c.id}
            cat={c}
            expanded={expanded === c.id}
            onToggleExpand={() => setExpanded(expanded === c.id ? null : c.id)}
            onPatch={(patch) => update.mutate({ id: c.id, patch })}
            onDelete={() => del.mutate(c.id)}
          />
        ))}
      </div>
    </>
  );
}

function CategoryCard({
  cat, expanded, onToggleExpand, onPatch, onDelete,
}: {
  cat: Category;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (p: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const [kw, setKw] = useState("");
  return (
    <div className="rounded border border-border bg-card">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
      >
        <div>
          <div className="font-semibold text-foreground">{cat.name}</div>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{cat.keywords.length} keywords</span>
            <span>·</span>
            <span>{cat.detectionCount} detections</span>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={cat.enabled}
            onCheckedChange={(v) => {
              if (!v) {
                api.triggerWarning(`Estás a punto de desactivar la categoría "${cat.name}". Esto reduce tu protección contra distracciones. Piénsalo con calma.`);
              }
              onPatch({ enabled: v });
            }}
          />
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">keywords</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cat.keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 bg-secondary border border-border">
                {k}
                <button
                  onClick={() => {
                    api.triggerWarning(`Estás eliminando la palabra clave "${k}" de "${cat.name}". Esto abre una puerta que quizás no quieras abrir. Tómate un momento.`);
                    onPatch({ keywords: cat.keywords.filter((x) => x !== k) });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                ><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && kw.trim()) {
                  onPatch({ keywords: [...cat.keywords, kw.trim()] });
                  setKw("");
                }
              }}
              placeholder="Add keyword + Enter"
              className="font-mono text-xs h-8"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 font-mono uppercase text-[10px] tracking-wider">
                <Trash2 className="h-3 w-3 mr-1" /> Delete category
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                <AlertDialogDescription>This category and its keywords will be removed permanently.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                api.triggerWarning(`Estás eliminando permanentemente la categoría "${cat.name}" y todas sus palabras clave. Esta acción reduce tu protección.`);
                onDelete();
              }}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

function AddForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (c: { name: string; keywords: string[]; enabled: boolean }) => void }) {
  const [name, setName] = useState("");
  const [kws, setKws] = useState("");
  return (
    <SectionCard title="New category" className="mb-4">
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
        <Input value={kws} onChange={(e) => setKws(e.target.value)} placeholder="keywords, comma, separated" className="font-mono text-xs" />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => onCreate({
              name: name.trim(),
              keywords: kws.split(",").map((k) => k.trim()).filter(Boolean),
              enabled: true,
            })}
          >Create</Button>
        </div>
      </div>
    </SectionCard>
  );
}
