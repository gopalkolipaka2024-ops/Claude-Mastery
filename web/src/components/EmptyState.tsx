import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function EmptyState({ icon = "search", title, children, actions }: { icon?: IconName; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-primary"><Icon name={icon} size={28} /></span>
      <h2 className="text-2xl text-primary">{title}</h2>
      {children && <div className="text-text-muted">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
