import { Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from './theme-context.js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SelectList, SelectListItem } from '@/routes/lab/lab-menu';

const options: Array<{ label: string; value: ThemePreference }> = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export function ThemeSwitcher() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Theme"
        align="start"
        collisionPadding={8}
        side="right"
        sideOffset={8}
        variant="ui3"
        className="z-[80] w-[150px]"
      >
        <SelectList
          openAlignment="none"
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          {options.map((option) => (
            <SelectListItem key={option.value} value={option.value}>
              {option.label}
            </SelectListItem>
          ))}
        </SelectList>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
