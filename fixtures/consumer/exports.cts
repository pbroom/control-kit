import kit = require('control-kit');

const value: kit.PlaneValue = kit.clampPlaneValue({ x: 2, y: -1 });
void value;

const sliderProps: kit.SliderProps = { value: 50, min: 0, max: 100 };
const colorSliderProps: kit.ColorValueSliderProps = { ...sliderProps };
void colorSliderProps;
