import type {
  StructureMark,
  StructureMeasurement,
  StructureSlab,
} from './structure-measure.js';

/*
 * Isometric drawing maths for the Structure tab. The camera, the sampled
 * rounded rectangles with outward normals, the hull-silhouette prism and the
 * front-facing crease run are adapted from Hairline by Lucas Marques
 * (https://github.com/lucasmarkes/hairline, MIT): plates are filled with the
 * ground colour and painted back to front, so there is no hidden-line pass.
 *
 * World space is the measured DOM: x right and y down in CSS px, z up.
 */

export type Vec2 = [number, number];

export type StructureCamera = {
  az: number;
  k: number;
  ox: number;
  oy: number;
  scale: number;
};

type Sample = { nu: number; nv: number; u: number; v: number };

/** 45° azimuth with sin(elevation) = .5: the 2:1 view Hairline rests at. */
export const STRUCTURE_CAMERA_AZIMUTH = Math.PI / 4;
export const STRUCTURE_CAMERA_K = 0.5;

const Z_FACTOR = Math.sqrt(1 - STRUCTURE_CAMERA_K * STRUCTURE_CAMERA_K);

export const r2 = (value: number) => Math.round(value * 100) / 100;

export function project(
  camera: StructureCamera,
  x: number,
  y: number,
  z: number,
): Vec2 {
  const cos = Math.cos(camera.az);
  const sin = Math.sin(camera.az);
  const zf = Math.sqrt(1 - camera.k * camera.k);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;

  return [
    camera.ox + camera.scale * rx,
    camera.oy + camera.scale * (ry * camera.k - z * zf),
  ];
}

const pointList = (points: readonly Vec2[]) =>
  points.map((point) => `${r2(point[0])} ${r2(point[1])}`).join('L');

export const closedPath = (points: readonly Vec2[]) =>
  points.length < 2 ? '' : `M${pointList(points)}Z`;

export const openPath = (points: readonly Vec2[]) =>
  points.length < 2 ? '' : `M${pointList(points)}`;

/** A rounded rectangle sampled with outward normals, `n` samples per corner. */
export function roundedRing(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  n = 5,
): Sample[] {
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2));
  const corners: Array<[number, number, number]> = [
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
    [x1 - r, y0 + r, 270],
  ];
  const samples: Sample[] = [];
  const steps = r > 0.01 ? n : 0;

  for (const [cu, cv, start] of corners) {
    for (let index = 0; index <= steps; index += 1) {
      const angle =
        ((start + (steps === 0 ? 45 : (90 * index) / steps)) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      samples.push({ nu: cos, nv: sin, u: cu + r * cos, v: cv + r * sin });
    }
  }

  return samples;
}

/** Convex hull (monotone chain). */
export function hull(input: readonly Vec2[]): Vec2[] {
  const points = input
    .slice()
    .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  const upper: Vec2[] = [];

  for (const point of points) {
    while (
      lower.length > 1 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!;
    while (
      upper.length > 1 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/** Whether a sample's normal faces the camera (screen-down is (sin az, cos az)). */
function facesCamera(camera: StructureCamera, sample: Sample) {
  return (
    sample.nu * Math.sin(camera.az) + sample.nv * Math.cos(camera.az) >= -1e-6
  );
}

/** The one cyclic run of samples that face the camera, in ring order. */
function frontRun(camera: StructureCamera, ring: readonly Sample[]): Sample[] {
  const n = ring.length;
  const keep = (index: number) => facesCamera(camera, ring[index % n]!);
  let start = -1;

  for (let index = 0; index < n; index += 1) {
    if (keep(index) && !keep(index + n - 1)) {
      start = index;
      break;
    }
  }

  if (start < 0) {
    return keep(0) ? ring.slice() : [];
  }

  const out: Sample[] = [];
  for (let offset = 0; offset < n && keep(start + offset); offset += 1) {
    out.push(ring[(start + offset) % n]!);
  }

  return out;
}

export type StructureFigureSlab = {
  /** Where a callout leader lands: the rightmost point of the top face. */
  anchor: Vec2;
  /** Dim front edge of the lid, which reads as the slab's thickness. */
  crease: string;
  focus: string;
  /** The slab's outline on the layer below (dashed). */
  footprint: string;
  /** Dashed drops to the layer below. */
  guide: string;
  hatch: string;
  key: string;
  level: number;
  lines: string;
  nodeId: string;
  painted: boolean;
  rings: string;
  /** Side band (hull of lid and floor), filled with the side tone. */
  side: string;
  text: string;
  /** Lid outline; also the hit target. */
  top: string;
};

export type StructureFigure = {
  bounds: { maxX: number; maxY: number; minX: number; minY: number };
  gap: number;
  slabs: StructureFigureSlab[];
};

export type StructureFigureRegion = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type SlabFrame = {
  slab: StructureSlab;
  thickness: number;
  z0: number;
  z1: number;
};

/** Footprint width at scale 1, which every proportion is taken from. */
function footprintWidth(measurement: StructureMeasurement) {
  return (measurement.width + measurement.height) * Math.SQRT1_2;
}

export function structureThickness(measurement: StructureMeasurement) {
  return Math.min(8, Math.max(1, footprintWidth(measurement) * 0.016));
}

/**
 * The gap between levels at explode = 1: the opened stack is about as tall
 * as the footprint is deep, whatever the number of levels.
 */
export function structureMaxGap(measurement: StructureMeasurement) {
  const depth = footprintWidth(measurement) * STRUCTURE_CAMERA_K;

  return (depth * 1.05) / Math.max(1, measurement.levels - 1) / Z_FACTOR;
}

function slabFrames(
  measurement: StructureMeasurement,
  gap: number,
): SlabFrame[] {
  const thickness = structureThickness(measurement);

  return measurement.slabs.map((slab) => {
    const z0 = slab.level * (thickness + gap);
    const own = slab.painted
      ? Math.min(
          thickness,
          Math.max(0.6, Math.min(slab.width, slab.height) / 2),
        )
      : 0;

    return { slab, thickness: own, z0, z1: z0 + own };
  });
}

function fitCamera(
  measurement: StructureMeasurement,
  region: StructureFigureRegion,
): StructureCamera {
  const camera: StructureCamera = {
    az: STRUCTURE_CAMERA_AZIMUTH,
    k: STRUCTURE_CAMERA_K,
    ox: 0,
    oy: 0,
    scale: 1,
  };
  // Fit the fully opened stack, so the base stays put while the gap moves.
  const frames = slabFrames(measurement, structureMaxGap(measurement));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const { slab, z0, z1 } of frames) {
    for (const x of [slab.x, slab.x + slab.width]) {
      for (const y of [slab.y, slab.y + slab.height]) {
        for (const z of [z0, z1]) {
          const [px, py] = project(camera, x, y, z);
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        }
      }
    }
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min(
    8,
    (region.x1 - region.x0) / width,
    (region.y1 - region.y0) / height,
  );

  camera.scale = scale;
  camera.ox = (region.x0 + region.x1) / 2 - ((minX + maxX) / 2) * scale;
  camera.oy = (region.y0 + region.y1) / 2 - ((minY + maxY) / 2) * scale;

  return camera;
}

function hatchSegments(
  mark: Extract<StructureMark, { kind: 'hatch' }>,
): Array<[Vec2, Vec2]> {
  const { height, width, x, y } = mark.rect;
  const radius = Math.min(mark.radius, width / 2, height / 2);
  const segments: Array<[Vec2, Vec2]> = [];
  const columns = Math.round(
    Math.max(6, Math.min(36, width / Math.max(4, Math.min(height, width) / 3))),
  );

  for (let index = 1; index < columns; index += 1) {
    const sx = x + (width * index) / columns;
    // Inside a rounded corner the line is shortened to the arc.
    const dx = Math.max(
      0,
      Math.max(x + radius - sx, sx - (x + width - radius)),
    );
    const inset = radius - Math.sqrt(Math.max(0, radius * radius - dx * dx));
    segments.push([
      [sx, y + inset],
      [sx, y + height - inset],
    ]);
  }

  if (mark.axis === 'grid') {
    const rows = Math.round(
      Math.max(6, Math.min(36, height / Math.max(4, width / columns))),
    );

    for (let index = 1; index < rows; index += 1) {
      const sy = y + (height * index) / rows;
      const dy = Math.max(
        0,
        Math.max(y + radius - sy, sy - (y + height - radius)),
      );
      const inset = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy));
      segments.push([
        [x + inset, sy],
        [x + width - inset, sy],
      ]);
    }
  }

  return segments;
}

/** Projects the measurement into a back-to-front list of slab paths. */
export function buildStructureFigure(
  measurement: StructureMeasurement,
  explode: number,
  region: StructureFigureRegion,
): StructureFigure {
  const camera = fitCamera(measurement, region);
  const gap = Math.max(0, Math.min(1, explode)) * structureMaxGap(measurement);
  const frames = slabFrames(measurement, gap);
  const frameByKey = new Map(frames.map((frame) => [frame.slab.key, frame]));
  const at = (z: number) => (u: number, v: number) => project(camera, u, v, z);
  // Enough samples per corner that an arc never shows its facets on screen.
  const cornerSteps = (radius: number) =>
    Math.max(2, Math.min(24, Math.ceil((radius * camera.scale) / 2.5)));
  const sin = Math.sin(camera.az);
  const cos = Math.cos(camera.az);
  const depth = ({ slab }: SlabFrame) =>
    (slab.x + slab.width / 2) * sin + (slab.y + slab.height / 2) * cos;
  const ordered = frames
    .slice()
    .sort(
      (left, right) =>
        left.slab.level - right.slab.level || depth(left) - depth(right),
    );
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const track = (point: Vec2) => {
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]);
    maxY = Math.max(maxY, point[1]);
  };

  const slabs = ordered.map((frame): StructureFigureSlab => {
    const { slab, z0, z1 } = frame;
    const ring = roundedRing(
      slab.x,
      slab.y,
      slab.x + slab.width,
      slab.y + slab.height,
      slab.radius,
      cornerSteps(slab.radius),
    );
    const lid = ring.map((sample) => at(z1)(sample.u, sample.v));
    const floor = ring.map((sample) => at(z0)(sample.u, sample.v));
    lid.forEach(track);
    floor.forEach(track);

    const front = frontRun(camera, ring);
    const project1 = at(z1 + 0.01);
    const ringPath = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ) =>
      closedPath(
        roundedRing(
          x,
          y,
          x + width,
          y + height,
          radius,
          cornerSteps(radius),
        ).map((sample) => project1(sample.u, sample.v)),
      );
    let text = '';
    let rings = '';
    let lines = '';
    let hatch = '';

    for (const mark of slab.marks) {
      if (mark.kind === 'text') {
        const { height, width, x, y } = mark.rect;
        text += ringPath(x, y, width, height, height / 2);
      } else if (mark.kind === 'ring') {
        const { height, width, x, y } = mark.rect;
        rings += ringPath(x, y, width, height, mark.radius);
      } else if (mark.kind === 'line') {
        lines += openPath(mark.points.map(([u, v]) => project1(u, v)));
      } else {
        for (const [start, end] of hatchSegments(mark)) {
          hatch += openPath([project1(...start), project1(...end)]);
        }
      }
    }

    let guide = '';
    let footprint = '';
    const parent = slab.parentKey ? frameByKey.get(slab.parentKey) : undefined;
    const below = parent ? parent.z1 : 0;

    if (z0 - below > 0.75 && (parent || slab.level > 0)) {
      // Drop from the floor's leftmost, rightmost and nearest samples.
      const projected = floor.map((point, index) => ({ index, point }));
      const pick = (score: (point: Vec2) => number) =>
        projected.reduce((best, entry) =>
          score(entry.point) > score(best.point) ? entry : best,
        ).index;
      const picks = new Set([
        pick((point) => -point[0]),
        pick((point) => point[0]),
        pick((point) => point[1]),
      ]);

      for (const index of picks) {
        const sample = ring[index]!;
        guide += openPath([
          at(z0)(sample.u, sample.v),
          at(below)(sample.u, sample.v),
        ]);
      }

      // Where the slab sits once assembled, traced on the layer below.
      footprint = closedPath(
        ring.map((sample) => at(below + 0.01)(sample.u, sample.v)),
      );
    }

    const anchor = lid.reduce((best, point) =>
      point[0] > best[0] || (point[0] === best[0] && point[1] < best[1])
        ? point
        : best,
    );
    const focus = slab.focused
      ? closedPath(
          roundedRing(
            slab.x - 2,
            slab.y - 2,
            slab.x + slab.width + 2,
            slab.y + slab.height + 2,
            slab.radius + 2,
          ).map((sample) => at(z1)(sample.u, sample.v)),
        )
      : '';

    return {
      anchor,
      crease: slab.painted
        ? openPath(front.map((sample) => at(z1)(sample.u, sample.v)))
        : '',
      focus,
      footprint,
      guide,
      hatch,
      key: slab.key,
      level: slab.level,
      lines,
      nodeId: slab.nodeId,
      painted: slab.painted,
      rings,
      side: slab.painted ? closedPath(hull(lid.concat(floor))) : '',
      text,
      top: closedPath(lid),
    };
  });

  return {
    bounds: { maxX, maxY, minX, minY },
    gap,
    slabs,
  };
}
