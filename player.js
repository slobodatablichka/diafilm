(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const autoplayRequested = params.get('autoplay') !== '0';
  const loopRequested = params.get('loop') !== '0';
  const urlInterval = Number(params.get('interval'));

  const img = document.getElementById('slide');
  const viewer = document.getElementById('viewer');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const playBtn = document.getElementById('play');
  const fsBtn = document.getElementById('fullscreen');
  const intervalSelect = document.getElementById('interval');
  const counter = document.getElementById('counter');
  const titleEl = document.getElementById('album-title');

  let slides = [];
  let index = 0;
  let timer = null;
  let playing = false;
  let loop = loopRequested;
  let controlsTimer = null;

  const allowedIntervals = [3, 5, 8, 10, 15, 20, 30];

  fetch('./manifest.json', {cache: 'no-store'})
    .then(r => {
      if (!r.ok) throw new Error(`manifest.json: HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      titleEl.textContent = data.title || 'Диафильм';
      document.title = `${data.title || 'Диафильм'} — диафильм`;

      setupAudio(data);

      slides = Array.isArray(data.slides) ? data.slides : [];
      if (!slides.length) throw new Error('В альбоме нет изображений.');

      const manifestInterval = Number(data.interval);
      const startInterval = allowedIntervals.includes(urlInterval)
        ? urlInterval
        : (allowedIntervals.includes(manifestInterval) ? manifestInterval : 8);

      intervalSelect.value = String(startInterval);
      loading.hidden = true;
      show(0);

      if (autoplayRequested) start();
    })
    .catch(e => {
      loading.hidden = true;
      error.hidden = false;
      error.textContent = `Не удалось открыть диафильм: ${e.message}`;
    });

  let bgAudio = null;
  let musicBtn = null;
  let volumeInput = null;

  function setupAudio(data) {
    if (!data.audio) return;

    const controls = document.querySelector('.controls');

    bgAudio = new Audio(data.audio);
    bgAudio.loop = true;
    bgAudio.preload = 'metadata';

    const volume = Number(data.audioVolume);
    bgAudio.volume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 0.25;

    musicBtn = document.createElement('button');
    musicBtn.type = 'button';
    musicBtn.textContent = '? ??????';
    musicBtn.title = '???????? / ????????? ??????';

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = '?????????';

    volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.min = '0';
    volumeInput.max = '1';
    volumeInput.step = '0.05';
    volumeInput.value = String(bgAudio.volume);

    volumeLabel.appendChild(volumeInput);
    controls.appendChild(musicBtn);
    controls.appendChild(volumeLabel);

    musicBtn.addEventListener('click', async () => {
      if (bgAudio.paused) {
        try {
          await bgAudio.play();
        } catch (_) {}
      } else {
        bgAudio.pause();
      }
      updateMusicButton();
    });

    volumeInput.addEventListener('input', () => {
      bgAudio.volume = Number(volumeInput.value);
    });

    bgAudio.addEventListener('play', updateMusicButton);
    bgAudio.addEventListener('pause', updateMusicButton);

    bgAudio.play()
      .then(updateMusicButton)
      .catch(updateMusicButton);
  }

  function updateMusicButton() {
    if (!musicBtn || !bgAudio) return;
    musicBtn.textContent = bgAudio.paused ? '? ??????' : '?? ??????';
  }

  function slideUrl(item) {
    return typeof item === 'string' ? item : item.src;
  }

  function show(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    img.src = slideUrl(slides[index]);
    img.alt = `Кадр ${index + 1}`;
    counter.textContent = `${index + 1} / ${slides.length}`;
    preload(index + 1);
    preload(index - 1);
  }

  function preload(i) {
    if (!slides.length) return;
    const j = (i + slides.length) % slides.length;
    const p = new Image();
    p.src = slideUrl(slides[j]);
  }

  function next() {
    if (index === slides.length - 1 && !loop) {
      stop();
      return;
    }
    show(index + 1);
  }

  function prev() {
    show(index - 1);
  }

  function intervalMs() {
    return Number(intervalSelect.value) * 1000;
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing) return;
    timer = setTimeout(() => {
      next();
      schedule();
    }, intervalMs());
  }

  function start() {
    if (!slides.length) return;
    playing = true;
    playBtn.textContent = '⏸ Пауза';
    playBtn.setAttribute('aria-label', 'Пауза');
    schedule();
  }

  function stop() {
    playing = false;
    clearTimeout(timer);
    timer = null;
    playBtn.textContent = '▶ Пуск';
    playBtn.setAttribute('aria-label', 'Пуск');
  }

  function togglePlay() {
    playing ? stop() : start();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await viewer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      // Браузер может запрещать fullscreen без явного клика.
    }
  }

  prevBtn.addEventListener('click', () => { prev(); if (playing) schedule(); });
  nextBtn.addEventListener('click', () => { next(); if (playing) schedule(); });
  playBtn.addEventListener('click', togglePlay);
  fsBtn.addEventListener('click', toggleFullscreen);
  intervalSelect.addEventListener('change', () => { if (playing) schedule(); });

  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') { next(); if (playing) schedule(); }
    else if (e.key === 'ArrowLeft') { prev(); if (playing) schedule(); }
    else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); togglePlay(); }
    else if (e.key.toLowerCase() === 'f') { toggleFullscreen(); }
  });

  viewer.addEventListener('click', e => {
    if (e.target === img) {
      next();
      if (playing) schedule();
    }
  });

  function showControlsTemporarily() {
    viewer.classList.remove('hide-controls');
    clearTimeout(controlsTimer);
    if (document.fullscreenElement) {
      controlsTimer = setTimeout(() => viewer.classList.add('hide-controls'), 2500);
    }
  }

  document.addEventListener('mousemove', showControlsTemporarily);
  document.addEventListener('touchstart', showControlsTemporarily, {passive:true});
  document.addEventListener('fullscreenchange', () => {
    viewer.classList.remove('hide-controls');
    clearTimeout(controlsTimer);
    if (document.fullscreenElement) {
      controlsTimer = setTimeout(() => viewer.classList.add('hide-controls'), 2500);
    }
  });
})();
