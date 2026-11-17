/* Frame Studio – photo frame generator
 * To add a frame: drop a PNG with a transparent opening into /assets
 * and add an entry to the FRAMES list below.
 */
(function () {
  'use strict';

  const FRAMES = [
    { id: 'gilded',  name: 'Gilded',  src: 'assets/frame-gilded.png' },
    { id: 'instant', name: 'Instant', src: 'assets/frame-instant.png' }
  ];

  const DEFAULTS = {
    zoom: 100, rotate: 0, offsetX: 0, offsetY: 0, flip: false,
    brightness: 100, contrast: 100, saturation: 100, grayscale: 0,
    bgColor: '#ffffff'
  };

  const state = Object.assign({}, DEFAULTS, {
    photo: null,          // HTMLImageElement
    photoName: '',
    frame: null,          // HTMLImageElement or null
    frameId: null,
    panX: 0, panY: 0      // drag offset in canvas pixels
  });

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const emptyState = $('emptyState');
  const stageHint = $('stageHint');
  const downloadBtn = $('downloadBtn');
  const photoInput = $('photoInput');
  const frameInput = $('frameInput');
  const frameList = $('frameList');
  const toastEl = $('toast');

  const sliders = ['zoom', 'rotate', 'offsetX', 'offsetY', 'brightness', 'contrast', 'saturation', 'grayscale'];
  const units = { zoom: '%', rotate: '°', offsetX: '', offsetY: '', brightness: '%', contrast: '%', saturation: '%', grayscale: '%' };

  const supportsFilter = 'filter' in CanvasRenderingContext2D.prototype;

  // ---------- Helpers ----------
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 5000);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = src;
    });
  }

  function readFileAsImage(file) {
    const url = URL.createObjectURL(file);
    return loadImage(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  }

  // ---------- Drawing ----------
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background behind the photo
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, W, H);

    if (state.photo) {
      const img = state.photo;
      const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const scale = cover * (state.zoom / 100);

      ctx.save();
      if (supportsFilter) {
        ctx.filter =
          `brightness(${state.brightness}%) contrast(${state.contrast}%) ` +
          `saturate(${state.saturation}%) grayscale(${state.grayscale}%)`;
      }
      ctx.translate(
        W / 2 + state.panX + (state.offsetX / 100) * (W / 2),
        H / 2 + state.panY + (state.offsetY / 100) * (H / 2)
      );
      ctx.rotate((state.rotate * Math.PI) / 180);
      ctx.scale(state.flip ? -scale : scale, scale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
    }

    if (state.frame) ctx.drawImage(state.frame, 0, 0, W, H);
  }

  function setCanvasSizeFromFrame() {
    // Output matches the frame's native size; with no frame, keep 1200 x 1200.
    const size = state.frame ? state.frame : null;
    canvas.width = size ? size.naturalWidth : 1200;
    canvas.height = size ? size.naturalHeight : 1200;
    canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    canvas.parentElement.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  }

  // ---------- Photo ----------
  async function setPhoto(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('That file is not an image. Choose a JPG, PNG or WebP photo.');
      return;
    }
    try {
      state.photo = await readFileAsImage(file);
    } catch (e) {
      toast('This image could not be opened. Try another file.');
      return;
    }
    state.photoName = file.name;
    state.panX = 0;
    state.panY = 0;
    $('photoName').textContent = file.name;
    emptyState.classList.add('is-hidden');
    stageHint.classList.remove('is-hidden');
    canvas.classList.add('has-photo');
    downloadBtn.disabled = false;
    draw();
  }

  photoInput.addEventListener('change', (e) => setPhoto(e.target.files[0]));

  // Drag & drop onto the stage
  ['dragenter', 'dragover'].forEach((t) =>
    stage.addEventListener(t, (e) => { e.preventDefault(); stage.classList.add('is-dragover'); })
  );
  ['dragleave', 'drop'].forEach((t) =>
    stage.addEventListener(t, (e) => { e.preventDefault(); stage.classList.remove('is-dragover'); })
  );
  stage.addEventListener('drop', (e) => setPhoto(e.dataTransfer.files[0]));

  // ---------- Frames ----------
  function renderFrameList() {
    frameList.innerHTML = '';

    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'frame-option is-none';
    none.setAttribute('role', 'radio');
    none.dataset.id = 'none';
    none.textContent = 'No frame';
    none.addEventListener('click', () => selectFrame(null));
    frameList.appendChild(none);

    FRAMES.forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frame-option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', f.name + ' frame');
      btn.dataset.id = f.id;

      const img = document.createElement('img');
      img.src = f.src;
      img.alt = '';
      // Checkerboard-free preview: frame sits on a neutral tile (see CSS)
      const label = document.createElement('span');
      label.className = 'frame-label';
      label.textContent = f.name;

      btn.append(img, label);
      btn.addEventListener('click', () => selectFrame(f));
      frameList.appendChild(btn);
    });

    markSelectedFrame();
  }

  function markSelectedFrame() {
    frameList.querySelectorAll('.frame-option').forEach((el) => {
      const active = (el.dataset.id === 'none' && !state.frameId) || el.dataset.id === state.frameId;
      el.setAttribute('aria-checked', String(active));
    });
  }

  async function selectFrame(f) {
    if (!f) {
      state.frame = null;
      state.frameId = null;
    } else {
      try {
        state.frame = f.image || (f.image = await loadImage(f.src));
        state.frameId = f.id;
      } catch (e) {
        toast('Could not load ' + f.name + '. Check that the file exists in the assets folder.');
        return;
      }
    }
    setCanvasSizeFromFrame();
    markSelectedFrame();
    draw();
  }

  frameInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await readFileAsImage(file);
      const custom = { id: 'custom-' + Date.now(), name: file.name.replace(/\.png$/i, ''), src: URL.createObjectURL(file), image: img };
      FRAMES.push(custom);
      renderFrameList();
      await selectFrame(custom);
    } catch (err) {
      toast('That frame could not be opened. Use a PNG with a transparent opening.');
    }
    frameInput.value = '';
  });

  // ---------- Adjustments ----------
  function updateOutput(id) {
    $(id + 'Out').textContent = state[id] + units[id];
  }

  sliders.forEach((id) => {
    const el = $(id);
    el.addEventListener('input', () => {
      state[id] = Number(el.value);
      updateOutput(id);
      draw();
    });
    if (!supportsFilter && ['brightness', 'contrast', 'saturation', 'grayscale'].includes(id)) {
      el.disabled = true;
      el.title = 'This browser does not support photo filters on the canvas.';
    }
  });

  $('bgColor').addEventListener('input', (e) => { state.bgColor = e.target.value; draw(); });

  $('flipBtn').addEventListener('click', (e) => {
    state.flip = !state.flip;
    e.currentTarget.setAttribute('aria-pressed', String(state.flip));
    draw();
  });

  $('rotate90Btn').addEventListener('click', () => {
    let r = state.rotate + 90;
    if (r > 180) r -= 360;
    state.rotate = r;
    $('rotate').value = r;
    updateOutput('rotate');
    draw();
  });

  $('resetBtn').addEventListener('click', () => {
    Object.assign(state, DEFAULTS, { panX: 0, panY: 0 });
    sliders.forEach((id) => { $(id).value = state[id]; updateOutput(id); });
    $('bgColor').value = state.bgColor;
    $('flipBtn').setAttribute('aria-pressed', 'false');
    draw();
  });

  // ---------- Drag to move, wheel to zoom ----------
  let drag = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.photo) return;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    const rect = canvas.getBoundingClientRect();
    drag = {
      x: e.clientX, y: e.clientY,
      panX: state.panX, panY: state.panY,
      ratio: canvas.width / rect.width
    };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    state.panX = drag.panX + (e.clientX - drag.x) * drag.ratio;
    state.panY = drag.panY + (e.clientY - drag.y) * drag.ratio;
    draw();
  });

  const endDrag = () => { drag = null; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    if (!state.photo) return;
    e.preventDefault();
    const next = Math.min(400, Math.max(50, state.zoom - Math.sign(e.deltaY) * 4));
    state.zoom = next;
    $('zoom').value = next;
    updateOutput('zoom');
    draw();
  }, { passive: false });

  // ---------- Download ----------
  downloadBtn.addEventListener('click', () => {
    if (!state.photo) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) { toast('The image could not be exported.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const base = state.photoName.replace(/\.[^.]+$/, '') || 'photo';
        a.href = url;
        a.download = base + '-framed.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    } catch (err) {
      toast('Download is blocked when the page is opened as a file. Run a local server (for example: npx serve) and open it from http://localhost.');
    }
  });

  // ---------- Init ----------
  sliders.forEach(updateOutput);
  renderFrameList();
  selectFrame(FRAMES[0]);
  stageHint.classList.add('is-hidden');
  draw();
})();
