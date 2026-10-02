# Legacy assets

Moved out of `assets/` on 2026-10-02. No page or script in the tree references any of these
files; they are kept here for the record rather than deleted. They still sit inside the
deploy root, but nothing fetches them, so no URL depends on them being here or gone.

To restore one, move it back and re-check the pins:

    git mv _legacy/assets/js/<name>.js assets/js/<name>.js
    node scripts/check-asset-pins.js --fix

| file | why it is here |
| --- | --- |
| `assets/css/bo-group-tabs.css` | superseded by `assets/css/bo-shell.css` — the group-tab row is part of the shell now (see the note near the top of bo-shell.css) |
| `assets/js/agent-settlement-inbox.js` | nothing loads it; `agent-settlement.html` runs on `currency-runtime.js` + `main-currency-runtime.js` |
| `assets/js/bonus-category-title.js` | predecessor of the promotion workspace listing (`promotion-workspace.js` carries the historical note); nothing loads it |
| `assets/js/main-accounting-report.js` | superseded by `assets/js/main-accounting-executive.js`, which the page actually loads |
| `assets/js/main-admin-credit.js` | nothing loads it; the page runs on the currency runtimes and the i18n pair |
| `assets/js/main-merchant-settlement.js` | superseded by `assets/js/main-merchant-report.js` + `assets/js/main-merchant-report-extra.js`, which the page loads |
| `assets/js/merchant-repayment-header.js` | nothing loads it |
