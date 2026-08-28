import { useState } from 'react';
import { Star } from 'lucide-react';

export function ToggleButtonBasicExample() {
  const [selected, setSelected] = useState(false);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <button
        aria-pressed={selected}
        className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-xs text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#0d99ff] aria-pressed:bg-[#4d5876] aria-pressed:text-[#8dc2f3]"
        onClick={() => setSelected((current) => !current)}
        type="button"
      >
        <Star aria-hidden="true" className="size-3.5" />
        Favorite
      </button>
    </div>
  );
}
