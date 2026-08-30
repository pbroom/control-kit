import { useState } from 'react';
import { ToggleButtonPlaygroundStage } from '../../lab/shared.js';

export function ToggleButtonDensityExample() {
  const [compactSelected, setCompactSelected] = useState(false);
  const [comfortableSelected, setComfortableSelected] = useState(false);

  return (
    <div className="flex min-h-[320px] items-center justify-center gap-3 p-8">
      <ToggleButtonPlaygroundStage
        content="iconLabel"
        density="compact"
        disabled={false}
        interactionState="default"
        label="Compact"
        onSelectedChange={setCompactSelected}
        selected={compactSelected}
      />
      <ToggleButtonPlaygroundStage
        content="iconLabel"
        density="comfortable"
        disabled={false}
        interactionState="default"
        label="Comfortable"
        onSelectedChange={setComfortableSelected}
        selected={comfortableSelected}
      />
    </div>
  );
}
