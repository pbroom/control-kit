import { useState } from 'react';
import {
  MultiInputControl,
  type MultiInputConfig,
  type MultiInputField,
} from 'control-kit';

type FieldId = 'x' | 'y';

const fields = [
  { value: 'x', label: 'X', tooltip: 'Horizontal position' },
  { value: 'y', label: 'Y', tooltip: 'Vertical position' },
] satisfies Array<MultiInputField<FieldId>>;

// Only min and max are required; steps default to 1, Alt 0.1, and Shift 10.
const config = {
  x: { min: 0, max: 100, precision: 1 },
  y: { min: 0, max: 100, precision: 1 },
} satisfies MultiInputConfig<FieldId>;

export function InputMultiExample() {
  const [values, setValues] = useState({ x: 50, y: 50 });
  const [lastCommit, setLastCommit] = useState('None yet');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <div className="flex w-64 flex-col gap-2">
        <MultiInputControl
          config={config}
          fields={fields}
          onFieldChange={(field, value) => {
            setValues((current) => ({ ...current, [field]: value }));
          }}
          onFieldCommit={(field, value) => {
            // Persist or record history once per finished edit.
            setLastCommit(`${field.toUpperCase()} ${value}`);
          }}
          showLeadingLabels
          values={values}
        />
        <span className="text-xs text-white/55">Last commit: {lastCommit}</span>
      </div>
    </div>
  );
}
