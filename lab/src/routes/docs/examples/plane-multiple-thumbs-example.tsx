import { useState } from 'react';
import { Checkbox, Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const initialPoints = [
  { id: 'top-left', value: { x: 0.25, y: 0.75 } },
  { id: 'top-right', value: { x: 0.75, y: 0.75 } },
  { id: 'bottom-left', value: { x: 0.25, y: 0.25 } },
  { id: 'bottom-right', value: { x: 0.75, y: 0.25 } },
] satisfies Array<{ id: string; value: PlaneValue }>;

export function MultipleThumbsExample() {
  const [points, setPoints] = useState(initialPoints);
  const [movesNearestPoint, setMovesNearestPoint] = useState(true);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        aria-label="Mesh control points"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
        pressBehavior={movesNearestPoint ? 'nearest' : 'none'}
      >
        {points.map((point, index) => (
          <PlaneThumb
            aria-label={`Control point ${index + 1}`}
            className="size-6 border-white/30 bg-white font-mono text-[10px] shadow-none"
            key={point.id}
            onValueChange={(value) => {
              setPoints((current) =>
                current.map((item) =>
                  item.id === point.id ? { ...item, value } : item,
                ),
              );
            }}
            thumbId={point.id}
            value={point.value}
          >
            {index + 1}
          </PlaneThumb>
        ))}
      </Plane>
      <Checkbox
        checked={movesNearestPoint}
        className="text-white/48"
        onCheckedChange={setMovesNearestPoint}
      >
        Press empty space to move the nearest point.
      </Checkbox>
    </div>
  );
}
