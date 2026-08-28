import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.js';
import { SelectList, SelectListItem } from '../../lab/lab-menu.js';

const OPTIONS = ['Copy', 'Duplicate', 'Delete'] as const;

export function SelectBasicExample() {
  const [value, setValue] = useState('Copy');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-white/10 px-2 text-xs text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#0d99ff] data-[state=open]:bg-[#0d99ff]"
            type="button"
          >
            {value}
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" variant="ui3">
          <SelectList value={value} onValueChange={setValue}>
            {OPTIONS.map((option) => (
              <SelectListItem key={option} value={option}>
                {option}
              </SelectListItem>
            ))}
          </SelectList>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
