(() => {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastY = window.scrollY;
  let pending = false;

  const update = () => {
    const y = window.scrollY;
    // Keep the header floating until the document has actually reached its top.
    // Resetting it earlier changes it from fixed back to normal flow mid-scroll,
    // which makes the reveal animation disappear and jump.
    if (y <= 8) {
      header.classList.remove('is-floating', 'is-visible');
    } else {
      header.classList.add('is-floating');
      if (y < lastY) header.classList.add('is-visible');
      if (y > lastY) header.classList.remove('is-visible');
    }
    lastY = y;
    pending = false;
  };

  window.addEventListener('scroll', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }, { passive:true });
})();

