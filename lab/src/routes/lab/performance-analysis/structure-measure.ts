import type {
  LabPrimitiveStructure,
  LabPrimitiveStructureNode,
  LabPrimitiveStructureRect,
} from './types.js';

/*
 * Reads the rendered primitive back out of the DOM: one slab per element a
 * structure node points at, with the element's real rect, corner radius and
 * paint, plus the content drawn on it (text runs, icon outlines, small painted
 * parts, rasters/gradients, focus). Everything is in CSS px relative to the
 * union of the measured slabs. This module only reads layout; it never writes
 * to the DOM, so a measure pass costs one style/layout flush at most.
 */

export type StructurePoint = readonly [number, number];

export type StructureMark =
  | { kind: 'text'; rect: LabPrimitiveStructureRect }
  | { kind: 'line'; points: readonly StructurePoint[] }
  /** A construction line (drawn dashed), e.g. a thumb's crosshair. */
  | { kind: 'dash'; points: readonly StructurePoint[] }
  | { kind: 'ring'; radius: number; rect: LabPrimitiveStructureRect }
  | {
      axis: 'grid' | 'x';
      kind: 'hatch';
      radius: number;
      rect: LabPrimitiveStructureRect;
    };

export type StructureSlab = LabPrimitiveStructureRect & {
  /** Unique per slab; several slabs can share a node (`all: true`). */
  key: string;
  /** Draws a focus ring around the slab. */
  focused: boolean;
  level: number;
  marks: readonly StructureMark[];
  nodeId: string;
  /** Has a visible fill/border; unpainted layout boxes draw as frames. */
  painted: boolean;
  /** Nearest measured ancestor slab, for the exploded guide lines. */
  parentKey: string | null;
  radius: number;
};

export type StructureMeasurement = {
  height: number;
  levels: number;
  signature: string;
  slabs: readonly StructureSlab[];
  width: number;
};

type MeasuredElement = {
  crosshair: boolean;
  element: Element;
  nodeId: string;
  portal: boolean;
  rect: LabPrimitiveStructureRect;
};

const MIN_SIZE = 0.5;
const MAX_LINE_SAMPLES = 96;
const LINE_SAMPLE_STEP = 1.25;

function flattenNodes(
  node: LabPrimitiveStructureNode,
  out: LabPrimitiveStructureNode[] = [],
) {
  out.push(node);
  node.children?.forEach((child) => flattenNodes(child, out));

  return out;
}

function parseAlpha(color: string) {
  if (!color || color === 'transparent') {
    return 0;
  }

  const slash = color.match(/\/\s*([\d.]+%?)\s*\)$/);

  if (slash) {
    const value = slash[1]!;

    return value.endsWith('%') ? Number.parseFloat(value) / 100 : Number(value);
  }

  const rgba = color.match(/^rgba\((?:[^,]+,){3}\s*([\d.]+)\s*\)$/);

  return rgba ? Number(rgba[1]) : 1;
}

function parseRadius(value: string, width: number, height: number) {
  const first = value.split(' ')[0] ?? '0';
  const amount = Number.parseFloat(first);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  const px = first.endsWith('%')
    ? (amount / 100) * Math.min(width, height)
    : amount;

  return Math.max(0, Math.min(px, width / 2, height / 2));
}

function intersect(
  a: LabPrimitiveStructureRect,
  b: LabPrimitiveStructureRect,
): LabPrimitiveStructureRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return right - x > MIN_SIZE && bottom - y > MIN_SIZE
    ? { height: bottom - y, width: right - x, x, y }
    : null;
}

function overlaps(a: LabPrimitiveStructureRect, b: LabPrimitiveStructureRect) {
  const tolerance = 0.75;

  return (
    a.x + tolerance < b.x + b.width &&
    b.x + tolerance < a.x + a.width &&
    a.y + tolerance < b.y + b.height &&
    b.y + tolerance < a.y + a.height
  );
}

function isRendered(element: Element) {
  const style = getComputedStyle(element);

  return style.display !== 'none' && style.visibility !== 'hidden';
}

function findElements(
  node: LabPrimitiveStructureNode,
  preview: Element,
): { elements: readonly Element[]; portal: boolean } {
  const measure = node.measure;

  if (!measure) {
    return { elements: [], portal: false };
  }

  if (measure.find) {
    const elements = measure.find(preview);

    return {
      elements,
      portal: elements.some((element) => !preview.contains(element)),
    };
  }

  if (!measure.selector) {
    return { elements: [], portal: false };
  }

  try {
    const elements = measure.all
      ? Array.from(preview.querySelectorAll(measure.selector))
      : [preview.querySelector(measure.selector)].filter(
          (element): element is Element => element !== null,
        );

    return { elements, portal: false };
  } catch {
    return { elements: [], portal: false };
  }
}

let textMeasureContext: CanvasRenderingContext2D | null | undefined;

function measureInputText(value: string, style: CSSStyleDeclaration) {
  if (textMeasureContext === undefined) {
    textMeasureContext = document.createElement('canvas').getContext('2d');
  }

  if (!textMeasureContext) {
    return value.length * Number.parseFloat(style.fontSize) * 0.55;
  }

  textMeasureContext.font = style.font;

  return textMeasureContext.measureText(value).width;
}

/** A text run as a bar the height of the font's x-height band. */
function textBar(
  rect: DOMRect,
  fontSize: number,
  origin: StructurePoint,
): LabPrimitiveStructureRect {
  const height = Math.max(1.5, Math.min(rect.height * 0.6, fontSize * 0.46));

  return {
    height,
    width: rect.width,
    x: rect.left - origin[0],
    y: rect.top + rect.height * 0.54 - height / 2 - origin[1],
  };
}

function collectInputText(
  input: HTMLInputElement | HTMLTextAreaElement,
  origin: StructurePoint,
): LabPrimitiveStructureRect | null {
  if (input instanceof HTMLInputElement) {
    const type = input.type;

    if (
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'range' ||
      type === 'hidden'
    ) {
      return null;
    }
  }

  const value = input.value || input.placeholder;

  if (!value.trim()) {
    return null;
  }

  const style = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  const paddingLeft =
    Number.parseFloat(style.paddingLeft) +
    Number.parseFloat(style.borderLeftWidth);
  const paddingRight =
    Number.parseFloat(style.paddingRight) +
    Number.parseFloat(style.borderRightWidth);
  const available = Math.max(0, rect.width - paddingLeft - paddingRight);
  const width = Math.min(available, measureInputText(value, style));
  const align = style.textAlign;
  const left =
    align === 'right' || align === 'end'
      ? rect.right - paddingRight - width
      : align === 'center'
        ? rect.left + paddingLeft + (available - width) / 2
        : rect.left + paddingLeft;
  const fontSize = Number.parseFloat(style.fontSize) || 12;

  return textBar(
    new DOMRect(left, rect.top, width, rect.height),
    fontSize,
    origin,
  );
}

function collectGeometryOutline(
  element: SVGGeometryElement,
  origin: StructurePoint,
): StructurePoint[][] {
  let length = 0;
  const matrix = element.getScreenCTM();

  try {
    length = element.getTotalLength();
  } catch {
    return [];
  }

  if (!matrix || !(length > 0)) {
    return [];
  }

  const scale = Math.hypot(matrix.a, matrix.b) || 1;
  const samples = Math.max(
    6,
    Math.min(MAX_LINE_SAMPLES, Math.ceil((length * scale) / LINE_SAMPLE_STEP)),
  );
  const step = (length * scale) / samples;
  const runs: StructurePoint[][] = [];
  let run: StructurePoint[] = [];
  let previous: StructurePoint | null = null;

  for (let index = 0; index <= samples; index += 1) {
    const local = element.getPointAtLength((index / samples) * length);
    const point = new DOMPoint(local.x, local.y).matrixTransform(matrix);
    const next: StructurePoint = [point.x - origin[0], point.y - origin[1]];

    // getPointAtLength walks across subpaths; a long hop is a moveTo.
    if (
      previous &&
      Math.hypot(next[0] - previous[0], next[1] - previous[1]) > step * 2.5
    ) {
      if (run.length > 1) runs.push(run);
      run = [];
    }

    run.push(next);
    previous = next;
  }

  if (run.length > 1) runs.push(run);

  return runs;
}

function pseudoGradientBox(
  element: Element,
  rect: DOMRect,
  origin: StructurePoint,
): LabPrimitiveStructureRect | null {
  for (const pseudo of ['::before', '::after']) {
    const style = getComputedStyle(element, pseudo);

    if (
      style.content === 'none' ||
      style.display === 'none' ||
      !style.backgroundImage.includes('gradient')
    ) {
      continue;
    }

    const width = Number.parseFloat(style.width);
    const height = Number.parseFloat(style.height);
    let left = Number.parseFloat(style.left);
    let top = Number.parseFloat(style.top);

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      continue;
    }

    if (!Number.isFinite(left)) left = 0;
    if (!Number.isFinite(top)) top = 0;

    const translate = style.transform.match(
      /^matrix\(1, 0, 0, 1, (-?[\d.]+), (-?[\d.]+)\)$/,
    );

    if (translate) {
      left += Number(translate[1]);
      top += Number(translate[2]);
    }

    return {
      height,
      width,
      x: rect.left + left - origin[0],
      y: rect.top + top - origin[1],
    };
  }

  return null;
}

function collectMarks(
  slabElement: Element,
  slabRect: LabPrimitiveStructureRect,
  claimed: ReadonlySet<Element>,
  origin: StructurePoint,
): StructureMark[] {
  const marks: StructureMark[] = [];
  const clip = (rect: LabPrimitiveStructureRect) => intersect(rect, slabRect);
  const pushRect = (
    rect: LabPrimitiveStructureRect,
    make: (rect: LabPrimitiveStructureRect) => StructureMark,
  ) => {
    const clipped = clip(rect);

    if (clipped) marks.push(make(clipped));
  };
  const slabBox = slabElement.getBoundingClientRect();
  const slabStyle = getComputedStyle(slabElement);

  // The slab's own raster or gradient paint.
  if (slabElement instanceof HTMLCanvasElement) {
    marks.push({
      axis: 'grid',
      kind: 'hatch',
      radius: parseRadius(
        slabStyle.borderTopLeftRadius,
        slabRect.width,
        slabRect.height,
      ),
      rect: slabRect,
    });
  } else if (slabStyle.backgroundImage.includes('gradient')) {
    marks.push({ axis: 'x', kind: 'hatch', radius: 0, rect: slabRect });
  }

  // The border's inner edge, so a bordered surface reads as a rimmed plate.
  const borderWidth = Number.parseFloat(slabStyle.borderTopWidth) || 0;

  if (
    borderWidth > 0 &&
    parseAlpha(slabStyle.borderTopColor) > 0.04 &&
    slabRect.width > borderWidth * 4 &&
    slabRect.height > borderWidth * 4
  ) {
    const inset = Math.max(
      borderWidth,
      Math.min(slabRect.width, slabRect.height) * 0.03,
    );
    marks.push({
      kind: 'ring',
      radius: Math.max(
        0,
        parseRadius(
          slabStyle.borderTopLeftRadius,
          slabRect.width,
          slabRect.height,
        ) - inset,
      ),
      rect: {
        height: slabRect.height - inset * 2,
        width: slabRect.width - inset * 2,
        x: slabRect.x + inset,
        y: slabRect.y + inset,
      },
    });
  }

  // A drag handle (scrub area): a double-headed arrow along its drag axis.
  if (/^(ew|col|ns|row)-resize$/.test(slabStyle.cursor)) {
    const vertical =
      slabStyle.cursor.startsWith('ns') || slabStyle.cursor.startsWith('row');
    const { height, width, x, y } = slabRect;

    if (vertical) {
      const cx = x + width * 0.82;
      const y0 = y + height * 0.25;
      const y1 = y + height * 0.75;
      const head = Math.min(width, height) * 0.1;
      marks.push(
        {
          kind: 'line',
          points: [
            [cx, y0],
            [cx, y1],
          ],
        },
        {
          kind: 'line',
          points: [
            [cx - head, y0 + head],
            [cx, y0],
            [cx + head, y0 + head],
          ],
        },
        {
          kind: 'line',
          points: [
            [cx - head, y1 - head],
            [cx, y1],
            [cx + head, y1 - head],
          ],
        },
      );
    } else {
      const cy = y + height * 0.84;
      const x0 = x + width * 0.22;
      const x1 = x + width * 0.78;
      const head = Math.min(width * 0.12, height * 0.12);
      marks.push(
        {
          kind: 'line',
          points: [
            [x0, cy],
            [x1, cy],
          ],
        },
        {
          kind: 'line',
          points: [
            [x0 + head, cy - head],
            [x0, cy],
            [x0 + head, cy + head],
          ],
        },
        {
          kind: 'line',
          points: [
            [x1 - head, cy - head],
            [x1, cy],
            [x1 - head, cy + head],
          ],
        },
      );
    }
  }

  const rail = pseudoGradientBox(slabElement, slabBox, origin);

  if (rail) {
    pushRect(rail, (rect) => ({
      axis: 'x',
      kind: 'hatch',
      radius: Math.min(rect.height / 2, rect.width / 2),
      rect,
    }));
    pushRect(rail, (rect) => ({
      kind: 'ring',
      radius: Math.min(rect.height / 2, rect.width / 2),
      rect,
    }));
  }

  if (
    slabElement instanceof HTMLInputElement ||
    slabElement instanceof HTMLTextAreaElement
  ) {
    const bar = collectInputText(slabElement, origin);

    if (bar) pushRect(bar, (rect) => ({ kind: 'text', rect }));
  }

  const visit = (element: Element) => {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';

        if (!text.trim()) continue;

        const range = document.createRange();
        range.selectNodeContents(child);
        const fontSize =
          Number.parseFloat(getComputedStyle(element).fontSize) || 12;

        for (const lineRect of Array.from(range.getClientRects())) {
          if (lineRect.width < MIN_SIZE) continue;
          pushRect(textBar(lineRect, fontSize, origin), (rect) => ({
            kind: 'text',
            rect,
          }));
        }

        continue;
      }

      if (!(child instanceof Element) || claimed.has(child)) {
        continue;
      }

      if (child instanceof SVGGeometryElement) {
        for (const points of collectGeometryOutline(child, origin)) {
          marks.push({ kind: 'line', points });
        }

        continue;
      }

      if (child instanceof SVGElement) {
        visit(child);
        continue;
      }

      const style = getComputedStyle(child);

      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }

      const box = child.getBoundingClientRect();
      const rect = {
        height: box.height,
        width: box.width,
        x: box.left - origin[0],
        y: box.top - origin[1],
      };

      if (
        child instanceof HTMLInputElement ||
        child instanceof HTMLTextAreaElement
      ) {
        const bar = collectInputText(child, origin);

        if (bar) pushRect(bar, (clipped) => ({ kind: 'text', rect: clipped }));
        continue;
      }

      if (child instanceof HTMLCanvasElement) {
        pushRect(rect, (clipped) => ({
          axis: 'grid',
          kind: 'hatch',
          radius: parseRadius(style.borderTopLeftRadius, box.width, box.height),
          rect: clipped,
        }));
        continue;
      }

      const painted =
        parseAlpha(style.backgroundColor) > 0.04 ||
        style.backgroundImage !== 'none' ||
        (Number.parseFloat(style.borderTopWidth) > 0 &&
          parseAlpha(style.borderTopColor) > 0.04);
      const sameAsSlab =
        Math.abs(rect.x - slabRect.x) < 1 &&
        Math.abs(rect.y - slabRect.y) < 1 &&
        Math.abs(rect.width - slabRect.width) < 1 &&
        Math.abs(rect.height - slabRect.height) < 1;

      if (painted && !sameAsSlab && rect.width > MIN_SIZE) {
        pushRect(rect, (clipped) => ({
          kind: 'ring',
          radius: parseRadius(style.borderTopLeftRadius, box.width, box.height),
          rect: clipped,
        }));
      }

      visit(child);
    }
  };

  visit(slabElement);

  return marks;
}

function hasPaint(element: Element) {
  if (
    element instanceof HTMLCanvasElement ||
    element instanceof HTMLImageElement
  ) {
    return true;
  }

  // An icon is its strokes; draw its box as a frame, not a plate.
  if (element instanceof SVGElement) {
    return false;
  }

  const style = getComputedStyle(element);
  const before = getComputedStyle(element, '::before');

  return (
    parseAlpha(style.backgroundColor) > 0.04 ||
    style.backgroundImage !== 'none' ||
    (Number.parseFloat(style.borderTopWidth) > 0 &&
      parseAlpha(style.borderTopColor) > 0.04) ||
    (before.content !== 'none' && before.backgroundImage !== 'none')
  );
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function roundRect(rect: LabPrimitiveStructureRect): LabPrimitiveStructureRect {
  return {
    height: round(rect.height),
    width: round(rect.width),
    x: round(rect.x),
    y: round(rect.y),
  };
}

function roundMark(mark: StructureMark): StructureMark {
  if (mark.kind === 'line' || mark.kind === 'dash') {
    return {
      kind: mark.kind,
      points: mark.points.map(([x, y]) => [round(x), round(y)] as const),
    };
  }

  return { ...mark, rect: roundRect(mark.rect) };
}

/**
 * Measures every element the structure points at inside `preview`. Returns
 * null when nothing measurable is rendered (e.g. the page is still loading).
 */
export function measurePrimitiveStructure(
  structure: LabPrimitiveStructure,
  preview: Element,
): StructureMeasurement | null {
  const previewBox = preview.getBoundingClientRect();
  const measured: MeasuredElement[] = [];
  const seen = new Set<Element>();

  for (const node of flattenNodes(structure.root)) {
    const { elements, portal } = findElements(node, preview);

    for (const element of elements) {
      if (seen.has(element)) continue;

      const resolveRect = node.measure?.resolveRect;
      let rect: LabPrimitiveStructureRect | null = null;

      if (resolveRect) {
        const resolved = resolveRect(element, preview);
        rect = resolved && {
          ...resolved,
          x: resolved.x + previewBox.left,
          y: resolved.y + previewBox.top,
        };
      } else if (isRendered(element)) {
        const box = element.getBoundingClientRect();
        rect = {
          height: box.height,
          width: box.width,
          x: box.left,
          y: box.top,
        };
      }

      if (!rect || rect.width < MIN_SIZE || rect.height < MIN_SIZE) continue;

      seen.add(element);
      measured.push({
        crosshair: node.measure?.crosshair === true,
        element,
        nodeId: node.id,
        portal: portal && !preview.contains(element),
        rect,
      });
    }
  }

  if (measured.length === 0) {
    return null;
  }

  // DOM order: parents before children, earlier siblings before later ones.
  measured.sort((left, right) => {
    if (left.element === right.element) return 0;
    const position = left.element.compareDocumentPosition(right.element);

    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const minX = Math.min(...measured.map((entry) => entry.rect.x));
  const minY = Math.min(...measured.map((entry) => entry.rect.y));
  const maxX = Math.max(
    ...measured.map((entry) => entry.rect.x + entry.rect.width),
  );
  const maxY = Math.max(
    ...measured.map((entry) => entry.rect.y + entry.rect.height),
  );
  const origin: StructurePoint = [minX, minY];
  const claimed = new Set(measured.map((entry) => entry.element));
  const slabByElement = new Map<Element, StructureSlab>();
  const slabs: StructureSlab[] = [];
  const active = document.activeElement;
  const nodeCounts = new Map<string, number>();

  for (const entry of measured) {
    const rect = {
      height: entry.rect.height,
      width: entry.rect.width,
      x: entry.rect.x - minX,
      y: entry.rect.y - minY,
    };
    let parent: StructureSlab | null = null;

    for (
      let ancestor = entry.element.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const candidate = slabByElement.get(ancestor);

      if (candidate) {
        parent = candidate;
        break;
      }
    }

    // Children rest on their parent; anything overlapping an earlier slab
    // (a later sibling painted over it, a portal over the trigger) stacks
    // above it, which is the order the browser paints them in.
    let level = parent
      ? parent.level + 1
      : entry.portal
        ? Math.max(0, ...slabs.map((slab) => slab.level)) + 1
        : 0;

    for (const slab of slabs) {
      if (slab !== parent && overlaps(slab, rect)) {
        level = Math.max(level, slab.level + 1);
      }
    }

    const style = getComputedStyle(entry.element);
    const count = nodeCounts.get(entry.nodeId) ?? 0;
    nodeCounts.set(entry.nodeId, count + 1);
    let ownsFocus = false;

    if (active && entry.element.contains(active)) {
      ownsFocus = true;

      for (
        let walker = active as Element | null;
        walker;
        walker = walker.parentElement
      ) {
        if (walker === entry.element) break;
        if (claimed.has(walker)) {
          ownsFocus = false;
          break;
        }
      }
    }

    const slab: StructureSlab = {
      ...roundRect(rect),
      focused:
        ownsFocus &&
        (active?.matches(':focus-visible') ||
          active instanceof HTMLInputElement),
      key: `${entry.nodeId}:${count}`,
      level,
      marks: collectMarks(entry.element, rect, claimed, origin).map(roundMark),
      nodeId: entry.nodeId,
      painted: hasPaint(entry.element),
      parentKey: parent?.key ?? null,
      radius: round(
        parseRadius(style.borderTopLeftRadius, rect.width, rect.height),
      ),
    };

    slabByElement.set(entry.element, slab);
    slabs.push(slab);

    // A positioned marker traces its x/y across the surface right below it.
    if (entry.crosshair) {
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const below = slabs
        .filter(
          (candidate) =>
            candidate !== slab &&
            candidate.level < slab.level &&
            cx > candidate.x &&
            cx < candidate.x + candidate.width &&
            cy > candidate.y &&
            cy < candidate.y + candidate.height,
        )
        .sort((left, right) => right.level - left.level)[0];

      if (below) {
        below.marks = [
          ...below.marks,
          {
            kind: 'dash',
            points: [
              [round(below.x), round(cy)],
              [round(below.x + below.width), round(cy)],
            ],
          },
          {
            kind: 'dash',
            points: [
              [round(cx), round(below.y)],
              [round(cx), round(below.y + below.height)],
            ],
          },
        ];
      }
    }
  }

  const width = round(maxX - minX);
  const height = round(maxY - minY);

  return {
    height,
    levels: Math.max(...slabs.map((slab) => slab.level)) + 1,
    signature: JSON.stringify([width, height, slabs]),
    slabs,
    width,
  };
}

/** The element the lab renders the active page's preview into. */
export function findLabPreviewHost(pageKey: string): Element | null {
  return document.querySelector(
    `[data-lab-crossfade-slot="lab-preview-crossfade"] > [data-lab-crossfade-phase="enter"][data-lab-crossfade-key="${pageKey}"]`,
  );
}
