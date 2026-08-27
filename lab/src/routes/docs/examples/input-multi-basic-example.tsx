import { useState } from 'react';
import {
  MultiInputControl,
  type MultiInputConfig,
  type MultiInputField,
} from '@color-kit/control-kit';

type FieldId = 'x' | 'y';

const fields = [
  { value: 'x', label: 'X', tooltip: 'Horizontal position' },
  { value: 'y', label: 'Y', tooltip: 'Vertical position' },
] satisfies Array<MultiInputField<FieldId>>;

const config = {
  x: {
    min: 0,
    max: 100,
    step: 1,
    fineStep: 0.1,
    coarseStep: 10,
    pageStep: 10,
    precision: 1,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
  y: {
    min: 0,
    max: 100,
    step: 1,
    fineStep: 0.1,
    coarseStep: 10,
    pageStep: 10,
    precision: 1,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
} satisfies MultiInputConfig<FieldId>;

export function InputMultiExample() {
  const [values, setValues] = useState({ x: 50, y: 50 });

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <div className="w-64">
        <MultiInputControl
          config={config}
          fields={fields}
          onFieldChange={(field, value) => {
            setValues((current) => ({ ...current, [field]: value }));
          }}
          showLeadingLabels
          values={values}
        />
      </div>
    </div>
  );
}
