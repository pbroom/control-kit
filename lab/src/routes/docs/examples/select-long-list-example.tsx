import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.js';
import { SelectList, SelectListItem } from '../../lab/lab-menu.js';

const VALUES = Array.from({ length: 16 }, (_, index) => String(index));

export function SelectLongListExample() {
  const [value, setValue] = useState('8');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-7 min-w-12 rounded-[5px] bg-white/10 px-2 text-xs text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#0d99ff] data-[state=open]:bg-[#0d99ff]"
            type="button"
          >
            {value}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="max-h-48 overflow-y-auto overscroll-contain"
          variant="ui3"
        >
          <SelectList value={value} onValueChange={setValue}>
            {VALUES.map((option) => (
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
