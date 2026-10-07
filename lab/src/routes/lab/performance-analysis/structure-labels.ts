/*
 * Callout labels for the Structure figure: a slot solver (keep labels near
 * their part's height, in that order, never overlapping) and a spring that
 * makes labels trail their slots. When two labels have to trade places, the
 * one that has further to go slides out to the right while it passes, so
 * their text never overlaps; the leader line stretches to follow it.
 *
 * Pure functions, px units, y down. No DOM.
 */

export type LabelTarget = {
  height: number;
  id: string;
  /** Where the label would like to sit (its part's leader anchor). */
  targetY: number;
  width: number;
};

export type LabelBody = {
  /** Horizontal slide used while passing another label. */
  dx: number;
  id: string;
  vdx: number;
  vy: number;
  y: number;
};

export type LabelSpring = {
  damping: number;
  mass: number;
  stiffness: number;
};

export const LABEL_SPRING: LabelSpring = {
  damping: 22,
  mass: 1,
  stiffness: 170,
};

export type LabelBounds = {
  /** Minimum clear space between two labels' boxes. */
  gap: number;
  maxY: number;
  minY: number;
};

const SETTLE_DISTANCE = 0.25;
const SETTLE_SPEED = 0.5;
const PASS_MARGIN = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function spacing(a: LabelTarget, b: LabelTarget, gap: number) {
  return (a.height + b.height) / 2 + gap;
}

/**
 * Non-overlapping centre y per label: ordered by target, as close to each
 * target as the spacing allows, kept inside the bounds where possible.
 */
export function solveLabelSlots(
  targets: readonly LabelTarget[],
  bounds: LabelBounds,
): Map<string, number> {
  const ordered = targets
    .map((target) => ({
      ...target,
      desired: clamp(
        target.targetY,
        bounds.minY + target.height / 2,
        bounds.maxY - target.height / 2,
      ),
    }))
    .sort((a, b) => a.desired - b.desired || a.id.localeCompare(b.id));
  const slots: number[] = [];

  ordered.forEach((label, index) => {
    const previous = ordered[index - 1];
    const floor = previous
      ? slots[index - 1]! + spacing(previous, label, bounds.gap)
      : -Infinity;
    slots.push(Math.max(label.desired, floor));
  });

  // Pushed past the bottom: shift the run up, keeping the spacing.
  const last = ordered.at(-1);
  if (last) {
    const overflow = slots.at(-1)! + last.height / 2 - bounds.maxY;

    if (overflow > 0) {
      for (let index = ordered.length - 1; index >= 0; index -= 1) {
        const next = ordered[index + 1];
        slots[index] = Math.min(
          slots[index]! - overflow,
          next
            ? slots[index + 1]! - spacing(ordered[index]!, next, bounds.gap)
            : Infinity,
        );
      }
    }
  }

  return new Map(ordered.map((label, index) => [label.id, slots[index]!]));
}

/** Labels at rest in their slots (also the reduced-motion behaviour). */
export function snapLabels(
  targets: readonly LabelTarget[],
  bounds: LabelBounds,
): LabelBody[] {
  const slots = solveLabelSlots(targets, bounds);

  return targets.map((target) => ({
    dx: 0,
    id: target.id,
    vdx: 0,
    vy: 0,
    y: slots.get(target.id)!,
  }));
}

function springStep(
  position: number,
  velocity: number,
  goal: number,
  dt: number,
  spring: LabelSpring,
) {
  const force =
    -spring.stiffness * (position - goal) - spring.damping * velocity;
  const nextVelocity = velocity + (force / spring.mass) * dt;

  return { position: position + nextVelocity * dt, velocity: nextVelocity };
}

/**
 * One frame. Bodies spring toward their slots; neighbours that keep their
 * order are pushed apart to the minimum spacing; neighbours that are
 * trading places let the one with further to go slide right until clear.
 * Returns the new bodies and whether everything has come to rest.
 */
export function stepLabels(
  bodies: readonly LabelBody[],
  targets: readonly LabelTarget[],
  bounds: LabelBounds,
  dtSeconds: number,
  spring: LabelSpring = LABEL_SPRING,
): { bodies: LabelBody[]; settled: boolean } {
  const slots = solveLabelSlots(targets, bounds);
  const targetById = new Map(targets.map((target) => [target.id, target]));
  const previous = new Map(bodies.map((body) => [body.id, body]));
  // New labels start in their slot.
  let next: LabelBody[] = targets.map(
    (target) =>
      previous.get(target.id) ?? {
        dx: 0,
        id: target.id,
        vdx: 0,
        vy: 0,
        y: slots.get(target.id)!,
      },
  );

  // Fixed sub-steps keep the spring stable on slow frames.
  const steps = Math.max(1, Math.ceil(dtSeconds / (1 / 120)));
  const dt = Math.min(dtSeconds, 0.064) / steps;

  for (let step = 0; step < steps; step += 1) {
    const order = [...next].sort((a, b) => a.y - b.y);
    const passing = new Map<string, number>();

    // Neighbours whose slots say the opposite order are trading places.
    for (let index = 0; index < order.length - 1; index += 1) {
      const a = order[index]!;
      const b = order[index + 1]!;

      if (slots.get(a.id)! <= slots.get(b.id)!) continue;

      const ta = targetById.get(a.id)!;
      const tb = targetById.get(b.id)!;

      // Close enough to collide (the spacing hold keeps them right at it).
      if (Math.abs(a.y - b.y) > spacing(ta, tb, bounds.gap) + 2) continue;

      // The one with further to travel steps aside.
      const aside =
        Math.abs(a.y - slots.get(a.id)!) >= Math.abs(b.y - slots.get(b.id)!)
          ? a
          : b;
      const other = aside === a ? tb : ta;
      passing.set(
        aside.id,
        Math.max(passing.get(aside.id) ?? 0, other.width + PASS_MARGIN),
      );
    }

    next = next.map((body) => {
      const y = springStep(body.y, body.vy, slots.get(body.id)!, dt, spring);
      const dx = springStep(
        body.dx,
        body.vdx,
        passing.get(body.id) ?? 0,
        dt,
        spring,
      );

      return {
        dx: dx.position,
        id: body.id,
        vdx: dx.velocity,
        vy: y.velocity,
        y: y.position,
      };
    });

    // No two labels get closer than their spacing unless one has slid far
    // enough aside to clear the other; a pair trading places waits here
    // until the slide clears, then passes.
    for (let pass = 0; pass < 3; pass += 1) {
      const sorted = [...next].sort((a, b) => a.y - b.y);
      for (let index = 0; index < sorted.length - 1; index += 1) {
        const a = sorted[index]!;
        const b = sorted[index + 1]!;
        const ta = targetById.get(a.id)!;
        const tb = targetById.get(b.id)!;
        const clear = a.dx >= b.dx + tb.width || b.dx >= a.dx + ta.width;

        if (clear) continue;

        const overlap = spacing(ta, tb, bounds.gap) - (b.y - a.y);

        if (overlap > 0) {
          a.y -= overlap / 2;
          b.y += overlap / 2;
        }
      }
    }
  }

  const settled = next.every((body) => {
    const slot = slots.get(body.id)!;

    return (
      Math.abs(body.y - slot) < SETTLE_DISTANCE &&
      Math.abs(body.vy) < SETTLE_SPEED &&
      Math.abs(body.dx) < SETTLE_DISTANCE &&
      Math.abs(body.vdx) < SETTLE_SPEED
    );
  });

  if (settled) {
    next = next.map((body) => ({
      ...body,
      dx: 0,
      vdx: 0,
      vy: 0,
      y: slots.get(body.id)!,
    }));
  }

  return { bodies: next, settled };
}

/** Whether any two labels' boxes intersect (for tests and assertions). */
export function labelsOverlap(
  bodies: readonly LabelBody[],
  targets: readonly LabelTarget[],
) {
  const byId = new Map(targets.map((target) => [target.id, target]));

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i]!;
      const b = bodies[j]!;
      const ta = byId.get(a.id)!;
      const tb = byId.get(b.id)!;
      const verticallyApart =
        Math.abs(a.y - b.y) >= (ta.height + tb.height) / 2 - 0.01;
      const horizontallyApart =
        a.dx >= b.dx + tb.width - 0.01 || b.dx >= a.dx + ta.width - 0.01;

      if (!verticallyApart && !horizontallyApart) return true;
    }
  }

  return false;
}
