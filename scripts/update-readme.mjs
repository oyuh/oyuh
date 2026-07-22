import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAMES_API = 'https://api.games.lawsonhart.me';

// leaderboard names are user-submitted, so escape before putting them in the readme
const esc = (s) => String(s).slice(0, 32).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const fmtTime = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, '0')}`;

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// show one single-player leaderboard at a time, flipping between shikaku and pips each run
async function gamesStat(readme) {
  const current = readme.split('<!-- GAMES_STAT -->')[1]?.split('<!-- /GAMES_STAT -->')[0] ?? '';
  if (current.includes('shikaku')) {
    const { entries } = await getJson(`${GAMES_API}/api/pips/leaderboard?limit=1`);
    const top = entries[0];
    return `🏆 current pips record: ${fmtTime(top.totalMs)} by ${esc(top.name)}`;
  }
  const { entries } = await getJson(`${GAMES_API}/api/shikaku/leaderboard?difficulty=hard&limit=1`);
  const top = entries[0];
  return `🏆 current shikaku record: ${top.score.toLocaleString('en-US')} pts (hard) by ${esc(top.name)}`;
}

async function jamlogStat() {
  const { users } = await getJson('https://fast.jamlog.lol/api/site-stats');
  return `🎧 ${users.toLocaleString('en-US')} people are using it`;
}

async function fivelaunchStat() {
  const headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const releases = await getJson('https://api.github.com/repos/oyuh/fivelaunch/releases?per_page=100', headers);
  const total = releases.flatMap((r) => r.assets).reduce((n, a) => n + a.download_count, 0);
  return `⬇️ ${total.toLocaleString('en-US')} downloads and counting`;
}

// null value (a failed fetch) keeps whatever is already in the readme
function replaceStat(readme, tag, value) {
  if (value == null) return readme;
  const start = `<!-- ${tag} -->`;
  const end = `<!-- /${tag} -->`;
  const s = readme.indexOf(start);
  const e = readme.indexOf(end);
  if (s === -1 || e === -1) return readme;
  return readme.slice(0, s + start.length) + value + readme.slice(e);
}

const quiet = (p) => p.catch((err) => (console.error(err.message), null));

// "(upd: 7/22 13:22)" in Dallas time, since the workflow runs in UTC
function stamp() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const pad = (n) => String(n).padStart(2, '0');
  return `(upd: ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())})`;
}

async function main() {
  const readmePath = join(ROOT, 'README.md');
  let readme = readFileSync(readmePath, 'utf8');

  const results = await Promise.all([
    quiet(gamesStat(readme)),
    quiet(jamlogStat()),
    quiet(fivelaunchStat()),
  ]);
  const [games, jamlog, fivelaunch] = results.map((v) => (v == null ? null : `${v} ${stamp()}`));

  readme = replaceStat(readme, 'GAMES_STAT', games);
  readme = replaceStat(readme, 'JAMLOG_STAT', jamlog);
  readme = replaceStat(readme, 'FIVELAUNCH_STAT', fivelaunch);
  writeFileSync(readmePath, readme);
  console.log({ games, jamlog, fivelaunch });
}

main();
