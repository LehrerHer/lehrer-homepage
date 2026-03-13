/* === DYNAMISCHE INHALTE ===
   Lädt inhalte.json und rendert Materialien in den jeweiligen
   .dynamic-inhalte[data-seite="..."] Containern.
   Wird auf allen Fach- und Materialien-Seiten eingebunden.
*/
(function () {
    var container = document.querySelector('.dynamic-inhalte[data-seite]');
    if (!container) return;

    var seite = container.dataset.seite;
    var basePath = container.dataset.basepath || '';

    fetch(basePath + 'inhalte.json')
        .then(function (r) { return r.json(); })
        .then(function (daten) {
            var items = (daten.materialien || []).filter(function (m) {
                return m.seite === seite;
            });
            if (items.length === 0) return;

            var karten = items.map(function (item) {
                var linkHtml = item.url
                    ? '<a href="' + basePath + item.url + '" class="material-link">→ Material öffnen</a>'
                    : '';
                return '<div class="material-karte">'
                    + '<span class="material-icon">' + (item.icon || '📄') + '</span>'
                    + '<div class="material-info">'
                    + '<h4>' + item.titel + '</h4>'
                    + '<p>' + item.beschreibung + '</p>'
                    + linkHtml
                    + '</div>'
                    + '</div>';
            }).join('');

            container.innerHTML =
                '<h2 class="section-titel" style="margin-top:40px;">Neue Materialien</h2>'
                + '<div class="materialien-grid">' + karten + '</div>';
        })
        .catch(function () {
            /* Stille Fehlerbehandlung – JSON evtl. noch nicht vorhanden */
        });
})();
