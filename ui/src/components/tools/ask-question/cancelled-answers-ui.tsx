import { MinusCircle } from 'lucide-react';

export function CancelledAnswersUI() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] py-0.5">
      <MinusCircle className="size-3 shrink-0" />
      <span>Questions skipped</span>
    </div>
  );
}
