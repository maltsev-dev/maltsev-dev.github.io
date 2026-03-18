// 404 Page Glitch Effect - Random glitch bursts
(function() {
  'use strict';

  function initGlitchEffect() {
    const errorPage = document.querySelector('.error-404');
    if (!errorPage) return;

    const glitchCode = document.querySelector('.error-404-code');
    if (!glitchCode) return;

    // Create random glitch bursts
    function createGlitchBurst() {
      const burst = document.createElement('div');
      burst.className = 'glitch-burst';
      burst.style.cssText = `
        position: absolute;
        background: ${Math.random() > 0.5 ? '#ff00c1' : '#00fff9'};
        width: ${Math.random() * 100 + 50}px;
        height: ${Math.random() * 3 + 1}px;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        opacity: 0.5;
        pointer-events: none;
        z-index: 5;
        animation: glitch-burst-fade 0.3s ease-out forwards;
      `;
      
      errorPage.appendChild(burst);
      
      // Remove after animation
      setTimeout(() => {
        burst.remove();
      }, 300);
    }

    // Add glitch burst keyframe dynamically
    const style = document.createElement('style');
    style.textContent = `
      @keyframes glitch-burst-fade {
        0% { opacity: 0.5; transform: translateX(0) scaleX(1); }
        50% { opacity: 0.8; transform: translateX(${Math.random() > 0.5 ? '' : '-'}20px) scaleX(1.5); }
        100% { opacity: 0; transform: translateX(${Math.random() > 0.5 ? '' : '-'}40px) scaleX(2); }
      }
    `;
    document.head.appendChild(style);

    // Trigger random glitch bursts
    function triggerRandomGlitch() {
      const glitchCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < glitchCount; i++) {
        setTimeout(() => {
          createGlitchBurst();
        }, i * 100);
      }

      // Add temporary intense glitch to the 404 text
      glitchCode.style.animation = 'none';
      glitchCode.offsetHeight; // Trigger reflow
      glitchCode.style.animation = 'glitch-skew 0.3s ease-out';
      
      setTimeout(() => {
        glitchCode.style.animation = 'glitch-skew 3s infinite';
      }, 300);

      // Schedule next glitch
      const nextGlitchDelay = Math.random() * 3000 + 2000;
      setTimeout(triggerRandomGlitch, nextGlitchDelay);
    }

    // Start glitch effect after a short delay
    setTimeout(triggerRandomGlitch, 1000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlitchEffect);
  } else {
    initGlitchEffect();
  }
})();
