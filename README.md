# Spiele-Tiles Hub

Ein leichtgewichtiges Spiele-Dashboard mit Kachel-Auswahl. Neue Spiele/Gadgets koennen Schritt fuer Schritt ergaenzt werden.

## Quick Start
- `index.html` im Browser oeffnen.

## Struktur
- `index.html` - Hub UI
- `styles.css` - Look und Feel
- `app.js` - Kachel-Logik
- `data/games.json` - Katalog der Spiele
- `games/` - einzelne Spiele/Prototypen

## Neues Spiel hinzufuegen
1. Ordner anlegen: `games/<id>/`
2. Einfache Seite erstellen: `index.html`, optional `style.css`, `app.js`
3. Eintrag in `data/games.json` hinzufuegen (id, title, status, tags, link, etc.)

## Statuswerte
- `ready` - spielbar
- `prototype` - fruehe Version
- `coming` - geplant
