import { Grid3X3, Star } from 'lucide-react';

export function ToggleButtonContentExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center gap-2 p-8">
      <button
        aria-label="Show grid"
        aria-pressed="false"
        className="inline-flex size-7 items-center justify-center rounded-[5px] text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#0d99ff]"
        type="button"
      >
        <Grid3X3 aria-hidden="true" className="size-3.5" />
      </button>
      <button
        aria-pressed="true"
        className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#4d5876] px-2 text-xs text-[#8dc2f3] outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]"
        type="button"
      >
        <Star aria-hidden="true" className="size-3.5" />
        Favorite
      </button>
      <button
        aria-pressed="false"
        className="inline-flex h-7 items-center rounded-[5px] px-2 text-xs text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#0d99ff]"
        type="button"
      >
        Preview
      </button>
    </div>
  );
}
