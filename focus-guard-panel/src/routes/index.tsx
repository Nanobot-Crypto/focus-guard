import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Focus Guard" }] }),
  component: Dashboard,
});

function formatRelative(iso: string | null) {
  if (!iso) return "no detections yet";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["status"], queryFn: api.getStatus, refetchInterval: 5000 });
  const { data: recent = [] } = useQuery({ queryKey: ["recent"], queryFn: api.getRecent, refetchInterval: 3000 });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.getStats });

  const toggle = useMutation({
    mutationFn: (a: "start" | "stop") => api.setMonitoring(a),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["status"] });
      toast.success(d.monitoring ? "Monitoring started" : "Monitoring stopped");
    },
    onError: () => toast.error("Failed to toggle monitoring"),
  });

  const reset = useMutation({
    mutationFn: api.resetStats,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Today's stats reset");
    },
  });

  const monitoring = status?.monitoring ?? false;
  const lastEvent = recent[0];

  return (
    <>

      <div className="relative rounded border border-border bg-card overflow-hidden mb-6">
        {monitoring && <div className="absolute inset-0 status-glow pointer-events-none" />}
        <div className="relative p-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span
              className={`h-3 w-3 rounded-full ${monitoring ? "bg-[var(--status-on)] pulse-dot" : "bg-[var(--status-off)]"}`}
            />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                monitoring
              </div>
              <div className="text-xl font-semibold mt-1">
                {monitoring ? "Active" : "Paused"}
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                uptime {status?.uptime ?? "—"}
              </div>
            </div>
          </div>
          {monitoring ? (
            <StopMonitoringDialog
              onConfirm={() => toggle.mutate("stop")}
            />
          ) : (
            <Button
              variant="default"
              onClick={() => toggle.mutate("start")}
              className="font-mono uppercase tracking-wider text-xs"
            >
              Start monitoring
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Interventions today" value={status?.todayInterventions ?? 0} />
        <Stat label="Time saved today" value={`${stats?.daily?.at(-1)?.timeSaved ?? 0}m`} />
        <Stat label="Current streak" value={`${stats?.total.streakDays ?? 0}d`} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SectionCard title="Last detection" className="col-span-1">
          {lastEvent ? (
            <div>
              <div className="font-mono text-xs text-muted-foreground">
                {formatRelative(status?.lastDetection ?? lastEvent.time)}
              </div>
              <div className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-primary/40 text-primary">
                {lastEvent.category}
              </div>
              <div className="mt-2 text-sm text-foreground truncate" title={lastEvent.title}>
                {lastEvent.title}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No detections yet.</div>
          )}
          <div className="mt-5 pt-4 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground hover:text-destructive px-0">
                  Reset today's stats
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset today's stats?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears intervention counters and time-saved for today.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reset.mutate()}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SectionCard>

        <SectionCard title="Recent activity" className="col-span-2">
          <ul className="divide-y divide-border -my-2">
            {recent.slice(0, 10).map((e, i) => (
              <li key={i} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">
                  {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border text-muted-foreground shrink-0">
                  {e.category}
                </span>
                <span className="truncate text-foreground/80" title={e.title}>{e.title}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="font-mono text-3xl font-semibold mt-2 text-foreground">{value}</div>
    </div>
  );
}

const COOLDOWN_SECONDS = 40;

function StopMonitoringDialog({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState<string>("");
  const [remaining, setRemaining] = useState(COOLDOWN_SECONDS);
  const { data: phrasesPayload } = useQuery({ queryKey: ["phrases"], queryFn: api.getPhrases });

  useEffect(() => {
    if (!open) return;
    const phrases = phrasesPayload?.phrases ?? [];
    if (phrases.length > 0) {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    } else {
      setPhrase("Pausar el monitoreo debilita el hábito que estás construyendo. Tómate un momento antes de decidir.");
    }
    setRemaining(COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [open, phrasesPayload]);

  const locked = remaining > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" className="font-mono uppercase tracking-wider text-xs">
          Stop monitoring
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to stop?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
            {phrase}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={locked}
            onClick={(e) => {
              if (locked) {
                e.preventDefault();
                return;
              }
              onConfirm();
              setOpen(false);
            }}
            className="font-mono uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locked ? `Stop anyway (${remaining}s)` : "Stop anyway"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
