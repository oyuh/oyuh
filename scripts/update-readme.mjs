import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function takeScreenshots(projects) {
  const screenshotDir = join(ROOT, 'assets', 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  for (const project of projects) {
    const page = await context.newPage();
    try {
      console.log(`Screenshotting ${project.name} (${project.url})...`);
      await page.goto(project.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({
        path: join(ROOT, project.screenshot),
        type: 'png',
        clip: { x: 0, y: 0, width: 1280, height: 800 },
      });
      console.log(`  ✓ ${project.screenshot}`);
    } catch (e) {
      console.error(`  ✗ Failed to screenshot ${project.name}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
}

function updateReadme(projects) {
  // Rotate every 6 hours
  const cycleIndex = Math.floor(Date.now() / (6 * 60 * 60 * 1000)) % projects.length;
  const featured = projects[cycleIndex];

  const hasScreenshot = existsSync(join(ROOT, featured.screenshot));

  const screenshotBlock = hasScreenshot
    ? `  <a href="${featured.url}">\n    <img src="${featured.screenshot}" alt="${featured.name}" width="700" />\n  </a>\n  <br><br>\n`
    : '';

  const featuredHtml = `
<div align="center">
  <h3><img src="assets/icons/star.svg" width="24" height="24" alt="" /> Featured Project</h3>
${screenshotBlock}  <strong>${featured.name}</strong>
  <br>
  <sub>${featured.description}</sub>
  <br><br>
  <a href="${featured.url}">
    <img src="assets/buttons/visit-site.svg" alt="Visit Site" />
  </a>
  &nbsp;&nbsp;
  <a href="${featured.repo}">
    <img src="assets/buttons/source-code.svg" alt="Source Code" />
  </a>
</div>
`;

  const readmePath = join(ROOT, 'README.md');
  let readme = readFileSync(readmePath, 'utf8');

  const startMarker = '<!-- FEATURED_PROJECT_START -->';
  const endMarker = '<!-- FEATURED_PROJECT_END -->';

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    readme =
      readme.substring(0, startIdx + startMarker.length) +
      featuredHtml +
      readme.substring(endIdx);
    writeFileSync(readmePath, readme);
    console.log(`\nFeatured project updated to: ${featured.name}`);
  } else {
    console.error('Could not find FEATURED_PROJECT markers in README.md');
    process.exit(1);
  }
}

async function main() {
  const projects = JSON.parse(readFileSync(join(ROOT, 'projects.json'), 'utf8'));
  await takeScreenshots(projects);
  updateReadme(projects);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
