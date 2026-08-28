import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.js';
import {
  SelectList,
  SelectListItem,
  SelectTrigger,
} from '../../lab/lab-menu.js';

const VALUES = Array.from({ length: 16 }, (_, index) => String(index));

export function SelectLongListExample() {
  const [value, setValue] = useState('8');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SelectTrigger className="min-w-12">{value}</SelectTrigger>
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
