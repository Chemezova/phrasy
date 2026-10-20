// Phrasy — тренажёр фраз. Всё хранится на телефоне (localStorage).

const STORE_KEY = 'phrasy.v1';
const SESSION_SIZE = 10;
const MAX_NEW = 5;
const DAY = 24 * 60 * 60 * 1000;
// Через сколько дней вернуть фразу после верного ответа, по номеру «коробки»
const INTERVALS = [0, 1, 2, 4, 8, 16, 30];
const LEARNED_BOX = 3;
const ALL_PARTICLES = ['up', 'out', 'off', 'on', 'in', 'down', 'back', 'over', 'around', 'away'];

TOPICS.mine = { name: 'Мои фразы', icon: '⭐' };

// ---------- Хранилище ----------

function emptyState() {
  return { version: 1, progress: {}, custom: [], topic: 'all', days: {}, mode: 'mix' };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(emptyState(), JSON.parse(raw));
  } catch (e) {}
  return emptyState();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

let state = load();

// ---------- Фразы ----------

function parseExample(ex) {
  const m = ex && ex.match(/\[([^\]]+)\]/);
  if (!m) return null;
  const opts = m[1].split('|').map(s => s.trim());
  return { answer: opts[0], options: opts, before: ex.slice(0, m.index), after: ex.slice(m.index + m[0].length) };
}

function buildItem(id, topic, en, ru, ex, exRu) {
  const gap = parseExample(ex);
  const plain = gap ? gap.before + gap.answer + gap.after : (ex || '');
  return { id, topic, en, ru, ex: plain, exRu: exRu || '', gap };
}

// Свои фразы: если фраза кончается частицей и она есть в примере — делаем пропуск сами
function autoGap(en, ex) {
  if (!ex) return '';
  // Берём последнюю частицу во фразе: в «run out of» это out
  const last = en.toLowerCase().split(/\s+/).reverse().find(w => ALL_PARTICLES.includes(w));
  if (!last) return ex;
  const re = new RegExp('\\b' + last + '\\b', 'i');
  const m = ex.match(re);
  if (!m) return ex;
  const others = shuffle(ALL_PARTICLES.filter(p => p !== last)).slice(0, 2);
  return ex.slice(0, m.index) + '[' + m[0] + '|' + others.join('|') + ']' + ex.slice(m.index + m[0].length);
}

function allItems() {
  const seed = SEED.map(([topic, en, ru, ex, exRu]) => buildItem('s:' + en, topic, en, ru, ex, exRu));
  const mine = state.custom.map(c => buildItem(c.id, 'mine', c.en, c.ru, autoGap(c.en, c.ex), c.exRu));
  return seed.concat(mine);
}

function itemsOf(topic) {
  const items = allItems();
  return topic === 'all' ? items : items.filter(i => i.topic === topic);
}

function prog(id) { return state.progress[id]; }

// ---------- Помощники ----------

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'en-US' && /Samantha|Ava|Allison/.test(v.name)) || vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

let toastTimer;
function toast(text) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2500);
}

// ---------- Талисман ----------

function mascot(mood, cls) {
  const eyes = {
    happy: '<circle cx="36" cy="44" r="5"/><circle cx="64" cy="44" r="5"/>',
    wow:   '<path d="M30 46 q6 -9 12 0" stroke-width="4" fill="none"/><path d="M58 46 q6 -9 12 0" stroke-width="4" fill="none"/>',
    oops:  '<circle cx="36" cy="46" r="5"/><circle cx="64" cy="46" r="5"/><path d="M29 36 l12 -4" stroke-width="3.5"/><path d="M71 36 l-12 -4" stroke-width="3.5"/><path d="M80 26 q5 8 0 11 q-5 -3 0 -11z" fill="#7CC4F0" stroke="none"/>',
    calm:  '<path d="M30 46 h12" stroke-width="4"/><path d="M58 46 h12" stroke-width="4"/>',
  }[mood];
  const mouth = {
    happy: '<path d="M34 62 q16 14 32 0" stroke-width="4.5" fill="none"/>',
    wow:   '<path d="M32 60 q18 22 36 0 z" stroke-width="3" fill="currentColor"/>',
    oops:  '<path d="M36 66 q4 -4 8 0 q4 4 8 0 q4 -4 8 0" stroke-width="4" fill="none"/>',
    calm:  '<path d="M38 63 q12 8 24 0" stroke-width="4.5" fill="none"/>',
  }[mood];
  return `<svg class="mascot ${cls || ''}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="52" r="44" fill="var(--face)"/>
    <circle cx="22" cy="60" r="7" fill="#FF9E7A" opacity=".55"/>
    <circle cx="78" cy="60" r="7" fill="#FF9E7A" opacity=".55"/>
    <g fill="var(--face-ink)" stroke="var(--face-ink)" stroke-linecap="round" style="color:var(--face-ink)">${eyes}${mouth}</g>
  </svg>`;
}

const PRAISE = ['Отлично!', 'Yes!', 'Так держать!', 'Супер!', 'Nailed it!', 'Прекрасно!', 'Well done!'];
const COMFORT = ['Почти! Вернёмся к ней.', 'Ничего, запомним.', 'Бывает! Ещё увидимся.', 'Не страшно, повторим.'];

// ---------- Экраны ----------

const app = document.getElementById('app');
let session = null;

function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }

function topicStats(topic) {
  const items = itemsOf(topic);
  const learned = items.filter(i => (prog(i.id) || {}).box >= LEARNED_BOX).length;
  return { total: items.length, learned };
}

function dueCount(topic) {
  const now = Date.now();
  return itemsOf(topic).filter(i => { const p = prog(i.id); return p && p.due <= now; }).length;
}

function homeGreeting() {
  const due = dueCount(state.topic);
  const fresh = itemsOf(state.topic).filter(i => !prog(i.id)).length;
  if (!Object.keys(state.progress).length) return 'Привет! Я Фразик. Давай учить фразы, которые пригодятся в поездках. 3 минуты, без стресса.';
  if (due > 0) return `${due} ${plural(due, 'фраза ждёт', 'фразы ждут', 'фраз ждут')} повторения. Заглянем?`;
  if (fresh > 0) return pick(['Есть новые фразы. Пара минут?', 'Потупим с пользой?', 'Я соскучился! Поехали?']);
  return 'Всё повторено! Можно просто потренироваться вперемешку.';
}

function showHome() {
  session = null;
  const all = topicStats('all');
  const todayCount = listOf('today').length;
  const inWork = listOf('work').length;
  const topicKeys = Object.keys(TOPICS).filter(k => !TOPICS[k].group && (k !== 'mine' || state.custom.length));
  const sheetKeys = Object.keys(TOPICS).filter(k => TOPICS[k].group === 'sheet');

  render(`
    <div class="top">
      <h1>Phrasy</h1>
      <button class="icon-btn" data-go="words" aria-label="Мои фразы">➕</button>
      <button class="icon-btn" data-go="settings" aria-label="Настройки">⚙️</button>
    </div>
    <div class="hero">${mascot(Object.keys(state.progress).length ? 'happy' : 'wow', 'bounce')}<div class="bubble">${homeGreeting()}</div></div>
    <button class="big" data-go="start">Поехали</button>
    <p class="hint">${state.topic === 'all' ? 'Все темы вперемешку' : TOPICS[state.topic].icon + ' ' + TOPICS[state.topic].name}</p>

    <div class="seg" role="group" aria-label="Направление перевода">
      ${Object.entries(MODES).map(([k, m]) => `<button class="${state.mode === k ? 'on' : ''}" data-mode="${k}">${m.label}</button>`).join('')}
    </div>

    <div class="stats">
      <button class="stat" data-list="learned"><b>${all.learned}</b><span>выучено</span></button>
      <button class="stat" data-list="work"><b>${inWork}</b><span>в процессе</span></button>
      <button class="stat" data-list="today"><b>${todayCount}</b><span>сегодня</span></button>
    </div>

    <div class="section-title">Тема</div>
    <div class="topics">
      ${topicCard('all', '🎲', 'Всё вперемешку')}
      ${topicKeys.map(k => topicCard(k, TOPICS[k].icon, TOPICS[k].name)).join('')}
    </div>
    ${sheetKeys.length ? `<div class="section-title">Из моей таблицы</div>
    <div class="topics">${sheetKeys.map(k => topicCard(k, TOPICS[k].icon, TOPICS[k].name)).join('')}</div>` : ''}
  `);
}

function topicCard(key, icon, name) {
  const s = topicStats(key);
  const pct = s.total ? Math.round(s.learned / s.total * 100) : 0;
  return `<button class="topic ${state.topic === key ? 'on' : ''}" data-topic="${key}">
    <div class="t-icon">${icon}</div>
    <div class="t-name">${esc(name)}</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="t-count">${s.learned} из ${s.total}</div>
  </button>`;
}

// ---------- Сессия ----------

function buildSession() {
  const items = itemsOf(state.topic);
  const now = Date.now();
  const due = items.filter(i => { const p = prog(i.id); return p && p.due <= now; })
                   .sort((a, b) => prog(a.id).due - prog(b.id).due);
  const fresh = shuffle(items.filter(i => !prog(i.id)));
  let queue = due.slice(0, SESSION_SIZE - Math.min(MAX_NEW, fresh.length));
  queue = queue.concat(fresh.slice(0, Math.min(MAX_NEW, SESSION_SIZE - queue.length)));
  if (queue.length < SESSION_SIZE) queue = queue.concat(due.slice(queue.length, SESSION_SIZE));
  queue = Array.from(new Set(queue));
  let practice = false;
  if (!queue.length) {
    // Всё повторено — просто тренировка из уже знакомого
    queue = shuffle(items.filter(i => prog(i.id))).slice(0, SESSION_SIZE);
    practice = true;
  }
  return { queue: shuffle(queue), pos: 0, total: queue.length, right: 0, retried: {}, practice, newOnes: 0 };
}

function startSession() {
  session = buildSession();
  if (!session.queue.length) { toast('В этой теме пока нет фраз'); return; }
  nextStep();
}

const MODES = {
  mix:     { label: 'Вперемешку' },
  'en-ru': { label: 'EN → RU' },
  'ru-en': { label: 'RU → EN' },
};

// Варианты ответа из той же темы: правильный + 2 других, без одинаковых
function choicesFor(item, field) {
  const pool = itemsOf(item.topic === 'mine' ? 'all' : item.topic);
  const others = Array.from(new Set(shuffle(pool).map(i => i[field]).filter(v => v && v !== item[field])));
  if (others.length < 2) return null;
  return shuffle([item[field], others[0], others[1]]);
}

function chooseExercise(item) {
  const p = prog(item.id);
  if (!p || p.box === 0) return 'intro';
  if (state.mode === 'ru-en') return 'reverse';
  if (state.mode === 'en-ru') return 'meaning';
  // Вперемешку: «что значит» и «вставь слово», со второго круга ещё «как сказать по-английски»
  const kinds = ['meaning'];
  if (item.gap) kinds.push('gap');
  if (p.box >= 2) kinds.push('reverse');
  return pick(kinds);
}

function progressBar() {
  const pct = Math.round(session.pos / session.total * 100);
  return `<div class="progress">
    <button class="icon-btn" data-go="home" aria-label="Закончить">✕</button>
    <div class="bar"><i style="width:${pct}%"></i></div>
  </div>`;
}

function nextStep() {
  if (session.pos >= session.queue.length) return showDone();
  const item = session.queue[session.pos];
  const kind = chooseExercise(item);
  session.current = { item, kind, answered: false };
  if (kind === 'intro') return showIntro(item);
  if (kind === 'gap') return showGap(item);
  const opts = choicesFor(item, kind === 'meaning' ? 'ru' : 'en');
  if (!opts) { session.current.kind = 'intro'; return showIntro(item); }
  return kind === 'meaning' ? showMeaning(item, opts) : showReverse(item, opts);
}

function sayBtn(text) {
  return `<button class="say" data-say="${esc(text)}" aria-label="Послушать">🔊</button>`;
}

function showIntro(item) {
  render(`
    ${progressBar()}
    <div class="card">
      <div class="kind">${prog(item.id) ? 'Ещё раз' : 'Новая фраза'} · ${TOPICS[item.topic].icon} ${esc(TOPICS[item.topic].name)}</div>
      <div class="phrase"><span>${esc(item.en)}</span>${sayBtn(item.en)}</div>
      ${item.ex ? `<div class="example">${highlight(item)}</div>` : ''}
      <div class="reveal" id="reveal" hidden>
        <div class="meaning">${esc(item.ru)}</div>
        ${item.exRu ? `<div class="ru">${esc(item.exRu)}</div>` : ''}
      </div>
    </div>
    <div class="duo" id="intro-actions">
      <button class="no" data-act="show">Показать перевод</button>
      <button class="yes" data-act="know">Уже знаю</button>
    </div>
  `);
  speak(item.en);
}

function highlight(item) {
  if (!item.gap) return esc(item.ex);
  return esc(item.gap.before) + '<b>' + esc(item.gap.answer) + '</b>' + esc(item.gap.after);
}

function showGap(item) {
  const g = item.gap;
  const opts = shuffle(g.options);
  render(`
    ${progressBar()}
    <div class="card">
      <div class="kind">Вставь слово</div>
      <div class="example">${esc(g.before)}<span class="gap" id="gap">&nbsp;?&nbsp;</span>${esc(g.after)}</div>
      <div class="ru">${esc(item.exRu)}</div>
    </div>
    <div class="options">
      ${opts.map(o => `<button class="opt" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}
    </div>
    <div id="fb"></div>
  `);
}

function showMeaning(item, opts) {
  render(`
    ${progressBar()}
    <div class="card">
      <div class="kind">Что это значит?</div>
      <div class="phrase"><span>${esc(item.en)}</span>${sayBtn(item.en)}</div>
      ${item.ex ? `<div class="example">${highlight(item)}</div>` : ''}
    </div>
    <div class="options">
      ${opts.map(o => `<button class="opt ru-opt" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}
    </div>
    <div id="fb"></div>
  `);
  speak(item.en);
}

function showReverse(item, opts) {
  render(`
    ${progressBar()}
    <div class="card">
      <div class="kind">Как сказать по-английски?</div>
      <div class="phrase"><span>${esc(item.ru)}</span></div>
    </div>
    <div class="options">
      ${opts.map(o => `<button class="opt" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}
    </div>
    <div id="fb"></div>
  `);
}

function answer(value) {
  const cur = session.current;
  if (cur.answered) return;
  cur.answered = true;
  const item = cur.item;
  const correct = cur.kind === 'gap' ? item.gap.answer : cur.kind === 'meaning' ? item.ru : item.en;
  const ok = value === correct;

  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.ans === correct) b.classList.add('right');
    else if (b.dataset.ans === value) b.classList.add('wrong');
  });
  if (cur.kind === 'gap') {
    const gap = document.getElementById('gap');
    gap.textContent = correct;
  }
  grade(item, ok);

  const particle = cur.kind === 'gap' && PARTICLES[correct.toLowerCase()] ? `<div class="particle">💡 ${esc(PARTICLES[correct.toLowerCase()])}</div>` : '';
  document.getElementById('fb').innerHTML = `
    <div class="feedback">
      ${mascot(ok ? 'wow' : 'oops', 'small ' + (ok ? 'bounce' : 'wobble'))}
      <div class="fb-text">
        <div class="fb-title">${ok ? pick(PRAISE) : pick(COMFORT)}</div>
        <div><b>${esc(item.en)}</b> — ${esc(item.ru)}</div>
        ${particle}
      </div>
      ${sayBtn(item.ex || item.en)}
    </div>
    <button class="big next" data-act="next">Дальше</button>
  `;
  speak(item.ex || item.en);
}

// Вернуть фразу в конец подхода — не больше двух раз, чтобы не застрять
function requeue(item) {
  const n = session.retried[item.id] || 0;
  if (n >= 2) return;
  session.retried[item.id] = n + 1;
  session.queue.push(item);
  session.total++;
}

function grade(item, ok) {
  const p = state.progress[item.id] || { box: 0, due: 0 };
  if (ok) {
    p.box = Math.min(p.box + 1, INTERVALS.length - 1);
    p.due = Date.now() + INTERVALS[p.box] * DAY;
    session.right++;
  } else {
    p.box = 1;
    p.due = Date.now();
    // Ошибку вернём в конце этой же сессии
    requeue(item);
  }
  p.last = Date.now();
  state.progress[item.id] = p;
  state.days[today()] = (state.days[today()] || 0) + 1;
  save();
}

function introAction(act) {
  const item = session.current.item;
  if (act === 'show') {
    document.getElementById('reveal').hidden = false;
    // Посмотрела перевод — значит, фраза новая: проверим её в конце подхода
    const box = document.getElementById('intro-actions');
    box.className = '';
    box.innerHTML = `<button class="big" data-act="learn">Понятно, дальше</button>`;
    return;
  }
  const p = state.progress[item.id] || { box: 0, due: 0 };
  if (act === 'know') {
    // Знакомую фразу проверим попозже
    p.box = Math.max(p.box, 2);
    p.due = Date.now() + INTERVALS[2] * DAY;
  } else {
    // Новую — проверим упражнением в конце этой же сессии
    p.box = 1;
    p.due = Date.now();
    requeue(item);
  }
  p.last = Date.now();
  state.progress[item.id] = p;
  state.days[today()] = (state.days[today()] || 0) + 1;
  save();
  session.pos++;
  nextStep();
}

function showDone() {
  const s = session;
  const answered = new Set(s.queue.map(i => i.id)).size;
  const msg = s.practice ? 'Хорошая тренировка!' : pick(['Отличная разминка!', 'Вот это да!', 'Мозг доволен!', 'Красота!']);
  render(`
    <div class="done">
      ${mascot('wow', 'bounce')}
      <h2>${msg}</h2>
      <p>${answered} ${plural(answered, 'фраза', 'фразы', 'фраз')} за подход. Я горжусь тобой!</p>
    </div>
    <div class="spacer"></div>
    <button class="big" data-go="start">Ещё подход</button>
    <button class="ghost" data-go="home">На главную</button>
  `);
  session = null;
}

// ---------- Списки за цифрами на главной ----------

const LISTS = {
  learned: { title: 'Выучено', empty: 'Пока пусто. Фраза попадает сюда, когда ты несколько раз подряд ответишь на неё верно.' },
  work:    { title: 'В процессе', empty: 'Пока пусто. Здесь будут фразы, которые ты уже начала учить.' },
  today:   { title: 'Сегодня', empty: 'Сегодня ещё не занимались. Поехали?' },
};

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

function listOf(kind) {
  const from = startOfToday();
  return allItems().filter(i => {
    const p = prog(i.id);
    if (!p) return false;
    if (kind === 'learned') return p.box >= LEARNED_BOX;
    if (kind === 'work') return p.box > 0 && p.box < LEARNED_BOX;
    return (p.last || 0) >= from;
  }).sort((a, b) => (prog(b.id).last || 0) - (prog(a.id).last || 0));
}

function showList(kind) {
  const items = listOf(kind);
  const answers = state.days[today()] || 0;
  const rows = items.map(i => `
    <div class="row">
      <div class="r-main"><div class="r-en">${esc(i.en)}</div><div class="r-ru">${esc(i.ru)}</div></div>
      ${dots(i.id)}
      <button class="say" data-say="${esc(i.en)}" aria-label="Послушать">🔊</button>
    </div>`).join('');
  render(`
    <div class="top">
      <button class="icon-btn" data-go="home" aria-label="Назад">←</button>
      <h1>${LISTS[kind].title} · ${items.length}</h1>
    </div>
    ${kind === 'today' && answers ? `<p class="note">${answers} ${plural(answers, 'ответ', 'ответа', 'ответов')} за сегодня.</p>` : ''}
    <p class="note">Точки справа — прогресс фразы: три зелёные значат «выучено».</p>
    <div class="list">${rows || `<p class="note">${LISTS[kind].empty}</p>`}</div>
  `);
}

// ---------- Мои фразы ----------

function showWords() {
  const rows = state.custom.slice().reverse().map(c => `
    <div class="row">
      <div class="r-main"><div class="r-en">${esc(c.en)}</div><div class="r-ru">${esc(c.ru)}</div></div>
      ${dots(c.id)}
      <button class="del" data-del="${esc(c.id)}" aria-label="Удалить">✕</button>
    </div>`).join('');
  render(`
    <div class="top">
      <button class="icon-btn" data-go="home" aria-label="Назад">←</button>
      <h1>Мои фразы</h1>
    </div>
    <form id="add">
      <label class="field"><span>Фраза по-английски</span><input name="en" required autocomplete="off" autocapitalize="none" placeholder="run out of"></label>
      <label class="field"><span>Перевод</span><input name="ru" required autocomplete="off" placeholder="закончиться"></label>
      <label class="field"><span>Пример (можно пропустить)</span><input name="ex" autocomplete="off" autocapitalize="none" placeholder="We ran out of milk."></label>
      <button class="big" type="submit">Добавить</button>
    </form>
    <p class="note">Подсказка: если во фразе есть частица (up, out, off…) и она есть в примере, Фразик сам сделает из неё упражнение «вставь слово».</p>

    <div class="section-title">Добавить списком</div>
    <form id="bulk">
      <label class="field"><span>Одна фраза на строку: фраза – перевод – пример (пример можно не писать). Можно просто скопировать строки из Google Таблицы.</span>
        <textarea name="list" rows="7" autocapitalize="none" placeholder="run out of – закончиться – We ran out of milk.&#10;look into – изучить&#10;keep in touch – оставаться на связи"></textarea></label>
      <button class="ghost" type="submit">📋 Добавить все</button>
    </form>
    <div id="bulk-report"></div>

    <div class="list">${rows || ''}</div>
  `);
}

// Разбор списка: строки из Google Таблицы (через табуляцию) или «фраза – перевод – пример»
function parseLine(line) {
  let cols;
  if (line.includes('\t')) cols = line.split('\t');
  else cols = line.split(/\s+[–—-]\s+|\s*[=;|]\s*/);
  cols = cols.map(c => c.trim()).filter(Boolean);
  if (cols.length < 2) return null;
  const [en, ru, ...rest] = cols;
  // Пример — колонка, похожая на предложение с этой фразой (синонимы пропускаем)
  const first = en.toLowerCase().split(/\s+/)[0];
  const ex = rest.find(c => c.split(/\s+/).length >= 4 && c.toLowerCase().includes(first)) || '';
  return { en, ru, ex };
}

function addBulk(form) {
  const lines = form.list.value.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return;
  const known = new Set(allItems().map(i => i.en.toLowerCase()));
  const added = [], dups = [], noRu = [];
  lines.forEach((line, n) => {
    const p = parseLine(line);
    if (!p) { noRu.push(line); return; }
    const key = p.en.toLowerCase();
    if (known.has(key)) { dups.push(p.en); return; }
    known.add(key);
    state.custom.push({ id: 'c:' + Date.now() + '-' + n, en: p.en, ru: p.ru, ex: p.ex, exRu: '' });
    added.push(p.en);
  });
  save();
  showWords();
  document.getElementById('bulk-report').innerHTML = `<div class="note">
    ✅ Добавлено: ${added.length}
    ${dups.length ? `<br>↩️ Уже были в приложении: ${dups.map(esc).join(', ')}` : ''}
    ${noRu.length ? `<br>⚠️ Не получилось разобрать (нет перевода): ${noRu.map(esc).join('; ')}` : ''}
  </div>`;
  if (noRu.length) document.querySelector('#bulk textarea').value = noRu.join('\n');
  document.getElementById('bulk-report').scrollIntoView({ block: 'center' });
}

function dots(id) {
  const box = (prog(id) || {}).box || 0;
  return `<div class="dots" title="Прогресс">${[1, 2, 3].map(n => `<i class="${box >= n ? 'on' : ''}"></i>`).join('')}</div>`;
}

function addWord(form) {
  const en = form.en.value.trim(), ru = form.ru.value.trim(), ex = form.ex.value.trim();
  if (!en || !ru) return;
  state.custom.push({ id: 'c:' + Date.now(), en, ru, ex, exRu: '' });
  save();
  toast('Добавлено: ' + en);
  showWords();
}

function delWord(id) {
  if (!confirm('Удалить эту фразу?')) return;
  state.custom = state.custom.filter(c => c.id !== id);
  delete state.progress[id];
  save();
  showWords();
}

// ---------- Настройки и резервная копия ----------

function showSettings() {
  render(`
    <div class="top">
      <button class="icon-btn" data-go="home" aria-label="Назад">←</button>
      <h1>Настройки</h1>
    </div>
    <div class="section-title">Резервная копия</div>
    <p class="note" style="margin-top:0">Прогресс хранится только на этом телефоне. Время от времени сохраняй копию в «Файлы» или себе в мессенджер.</p>
    <button class="ghost" data-act="export">💾 Сохранить копию</button>
    <button class="ghost" data-act="import">📂 Загрузить из копии</button>
    <input type="file" id="importFile" accept="application/json,.json" hidden>

    <div class="section-title">Как поставить на iPhone</div>
    <p class="note" style="margin-top:0">Открой эту страницу в Safari → кнопка «Поделиться» → «На экран „Домой“». Иконка появится рядом с другими приложениями.</p>

    <div class="section-title">Начать заново</div>
    <button class="ghost" data-act="reset">Сбросить прогресс</button>
    <p class="hint" style="margin-top:20px">Phrasy · ${SEED.length} фраз в наборе</p>
  `);
}

async function exportData() {
  const data = JSON.stringify({ app: 'phrasy', exported: new Date().toISOString(), state }, null, 1);
  const name = 'phrasy-backup-' + today() + '.json';
  const file = new File([data], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Phrasy — копия' });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.app !== 'phrasy' || !data.state) throw new Error('bad');
      if (!confirm('Заменить текущий прогресс данными из копии?')) return;
      state = Object.assign(emptyState(), data.state);
      save();
      toast('Готово, прогресс загружен');
      showHome();
    } catch (e) {
      toast('Это не похоже на копию Phrasy');
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm('Стереть весь прогресс? Свои фразы останутся.')) return;
  state.progress = {};
  state.days = {};
  save();
  toast('Прогресс сброшен');
  showHome();
}

// ---------- События ----------

app.addEventListener('click', e => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.say) { speak(el.dataset.say); return; }
  if (el.dataset.topic) { state.topic = el.dataset.topic; save(); showHome(); return; }
  if (el.dataset.mode) { state.mode = el.dataset.mode; save(); showHome(); return; }
  if (el.dataset.list) { showList(el.dataset.list); return; }
  if (el.dataset.ans !== undefined) { answer(el.dataset.ans); return; }
  if (el.dataset.del) { delWord(el.dataset.del); return; }
  const go = el.dataset.go;
  if (go === 'home') return showHome();
  if (go === 'start') return startSession();
  if (go === 'words') return showWords();
  if (go === 'settings') return showSettings();
  const act = el.dataset.act;
  if (act === 'next') { session.pos++; return nextStep(); }
  if (act === 'show' || act === 'know' || act === 'learn') return introAction(act);
  if (act === 'export') return exportData();
  if (act === 'import') return document.getElementById('importFile').click();
  if (act === 'reset') return resetAll();
});

app.addEventListener('submit', e => {
  if (e.target.id === 'add') { e.preventDefault(); addWord(e.target); }
  if (e.target.id === 'bulk') { e.preventDefault(); addBulk(e.target); }
});

app.addEventListener('change', e => {
  if (e.target.id === 'importFile' && e.target.files[0]) importData(e.target.files[0]);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

showHome();
