import { chromium } from 'playwright';
import GIFEncoder from 'gif-encoder-2';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const svgPath = process.argv[2];
const gifPath = process.argv[3];

if (!svgPath || !gifPath) {
  console.error('Usage: node scripts/render-gif.mjs <input.svg> <output.gif>');
  process.exit(1);
}

const svgContent = readFileSync(resolve(rootDir, svgPath), 'utf-8');

// Extract width/height from SVG
const widthMatch = svgContent.match(/width="(\d+)"/);
const heightMatch = svgContent.match(/height="(\d+)"/);
const width = parseInt(widthMatch?.[1] || '495', 10);
const height = parseInt(heightMatch?.[1] || '200', 10);

console.log(`SVG dimensions: ${width}x${height}`);

const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { width: ${width}px; height: ${height}px; overflow: hidden; }
</style></head>
<body>${svgContent}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width, height });
await page.setContent(html, { waitUntil: 'networkidle' });

// Wait for animations to initialize
await page.waitForTimeout(200);

// Pause all animations and control them manually
await page.evaluate(() => {
  const animations = document.getAnimations();
  animations.forEach(a => a.pause());
});

const FRAME_INTERVAL = 100;
const DURATION = 4000;
const FRAME_COUNT = DURATION / FRAME_INTERVAL;

const encoder = new GIFEncoder(width, height);
encoder.setDelay(FRAME_INTERVAL);
encoder.setRepeat(0);
encoder.setQuality(10);
encoder.start();

console.log(`Capturing ${FRAME_COUNT} frames...`);

for (let i = 0; i < FRAME_COUNT; i++) {
  const currentTime = i * FRAME_INTERVAL;

  // Set all animations to the current time
  await page.evaluate((t) => {
    const animations = document.getAnimations();
    animations.forEach(a => { a.currentTime = t; });
  }, currentTime);

  const buf = await page.screenshot({ type: 'png' });

  // Use sharp to convert PNG to raw RGBA pixels
  const { data: pixels } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  encoder.addFrame(pixels);

  if ((i + 1) % 10 === 0) console.log(`  frame ${i + 1}/${FRAME_COUNT}`);
}

encoder.finish();
const gifBuffer = encoder.out.getData();
writeFileSync(resolve(rootDir, gifPath), gifBuffer);
console.log(`GIF saved: ${gifPath} (${(gifBuffer.length / 1024).toFixed(1)} KB)`);

await browser.close();
