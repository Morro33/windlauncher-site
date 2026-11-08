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
  if (!stats.downloads) return;
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
const REVIEWS = {
  url: '',
  key: ''
};

const reviewsSection = document.getElementById('reviews');
const reviewForm = document.querySelector('[data-review-form]');
const reviewsList = document.querySelector('[data-reviews-list]');
const reviewsEmpty = document.querySelector('[data-reviews-empty]');
const reviewsSummary = document.querySelector('[data-reviews-summary]');
const reviewNote = document.querySelector('[data-review-note]');
const reviewSubmit = document.querySelector('[data-review-submit]');

const starsText = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

const shortDate = (value) => {
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value));
  } catch {
    return '';
  }
};

const buildReview = (review) => {
  const card = document.createElement('article');
  card.className = 'review';

  const header = document.createElement('header');
  const name = document.createElement('strong');
  name.textContent = review.name;

  const stars = document.createElement('span');
  stars.className = 'review-stars';
  stars.textContent = starsText(review.rating);

  const time = document.createElement('time');
  time.dateTime = review.created_at;
  time.textContent = shortDate(review.created_at);

  header.append(name, stars, time);

  const body = document.createElement('p');
  body.textContent = review.body;

  card.append(header, body);
  return card;
};

const renderSummary = (reviews) => {
  if (!reviewsSummary) return;
  if (!reviews.length) {
    reviewsSummary.hidden = true;
    return;
  }
  const average = reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length;
  const rounded = Math.round(average);
  const text = average.toFixed(1).replace('.', ',');

  reviewsSummary.innerHTML = '';
  const stars = document.createElement('span');
  stars.className = 'summary-stars';
  stars.textContent = starsText(rounded);
  const strong = document.createElement('strong');
  strong.textContent = text;
  const count = plural(reviews.length, 'отзыв', 'отзыва', 'отзывов');
  reviewsSummary.append(stars, strong, ` · ${reviews.length} ${count}`);
  reviewsSummary.hidden = false;
};

const renderReviews = (reviews) => {
  if (!reviewsList) return;
  reviewsList.querySelectorAll('.review').forEach((node) => node.remove());
  for (const review of reviews) reviewsList.append(buildReview(review));
  if (reviewsEmpty) reviewsEmpty.hidden = reviews.length > 0;
  renderSummary(reviews);
};

const setNote = (text, state) => {
  if (!reviewNote) return;
  reviewNote.textContent = text;
  if (state) reviewNote.dataset.state = state;
  else delete reviewNote.dataset.state;
};

const loadReviews = async () => {
  const response = await fetch(
    `${REVIEWS.url}/rest/v1/reviews?select=id,created_at,name,rating,body&hidden=eq.false&order=created_at.desc&limit=60`,
    { headers: { apikey: REVIEWS.key, authorization: `Bearer ${REVIEWS.key}` } }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const initReviews = async () => {
  reviewsSection.hidden = false;
  try {
    renderReviews(await loadReviews());
  } catch {
    if (reviewsEmpty) {
      reviewsEmpty.textContent = 'Не удалось загрузить отзывы. Обновите страницу позже.';
      reviewsEmpty.hidden = false;
    }
  }
};

if (reviewForm) {
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!reviewSubmit) return;

    const data = new FormData(reviewForm);
    const name = String(data.get('name') || '').trim();
    const body = String(data.get('body') || '').trim();
    const rating = Number(data.get('rating'));
    const trap = String(data.get('website') || '');

    if (trap) {
      reviewForm.reset();
      setNote('Спасибо! Отзыв опубликован.', 'ok');
      return;
    }

    if (name.length < 2 || name.length > 40) {
      setNote('Имя — от 2 до 40 символов.', 'error');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      setNote('Поставьте оценку от 1 до 5.', 'error');
      return;
    }
    if (body.length < 10 || body.length > 1200) {
      setNote('Отзыв — от 10 до 1200 символов.', 'error');
      return;
    }

    const last = Number(localStorage.getItem('wl.reviewAt') || 0);
    if (Date.now() - last < 60000) {
      setNote('Вы уже отправляли отзыв только что. Подождите минуту.', 'error');
      return;
    }

    reviewSubmit.disabled = true;
    setNote('Отправляем…');

    try {
      const response = await fetch(`${REVIEWS.url}/rest/v1/reviews`, {
        method: 'POST',
        headers: {
          apikey: REVIEWS.key,
          authorization: `Bearer ${REVIEWS.key}`,
          'content-type': 'application/json',
          prefer: 'return=representation'
        },
        body: JSON.stringify({ name, rating, body })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      reviewForm.reset();
      localStorage.setItem('wl.reviewAt', String(Date.now()));
      setNote('Спасибо! Отзыв опубликован.', 'ok');
      await loadReviews().then(renderReviews).catch(() => {});
    } catch {
      setNote('Не удалось отправить. Попробуйте ещё раз.', 'error');
    } finally {
      reviewSubmit.disabled = false;
    }
  });
}

if (REVIEWS.url && REVIEWS.key && reviewsSection) {
  initReviews();
}