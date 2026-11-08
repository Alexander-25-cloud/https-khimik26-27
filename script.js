// Заполняет таблицы данными из data.js (его обновляет update-stats.js каждые 2 часа)
// и перезагружает страницу каждые 2 часа, чтобы подхватить свежие цифры.

const RELOAD_EVERY_MS = 2 * 60 * 60 * 1000;

function cellValue(value) {
  const v = String(value ?? '').trim();
  return v === '' || v === '0' || v === '-' ? '—' : v;
}

function renderTable(tbodyId, players) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody || !Array.isArray(players) || players.length === 0) return;

  tbody.replaceChildren(
    ...players.map((p) => {
      const tr = document.createElement('tr');
      [p.num, p.name, p.games, p.goals, p.assists, p.points, p.shots, p.toi].forEach((value, i) => {
        const td = document.createElement('td');
        td.textContent = i === 1 ? value : cellValue(value);
        tr.appendChild(td);
      });
      return tr;
    })
  );
}

function renderStats() {
  const data = window.KHIMIK_STATS;
  const status = document.getElementById('update-status');

  if (!data) {
    if (status) status.textContent = 'Автообновление ещё не запускалось — показаны сохранённые данные';
    return;
  }

  renderTable('forwards-body', data.forwards);
  renderTable('defenders-body', data.defenders);

  if (status) {
    const updated = new Date(data.updated);
    status.textContent = 'Данные с сайта ВХЛ обновлены: ' + updated.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}

renderStats();
setTimeout(() => location.reload(), RELOAD_EVERY_MS);
