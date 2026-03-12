import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node update-svgs.mjs <stats.json>');
  process.exit(1);
}

const stats = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));

function formatNumber(n) {
  return n >= 1000 ? n.toLocaleString('en-US') : String(n);
}

// Ensure assets directory exists
mkdirSync(resolve(rootDir, 'assets'), { recursive: true });

// --- Update stats.svg ---
let statsSvg = readFileSync(resolve(rootDir, 'templates/stats.svg'), 'utf-8');

// Replace stat values using the patterns from the template
// Total Stars
statsSvg = statsSvg.replace(
  /(<text x="200"[^>]*font-weight="700"[^>]*fill="#00d4ff">)\s*62\s*(<\/text>)/,
  `$1${formatNumber(stats.totalStars)}$2`
);

// Commits (year)
statsSvg = statsSvg.replace(
  /Commits \(\d{4}\)/,
  `Commits (${stats.year})`
);
statsSvg = statsSvg.replace(
  /(<text x="200"[^>]*font-weight="700"[^>]*fill="#00d4ff">)\s*3,054\s*(<\/text>)/,
  `$1${formatNumber(stats.commits)}$2`
);

// PRs
statsSvg = statsSvg.replace(
  /(<text x="200"[^>]*font-weight="700"[^>]*fill="#00d4ff">)\s*19\s*(<\/text>\s*<\/g>\s*<\/g>\s*<!-- Issues -->)/,
  `$1${formatNumber(stats.prs)}$2`
);

// Issues
statsSvg = statsSvg.replace(
  /(<text x="200"[^>]*font-weight="700"[^>]*fill="#00d4ff">)\s*10\s*(<\/text>\s*<\/g>\s*<\/g>\s*<!-- Contributed to -->)/,
  `$1${formatNumber(stats.issues)}$2`
);

// Contributed to
statsSvg = statsSvg.replace(
  /(<text x="200"[^>]*font-weight="700"[^>]*fill="#00d4ff">)\s*19 repos\s*(<\/text>)/,
  `$1${formatNumber(stats.contributedTo)} repos$2`
);

// Replace rank level (A+ text in the rank circle)
statsSvg = statsSvg.replace(
  /(<text x="420" y="85" text-anchor="middle" dominant-baseline="central"[^>]*>)\s*A\+\s*(<\/text>)/,
  `$1${stats.rank.level}$2`
);

writeFileSync(resolve(rootDir, 'assets/stats.svg'), statsSvg);
console.log('Updated assets/stats.svg');

// --- Update top-langs.svg ---
const BAR_MAX_WIDTH = 280;
const barClasses = ['bar-ts', 'bar-rs', 'bar-py', 'bar-js', 'bar-ot'];

let langsSvg = readFileSync(resolve(rootDir, 'templates/top-langs.svg'), 'utf-8');

// We need to rebuild the language rows section
const langs = stats.languages.slice(0, 5);

// Build new language rows
const rows = langs.map((lang, i) => {
  const y = 12 + i * 24;
  const barWidth = Math.round((lang.percentage / 100) * BAR_MAX_WIDTH * 10) / 10;
  const barClass = barClasses[i] || barClasses[barClasses.length - 1];
  const delay = (0.3 + i * 0.15).toFixed(2);

  return `    <!-- ${lang.name} -->
    <g class="lang-row" transform="translate(0, ${y})">
      <circle cx="6" cy="-3" r="5" fill="${lang.color}" />
      <text x="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
            font-size="12" fill="#c9d1d9">${lang.name}</text>
      <text x="435" text-anchor="end"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
            font-size="12" font-weight="600" fill="#8b949e">${lang.percentage}%</text>
      <rect x="110" y="-9" width="280" height="10" rx="5" fill="#21262d" />
      <rect x="110" y="-9" width="${barWidth}" height="10" rx="5" fill="${lang.color}" class="${barClass}" opacity="0.9" />
    </g>`;
}).join('\n\n');

// Update bar animation styles to use actual language colors
const barStyles = langs.map((lang, i) => {
  const barClass = barClasses[i] || barClasses[barClasses.length - 1];
  const delay = (0.3 + i * 0.15).toFixed(2);
  return `      .${barClass} { animation: barGrow 1s ease forwards ${delay}s; }`;
}).join('\n');

// Replace bar animation styles
langsSvg = langsSvg.replace(
  /\.bar-ts \{[^}]+\}\s*\n\s*\.bar-rs \{[^}]+\}\s*\n\s*\.bar-py \{[^}]+\}\s*\n\s*\.bar-js \{[^}]+\}\s*\n\s*\.bar-ot \{[^}]+\}/,
  barStyles
);

// Replace language rows content
langsSvg = langsSvg.replace(
  /<!-- Language rows -->\s*<g transform="translate\(25, 48\)">\s*[\s\S]*?<\/g>\s*<\/svg>/,
  `<!-- Language rows -->\n  <g transform="translate(25, 48)">\n\n${rows}\n\n  </g>\n</svg>`
);

writeFileSync(resolve(rootDir, 'assets/top-langs.svg'), langsSvg);
console.log('Updated assets/top-langs.svg');
