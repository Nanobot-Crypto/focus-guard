import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type Config, type OverlayTheme, type Sensitivity } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Focus Guard" }] }),
  component: SettingsPage,
});

const sensitivities: { value: Sensitivity; label: string; desc: string }[] = [
  { value: "low", label: "Low", desc: "Strong matches only · fewer interventions" },
  { value: "medium", label: "Medium", desc: "Balanced detection (recommended)" },
  { value: "high", label: "High", desc: "Aggressive matching · more interventions" },
];

type ThemePreview = {
  value: OverlayTheme;
  label: string;
  desc: string;
  bg: string;
  fg: string;
  accent: string;
  border: string;
};

const themes: ThemePreview[] = [
  {
    value: "dark",
    label: "Dark",
    desc: "High contrast · teal accent",
    bg: "linear-gradient(135deg,#0d0d0f 0%,#1a1a1d 100%)",
    fg: "#e8e8ea",
    accent: "#00e5c8",
    border: "#2a2a2e",
  },
  {
    value: "calm",
    label: "Calm",
    desc: "Muted blue-green · soft",
    bg: "linear-gradient(135deg,#1f2937 0%,#0f766e 100%)",
    fg: "#f0fdfa",
    accent: "#5eead4",
    border: "#134e4a",
  },
  {
    value: "minimal",
    label: "Minimal",
    desc: "Light · monochrome",
    bg: "linear-gradient(135deg,#fafafa 0%,#e5e5e5 100%)",
    fg: "#0a0a0a",
    accent: "#525252",
    border: "#d4d4d4",
  },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["config"], queryFn: api.getConfig });
  const [cfg, setCfg] = useState<Config | null>(null);

  useEffect(() => { if (data) setCfg(data); }, [data]);

  const save = useMutation({
    mutationFn: (patch: Partial<Config>) => api.updateConfig(patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config"] }); toast.success("Settings saved"); },
    onError: () => toast.error("Save failed"),
  });

  const reset = useMutation({
    mutationFn: api.resetStats,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stats"] }); qc.invalidateQueries({ queryKey: ["status"] }); toast.success("All statistics reset"); },
  });

  if (!cfg) return null;

  const patch = (p: Partial<Config>) => setCfg({ ...cfg, ...p });

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure blocking behavior, overlay, and system options."
        actions={<Button size="sm" onClick={() => save.mutate(cfg)} className="font-mono uppercase tracking-wider text-xs">Save changes</Button>}
      />

      <div className="space-y-4">
        <SectionCard title="Blocking behavior">
          <div className="space-y-5">
            <Field label="Block duration (seconds)">
              <Input
                type="number"
                value={cfg.blockDuration}
                onChange={(e) => patch({ blockDuration: Number(e.target.value) })}
                className="font-mono w-32"
                min={5}
                max={600}
              />
            </Field>

            <Field label="Sensitivity">
              <div className="grid grid-cols-3 gap-2">
                {sensitivities.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => patch({ sensitivity: s.value })}
                    className={`text-left p-3 border rounded transition-colors ${
                      cfg.sensitivity === s.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-mono text-xs uppercase tracking-wider">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            <ToggleRow
              label="Show countdown progress bar"
              checked={cfg.showProgress}
              onChange={(v) => patch({ showProgress: v })}
            />
          </div>
        </SectionCard>

        <SectionCard title="Overlay appearance">
          <Field label="Theme">
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => {
                const selected = cfg.overlayTheme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => patch({ overlayTheme: t.value })}
                    className={`group p-2 border rounded text-left transition-all ${
                      selected
                        ? "border-primary ring-1 ring-primary/40"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div
                      className="relative h-24 w-full rounded overflow-hidden border flex flex-col items-center justify-center gap-1.5 px-2"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div
                        className="h-1 w-8 rounded-full opacity-80"
                        style={{ background: t.accent }}
                      />
                      <div
                        className="font-mono text-[9px] uppercase tracking-wider opacity-90 text-center leading-tight"
                        style={{ color: t.fg }}
                      >
                        Stay focused
                      </div>
                      <div
                        className="h-[3px] w-3/4 rounded-full"
                        style={{ background: t.accent, opacity: 0.9 }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      <span className="font-mono text-xs uppercase tracking-wider">{t.label}</span>
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 px-0.5">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </Field>
        </SectionCard>


        <SectionCard title="System">
          <div className="space-y-5">
            <ToggleRow
              label="Auto-start on login"
              checked={cfg.autoStart}
              onChange={(v) => patch({ autoStart: v })}
            />
            <ToggleRow
              label="Break reminders every 30 min"
              checked={cfg.breakRemindersEnabled}
              onChange={(v) => patch({ breakRemindersEnabled: v })}
            />
            <div className="pt-4 border-t border-border">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">danger zone</div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="font-mono uppercase tracking-wider text-xs">
                    Reset all statistics
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all statistics?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All historical intervention data, time-saved metrics, and streaks will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => reset.mutate()}>Reset everything</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
