# Tim Hortons Hockey Cards

Scripts, pages, and tools for tracking my Tim Hortons hockey card collection.

**Repository:** [https://github.com/pzelnip/tim_hortons_cards](https://github.com/pzelnip/tim_hortons_cards)

## 2026 Olympics Checklist

[2026_olympics.html](static/2026_olympics.html) — An interactive single-page checklist for the 2026 Tim Hortons Team Canada Olympics set (200 cards total).

**Card categories:**

| Category              | Cards        | Pull Rate |
| --------------------- | ------------ | --------- |
| Base                  | 1–100        | —         |
| Gold Medalists        | GM-1–GM-15   | 1:3       |
| Northern Stars        | NS-1–NS-15   | 1:4       |
| Celebrated Prodigies  | CP-1–CP-15   | 1:6       |
| Program of Excellence | POE-1–POE-15 | 1:8       |
| Duos                  | CO-1–CO-15   | 1:24      |
| Maple Leaf Immortals  | ML-1–ML-5    | 1:100     |

**Features:**

- Check off cards as you collect them
- Progress tracking per category and overall
- Shareable collection link via URL encoding
- No dependencies — just open the HTML file in a browser

## Adding a new card set

1. Create a new JSON data file in `data/` (e.g. `data/new_set.json`) — see existing files for the format.
2. Run `./generate.sh` to generate the corresponding HTML file.
3. Commit both the JSON file and the generated HTML file.

The per-set HTML files (`2026_olympics.html`, `test.html`, etc.) are auto-generated from `template.html`. To change the shared page layout, edit `template.html` and re-run `./generate.sh`.

This page is live at <https://tinyurl.com/timmyshockey>, or scan this QR Code:

![QR Code for page](timmyshockey-qr.png)
