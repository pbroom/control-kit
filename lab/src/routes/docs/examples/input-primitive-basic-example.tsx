import { useState } from 'react';
import { PrimitiveValueInput } from 'control-kit';

export function InputPrimitiveExample() {
  const [value, setValue] = useState(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <PrimitiveValueInput
        allowExpressions={false}
        ariaLabel="Opacity"
        autoTrim
        coarseStep={10}
        commitOnBlur
        disabled={false}
        fineStep={0.1}
        max={100}
        min={0}
        onValueChange={setValue}
        pageStep={10}
        pointerLockEnabled={false}
        precision={1}
        readOnly={false}
        scrubEnabled
        scrubThreshold={2}
        selectAllOnFocus
        size="sm"
        step={1}
        trailingElement="%"
        value={value}
        visualState="auto"
        wrapMode="clamp"
      />
    </div>
  );
}
