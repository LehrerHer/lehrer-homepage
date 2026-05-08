(function () {
  // Hamburger-Toggle für die Site-Navbar
  var hamburger = document.getElementById('site-hamburger');
  var navLinks  = document.getElementById('site-nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var offen = navLinks.classList.toggle('offen');
      hamburger.classList.toggle('offen', offen);
      hamburger.setAttribute('aria-expanded', String(offen));
      hamburger.setAttribute('aria-label', offen ? 'Menü schließen' : 'Menü öffnen');
    });
    // Schließen beim Klick auf einen Link
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('offen');
        hamburger.classList.remove('offen');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Menü öffnen');
      });
    });
  }

  // Footerjahr automatisch setzen
  var jahrEl = document.getElementById('footer-jahr');
  if (jahrEl) jahrEl.textContent = new Date().getFullYear();
})();
