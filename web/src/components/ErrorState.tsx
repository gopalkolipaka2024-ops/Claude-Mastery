"use client";
import { Button } from "./Button";
import { Icon } from "./Icon";

export function ErrorState({ title = "Something went wrong", message, onRetry, retrying }: { title?: string; message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-danger-600/30 bg-danger-50 px-4 py-8 text-center">
      <span className="text-danger-600"><Icon name="alert" size={28} /></span>
      <h2 className="text-2xl text-danger-700">{title}</h2>
      <p className="text-danger-700">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry} loading={retrying}><Icon name="refresh" size={16} />Try again</Button>}
    </div>
  );
}
