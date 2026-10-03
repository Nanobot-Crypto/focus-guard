import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-8 pb-4 border-b border-border">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">focus-guard</div>
        <h1 className="text-2xl font-semibold text-foreground mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded border border-border bg-card ${className}`}>
      {title && (
        <header className="px-5 py-3 border-b border-border">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
