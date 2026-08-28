import { Star } from 'lucide-react';

const states = [
  { label: 'Off', pressed: false, disabled: false },
  { label: 'On', pressed: true, disabled: false },
  { label: 'Disabled', pressed: false, disabled: true },
] as const;

export function ToggleButtonStatesExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center gap-2 p-8">
      {states.map((state) => (
        <button
          key={state.label}
          aria-pressed={state.pressed}
          className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-xs text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#0d99ff] aria-pressed:bg-[#4d5876] aria-pressed:text-[#8dc2f3] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={state.disabled}
          type="button"
        >
          <Star aria-hidden="true" className="size-3.5" />
          {state.label}
        </button>
      ))}
    </div>
  );
}
