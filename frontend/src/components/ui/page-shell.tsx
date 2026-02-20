import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function PageShell({ title, subtitle, icon: Icon, children }: PageShellProps) {
  return (
    <div className="flex-1 w-full p-6 overflow-y-auto lg:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          {Icon && (
            <div className="flex justify-center mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <div
      className={`rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
      )}
      {children}
    </div>
  );
}
