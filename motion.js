/* Progressive enhancement: all content is readable when JavaScript or motion is unavailable. */
(() => {
  'use strict';
  const body = document.body;
  const root = document.documentElement;
  const hero = document.getElementById('journalHero');
  const toggle = document.getElementById('motionToggle');
  const systemPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width: 700px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const storageKey = 'bell-journal-motion';
  let preference = null;
  try { preference = localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
  let observer = null;
  let frame = 0;
  let enabled = false;
  let pointerX = 0;
  let pointerY = 0;
  let lastHeading = '';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function showEverything() {
    document.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('is-revealed'));
  }
  function updateFrame() {
    frame = 0;
    if (!enabled) return;
    const pageHeight = Math.max(1, root.scrollHeight - window.innerHeight);
    const scrollTop = window.scrollY || 0;
    root.style.setProperty('--reading-progress', clamp(scrollTop / pageHeight, 0, 1));
    if (hero && !hero.classList.contains('hidden')) {
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom > -120 && bounds.top < window.innerHeight + 120) {
        const progress = clamp((window.innerHeight * 0.38 - bounds.top) / (window.innerHeight * 0.65 + bounds.height), -0.4, 1);
        const intensity = smallScreen.matches ? 0.38 : 1;
        hero.style.setProperty('--book-y', (progress * -44 * intensity + pointerY * 5 * intensity) + 'px');
        hero.style.setProperty('--book-x', pointerX * 7 * intensity + 'px');
        hero.style.setProperty('--book-rotate', (progress * -4 + pointerX * 1.5) * intensity + 'deg');
        hero.style.setProperty('--book-scale', String(1 + Math.max(0, progress) * 0.045 * intensity));
        hero.style.setProperty('--copy-y', progress * 12 * intensity + 'px');
      }
    }
  }
  function requestFrame() {
    if (enabled && !frame) frame = requestAnimationFrame(updateFrame);
  }
  function revealHeading() {
    const heading = document.getElementById('pageTitle');
    if (!heading) return;
    const text = heading.textContent;
    if (!enabled || text === lastHeading && heading.querySelector('.word-mask')) return;
    lastHeading = text;
    const fragment = document.createDocumentFragment();
    let index = 0;
    text.split(/(\s+)/).forEach(word => {
      if (!word.trim()) { fragment.appendChild(document.createTextNode(word)); return; }
      const mask = document.createElement('span');
      const ink = document.createElement('span');
      mask.className = 'word-mask';
      ink.className = 'word-ink';
      ink.style.setProperty('--word-delay', index++ * 70 + 'ms');
      ink.textContent = word;
      mask.appendChild(ink);
      fragment.appendChild(mask);
    });
    heading.replaceChildren(fragment);
  }
  function refresh() {
    if (observer) observer.disconnect();
    if (!enabled) { showEverything(); return; }
    revealHeading();
    const parent = body.classList.contains('family-mode');
    const page = document.getElementById('crumb')?.textContent || '';
    const quiet = !parent && !['Overview', 'Test schedule', 'Assignments'].includes(page);
    const selector = parent
      ? '#content .panelhead, #content .event-card, #content .announcement, #content .empty'
      : quiet ? '' : '#stats .stat, #content .lm-card, #content .event-card, #content .announcement, #content .assignment-head';
    const elements = selector ? [...document.querySelectorAll(selector)] : [];
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
    elements.forEach((element, index) => {
      if (!element.hasAttribute('data-reveal')) {
        element.setAttribute('data-reveal', '');
        const stagger = element.matches('.event-card, .lm-card, .stat') ? index % (smallScreen.matches ? 2 : 4) : 0;
        element.style.setProperty('--reveal-delay', stagger * (parent ? 100 : 45) + 'ms');
        element.style.setProperty('--reveal-angle', parent && element.matches('.event-card') ? (index % 2 ? '1.1deg' : '-1.1deg') : '0deg');
      }
      if (!element.classList.contains('is-revealed')) observer.observe(element);
    });
    requestFrame();
  }
  function applyPreference() {
    enabled = preference !== 'off' && !systemPreference.matches && 'IntersectionObserver' in window;
    body.classList.toggle('motion-on', enabled);
    toggle.textContent = enabled ? 'Motion on' : 'Motion off';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-disabled', String(systemPreference.matches));
    toggle.setAttribute('aria-label', systemPreference.matches ? 'Motion is off to respect your device settings' : enabled ? 'Turn animations off' : 'Turn animations on');
    toggle.title = systemPreference.matches ? 'Your device prefers reduced motion' : 'Turn scroll animations on or off';
    if (!enabled) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (observer) observer.disconnect();
      showEverything();
    }
    refresh();
  }
  toggle.addEventListener('click', () => {
    if (systemPreference.matches) return;
    preference = enabled ? 'off' : 'on';
    try { localStorage.setItem(storageKey, preference); } catch { /* Keep the session preference. */ }
    applyPreference();
  });
  systemPreference.addEventListener('change', applyPreference);
  smallScreen.addEventListener('change', requestFrame);
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  window.addEventListener('bell:render', () => {
    try { refresh(); } catch { enabled = false; body.classList.remove('motion-on'); showEverything(); }
  });
  document.addEventListener('focusin', event => {
    const hiddenCard = event.target.closest('[data-reveal]');
    if (hiddenCard) { hiddenCard.classList.add('is-revealed'); observer?.unobserve(hiddenCard); }
  });
  if (hero) {
    hero.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches || smallScreen.matches) return;
      const bounds = hero.getBoundingClientRect();
      pointerX = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5);
      pointerY = clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5);
      requestFrame();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; requestFrame(); });
  }
  try { applyPreference(); } catch { body.classList.remove('motion-on'); showEverything(); }
})();
