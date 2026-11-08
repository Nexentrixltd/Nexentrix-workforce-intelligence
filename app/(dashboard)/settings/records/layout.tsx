import { LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";

export default function RecordsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LayoutGrid size={22} />
          </div>

          <h1 className="font-triakis text-3xl tracking-tight md:text-4xl">
            My Records
          </h1>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Keep your personal and payroll details up to date. HR reviews each section.
        </p>
      </div>

      {children}
    </div>
  );
}
