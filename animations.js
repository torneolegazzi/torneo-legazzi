/* animations.js — Torneo Legazzi */

(function () {
  'use strict';

  /* ── CURSOR GLOW ─────────────────────────────────────────── */
  if (window.matchMedia('(pointer: fine)').matches) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    let raf;
    document.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
      });
    });
  }

  /* ── SCROLL REVEAL ───────────────────────────────────────── */
  const revealObs = window._revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));

  /* ── STAGGER CHILDREN ────────────────────────────────────── */
  document.querySelectorAll('[data-stagger]').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.transitionDelay = (i * 75) + 'ms';
      revealObs.observe(child);
    });
  });

  /* ── BUTTON RIPPLE ───────────────────────────────────────── */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const rect = btn.getBoundingClientRect();
      const el   = document.createElement('span');
      el.className = 'ripple-el';
      el.style.left = (e.clientX - rect.left) + 'px';
      el.style.top  = (e.clientY - rect.top)  + 'px';
      btn.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    });
  });

  /* ── STICKY HEADER SHADOW ────────────────────────────────── */
  const header = document.querySelector('header');
  if (header) {
    const onScroll = () => {
      header.style.background = window.scrollY > 10
        ? 'rgba(6,16,30,0.88)'
        : 'rgba(6,16,30,0.65)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── DIGIT TICK PULSE ────────────────────────────────────── */
  /* Called externally from script.js when a digit changes */
  window.tickDigit = function (el) {
    el.classList.remove('tick');
    void el.offsetWidth; /* reflow */
    el.classList.add('tick');
    setTimeout(() => el.classList.remove('tick'), 150);
  };

})();
