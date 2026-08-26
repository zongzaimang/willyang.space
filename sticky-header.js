(() => {
  const header = document.querySelector('.header');
  if (!header) return;

  const revealAfter = header.offsetHeight + 12;
  let lastY = window.scrollY;
  let pending = false;

  const update = () => {
    const y = window.scrollY;
    if (y <= 8 || y < revealAfter) {
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

