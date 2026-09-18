// Scroll reveal — elements brush in as they enter the viewport
(function() {
    'use strict';

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function initScrollAnimations() {
        if (prefersReducedMotion()) {
            document.querySelectorAll('.fade-in, .reveal-left, .reveal-right')
                .forEach(el => el.classList.add('visible'));
            return;
        }

        const animatedElements = document.querySelectorAll('.fade-in, .reveal-left, .reveal-right');
        if (animatedElements.length === 0) return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.08
        });

        animatedElements.forEach(el => observer.observe(el));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
        initScrollAnimations();
    }
})();