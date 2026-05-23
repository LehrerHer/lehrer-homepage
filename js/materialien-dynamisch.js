(function () {
  var container = document.querySelector('.dyn-mat-section[data-fach]');
  if (!container) return;

  var fach = container.dataset.fach;
  var API  = 'https://kolosseum.lehrer-herrmann.de/api/materials?fach=' + encodeURIComponent(fach);
  var BASE = 'https://kolosseum.lehrer-herrmann.de';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch(API, { credentials: 'include' })
    .then(function (r) { return r.json(); })
    .then(function (items) {
      if (!items || !items.length) return;

      var grouped = { Arbeitsblatt: [], Material: [], Quiz: [] };
      items.forEach(function (item) {
        if (grouped[item.typ]) grouped[item.typ].push(item);
      });

      var html = '';
      Object.keys(grouped).forEach(function (typ) {
        var list = grouped[typ];
        if (!list.length) return;

        var badgeCls = typ === 'Arbeitsblatt' ? 'ab' : typ === 'Quiz' ? 'quiz' : 'mat';
        var badgeTxt = typ === 'Quiz' ? '⚔️ Quiz' : typ;

        html += '<h2 class="mat-kategorie">' + esc(typ) +
                ' <span style="font-size:0.75em;font-weight:400;color:var(--farbe-text-hell)">(hochgeladen)</span></h2>';
        html += '<div class="mat-grid">';

        list.forEach(function (item) {
          var isHtml  = item.datei_typ && item.datei_typ.includes('html');
          var dlAttr  = isHtml ? '' : ' download';
          html += '<a href="' + BASE + esc(item.datei_url) + '" class="mat-card" target="_blank"' + dlAttr + '>' +
                  '<span class="mat-badge ' + badgeCls + '">' + esc(badgeTxt) + '</span>' +
                  '<div class="mat-title">' + esc(item.titel) + '</div>' +
                  '</a>';
        });

        html += '</div>';
      });

      if (html) container.innerHTML = html;
    })
    .catch(function () { /* lautlos ignorieren */ });
})();
