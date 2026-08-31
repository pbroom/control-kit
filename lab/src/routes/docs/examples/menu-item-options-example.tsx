import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.js';
import { DropdownMenuItemContent, SelectTrigger } from '../../lab/lab-menu.js';

const DENSITIES = ['compact', 'comfortable'] as const;

export function MenuItemOptionsExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center gap-3 p-8">
      {DENSITIES.map((density) => (
        <DropdownMenu key={density}>
          <DropdownMenuTrigger asChild>
            <SelectTrigger>{density}</SelectTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" variant="ui3">
            <DropdownMenuItem
              density={density}
              typeaheadLabel="Duplicate layer"
              variant="ui3"
            >
              <DropdownMenuItemContent label="Duplicate" shortcut="⌘D" />
            </DropdownMenuItem>
            <DropdownMenuItem
              density={density}
              typeaheadLabel="Delete layer"
              variant="ui3"
            >
              <DropdownMenuItemContent label="Delete" shortcut="⌫" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}
