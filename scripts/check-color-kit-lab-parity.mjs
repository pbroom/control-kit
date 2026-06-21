const message = [
  'Color-kit lab parity check is deprecated.',
  '',
  'The one-to-one port audit has done its job, and the standalone lab is now',
  'expected to evolve independently. Use lab:typecheck, lab:smoke, and lab:build',
  'for day-to-day validation.',
  '',
  'The retired strict checker is archived at:',
  '  scripts/archive/check-color-kit-lab-parity.strict.mjs',
].join('\n');

console.log(message);
