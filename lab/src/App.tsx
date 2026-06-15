import {
  Activity,
  ArrowBigUp,
  ArrowLeftToLine,
  ArrowRightToLine,
  Braces,
  DecimalsArrowRight,
  Diff,
  Eye,
  History,
  Infinity as InfinityIcon,
  Monitor,
  Moon,
  MousePointer2,
  Option,
  Radius,
  RotateCw,
  SquareDashedMousePointer,
  Sun,
  Wand2,
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
  type PrimitiveVisualState,
  type PrimitiveWrapMode,
} from '@color-kit/control-kit';

type LabPageKey = 'primitive' | 'multi' | 'checkbox' | 'toggle' | 'tooltip';
type MultiFieldId = 'l' | 'c' | 'h' | 'a';
type ToggleMode = 'single' | 'multiple';
type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
type ThemeMode = 'system' | 'dark' | 'light';
type PrimitiveHandleContent = 'none' | 'letter' | 'icon' | 'swatch';
type PrimitiveScrubFieldId = 'dragStep' | 'stepDragDistance';

interface LabPage {
  key: LabPageKey;
  label: string;
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
  stepDragDistance: number;
  scrubThreshold: number;
  pointerLockEnabled: boolean;
  horizontalArrowKeysMoveCaret: boolean;
  disabled: boolean;
  readOnly: boolean;
  visualState: PrimitiveVisualState;
  density: PrimitiveDensity;
  placeholder: string;
  handleContent: PrimitiveHandleContent;
  handleSide: PrimitiveHandleSide;
  handleLetter: string;
}

interface MultiState {
  values: Record<MultiFieldId, number>;
  config: MultiInputConfig<MultiFieldId>;
  activeField: MultiFieldId;
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
  },
  {
    key: 'multi',
    label: 'Multi input',
  },
  {
    key: 'checkbox',
    label: 'Checkbox',
  },
  {
    key: 'toggle',
    label: 'Toggle group',
  },
  {
    key: 'tooltip',
    label: 'Tooltip',
  },
];

const THEME_MODES: ThemeMode[] = ['system', 'dark', 'light'];
const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

const INITIAL_PRIMITIVE_STATE: PrimitiveState = {
  value: 42,
  min: 0,
  max: 100,
  step: 1,
  fineStep: 0.1,
  coarseStep: 10,
  pageStep: 10,
  precision: 3,
  wrapMode: 'clamp',
  autoTrim: true,
  allowExpressions: true,
  selectAllOnFocus: true,
  commitOnBlur: true,
  scrubEnabled: true,
  stepDragDistance: 1,
  scrubThreshold: 2,
  pointerLockEnabled: true,
  horizontalArrowKeysMoveCaret: true,
  disabled: false,
  readOnly: false,
  visualState: 'auto',
  density: 'compact',
  placeholder: '0',
  handleContent: 'letter',
  handleSide: 'leading',
  handleLetter: 'V',
};

const MULTI_FIELDS: Array<MultiInputField<MultiFieldId>> = [
  {
    value: 'l',
    label: 'L',
    tooltip: 'Lightness',
    weight: 'flex-[0_1_44px]',
  },
  {
    value: 'c',
    label: 'C',
    tooltip: 'Chroma',
    weight: 'flex-[0_1_44px]',
  },
  {
    value: 'h',
    label: 'H',
    tooltip: 'Hue',
    weight: 'flex-[0_1_44px]',
  },
  {
    value: 'a',
    label: 'O',
    tooltip: 'Opacity',
    unit: '%',
    weight: 'flex-[1_1_65px]',
  },
];

const MULTI_FIELD_BY_ID = MULTI_FIELDS.reduce(
  (fields, field) => ({
    ...fields,
    [field.value]: field,
  }),
  {} as Record<MultiFieldId, MultiInputField<MultiFieldId>>,
);

const INITIAL_MULTI_CONFIG: MultiInputConfig<MultiFieldId> = {
  l: {
    min: 0,
    max: 1,
    step: 0.01,
    fineStep: 0.001,
    coarseStep: 0.1,
    pageStep: 0.1,
    precision: 3,
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
    pageStep: 0.05,
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
    pageStep: 30,
    precision: 1,
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
    c: 0.24,
    h: 28,
    a: 1,
  },
  config: INITIAL_MULTI_CONFIG,
  activeField: 'l',
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
  a: 'Opacity',
};

const MAX_PRIMITIVE_PRECISION_DIGITS = 12;

const PRIMITIVE_SCRUB_FIELDS: Array<MultiInputField<PrimitiveScrubFieldId>> = [
  {
    value: 'dragStep',
    label: 'D',
    tooltip: 'Drag step',
  },
  {
    value: 'stepDragDistance',
    label: '',
    tooltip: 'Step drag distance',
    unit: 'px',
  },
];

const PRIMITIVE_SCRUB_CONFIG: MultiInputConfig<PrimitiveScrubFieldId> = {
  dragStep: {
    min: 0,
    max: 1000,
    step: 0.1,
    fineStep: 0.01,
    coarseStep: 1,
    pageStep: 1,
    precision: 6,
    autoTrim: true,
    wrapMode: 'free',
    disabled: false,
  },
  stepDragDistance: {
    min: 0.01,
    max: 1000,
    step: 0.5,
    fineStep: 0.1,
    coarseStep: 2,
    pageStep: 4,
    precision: 2,
    autoTrim: true,
    wrapMode: 'clamp',
    disabled: false,
  },
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
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isEventLogVisible, setEventLogVisible] = useState(false);
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

  const ThemeIcon =
    themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Monitor;

  return (
    <div
      className="lab-shell"
      data-event-log={isEventLogVisible || undefined}
      data-theme={themeMode}
    >
      <main className="lab-body">
        <nav className="lab-rail" aria-label="Components">
          <div className="lab-rail-heading">Components</div>
          <div className="lab-page-list">
            {LAB_PAGES.map(({ key, label }) => (
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
                {label}
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

        <aside className="lab-inspector" aria-label="Properties">
          <div className="lab-inspector-title">
            <span>Properties</span>
            <div className="lab-inspector-actions">
              <button
                className="lab-icon-button"
                type="button"
                aria-label={`Theme: ${THEME_LABELS[themeMode]}. Switch theme.`}
                title={`Theme: ${THEME_LABELS[themeMode]}`}
                onClick={() =>
                  setThemeMode((current) => {
                    const currentIndex = THEME_MODES.indexOf(current);
                    return THEME_MODES[(currentIndex + 1) % THEME_MODES.length];
                  })
                }
              >
                <ThemeIcon aria-hidden="true" size={14} />
              </button>
              <button
                className="lab-icon-button"
                type="button"
                aria-label={
                  isEventLogVisible ? 'Hide event log' : 'Show event log'
                }
                aria-pressed={isEventLogVisible}
                data-active={isEventLogVisible || undefined}
                title={isEventLogVisible ? 'Hide event log' : 'Show event log'}
                onClick={() => setEventLogVisible((current) => !current)}
              >
                <History aria-hidden="true" size={14} />
              </button>
            </div>
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

      {isEventLogVisible ? <EventLog events={events} /> : null}
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
  const handleElement = getPrimitiveHandleElement(state);

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
        placeholder={state.placeholder}
        leadingElement={null}
        handleElement={handleElement}
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
        stepDragDistance={state.stepDragDistance}
        scrubThreshold={state.scrubThreshold}
        pointerLockEnabled={state.pointerLockEnabled}
        horizontalArrowKeysMoveCaret={state.horizontalArrowKeysMoveCaret}
        disabled={state.disabled}
        readOnly={state.readOnly}
        visualState={state.visualState}
        visualTreatment="default"
        size="sm"
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

function getPrimitiveHandleElement(state: PrimitiveState): ReactNode {
  switch (state.handleContent) {
    case 'none':
      return null;
    case 'letter':
      return state.handleLetter.trim().slice(0, 2) || null;
    case 'icon':
      return <MousePointer2 aria-hidden="true" size={12} strokeWidth={1.75} />;
    case 'swatch':
      return <span aria-hidden="true" className="handle-swatch" />;
  }
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
  const handleElement = getPrimitiveHandleElement(state);

  return (
    <>
      <PanelSection title="Input">
        <div className="panel-stack">
          <FieldGrid>
            <PrimitiveValueField
              label="Value"
              state={state}
              handleElement={handleElement}
              onChange={(value) => update('value', value)}
            />
            <TextField
              label="Placeholder"
              value={state.placeholder}
              maxLength={12}
              onChange={(value) => update('placeholder', value)}
            />
          </FieldGrid>
          <FieldGrid>
            <NumberField
              label="Min"
              value={state.min}
              leadingElement={<ArrowLeftToLine aria-hidden="true" size={12} />}
              onChange={(value) => update('min', Math.min(value, state.max))}
            />
            <NumberField
              label="Max"
              value={state.max}
              leadingElement={<ArrowRightToLine aria-hidden="true" size={12} />}
              onChange={(value) => update('max', Math.max(value, state.min))}
            />
          </FieldGrid>
          <FieldGrid>
            <NumberField
              label="Precision"
              value={state.precision}
              min={0}
              max={MAX_PRIMITIVE_PRECISION_DIGITS}
              wrapMode="clamp"
              step={1}
              precision={0}
              leadingElement={
                <DecimalsArrowRight aria-hidden="true" size={12} />
              }
              onChange={(value) =>
                update('precision', normalizePrimitivePrecision(value))
              }
            />
            <SegmentedField
              label="Bounds"
              value={state.wrapMode}
              options={[
                ['clamp', 'Clamp', <Braces aria-hidden="true" size={14} />],
                ['wrap', 'Wrap', <RotateCw aria-hidden="true" size={14} />],
                ['free', 'Free', <InfinityIcon aria-hidden="true" size={14} />],
              ]}
              onChange={(value) => update('wrapMode', value)}
            />
          </FieldGrid>
        </div>
      </PanelSection>

      <PanelSection
        title="Drag Handle"
        description="Choose what appears inside the scrub handle."
      >
        <div className="panel-stack">
          <SegmentedField
            label="Content"
            value={state.handleContent}
            options={[
              ['none', 'None'],
              ['letter', 'Letter'],
              ['icon', 'Icon'],
              ['swatch', 'Swatch'],
            ]}
            onChange={(value) => update('handleContent', value)}
          />
          <SegmentedField
            label="Side"
            value={state.handleSide}
            options={[
              ['leading', 'Leading'],
              ['trailing', 'Trailing'],
            ]}
            onChange={(value) => update('handleSide', value)}
          />
          {state.handleContent === 'letter' ? (
            <TextField
              label="Letter"
              value={state.handleLetter}
              maxLength={2}
              onChange={(value) => update('handleLetter', value)}
            />
          ) : null}
        </div>
      </PanelSection>

      <PanelSeparator />

      <PanelSection title="Stepping">
        <FieldGrid>
          <NumberField
            label="Step"
            value={state.step}
            step={0.1}
            leadingElement={<Diff aria-hidden="true" size={12} />}
            onChange={(value) => update('step', Math.max(0.0001, value))}
          />
          <DragStepField
            dragStep={state.step}
            stepDragDistance={state.stepDragDistance}
            onDragStepChange={(value) =>
              update('step', Math.max(0.0001, value))
            }
            onStepDragDistanceChange={(value) =>
              update('stepDragDistance', Math.max(0.01, value))
            }
          />
          <NumberField
            label="Fine"
            value={state.fineStep}
            step={0.1}
            leadingElement={<Option aria-hidden="true" size={12} />}
            onChange={(value) => update('fineStep', Math.max(0.0001, value))}
          />
          <NumberField
            label="Coarse"
            value={state.coarseStep}
            step={1}
            leadingElement={<ArrowBigUp aria-hidden="true" size={12} />}
            onChange={(value) => update('coarseStep', Math.max(0.0001, value))}
          />
        </FieldGrid>
      </PanelSection>

      <PanelSeparator />

      <PanelSection
        title="Behavior"
        description="Toggle text-entry affordances for the focused input."
      >
        <div className="panel-stack">
          <SwitchField
            label="Select all on focus"
            checked={state.selectAllOnFocus}
            onChange={(checked) => update('selectAllOnFocus', checked)}
          />
          <SwitchField
            label="Allow expressions"
            checked={state.allowExpressions}
            onChange={(checked) => update('allowExpressions', checked)}
          />
          <SwitchField
            label="Commit on blur"
            checked={state.commitOnBlur}
            onChange={(checked) => update('commitOnBlur', checked)}
          />
          <SwitchField
            label="Horizontal arrows move caret"
            checked={state.horizontalArrowKeysMoveCaret}
            onChange={(checked) =>
              update('horizontalArrowKeysMoveCaret', checked)
            }
          />
          <SwitchField
            label="Trim trailing zeros"
            checked={state.autoTrim}
            onChange={(checked) => update('autoTrim', checked)}
          />
        </div>
      </PanelSection>

      <PanelSeparator />

      <PanelSection
        title="Scrub"
        description="Adjust how far the pointer moves per channel step."
      >
        <div className="panel-stack">
          <SwitchField
            label="Enable scrub handle"
            checked={state.scrubEnabled}
            onChange={(checked) => update('scrubEnabled', checked)}
          />
          <SwitchField
            label="Use pointer lock"
            checked={state.pointerLockEnabled}
            onChange={(checked) => update('pointerLockEnabled', checked)}
          />
          <NumberField
            label="Drag threshold"
            value={state.scrubThreshold}
            min={0}
            max={1000}
            wrapMode="clamp"
            step={1}
            precision={6}
            leadingElement={<Radius aria-hidden="true" size={12} />}
            onChange={(value) => update('scrubThreshold', Math.max(0, value))}
          />
        </div>
      </PanelSection>

      <PanelSeparator />

      <PanelSection
        title="Visual State"
        description="Preview primitive sizing and state variants."
      >
        <div className="panel-stack">
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
            label="Validity"
            value={state.visualState}
            options={[
              ['auto', 'Auto'],
              ['valid', 'Valid'],
              ['invalid', 'Invalid'],
            ]}
            onChange={(value) => update('visualState', value)}
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
        </div>
      </PanelSection>
    </>
  );
}

function PrimitiveValueField({
  label,
  state,
  handleElement,
  onChange,
}: {
  label: string;
  state: PrimitiveState;
  handleElement: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <PrimitiveValueInput
        value={state.value}
        onValueChange={(nextValue) => onChange(nextValue)}
        ariaLabel={label}
        placeholder={state.placeholder}
        leadingElement={null}
        handleElement={handleElement}
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
        stepDragDistance={state.stepDragDistance}
        scrubThreshold={state.scrubThreshold}
        pointerLockEnabled={state.pointerLockEnabled}
        horizontalArrowKeysMoveCaret={state.horizontalArrowKeysMoveCaret}
        disabled={state.disabled}
        readOnly={state.readOnly}
        visualState={state.visualState}
        visualTreatment="default"
        size="full"
        density="compact"
      />
    </label>
  );
}

function DragStepField({
  dragStep,
  stepDragDistance,
  onDragStepChange,
  onStepDragDistanceChange,
}: {
  dragStep: number;
  stepDragDistance: number;
  onDragStepChange: (value: number) => void;
  onStepDragDistanceChange: (value: number) => void;
}) {
  const values: Record<PrimitiveScrubFieldId, number> = {
    dragStep,
    stepDragDistance,
  };

  return (
    <div className="control-field control-field-compact">
      <span className="sr-only">Drag step</span>
      <MultiInputControl
        values={values}
        config={PRIMITIVE_SCRUB_CONFIG}
        fields={PRIMITIVE_SCRUB_FIELDS}
        parseExpression={parsePrimitiveExpression}
        showLeadingLabels
        onFieldChange={(field, nextValue) => {
          if (field === 'dragStep') {
            onDragStepChange(nextValue);
            return;
          }

          const normalized = Number.isFinite(nextValue)
            ? Math.min(1000, Math.max(0.01, Number(nextValue.toFixed(4))))
            : 1;
          onStepDragDistanceChange(normalized);
        }}
      />
    </div>
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
  const activeFieldDefinition = MULTI_FIELD_BY_ID[state.activeField];
  const activeDisplayScale =
    activeFieldDefinition.displayScale ??
    (activeFieldDefinition.unit === '%' ? 100 : 1);

  return (
    <>
      <PanelSection
        title="Input Multi"
        description="Configure the selected color channel input."
      >
        <SegmentedField
          label="Segment"
          value={state.activeField}
          options={MULTI_FIELDS.map((field) => [field.value, field.label])}
          onChange={(value) =>
            setState((current) => ({ ...current, activeField: value }))
          }
        />
        <FieldGrid>
          <NumberField
            label="Min"
            value={activeConfig.min * activeDisplayScale}
            showLabel={false}
            step={activeConfig.step * activeDisplayScale}
            fineStep={activeConfig.fineStep * activeDisplayScale}
            coarseStep={activeConfig.coarseStep * activeDisplayScale}
            pageStep={activeConfig.pageStep * activeDisplayScale}
            precision={activeConfig.precision}
            leadingElement={<ArrowLeftToLine aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('min', value / activeDisplayScale)
            }
          />
          <NumberField
            label="Max"
            value={activeConfig.max * activeDisplayScale}
            showLabel={false}
            step={activeConfig.step * activeDisplayScale}
            fineStep={activeConfig.fineStep * activeDisplayScale}
            coarseStep={activeConfig.coarseStep * activeDisplayScale}
            pageStep={activeConfig.pageStep * activeDisplayScale}
            precision={activeConfig.precision}
            leadingElement={<ArrowRightToLine aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('max', value / activeDisplayScale)
            }
          />
        </FieldGrid>
        <FieldGrid>
          <NumberField
            label="Precision"
            value={activeConfig.precision}
            min={0}
            max={MAX_PRIMITIVE_PRECISION_DIGITS}
            wrapMode="clamp"
            step={1}
            precision={0}
            leadingElement={<DecimalsArrowRight aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('precision', normalizePrimitivePrecision(value))
            }
          />
          <SegmentedField
            label="Bounds"
            value={activeConfig.wrapMode}
            options={[
              ['clamp', 'Clamp', <Braces aria-hidden="true" size={14} />],
              ['wrap', 'Wrap', <RotateCw aria-hidden="true" size={14} />],
              ['free', 'Free', <InfinityIcon aria-hidden="true" size={14} />],
            ]}
            onChange={(value) => updateFieldConfig('wrapMode', value)}
          />
        </FieldGrid>
      </PanelSection>

      <PanelSeparator />

      <PanelSection title="Stepping">
        <FieldGrid>
          <NumberField
            label="Step"
            value={activeConfig.step * activeDisplayScale}
            showLabel={false}
            step={0.1}
            precision={6}
            leadingElement={<Diff aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('step', value / activeDisplayScale)
            }
          />
          <NumberField
            label="Fine"
            value={activeConfig.fineStep * activeDisplayScale}
            showLabel={false}
            step={0.1}
            precision={6}
            leadingElement={<Option aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('fineStep', value / activeDisplayScale)
            }
          />
          <NumberField
            label="Coarse"
            value={activeConfig.coarseStep * activeDisplayScale}
            showLabel={false}
            step={1}
            precision={6}
            leadingElement={<ArrowBigUp aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('coarseStep', value / activeDisplayScale)
            }
          />
          <NumberField
            label="Page"
            value={activeConfig.pageStep * activeDisplayScale}
            showLabel={false}
            step={1}
            precision={6}
            leadingElement={<ArrowRightToLine aria-hidden="true" size={12} />}
            onChange={(value) =>
              updateFieldConfig('pageStep', value / activeDisplayScale)
            }
          />
        </FieldGrid>
      </PanelSection>

      <PanelSeparator />

      <PanelSection title="Behavior">
        <div className="panel-stack">
          <SwitchField
            label="Trim trailing zeros"
            checked={activeConfig.autoTrim}
            onChange={(checked) => updateFieldConfig('autoTrim', checked)}
          />
          <SwitchField
            label="Disabled"
            checked={activeConfig.disabled}
            onChange={(checked) => updateFieldConfig('disabled', checked)}
          />
        </div>
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
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <div className="panel-section-header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="panel-section-body">{children}</div>
    </section>
  );
}

function PanelSeparator() {
  return <div className="panel-separator" role="presentation" />;
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

function NumberField({
  label,
  value,
  step = 1,
  fineStep = step / 10,
  coarseStep = step * 10,
  pageStep = step * 10,
  min = -100_000,
  max = 100_000,
  precision = Number.isInteger(step) ? 0 : 3,
  wrapMode = 'free',
  leadingElement = null,
  showLabel = true,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  fineStep?: number;
  coarseStep?: number;
  pageStep?: number;
  min?: number;
  max?: number;
  precision?: number;
  wrapMode?: PrimitiveWrapMode;
  leadingElement?: ReactNode;
  showLabel?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label
      className={`control-field ${showLabel ? '' : 'control-field-compact'}`}
    >
      <span className={showLabel ? undefined : 'sr-only'}>{label}</span>
      <PrimitiveValueInput
        value={Number.isFinite(value) ? value : 0}
        onValueChange={(nextValue) =>
          onChange(Math.min(max, Math.max(min, nextValue)))
        }
        ariaLabel={label}
        leadingElement={leadingElement}
        min={min}
        max={max}
        wrapMode={wrapMode}
        step={step}
        fineStep={fineStep}
        coarseStep={coarseStep}
        pageStep={pageStep}
        precision={precision}
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
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
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
  options: Array<[TValue, string, ReactNode?]>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="segmented-field">
      <span>{label}</span>
      <div className="segmented-control">
        {options.map(([optionValue, optionLabel, optionIcon]) => (
          <button
            key={optionValue}
            type="button"
            aria-label={`${label}: ${optionLabel}`}
            data-active={value === optionValue || undefined}
            onClick={() => onChange(optionValue)}
          >
            {optionIcon ? (
              <>
                <span className="segmented-icon" aria-hidden="true">
                  {optionIcon}
                </span>
                <span className="sr-only">{optionLabel}</span>
              </>
            ) : (
              optionLabel
            )}
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
