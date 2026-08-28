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

export function SelectPlacementExample() {
  const [value, setValue] = useState('Center');

  return (
    <div className="flex min-h-[320px] items-end justify-end p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SelectTrigger>Align: {value}</SelectTrigger>
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
