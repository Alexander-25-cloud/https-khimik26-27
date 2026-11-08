#!/usr/bin/osascript -l JavaScript
// Автообновление статистики ХК «Химик» с официального сайта ВХЛ (vhlru.ru).
// Запуск вручную:  osascript -l JavaScript update-stats.js
// Результат пишется в data.js рядом со скриптом; index.html читает его автоматически.

ObjC.import('Foundation');

const SEASON_ID = '1430';   // 26/27 | Регулярный чемпионат (см. выпадающий список на vhlru.ru/stats/players/)
const TEAM_ID = '15532';    // Химик
const BASE = 'https://www.vhlru.ru/stats/players/' + SEASON_ID + '/';
const SOURCES = {
  forwards: BASE + 'forwards/' + TEAM_ID + '/',
  defenders: BASE + 'defenses/' + TEAM_ID + '/',
};

const app = Application.currentApplication();
app.includeStandardAdditions = true;

function scriptDir() {
  const args = $.NSProcessInfo.processInfo.arguments;
  for (let i = 0; i < args.count; i++) {
    let a = ObjC.unwrap(args.objectAtIndex(i));
    if (/update-stats\.js$/.test(a)) {
      if (a.charAt(0) !== '/') {
        a = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath) + '/' + a;
      }
      return ObjC.unwrap($(a).stringByStandardizingPath.stringByDeletingLastPathComponent);
    }
  }
  return ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
}

function download(url) {
  return app.doShellScript(
    "curl -sSL --fail --max-time 40 -A 'Mozilla/5.0 (Macintosh) KhimikStats' " + quoted(url)
  );
}

function quoted(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Разбирает таблицу .table-players: находит нужные столбцы по заголовкам.
function parsePlayers(html) {
  const tableMatch = html.match(/<table class="table table-players">([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Таблица игроков не найдена на странице');
  const table = tableMatch[1];

  const headers = [];
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/g;
  let m;
  while ((m = thRe.exec(table))) headers.push(cleanText(m[1]));

  const col = (name) => {
    const i = headers.indexOf(name);
    if (i === -1) throw new Error('Нет столбца «' + name + '» (структура сайта изменилась?)');
    return i;
  };
  const idx = {
    name: col('Игрок'), num: col('#'), games: col('И'), goals: col('Ш'),
    assists: col('А'), points: col('О'), shots: col('БВ'), toi: col('ВП/И'),
  };

  const body = (table.split(/<tbody>/)[1] || '');
  const rows = body.split(/<tr[\s>]/).slice(1);
  const players = [];
  rows.forEach((row) => {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = tdRe.exec(row))) cells.push(cleanText(c[1]));
    if (cells.length < headers.length) return;
    players.push({
      num: cells[idx.num], name: cells[idx.name], games: cells[idx.games],
      goals: cells[idx.goals], assists: cells[idx.assists], points: cells[idx.points],
      shots: cells[idx.shots], toi: cells[idx.toi],
    });
  });

  players.sort((a, b) => (parseInt(a.num, 10) || 999) - (parseInt(b.num, 10) || 999));
  return players;
}

function writeFile(path, text) {
  const ok = $(text).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
  if (!ok) throw new Error('Не удалось записать ' + path);
}

function run() {
  const dir = scriptDir();
  const result = { updated: new Date().toISOString(), source: 'https://www.vhlru.ru/stats/players/' };

  Object.keys(SOURCES).forEach((key) => {
    const players = parsePlayers(download(SOURCES[key]));
    if (!players.length) throw new Error('Пустой список: ' + key);
    result[key] = players;
  });

  writeFile(dir + '/data.js',
    '// Файл создаётся автоматически скриптом update-stats.js — не редактируйте вручную.\n' +
    'window.KHIMIK_STATS = ' + JSON.stringify(result, null, 2) + ';\n');

  return 'OK ' + result.updated + ': нападающих ' + result.forwards.length +
    ', защитников ' + result.defenders.length;
}
