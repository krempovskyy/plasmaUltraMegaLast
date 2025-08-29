document.addEventListener('DOMContentLoaded', () => {
  // Главный скроллер — контейнер, а не window
  const container = document.querySelector('.horizontal-scroll-container');
  
  // Считаем слайдами и интро
  const slides = [...document.querySelectorAll('.intro-section-new, .slide')];
  const stablecoinsSlide = document.querySelector('.stablecoins-vertical-slide');

  // Таймлайн
  const timelineContainer = document.querySelector('.timeline-container');
  const timelineLine = document.querySelector('.timeline-line');
  const timelineFill = document.querySelector('.timeline-fill');
  const timelineDots = [...document.querySelectorAll('.timeline-dot')];  

  const vw = () => window.innerWidth || 1;

  // ===== СНАП/НАВИГАЦИЯ =====
  let index = 0;
  let isAnimating = false;
  let queuedDir = 0;
  let idleTimer = null;
  let isInStablecoinsSection = false;

  const setActive = (i) => {
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
  };

  const snapTo = (i) => {
    index = Math.max(0, Math.min(i, slides.length - 1));
    
    // Простой скролл без сложной логики
    container.scrollTo({ left: index * vw(), behavior: 'smooth' });
    
    setActive(index);
    updateTimelineByScroll();
  };

  // Автодоснап, если инерция оставила между слайдами
  const scheduleIdleSnap = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (isInStablecoinsSection) return; // Don't snap when in stablecoins section
    
    idleTimer = setTimeout(() => {
      const nearest = Math.round(container.scrollLeft / vw());
      if (nearest !== index) snapTo(nearest);
    }, 120);
  };

  // Check if user is in the stablecoins section
  const checkStablecoinsSection = () => {
    const stablecoinsIndex = slides.indexOf(stablecoinsSlide);
    const currentSlideIndex = Math.round(container.scrollLeft / vw());
    isInStablecoinsSection = currentSlideIndex === stablecoinsIndex;
    
    // Update body overflow for vertical scrolling in stablecoins section
    if (isInStablecoinsSection) {
      document.body.style.overflow = 'hidden';
      stablecoinsSlide.style.overflowY = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
      stablecoinsSlide.style.overflowY = 'hidden';
    }
  };

  // ===== ТАЙМЛАЙН =====
  const ensureDots = () => {
    const need = 5; // Dots for slides 1-5 (last dot navigates to last slide)
    const have = timelineDots.length;
    if (need === have) return;
    // если в HTML их фиксированное число — пересоздадим
    document.querySelectorAll('.timeline-dot').forEach(d => d.remove());
    for (let i = 0; i < need; i++) {
      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      timelineContainer.appendChild(dot);
    }
  };

  const getDots = () => [...document.querySelectorAll('.timeline-dot')];

  const layoutDots = () => {
    const dots = getDots();
    const containerWidth = timelineContainer.offsetWidth;
    const n = 5; // Total dots including the last slide
    
    dots.forEach((dot, i) => {
      const x = (n === 1) ? 0 : (i / (n - 1)) * containerWidth;
      dot.style.left = `${x}px`;
    });
  };

  let rafId = null;
  let currentIndex = 0;

  const setActiveDot = (idx) => {
    getDots().forEach((d, i) => {
      if (i === idx) {
        d.style.transform = 'translateY(-50%) scale(1.1)';
        d.style.backgroundColor = '#4CAF50';
        d.style.borderColor = '#ffffff';
      } else {
        d.style.transform = 'translateY(-50%) scale(0.9)';
        d.style.backgroundColor = '#fff';
        d.style.borderColor = '#4CAF50';
      }
    });
  };

  const updateTimelineByScroll = () => {
    rafId = null;

    const currentSlideIndex = Math.round(container.scrollLeft / vw());
    
    // Handle timeline animation for slides 1-5
    if (currentSlideIndex >= 1 && currentSlideIndex <= 5) {
      const timelineIndex = currentSlideIndex - 1; // Map slides 1..5 -> 0..4
      const n = 5; // total dots including the last slide
      const fillRatio = timelineIndex / (n - 1);  // 0..1

      // Make the fill go slightly beyond the current checkpoint for better visual appearance
      const extendedFillRatio = Math.min(1, fillRatio + 0.02);
      timelineFill.style.width = `${extendedFillRatio * 100}%`;

      // Update active dot for slides 1-4 (visible dots)
      if (currentSlideIndex >= 1 && currentSlideIndex <= 4) {
        const idx = Math.round(timelineIndex);
        if (idx !== currentIndex && idx >= 0 && idx < n - 1) {
          currentIndex = idx;
          setActiveDot(idx);
        }
      }
    }
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(updateTimelineByScroll);
  };

  const afterSnapUpdateTimeline = () => {
    layoutDots();
    updateTimelineByScroll();
  };

  // Показ/скрытие таймлайна: только для средних слайдов (1-4)
  const toggleTimeline = () => {
    const currentSlideIndex = Math.round(container.scrollLeft / vw());
    
    // Show timeline only for middle slides (1-4)
    const show = currentSlideIndex >= 1 && currentSlideIndex <= 4;
    timelineContainer.style.opacity = show ? '1' : '0';
    timelineContainer.style.pointerEvents = show ? 'auto' : 'none';
  };

  // ===== События =====
  container.addEventListener('scroll', () => {
    // live-обновление индекса (если пользователь тянет тачпадом)
    const approx = Math.round(container.scrollLeft / vw());
    if (!isAnimating && approx !== index) {
      index = Math.max(0, Math.min(approx, slides.length - 1));
      setActive(index);
    }
    
    checkStablecoinsSection();
    toggleTimeline();
    scheduleIdleSnap();
    requestUpdate();
  }, { passive: true });

  // Modified wheel event handler to support vertical scrolling within slides
  container.addEventListener('wheel', (e) => {
    if (isInStablecoinsSection) {
      // Allow natural vertical scrolling in stablecoins section
      e.stopPropagation();
      return;
    }
    
    const currentSlide = slides[index];
    const isScrollable = currentSlide.scrollHeight > currentSlide.clientHeight;
    
    if (isScrollable) {
      // Check if we can scroll within the current slide
      const { scrollTop, scrollHeight, clientHeight } = currentSlide;
      const isAtTop = scrollTop <= 10; // Allow more tolerance for top
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // Allow more tolerance for bottom
      
      // If scrolling up at the top, go to previous slide
      if (e.deltaY < 0 && isAtTop) {
        e.preventDefault();
        snapTo(index - 1);
        return;
      }
      
      // If scrolling down at the bottom, go to next slide
      if (e.deltaY > 0 && isAtBottom) {
        e.preventDefault();
        snapTo(index + 1);
        return;
      }
      
      // Otherwise allow natural vertical scrolling within the slide
      // Don't prevent default, let the slide scroll naturally
      return;
    } else {
      // If slide is not scrollable, move to next/previous slide
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      snapTo(index + dir);
    }
  }, { passive: false });

  // Handle wheel events specifically for the stablecoins section
  if (stablecoinsSlide) {
    stablecoinsSlide.addEventListener('wheel', (e) => {
      if (!isInStablecoinsSection) return;
      
      const { scrollTop, scrollHeight, clientHeight } = stablecoinsSlide;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      // If scrolling up at the top, go to previous slide
      if (e.deltaY < 0 && isAtTop) {
        e.preventDefault();
        snapTo(index - 1);
        return;
      }
      
      // If scrolling down at the bottom, go to next slide (if exists)
      if (e.deltaY > 0 && isAtBottom && index < slides.length - 1) {
        e.preventDefault();
        snapTo(index + 1);
        return;
      }
      
      // Otherwise allow normal vertical scrolling
    }, { passive: false });
  }

  // Add wheel event listeners for scrollable slides to ensure they can scroll
  slides.forEach((slide, slideIndex) => {
    slide.addEventListener('wheel', (e) => {
      // Only handle if this is the current slide and it's scrollable
      if (slideIndex !== index) return;
      
      const isScrollable = slide.scrollHeight > slide.clientHeight;
      if (!isScrollable) return;
      
      const { scrollTop, scrollHeight, clientHeight } = slide;
      const isAtTop = scrollTop <= 10;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      
      // If scrolling up at the top, go to previous slide
      if (e.deltaY < 0 && isAtTop) {
        e.preventDefault();
        snapTo(index - 1);
        return;
      }
      
      // If scrolling down at the bottom, go to next slide
      if (e.deltaY > 0 && isAtBottom) {
        e.preventDefault();
        snapTo(index + 1);
        return;
      }
      
      // Otherwise allow natural vertical scrolling within the slide
      // Don't prevent default, let the slide scroll naturally
    }, { passive: false });
  });

  // Клики по точкам таймлайна
  timelineContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('timeline-dot')) {
      const dots = getDots();
      const clickedIndex = dots.indexOf(e.target);
      if (clickedIndex !== -1) {
        // Convert timeline index (0-4) to slide index (1-5)
        const slideIndex = clickedIndex + 1;
        snapTo(slideIndex);
      }
    }
  });

  // Клавиши стрелок - modified to handle vertical scrolling in stablecoins
  document.addEventListener('keydown', (e) => {
    if (isInStablecoinsSection) {
      // Allow natural arrow key scrolling in stablecoins section
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        return; // Don't prevent default, allow natural scrolling
      }
    }
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      snapTo(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      snapTo(index - 1);
    }
  });

  // Инициализация
  ensureDots();
  layoutDots();
  setActive(0);
  
  // Initialize timeline to show first checkpoint as active
  setActiveDot(0);
  timelineFill.style.width = '0%';
  
  afterSnapUpdateTimeline();
  checkStablecoinsSection();
});