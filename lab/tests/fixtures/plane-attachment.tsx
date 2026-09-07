import '../../src/styles.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plane, PlaneThumb, PlaneAttachment } from 'control-kit';

const portal = new URLSearchParams(location.search).get('portal') !== 'false';

function AttachmentFixture() {
  const [value, setValue] = useState({ x: 0.5, y: 0.5 });
  return (
    <>
      <button type="button">Before</button>
      <Plane
        pressBehavior="nearest"
        style={{ margin: 24, width: 240, height: 240, background: '#252525' }}
      >
        <PlaneThumb value={value} onValueChange={setValue}>
          <PlaneAttachment
            portal={portal}
            visibility="focus-within"
            style={{ padding: 8, width: 160, background: '#444' }}
          >
            <input
              aria-label="Name"
              defaultValue="Gradient"
              style={{ width: '100%' }}
            />
            <button type="button">OK</button>
          </PlaneAttachment>
        </PlaneThumb>
      </Plane>
      <button type="button">After</button>
      <output aria-label="Coordinates">{JSON.stringify(value)}</output>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<AttachmentFixture />);
