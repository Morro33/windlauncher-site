const nav = document.getElementById('nav');
const onScroll = () => {
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 12);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const tilt = document.querySelector('[data-tilt]');
if (tilt && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reset = () => {
    tilt.style.setProperty('--rx', '0deg');
    tilt.style.setProperty('--ry', '0deg');
  };
  tilt.addEventListener('pointermove', (event) => {
    const rect = tilt.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tilt.style.setProperty('--ry', `${x * 5}deg`);
    tilt.style.setProperty('--rx', `${-y * 4}deg`);
  });
  tilt.addEventListener('pointerleave', reset);
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const target = document.querySelector(button.getAttribute('data-copy'));
    if (!target) return;
    const text = target.textContent?.trim() ?? '';
    try {
      await navigator.clipboard.writeText(text);
      const previous = button.textContent;
      button.textContent = 'Скопировано';
      setTimeout(() => {
        button.textContent = previous;
      }, 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}

const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const statsCache = 'wl.releaseStats';

const renderStats = (stats) => {
  const number = new Intl.NumberFormat('ru-RU').format(stats.downloads);
  const hero = document.querySelector('[data-downloads]');
  if (hero) {
    hero.textContent = `${number} ${plural(stats.downloads, 'скачивание', 'скачивания', 'скачиваний')}`;
    hero.hidden = false;
  }
  const note = document.querySelector('[data-downloads-note]');
  if (note) {
    const date = stats.at
      ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(stats.at))
      : null;
    note.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = number;
    note.append('Скачали ', strong, ` ${plural(stats.downloads, 'раз', 'раза', 'раз')}`);
    if (date) note.append(` · обновлено ${date}`);
    note.hidden = false;
  }
};

const loadStats = async () => {
  try {
    const cached = JSON.parse(localStorage.getItem(statsCache) || 'null');
    if (cached && Date.now() - cached.time < 600000) {
      renderStats(cached.value);
      return;
    }
  } catch {}

  try {
    const response = await fetch('https://api.github.com/repos/Morro33/windlauncher-site/releases?per_page=10', {
      headers: { accept: 'application/vnd.github+json' }
    });
    if (!response.ok) return;
    const releases = await response.json();
    const latest = releases.find((item) => !item.draft);
    if (!latest) return;
    const stats = {
      downloads: (latest.assets || []).reduce((sum, asset) => sum + (asset.download_count || 0), 0),
      at: latest.published_at
    };
    renderStats(stats);
    try {
      localStorage.setItem(statsCache, JSON.stringify({ time: Date.now(), value: stats }));
    } catch {}
  } catch {}
};

loadStats();