// Compile-time only, and not part of the public entry: `pnpm typecheck`
// fails here when a control's details stop fitting the shared shape.
import type { ControlChangeDetails } from './change-details.js';
import type {
  ControlFieldValueChangeDetails,
  ControlFieldValueCommitDetails,
} from './control-field.js';
import type {
  PlaneSnapChangeDetails,
  PlaneValueChangeDetails,
} from './plane/types.js';
import type { SliderProps } from './slider.js';

type Fits<Details extends ControlChangeDetails> = Details;
type DetailsOf<Callback> = Callback extends (
  value: never,
  details: infer Details,
) => unknown
  ? Details
  : never;

export type ControlChangeDetailsContract = [
  Fits<PlaneValueChangeDetails>,
  Fits<PlaneSnapChangeDetails>,
  Fits<ControlFieldValueChangeDetails>,
  Fits<ControlFieldValueCommitDetails>,
  Fits<DetailsOf<NonNullable<SliderProps['onValueChange']>>>,
  Fits<DetailsOf<NonNullable<SliderProps['onValueCommitted']>>>,
];
