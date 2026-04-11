import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function updateReadme(projects) {
  const featured = projects[Math.floor(Math.random() * projects.length)];

  const blogBlock = featured.blog
    ? `  <a href="${featured.blog}">\n    <img src="assets/buttons/blog-post.svg" alt="Blog Post" />\n  </a>\n`
    : '';

  const featuredHtml = `
<div align="center">
  <h3><img src="assets/icons/star.svg" width="24" height="24" alt="" /> Featured Project</h3>
  <strong>${featured.name}</strong>
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
${blogBlock ? '  &nbsp;&nbsp;\n' + blogBlock : ''}</div>
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
    console.log(`Featured project updated to: ${featured.name}`);
  } else {
    console.error('Could not find FEATURED_PROJECT markers in README.md');
    process.exit(1);
  }
}

function main() {
  const projects = JSON.parse(readFileSync(join(ROOT, 'projects.json'), 'utf8'));
  updateReadme(projects);
}

main();
