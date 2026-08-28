import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

const OPTIONS = ['Small', 'Medium', 'Large'] as const;

export function SelectBasicExample() {
  const [value, setValue] = useState('Medium');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SelectTrigger>
            {value}
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </SelectTrigger>
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
