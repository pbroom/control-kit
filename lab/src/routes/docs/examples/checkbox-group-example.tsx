import { useState } from 'react';
import { Checkbox } from '@color-kit/control-kit';

type GuideSettings = {
  grid: boolean;
  guides: boolean;
  rulers: boolean;
};

export function CheckboxGroupExample() {
  const [settings, setSettings] = useState<GuideSettings>({
    grid: true,
    guides: false,
    rulers: true,
  });

  function setSetting(name: keyof GuideSettings, checked: boolean) {
    setSettings((current) => ({ ...current, [name]: checked }));
  }

  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <fieldset className="flex w-48 flex-col gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">
          Canvas overlays
        </legend>
        <Checkbox
          checked={settings.grid}
          name="grid"
          onCheckedChange={(checked) => setSetting('grid', checked)}
        >
          Grid
        </Checkbox>
        <Checkbox
          checked={settings.guides}
          name="guides"
          onCheckedChange={(checked) => setSetting('guides', checked)}
        >
          Guides
        </Checkbox>
        <Checkbox
          checked={settings.rulers}
          name="rulers"
          onCheckedChange={(checked) => setSetting('rulers', checked)}
        >
          Rulers
        </Checkbox>
      </fieldset>
    </div>
  );
}
