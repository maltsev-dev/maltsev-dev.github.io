// Fade-in and reveal on scroll effects
(function() {
  'use strict';

  // Check if user prefers reduced motion
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initScrollAnimations() {
    if (prefersReducedMotion()) {
      return; // Skip animation if user prefers reduced motion
    }

    // Select all elements with fade-in, reveal-left, or reveal-right classes
    const animatedElements = document.querySelectorAll('.fade-in, .reveal-left, .reveal-right');

    if (animatedElements.length === 0) {
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => {
      observer.observe(el);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }
})();
