import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { controlKitColor } from '../src/theme';

const read = (file: string) =>
  readFileSync(new URL(`../styles/${file}`, import.meta.url), 'utf8');
const themeCss = read('theme.css');
const tailwindCss = read('tailwind.css');

const tokens = Object.entries(controlKitColor).map(([key, value]) => {
  const match = /^var\((--ck-[a-z-]+),(#[0-9a-f]+)\)$/.exec(value);
  if (!match) throw new Error(`Unexpected token format for ${key}: ${value}`);
  return { key, name: match[1]!, fallback: match[2]! };
});

function block(selector: string) {
  const start = themeCss.indexOf(selector);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const open = themeCss.indexOf('{', start);
  return themeCss.slice(open + 1, themeCss.indexOf('}', open));
}

function declarations(css: string) {
  return Object.fromEntries(
    [...css.matchAll(/(--ck-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2]!.trim(),
    ]),
  );
}

describe('theme.css', () => {
  it('defines every controlKitColor token with the JS dark default', () => {
    const dark = declarations(block(':where(:root)'));
    for (const { name, fallback } of tokens) {
      expect(dark[name], name).toBe(fallback);
    }
    expect(Object.keys(dark).sort()).toEqual(tokens.map((t) => t.name).sort());
  });

  it('defines every token in the light preset', () => {
    const light = declarations(block(":where([data-ck-theme='light'])"));
    expect(Object.keys(light).sort()).toEqual(tokens.map((t) => t.name).sort());
  });
});

describe('tailwind.css', () => {
  it('imports the theme, registers package source, and maps every token', () => {
    expect(tailwindCss).toContain("@import './theme.css';");
    expect(tailwindCss).toContain("@source '../src';");
    for (const { name } of tokens) {
      expect(tailwindCss).toContain(`--color-${name.slice(2)}: var(${name});`);
    }
  });
});
