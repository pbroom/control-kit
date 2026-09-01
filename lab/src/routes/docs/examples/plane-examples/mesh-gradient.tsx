import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

type MeshPoint = {
  color: string;
  id: string;
  name: string;
  rgb: string;
  value: PlaneValue;
};

const initialPoints = [
  {
    color: '#ffd770',
    id: 'gold',
    name: 'Gold',
    rgb: '255 215 112',
    value: { x: 0.12, y: 0.86 },
  },
  {
    color: '#748bff',
    id: 'iris',
    name: 'Iris',
    rgb: '116 139 255',
    value: { x: 0.88, y: 0.82 },
  },
  {
    color: '#ff5c91',
    id: 'coral',
    name: 'Coral',
    rgb: '255 92 145',
    value: { x: 0.58, y: 0.52 },
  },
  {
    color: '#3ee1ba',
    id: 'mint',
    name: 'Mint',
    rgb: '62 225 186',
    value: { x: 0.78, y: 0.12 },
  },
] satisfies MeshPoint[];

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMeshPoint(name: string, value: PlaneValue) {
  return `${name} mesh point, ${formatPercent(value.x)} from the left, ${formatPercent(value.y)} from the bottom`;
}

export function MeshGradientExample() {
  const [points, setPoints] = useState(initialPoints);
  const [activePointId, setActivePointId] = useState(initialPoints[2].id);
  const activePoint =
    points.find((point) => point.id === activePointId) ?? points[0];
  const meshBackground = [
    ...points.map(
      (point) =>
        `radial-gradient(circle at ${point.value.x * 100}% ${(1 - point.value.y) * 100}%, rgb(${point.rgb} / 0.98) 0%, rgb(${point.rgb} / 0.7) 20%, transparent 50%)`,
    ),
    'linear-gradient(135deg, #4a2942, #292f70 52%, #164c46)',
  ].join(', ');

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Mesh gradient control points"
        className="relative size-[240px] touch-none rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]"
        pressBehavior="nearest"
        style={{ backgroundImage: meshBackground }}
      >
        {points.map((point) => (
          <PlaneThumb
            aria-label={`${point.name} mesh point`}
            className="size-6 border-2 border-white shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
            getAriaValueText={(value) => formatMeshPoint(point.name, value)}
            key={point.id}
            onValueChange={(value) => {
              setActivePointId(point.id);
              setPoints((current) =>
                current.map((item) =>
                  item.id === point.id ? { ...item, value } : item,
                ),
              );
            }}
            style={{ backgroundColor: point.color }}
            thumbId={point.id}
            value={point.value}
            xAriaLabel={`${point.name} mesh point horizontal position`}
            yAriaLabel={`${point.name} mesh point vertical position`}
          />
        ))}
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="text-[11px] text-white/72">
          {activePoint.name} {formatPercent(activePoint.value.x)}{' '}
          {formatPercent(activePoint.value.y)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Drag a color node, or press empty space to move the nearest one.
        </p>
      </div>
    </div>
  );
}
