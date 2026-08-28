import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.js';
import { SelectList, SelectListItem } from '../../lab/lab-menu.js';

export function SelectPlacementExample() {
  const [value, setValue] = useState('Center');

  return (
    <div className="flex min-h-[320px] items-end justify-end p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-7 rounded-[5px] bg-white/10 px-2 text-xs text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#0d99ff] data-[state=open]:bg-[#0d99ff]"
            type="button"
          >
            Align: {value}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" variant="ui3">
          <SelectList value={value} onValueChange={setValue}>
            {['Start', 'Center', 'End'].map((option) => (
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
