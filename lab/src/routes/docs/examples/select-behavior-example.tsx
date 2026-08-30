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

export function SelectBehaviorExample() {
  const [value, setValue] = useState('Medium');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SelectTrigger>
            {value}
            <ChevronDown aria-hidden="true" data-icon="inline-end" />
          </SelectTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" variant="ui3">
          <SelectList
            closeOnSelect={false}
            onValueChange={setValue}
            openAlignment="none"
            value={value}
          >
            {OPTIONS.map((option) => (
              <SelectListItem
                density="comfortable"
                key={option}
                typeaheadLabel={`${option} size`}
                value={option}
              >
                {option}
              </SelectListItem>
            ))}
          </SelectList>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
