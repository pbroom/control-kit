import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  usePrimitiveValueInput,
  type PrimitiveValueChangeDetails,
} from '@color-kit/control-kit';
import './styles.css';

// Mirrors Color Kit's channel-input boundary: the consumer owns the numeric
// value, renders the hook's native input/handle, and forwards interaction details.
function ChannelInput() {
  const [value, setValue] = useState(42);
  const [interaction, setInteraction] = useState('none');
  const input = usePrimitiveValueInput({
    value,
    onValueChange(next: number, details: PrimitiveValueChangeDetails) {
      setValue(next);
      setInteraction(details.interaction);
    },
    min: 0,
    max: 100,
    wrapMode: 'clamp',
    step: 1,
    fineStep: 0.1,
    coarseStep: 10,
    pageStep: 10,
    precision: 1,
    autoTrim: true,
    allowExpressions: false,
    selectAllOnFocus: true,
    commitOnBlur: true,
    scrubEnabled: true,
    scrubPixelsPerStep: 1,
    scrubThreshold: 1,
    pointerLockEnabled: false,
    horizontalArrowKeysMoveCaret: false,
    disabled: false,
    readOnly: false,
  });

  return (
    <div>
      <div ref={input.scrubHandleRef} {...input.scrubHandleProps}>
        Channel
      </div>
      <input
        ref={input.inputRef}
        {...input.inputProps}
        aria-label="Color channel"
      />
      <output data-testid="channel-value">{value}</output>
      <output data-testid="interaction">{interaction}</output>
    </div>
  );
}

function Consumer() {
  return (
    <main style={{ padding: 80 }}>
      <ChannelInput />
      <ToggleGroup type="single" defaultValue="rgb" aria-label="Color model">
        <ToggleGroupItem value="rgb">RGB</ToggleGroupItem>
        <ToggleGroupItem value="hsl">HSL</ToggleGroupItem>
      </ToggleGroup>
      <TooltipProvider delay={0} timeout={0}>
        <Tooltip>
          <TooltipTrigger render={<button type="button" />}>
            Channel help
          </TooltipTrigger>
          <TooltipContent highContrast={false}>Choose a channel</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<button type="button" />}>
            Inverse help
          </TooltipTrigger>
          <TooltipContent>Inverse tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Consumer />);
