/* === DYNAMISCHE INHALTE ===
   Lädt inhalte.json und rendert Materialien in den jeweiligen
   .dynamic-inhalte[data-seite="..."] Containern.
   Wird auf allen Fach- und Materialien-Seiten eingebunden.

   Unterstützte data-Attribute am Container:
     data-seite="..."    Filtert nach Fach-/Seitenkennung
     data-alle="true"    Zeigt Materialien aller Seiten
     data-limit="6"      Begrenzt auf N Einträge (neueste zuerst)
*/
(function () {
    var container = document.querySelector('.dynamic-inhalte');
    if (!container) return;

    var seite    = container.dataset.seite;
    var alleZeigen = container.dataset.alle === 'true';
    var limit    = container.dataset.limit ? parseInt(container.dataset.limit, 10) : 0;
    var basePath = container.dataset.basepath || '';

    fetch(basePath + 'inhalte.json')
        .then(function (r) { return r.json(); })
        .then(function (daten) {
            var items = daten.materialien || [];

            /* Filtern nach Seite, außer data-alle="true" ist gesetzt */
            if (!alleZeigen && seite) {
                items = items.filter(function (m) { return m.seite === seite; });
            }

            /* Neueste zuerst sortieren */
            items = items.slice().sort(function (a, b) {
                return (b.datum || '').localeCompare(a.datum || '');
            });

            /* Auf N Einträge begrenzen */
            if (limit > 0) {
                items = items.slice(0, limit);
            }

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

            var ueberschrift = alleZeigen
                ? 'Neue Materialien'
                : 'Materialien';

            container.innerHTML =
                '<h2 class="section-titel" style="margin-top:40px;">' + ueberschrift + '</h2>'
                + '<div class="materialien-grid">' + karten + '</div>';
        })
        .catch(function () {
            /* Stille Fehlerbehandlung – JSON evtl. noch nicht vorhanden */
        });
})();
