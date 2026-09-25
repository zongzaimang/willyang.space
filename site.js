(() => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  let lastY = scrollY, direction = 0, distance = 0, pending = false;
  const updateHeader = () => {
    const y = Math.max(0, scrollY), delta = y - lastY;
    if (Math.sign(delta) !== direction) distance = 0;
    direction = Math.sign(delta);
    distance += Math.abs(delta);
    header?.classList.toggle('scrolled', y > 16);
    if (y < 160 || header?.contains(document.activeElement)) header?.classList.remove('is-hidden');
    else if (distance > 32) header?.classList.toggle('is-hidden', direction > 0);
    lastY = y; pending = false;
  };
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateHeader); } }, { passive: true });
  header?.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  if (header && 'ResizeObserver' in window) new ResizeObserver(() => root.style.setProperty('--header-height', `${header.offsetHeight}px`)).observe(header);
  updateHeader();

  const dialog = document.querySelector('#image-viewer');
  let opener, previousOverflow;
  if (dialog && typeof dialog.showModal === 'function') {
    const stage = dialog.querySelector('.viewer-stage');
    const viewerImage = stage.querySelector('img');
    const status = stage.querySelector('.viewer-status');
    const finishLoading = () => {
      stage.setAttribute('aria-busy', 'false');
      status.hidden = Boolean(viewerImage.naturalWidth);
      status.textContent = viewerImage.naturalWidth ? '' : 'Image unavailable. Please close and try again.';
      viewerImage.hidden = !viewerImage.naturalWidth;
    };
    viewerImage.addEventListener('load', finishLoading);
    viewerImage.addEventListener('error', finishLoading);
    document.querySelectorAll('[data-view-image]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); opener = link;
      const source = link.querySelector('img'), image = dialog.querySelector('img');
      stage.setAttribute('aria-busy', 'true');
      status.hidden = false;
      status.textContent = 'Loading image…';
      image.hidden = false;
      image.src = link.href; image.alt = source.alt;
      if (image.complete) finishLoading();
      dialog.querySelector('#viewer-title').textContent = source.alt;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.querySelector('.viewer-stage').classList.remove('is-zoomed');
      dialog.querySelector('.viewer-zoom').setAttribute('aria-pressed', 'false');
      dialog.querySelector('.viewer-zoom').textContent = 'Original size';
      dialog.showModal(); dialog.querySelector('.viewer-close').focus();
      dialog.querySelector('.viewer-stage').scrollTop = 0;
      stage.scrollLeft = 0;
    }));
    dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.viewer-zoom').addEventListener('click', event => {
      const zoomed = dialog.querySelector('.viewer-stage').classList.toggle('is-zoomed');
      event.currentTarget.setAttribute('aria-pressed', String(zoomed));
      event.currentTarget.textContent = zoomed ? 'Fit to window' : 'Original size';
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow || ''; opener?.focus({ preventScroll: true }); });
  }
  document.querySelectorAll('main img').forEach(image => {
    const fail = () => {
      if (image.parentElement.querySelector('.image-error')) return;
      const message = document.createElement('span'); message.className = 'image-error';
      message.textContent = `${image.alt} — Image unavailable. Please try again later.`;
      image.hidden = true; image.parentElement.append(message);
    };
    image.addEventListener('error', fail);
    if (image.complete && !image.naturalWidth) fail();
  });
})();
