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
