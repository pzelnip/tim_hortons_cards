# Todos

- [x] Fix: Confirm modal has no Escape key handler for accessibility (app.js:277-303)
- [x] Fix: Clear/undo handler doesn't call `updateSyncIndicator()`, so dirty banner won't show (app.js:503-519)
- [ ] Fix: Markdown export doesn't escape pipe characters in card names (app.js:449-451)
- [ ] Fix: TSV export doesn't escape tabs/newlines in card names (app.js:437-441)
- [ ] Fix: `hashchange` listener doesn't await async `loadState()`, so `updateCounts()` runs before state is loaded (app.js:590-593)
- [ ] Add test to CI that tests the Git SHA version ref is in the page and clickable
- [ ] Move templatized HTML from out of generate.sh into a proper templating system (maybe Jinja?)
