# Todos

- [x] Fix: Confirm modal has no Escape key handler for accessibility (app.js:277-303)
- [x] Fix: Clear/undo handler doesn't call `updateSyncIndicator()`, so dirty banner won't show (app.js:503-519)
- [x] Fix: Markdown export doesn't escape pipe characters in card names (app.js:449-451)
- [x] Allow "all/have/need" filter to be respected on markdown/csv/tsv/etc export
- [x] Add link back to index.html from each generated page
- [ ] Add tests for different export formats, provide a mechanism for running tests locally.  If tools required use asdf to manage them.
- [ ] Backfill tests for sensible parts of the project.
- [ ] Update deploy.yml to run tests, blocking deployment if tests fail
- [ ] Add test to CI that tests the Git SHA version ref is in the page and clickable
- [ ] Announcement banner that appears on all pages (close button to cancel it, can contain links)
- [ ] Fix: TSV export doesn't escape tabs/newlines in card names (app.js:437-441)
- [ ] Fix: `hashchange` listener doesn't await async `loadState()`, so `updateCounts()` runs before state is loaded (app.js:590-593)
- [ ] Add "cards I want" feature (being able to tag specific cards as desirable, and add a "want" filter to the all/need/have filter)
- [ ] Move templatized HTML from out of generate.sh into a proper templating system (maybe Jinja?)
