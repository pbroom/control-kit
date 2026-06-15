import {
  Activity,
  CheckSquare,
  Eye,
  History,
  MousePointer2,
  Settings2,
  SlidersHorizontal,
  SquareDashedMousePointer,
  ToggleLeft,
  Type,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  Checkbox,
  MultiInputControl,
  PrimitiveValueInput,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  normalizePrimitivePrecision,
  type MultiInputConfig,
  type MultiInputField,
  type PrimitiveDensity,
  type PrimitiveExpressionParser,
  type PrimitiveHandleSide,
  type PrimitiveSize,
  type PrimitiveVisualState,
  type PrimitiveVisualTreatment,
  type PrimitiveWrapMode,
} from '@color-kit/control-kit';

type LabPageKey = 'primitive' | 'multi' | 'checkbox' | 'toggle' | 'tooltip';
type MultiFieldId = 'l' | 'c' | 'h' | 'a';
type ToggleMode = 'single' | 'multiple';
type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

interface LabPage {
  key: LabPageKey;
  label: string;
  summary: string;
  Icon: LucideIcon;
}

interface EventLogEntry {
  id: string;
  source: string;
  message: string;
  time: string;
}

interface PrimitiveState {
  value: number;
  min: number;
  max: number;
  step: number;
  fineStep: number;
  coarseStep: number;
  pageStep: number;
  precision: number;
  wrapMode: PrimitiveWrapMode;
  autoTrim: boolean;
  allowExpressions: boolean;
  selectAllOnFocus: boolean;
  commitOnBlur: boolean;
  scrubEnabled: boolean;
  scrubPixelsPerStep: number;
  scrubThreshold: number;
  pointerLockEnabled: boolean;
  horizontalArrowKeysMoveCaret: boolean;
  disabled: boolean;
  readOnly: boolean;
  visualState: PrimitiveVisualState;
  visualTreatment: PrimitiveVisualTreatment;
  size: PrimitiveSize;
  density: PrimitiveDensity;
  handleSide: PrimitiveHandleSide;
  leadingElement: string;
  trailingElement: string;
  handleElement: string;
}

interface MultiState {
  values: Record<MultiFieldId, number>;
  config: MultiInputConfig<MultiFieldId>;
  activeField: MultiFieldId;
  showLeadingLabels: boolean;
}

interface CheckboxState {
  checked: boolean;
  disabled: boolean;
  label: string;
}

interface ToggleState {
  mode: ToggleMode;
  singleValue: string | undefined;
  multipleValues: string[];
  loop: boolean;
  disabled: boolean;
  variant: 'default' | 'outline';
  size: 'sm' | 'default' | 'lg';
}

interface TooltipState {
  side: TooltipSide;
  highContrast: boolean;
  showPointer: boolean;
  delayDuration: number;
  skipDelayDuration: number;
}

const LAB_PAGES: LabPage[] = [
  {
    key: 'primitive',
    label: 'Primitive input',
    summary: 'Numeric value, keyboard stepping, scrubbing, and draft commits.',
    Icon: Type,
  },
  {
    key: 'multi',
    label: 'Multi input',
    summary: 'Compound channel controls built from primitive inputs.',
    Icon: SlidersHorizontal,
  },
  {
    key: 'checkbox',
    label: 'Checkbox',
    summary: 'Checked, unchecked, disabled, and label treatments.',
    Icon: CheckSquare,
  },
  {
    key: 'toggle',
    label: 'Toggle group',
    summary: 'Single and multiple segmented toggle behavior.',
    Icon: ToggleLeft,
  },
  {
    key: 'tooltip',
    label: 'Tooltip',
    summary: 'Placement, contrast, pointer, and handoff timing.',
    Icon: MousePointer2,
  },
];

const INITIAL_PRIMITIVE_STATE: PrimitiveState = {
  value: 42,
  min: 0,
  max: 100,
  step: 1,
  fineStep: 0.1,
  coarseStep: 10,
  pageStep: 10,
  precision: 0,
  wrapMode: 'clamp',
  autoTrim: true,
  allowExpressions: true,
  selectAllOnFocus: true,
  commitOnBlur: true,
  scrubEnabled: true,
  scrubPixelsPerStep: 1,
  scrubThreshold: 1,
  pointerLockEnabled: false,
  horizontalArrowKeysMoveCaret: true,
  disabled: false,
  readOnly: false,
  visualState: 'auto',
  visualTreatment: 'default',
  size: 'lg',
  density: 'comfortable',
  handleSide: 'leading',
  leadingElement: 'V',
  trailingElement: 'px',
  handleElement: '',
};

const MULTI_FIELDS: Array<MultiInputField<MultiFieldId>> = [
  {
    value: 'l',
    label: 'L',
    tooltip: 'Lightness',
    unit: '%',
    displayScale: 100,
  },
  {
    value: 'c',
    label: 'C',
    tooltip: 'Chroma',
  },
  {
    value: 'h',
    label: 'H',
    tooltip: 'Hue',
    unit: 'deg',
  },
  {
    value: 'a',
    label: 'A',
    tooltip: 'Alpha',
    unit: '%',
    displayScale: 100,
  },
];

const INITIAL_MULTI_CONFIG: MultiInputConfig<MultiFieldId> = {
  l: {
    min: 0,
    max: 1,
    step: 0.01,
    fineStep: 0.001,
    coarseStep: 0.1,
    pageStep: 0.1,
    precision: 1,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
  c: {
    min: 0,
    max: 0.4,
    step: 0.01,
    fineStep: 0.001,
    coarseStep: 0.05,
    pageStep: 0.1,
    precision: 3,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
  h: {
    min: 0,
    max: 360,
    step: 1,
    fineStep: 0.1,
    coarseStep: 15,
    pageStep: 45,
    precision: 0,
    autoTrim: true,
    wrapMode: 'wrap',
    disabled: false,
  },
  a: {
    min: 0,
    max: 1,
    step: 0.01,
    fineStep: 0.001,
    coarseStep: 0.1,
    pageStep: 0.1,
    precision: 1,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
};

const INITIAL_MULTI_STATE: MultiState = {
  values: {
    l: 0.64,
    c: 0.18,
    h: 232,
    a: 1,
  },
  config: INITIAL_MULTI_CONFIG,
  activeField: 'l',
  showLeadingLabels: true,
};

const INITIAL_CHECKBOX_STATE: CheckboxState = {
  checked: true,
  disabled: false,
  label: 'Enable preview updates',
};

const INITIAL_TOGGLE_STATE: ToggleState = {
  mode: 'single',
  singleValue: 'inspect',
  multipleValues: ['grid', 'snap'],
  loop: true,
  disabled: false,
  variant: 'outline',
  size: 'default',
};

const INITIAL_TOOLTIP_STATE: TooltipState = {
  side: 'top',
  highContrast: true,
  showPointer: true,
  delayDuration: 250,
  skipDelayDuration: 300,
};

const FIELD_LABELS: Record<MultiFieldId, string> = {
  l: 'Lightness',
  c: 'Chroma',
  h: 'Hue',
  a: 'Alpha',
};

const parsePrimitiveExpression: PrimitiveExpressionParser = (
  draft,
  { allowExpressions, currentValue },
) => {
  const trimmed = draft.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (Number.isFinite(parsed)) return parsed;
  if (!allowExpressions) return null;

  const relativeMatch = trimmed.match(/^([+\-*/])\s*(-?\d+(?:\.\d+)?)$/);
  if (relativeMatch) {
    const operand = Number(relativeMatch[2]);
    switch (relativeMatch[1]) {
      case '+':
        return currentValue + operand;
      case '-':
        return currentValue - operand;
      case '*':
        return currentValue * operand;
      case '/':
        return operand === 0 ? null : currentValue / operand;
      default:
        return null;
    }
  }

  const binaryMatch = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/,
  );
  if (!binaryMatch) return null;

  const left = Number(binaryMatch[1]);
  const right = Number(binaryMatch[3]);
  switch (binaryMatch[2]) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? null : left / right;
    default:
      return null;
  }
};

function nextLogId(): string {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function formatLogTime(): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

export function App() {
  const [activePage, setActivePage] = useState<LabPageKey>('primitive');
  const [primitiveState, setPrimitiveState] = useState<PrimitiveState>(
    INITIAL_PRIMITIVE_STATE,
  );
  const [multiState, setMultiState] = useState<MultiState>(INITIAL_MULTI_STATE);
  const [checkboxState, setCheckboxState] = useState<CheckboxState>(
    INITIAL_CHECKBOX_STATE,
  );
  const [toggleState, setToggleState] =
    useState<ToggleState>(INITIAL_TOGGLE_STATE);
  const [tooltipState, setTooltipState] = useState<TooltipState>(
    INITIAL_TOOLTIP_STATE,
  );
  const [events, setEvents] = useState<EventLogEntry[]>([
    {
      id: 'boot',
      source: 'Lab',
      message: 'Ready for local component experiments.',
      time: formatLogTime(),
    },
  ]);

  const pushEvent = useCallback((source: string, message: string) => {
    setEvents((current) =>
      [
        {
          id: nextLogId(),
          source,
          message,
          time: formatLogTime(),
        },
        ...current,
      ].slice(0, 12),
    );
  }, []);

  return (
    <div className="lab-shell">
      <main className="lab-body">
        <nav className="lab-rail" aria-label="Components">
          <div className="lab-rail-heading">Components</div>
          <div className="lab-page-list">
            {LAB_PAGES.map(({ key, label, summary, Icon }) => (
              <button
                key={key}
                className="lab-page-button"
                data-active={activePage === key || undefined}
                type="button"
                onClick={() => {
                  setActivePage(key);
                  pushEvent('Lab', `Opened ${label}.`);
                }}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>
                  <strong>{label}</strong>
                  <small>{summary}</small>
                </span>
              </button>
            ))}
          </div>
        </nav>

        <section className="lab-stage-panel" aria-label="Live preview">
          <div className="lab-stage">
            {activePage === 'primitive' ? (
              <PrimitiveDemo
                state={primitiveState}
                setState={setPrimitiveState}
                onEvent={pushEvent}
              />
            ) : null}
            {activePage === 'multi' ? (
              <MultiInputDemo
                state={multiState}
                setState={setMultiState}
                onEvent={pushEvent}
              />
            ) : null}
            {activePage === 'checkbox' ? (
              <CheckboxDemo
                state={checkboxState}
                setState={setCheckboxState}
                onEvent={pushEvent}
              />
            ) : null}
            {activePage === 'toggle' ? (
              <ToggleDemo
                state={toggleState}
                setState={setToggleState}
                onEvent={pushEvent}
              />
            ) : null}
            {activePage === 'tooltip' ? (
              <TooltipDemo state={tooltipState} onEvent={pushEvent} />
            ) : null}
          </div>
        </section>

        <aside className="lab-inspector" aria-label="Inspector">
          <div className="lab-inspector-title">
            <Settings2 aria-hidden="true" size={16} />
            <span>Inspector</span>
          </div>
          {activePage === 'primitive' ? (
            <PrimitiveInspector
              state={primitiveState}
              setState={setPrimitiveState}
            />
          ) : null}
          {activePage === 'multi' ? (
            <MultiInputInspector state={multiState} setState={setMultiState} />
          ) : null}
          {activePage === 'checkbox' ? (
            <CheckboxInspector
              state={checkboxState}
              setState={setCheckboxState}
            />
          ) : null}
          {activePage === 'toggle' ? (
            <ToggleInspector state={toggleState} setState={setToggleState} />
          ) : null}
          {activePage === 'tooltip' ? (
            <TooltipInspector state={tooltipState} setState={setTooltipState} />
          ) : null}
        </aside>
      </main>

      <EventLog events={events} />
    </div>
  );
}

function PrimitiveDemo({
  state,
  setState,
  onEvent,
}: {
  state: PrimitiveState;
  setState: Dispatch<SetStateAction<PrimitiveState>>;
  onEvent: (source: string, message: string) => void;
}) {
  const isScrubbingRef = useRef(false);

  return (
    <div className="primitive-demo">
      <PrimitiveValueInput
        value={state.value}
        onValueChange={(value, details) => {
          setState((current) => ({ ...current, value }));
          onEvent(
            'Primitive input',
            `${details.interaction} committed ${formatNumber(value)}.`,
          );
        }}
        ariaLabel="Primitive input value"
        leadingElement={state.leadingElement || null}
        trailingElement={state.trailingElement || null}
        handleElement={state.handleElement || undefined}
        handleSide={state.handleSide}
        min={state.min}
        max={state.max}
        wrapMode={state.wrapMode}
        step={state.step}
        fineStep={state.fineStep}
        coarseStep={state.coarseStep}
        pageStep={state.pageStep}
        precision={state.precision}
        autoTrim={state.autoTrim}
        allowExpressions={state.allowExpressions}
        parseExpression={parsePrimitiveExpression}
        selectAllOnFocus={state.selectAllOnFocus}
        commitOnBlur={state.commitOnBlur}
        scrubEnabled={state.scrubEnabled}
        scrubPixelsPerStep={state.scrubPixelsPerStep}
        scrubThreshold={state.scrubThreshold}
        pointerLockEnabled={state.pointerLockEnabled}
        horizontalArrowKeysMoveCaret={state.horizontalArrowKeysMoveCaret}
        disabled={state.disabled}
        readOnly={state.readOnly}
        visualState={state.visualState}
        visualTreatment={state.visualTreatment}
        size={state.size}
        density={state.density}
        onInvalidCommit={(draft) =>
          onEvent('Primitive input', `Rejected draft "${draft}".`)
        }
        onScrubbingChange={(isScrubbing) =>
          setScrubbingState(isScrubbingRef, isScrubbing, onEvent)
        }
      />
    </div>
  );
}

function setScrubbingState(
  isScrubbingRef: MutableRefObject<boolean>,
  isScrubbing: boolean,
  onEvent: (source: string, message: string) => void,
) {
  if (isScrubbingRef.current === isScrubbing) return;
  isScrubbingRef.current = isScrubbing;
  onEvent('Primitive input', isScrubbing ? 'Scrub started.' : 'Scrub ended.');
}

function MultiInputDemo({
  state,
  setState,
  onEvent,
}: {
  state: MultiState;
  setState: Dispatch<SetStateAction<MultiState>>;
  onEvent: (source: string, message: string) => void;
}) {
  return (
    <div className="multi-demo">
      <MultiInputControl
        values={state.values}
        config={state.config}
        fields={MULTI_FIELDS}
        showLeadingLabels={state.showLeadingLabels}
        parseExpression={parsePrimitiveExpression}
        onFieldChange={(field, value) => {
          setState((current) => ({
            ...current,
            values: {
              ...current.values,
              [field]: value,
            },
          }));
          onEvent(
            'Multi input',
            `${FIELD_LABELS[field]} changed to ${formatNumber(value)}.`,
          );
        }}
      />
    </div>
  );
}

function CheckboxDemo({
  state,
  setState,
  onEvent,
}: {
  state: CheckboxState;
  setState: Dispatch<SetStateAction<CheckboxState>>;
  onEvent: (source: string, message: string) => void;
}) {
  return (
    <div className="checkbox-demo">
      <Checkbox
        checked={state.checked}
        disabled={state.disabled}
        onCheckedChange={(checked) => {
          const nextChecked = checked === true;
          setState((current) => ({ ...current, checked: nextChecked }));
          onEvent('Checkbox', nextChecked ? 'Checked.' : 'Unchecked.');
        }}
      >
        {state.label}
      </Checkbox>
    </div>
  );
}

function ToggleDemo({
  state,
  setState,
  onEvent,
}: {
  state: ToggleState;
  setState: Dispatch<SetStateAction<ToggleState>>;
  onEvent: (source: string, message: string) => void;
}) {
  return (
    <div className="toggle-demo">
      {state.mode === 'single' ? (
        <ToggleGroup
          type="single"
          value={state.singleValue}
          variant={state.variant}
          size={state.size}
          loop={state.loop}
          className="lab-toggle-group"
          onValueChange={(value) => {
            setState((current) => ({ ...current, singleValue: value }));
            onEvent('Toggle group', `Selected ${value ?? 'none'}.`);
          }}
        >
          <ToggleGroupItem value="inspect" disabled={state.disabled}>
            <Eye aria-hidden="true" size={14} />
            Inspect
          </ToggleGroupItem>
          <ToggleGroupItem value="tune" disabled={state.disabled}>
            <Wand2 aria-hidden="true" size={14} />
            Tune
          </ToggleGroupItem>
          <ToggleGroupItem value="events" disabled={state.disabled}>
            <History aria-hidden="true" size={14} />
            Events
          </ToggleGroupItem>
        </ToggleGroup>
      ) : (
        <ToggleGroup
          type="multiple"
          value={state.multipleValues}
          variant={state.variant}
          size={state.size}
          loop={state.loop}
          className="lab-toggle-group"
          onValueChange={(value) => {
            setState((current) => ({ ...current, multipleValues: value }));
            onEvent(
              'Toggle group',
              `Active values: ${value.join(', ') || 'none'}.`,
            );
          }}
        >
          <ToggleGroupItem value="grid" disabled={state.disabled}>
            <SquareDashedMousePointer aria-hidden="true" size={14} />
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="snap" disabled={state.disabled}>
            <MousePointer2 aria-hidden="true" size={14} />
            Snap
          </ToggleGroupItem>
          <ToggleGroupItem value="trace" disabled={state.disabled}>
            <Activity aria-hidden="true" size={14} />
            Trace
          </ToggleGroupItem>
        </ToggleGroup>
      )}
    </div>
  );
}

function TooltipDemo({
  state,
  onEvent,
}: {
  state: TooltipState;
  onEvent: (source: string, message: string) => void;
}) {
  return (
    <TooltipProvider
      delayDuration={state.delayDuration}
      skipDelayDuration={state.skipDelayDuration}
    >
      <div className="tooltip-demo">
        {['Layer', 'Bounds', 'State', 'Export'].map((label) => (
          <Tooltip
            key={label}
            onOpenChange={(open) =>
              onEvent('Tooltip', `${label} ${open ? 'opened' : 'closed'}.`)
            }
          >
            <TooltipTrigger asChild>
              <button type="button" className="tooltip-target">
                <MousePointer2 aria-hidden="true" size={16} />
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side={state.side}
              highContrast={state.highContrast}
              showPointer={state.showPointer}
            >
              {label} tooltip preview
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

function PrimitiveInspector({
  state,
  setState,
}: {
  state: PrimitiveState;
  setState: Dispatch<SetStateAction<PrimitiveState>>;
}) {
  const update = <K extends keyof PrimitiveState>(
    key: K,
    value: PrimitiveState[K],
  ) => setState((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PanelSection title="Value">
        <NumberField
          label="Value"
          value={state.value}
          step={state.step}
          onChange={(value) => update('value', value)}
        />
        <SegmentedField
          label="Visual state"
          value={state.visualState}
          options={[
            ['auto', 'Auto'],
            ['valid', 'Valid'],
            ['invalid', 'Invalid'],
          ]}
          onChange={(value) => update('visualState', value)}
        />
      </PanelSection>
      <PanelSection title="Bounds">
        <FieldGrid>
          <NumberField
            label="Min"
            value={state.min}
            onChange={(value) => update('min', Math.min(value, state.max))}
          />
          <NumberField
            label="Max"
            value={state.max}
            onChange={(value) => update('max', Math.max(value, state.min))}
          />
        </FieldGrid>
        <SegmentedField
          label="Mode"
          value={state.wrapMode}
          options={[
            ['clamp', 'Clamp'],
            ['wrap', 'Wrap'],
            ['free', 'Free'],
          ]}
          onChange={(value) => update('wrapMode', value)}
        />
      </PanelSection>
      <PanelSection title="Precision">
        <FieldGrid>
          <NumberField
            label="Step"
            value={state.step}
            step={0.1}
            onChange={(value) => update('step', Math.max(0.0001, value))}
          />
          <NumberField
            label="Fine"
            value={state.fineStep}
            step={0.01}
            onChange={(value) => update('fineStep', Math.max(0.0001, value))}
          />
          <NumberField
            label="Coarse"
            value={state.coarseStep}
            step={1}
            onChange={(value) => update('coarseStep', Math.max(0.0001, value))}
          />
          <NumberField
            label="Page"
            value={state.pageStep}
            step={1}
            onChange={(value) => update('pageStep', Math.max(0.0001, value))}
          />
        </FieldGrid>
        <NumberField
          label="Digits"
          value={state.precision}
          step={1}
          onChange={(value) =>
            update('precision', normalizePrimitivePrecision(value))
          }
        />
      </PanelSection>
      <PanelSection title="Scrubbing">
        <SwitchField
          label="Scrub enabled"
          checked={state.scrubEnabled}
          onChange={(checked) => update('scrubEnabled', checked)}
        />
        <FieldGrid>
          <NumberField
            label="Pixels/step"
            value={state.scrubPixelsPerStep}
            step={0.5}
            onChange={(value) =>
              update('scrubPixelsPerStep', Math.max(0.1, value))
            }
          />
          <NumberField
            label="Threshold"
            value={state.scrubThreshold}
            step={1}
            onChange={(value) =>
              update('scrubThreshold', Math.max(0, Math.round(value)))
            }
          />
        </FieldGrid>
        <SwitchField
          label="Pointer lock"
          checked={state.pointerLockEnabled}
          onChange={(checked) => update('pointerLockEnabled', checked)}
        />
      </PanelSection>
      <PanelSection title="Density">
        <SegmentedField
          label="Size"
          value={state.size}
          options={[
            ['sm', 'Sm'],
            ['md', 'Md'],
            ['lg', 'Lg'],
            ['full', 'Full'],
          ]}
          onChange={(value) => update('size', value)}
        />
        <SegmentedField
          label="Density"
          value={state.density}
          options={[
            ['compact', 'Compact'],
            ['comfortable', 'Comfort'],
          ]}
          onChange={(value) => update('density', value)}
        />
        <SegmentedField
          label="Treatment"
          value={state.visualTreatment}
          options={[
            ['default', 'Default'],
            ['embedded', 'Embedded'],
          ]}
          onChange={(value) => update('visualTreatment', value)}
        />
      </PanelSection>
      <PanelSection title="Handle">
        <SegmentedField
          label="Side"
          value={state.handleSide}
          options={[
            ['leading', 'Leading'],
            ['trailing', 'Trailing'],
          ]}
          onChange={(value) => update('handleSide', value)}
        />
        <TextField
          label="Leading"
          value={state.leadingElement}
          onChange={(value) => update('leadingElement', value)}
        />
        <TextField
          label="Trailing"
          value={state.trailingElement}
          onChange={(value) => update('trailingElement', value)}
        />
        <TextField
          label="Handle"
          value={state.handleElement}
          onChange={(value) => update('handleElement', value)}
        />
      </PanelSection>
      <PanelSection title="Behavior">
        <SwitchField
          label="Auto trim"
          checked={state.autoTrim}
          onChange={(checked) => update('autoTrim', checked)}
        />
        <SwitchField
          label="Expressions"
          checked={state.allowExpressions}
          onChange={(checked) => update('allowExpressions', checked)}
        />
        <SwitchField
          label="Select on focus"
          checked={state.selectAllOnFocus}
          onChange={(checked) => update('selectAllOnFocus', checked)}
        />
        <SwitchField
          label="Commit on blur"
          checked={state.commitOnBlur}
          onChange={(checked) => update('commitOnBlur', checked)}
        />
        <SwitchField
          label="Arrow keys move caret"
          checked={state.horizontalArrowKeysMoveCaret}
          onChange={(checked) =>
            update('horizontalArrowKeysMoveCaret', checked)
          }
        />
        <SwitchField
          label="Disabled"
          checked={state.disabled}
          onChange={(checked) => update('disabled', checked)}
        />
        <SwitchField
          label="Read only"
          checked={state.readOnly}
          onChange={(checked) => update('readOnly', checked)}
        />
      </PanelSection>
    </>
  );
}

function MultiInputInspector({
  state,
  setState,
}: {
  state: MultiState;
  setState: Dispatch<SetStateAction<MultiState>>;
}) {
  const activeConfig = state.config[state.activeField];

  const updateFieldConfig = <
    K extends keyof MultiInputConfig<MultiFieldId>[MultiFieldId],
  >(
    key: K,
    value: MultiInputConfig<MultiFieldId>[MultiFieldId][K],
  ) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [current.activeField]: {
          ...current.config[current.activeField],
          [key]: value,
        },
      },
    }));
  };

  return (
    <>
      <PanelSection title="Segment">
        <SegmentedField
          label="Active"
          value={state.activeField}
          options={[
            ['l', 'L'],
            ['c', 'C'],
            ['h', 'H'],
            ['a', 'A'],
          ]}
          onChange={(value) =>
            setState((current) => ({ ...current, activeField: value }))
          }
        />
        <SwitchField
          label="Leading labels"
          checked={state.showLeadingLabels}
          onChange={(checked) =>
            setState((current) => ({
              ...current,
              showLeadingLabels: checked,
            }))
          }
        />
      </PanelSection>
      <PanelSection title="Bounds">
        <FieldGrid>
          <NumberField
            label="Min"
            value={activeConfig.min}
            step={0.01}
            onChange={(value) => updateFieldConfig('min', value)}
          />
          <NumberField
            label="Max"
            value={activeConfig.max}
            step={0.01}
            onChange={(value) => updateFieldConfig('max', value)}
          />
        </FieldGrid>
        <SegmentedField
          label="Mode"
          value={activeConfig.wrapMode}
          options={[
            ['clamp', 'Clamp'],
            ['wrap', 'Wrap'],
            ['free', 'Free'],
          ]}
          onChange={(value) => updateFieldConfig('wrapMode', value)}
        />
      </PanelSection>
      <PanelSection title="Precision">
        <FieldGrid>
          <NumberField
            label="Step"
            value={activeConfig.step}
            step={0.01}
            onChange={(value) => updateFieldConfig('step', value)}
          />
          <NumberField
            label="Fine"
            value={activeConfig.fineStep}
            step={0.001}
            onChange={(value) => updateFieldConfig('fineStep', value)}
          />
          <NumberField
            label="Coarse"
            value={activeConfig.coarseStep}
            step={0.01}
            onChange={(value) => updateFieldConfig('coarseStep', value)}
          />
          <NumberField
            label="Page"
            value={activeConfig.pageStep}
            step={0.01}
            onChange={(value) => updateFieldConfig('pageStep', value)}
          />
        </FieldGrid>
        <NumberField
          label="Digits"
          value={activeConfig.precision}
          step={1}
          onChange={(value) =>
            updateFieldConfig('precision', normalizePrimitivePrecision(value))
          }
        />
        <SwitchField
          label="Auto trim"
          checked={activeConfig.autoTrim}
          onChange={(checked) => updateFieldConfig('autoTrim', checked)}
        />
        <SwitchField
          label="Disabled"
          checked={activeConfig.disabled}
          onChange={(checked) => updateFieldConfig('disabled', checked)}
        />
      </PanelSection>
    </>
  );
}

function CheckboxInspector({
  state,
  setState,
}: {
  state: CheckboxState;
  setState: Dispatch<SetStateAction<CheckboxState>>;
}) {
  return (
    <>
      <PanelSection title="State">
        <SwitchField
          label="Checked"
          checked={state.checked}
          onChange={(checked) =>
            setState((current) => ({ ...current, checked }))
          }
        />
        <SwitchField
          label="Disabled"
          checked={state.disabled}
          onChange={(disabled) =>
            setState((current) => ({ ...current, disabled }))
          }
        />
      </PanelSection>
      <PanelSection title="Label">
        <TextField
          label="Text"
          value={state.label}
          onChange={(label) => setState((current) => ({ ...current, label }))}
        />
      </PanelSection>
    </>
  );
}

function ToggleInspector({
  state,
  setState,
}: {
  state: ToggleState;
  setState: Dispatch<SetStateAction<ToggleState>>;
}) {
  return (
    <>
      <PanelSection title="Mode">
        <SegmentedField
          label="Selection"
          value={state.mode}
          options={[
            ['single', 'Single'],
            ['multiple', 'Multiple'],
          ]}
          onChange={(mode) => setState((current) => ({ ...current, mode }))}
        />
        <SegmentedField
          label="Variant"
          value={state.variant}
          options={[
            ['default', 'Default'],
            ['outline', 'Outline'],
          ]}
          onChange={(variant) =>
            setState((current) => ({ ...current, variant }))
          }
        />
        <SegmentedField
          label="Size"
          value={state.size}
          options={[
            ['sm', 'Sm'],
            ['default', 'Default'],
            ['lg', 'Lg'],
          ]}
          onChange={(size) => setState((current) => ({ ...current, size }))}
        />
      </PanelSection>
      <PanelSection title="Behavior">
        <SwitchField
          label="Loop focus"
          checked={state.loop}
          onChange={(loop) => setState((current) => ({ ...current, loop }))}
        />
        <SwitchField
          label="Disabled"
          checked={state.disabled}
          onChange={(disabled) =>
            setState((current) => ({ ...current, disabled }))
          }
        />
      </PanelSection>
    </>
  );
}

function TooltipInspector({
  state,
  setState,
}: {
  state: TooltipState;
  setState: Dispatch<SetStateAction<TooltipState>>;
}) {
  return (
    <>
      <PanelSection title="Placement">
        <SegmentedField
          label="Side"
          value={state.side}
          options={[
            ['top', 'Top'],
            ['right', 'Right'],
            ['bottom', 'Bottom'],
            ['left', 'Left'],
          ]}
          onChange={(side) => setState((current) => ({ ...current, side }))}
        />
      </PanelSection>
      <PanelSection title="Visual state">
        <SwitchField
          label="High contrast"
          checked={state.highContrast}
          onChange={(highContrast) =>
            setState((current) => ({ ...current, highContrast }))
          }
        />
        <SwitchField
          label="Pointer"
          checked={state.showPointer}
          onChange={(showPointer) =>
            setState((current) => ({ ...current, showPointer }))
          }
        />
      </PanelSection>
      <PanelSection title="Timing">
        <NumberField
          label="Delay"
          value={state.delayDuration}
          step={50}
          onChange={(delayDuration) =>
            setState((current) => ({
              ...current,
              delayDuration: Math.max(0, delayDuration),
            }))
          }
        />
        <NumberField
          label="Skip delay"
          value={state.skipDelayDuration}
          step={50}
          onChange={(skipDelayDuration) =>
            setState((current) => ({
              ...current,
              skipDelayDuration: Math.max(0, skipDelayDuration),
            }))
          }
        />
      </PanelSection>
    </>
  );
}

function EventLog({ events }: { events: EventLogEntry[] }) {
  return (
    <footer className="event-log" aria-label="Event log">
      <div className="event-log-title">
        <History aria-hidden="true" size={15} />
        <span>Event log</span>
      </div>
      <div className="event-log-items">
        {events.map((event) => (
          <div className="event-log-row" key={event.id}>
            <time>{event.time}</time>
            <strong>{event.source}</strong>
            <span>{event.message}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      <div className="panel-section-body">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <PrimitiveValueInput
        value={Number.isFinite(value) ? value : 0}
        onValueChange={(nextValue) => onChange(nextValue)}
        ariaLabel={label}
        leadingElement={null}
        min={-100_000}
        max={100_000}
        wrapMode="free"
        step={step}
        fineStep={step / 10}
        coarseStep={step * 10}
        pageStep={step * 10}
        precision={Number.isInteger(step) ? 0 : 3}
        autoTrim
        allowExpressions
        parseExpression={parsePrimitiveExpression}
        selectAllOnFocus
        commitOnBlur
        scrubEnabled
        scrubPixelsPerStep={1}
        scrubThreshold={1}
        pointerLockEnabled={false}
        disabled={false}
        readOnly={false}
        visualState="auto"
        size="full"
        density="compact"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      className="switch-field"
      onCheckedChange={(nextChecked) => onChange(nextChecked === true)}
    >
      {label}
    </Checkbox>
  );
}

function SegmentedField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="segmented-field">
      <span>{label}</span>
      <div className="segmented-control">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            data-active={value === optionValue || undefined}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}
