#!/bin/sh
# Generate per-set HTML files from template.html and an index.html landing page.
# Run this after editing template.html or adding a new data/*.json file.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/docs/template.html"

# Sets to exclude from index.html (space-separated basenames without .json)
INDEX_BLACKLIST="test"

if [ ! -f "$TEMPLATE" ]; then
    echo "Error: docs/template.html not found" >&2
    exit 1
fi

for json_file in "$SCRIPT_DIR"/docs/data/*.json; do
    set_name=$(basename "$json_file" .json)
    target="$SCRIPT_DIR/docs/${set_name}.html"
    cp "$TEMPLATE" "$target"
    echo "Generated: ${set_name}.html"
done

# --- Generate index.html ---
INDEX="$SCRIPT_DIR/docs/index.html"
cat > "$INDEX" <<'HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tim Hortons Hockey Cards Checklists</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .set-list { list-style: none; max-width: 600px; margin: 0 auto 2rem; }
        .set-list li { padding: 0; margin-bottom: 0.75rem; text-decoration: none; }
        .set-list li:hover { background-color: #ffe6e6; }
        .set-list a {
            display: block;
            padding: 0.75rem 1rem;
            color: var(--red);
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .set-list a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Tim Hortons Hockey Cards Checklists</h1>
    <ul class="set-list">
HEADER

for json_file in "$SCRIPT_DIR"/docs/data/*.json; do
    set_name=$(basename "$json_file" .json)
    # Skip blacklisted sets
    case " $INDEX_BLACKLIST " in
        *" $set_name "*) continue ;;
    esac
    title=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['title'])" "$json_file")
    cat >> "$INDEX" <<ENTRY
        <li><a href="${set_name}.html">${title}</a></li>
ENTRY
done

cat >> "$INDEX" <<'FOOTER'
    </ul>
    <footer class="site-footer">
        <a href="https://github.com/pzelnip/tim_hortons_cards/" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
        <span class="version-sha"></span>
    </footer>
    <script>
    fetch('version.json').then(r => r.ok && r.json()).then(d => {
        if (d && d.version) {
            document.querySelector('.version-sha').innerHTML =
                '<a href="https://github.com/pzelnip/tim_hortons_cards/commit/' +
                d.version + '" target="_blank" rel="noopener noreferrer">' + d.version + '</a>';
        }
    }).catch(() => {});
    </script>
</body>
</html>
FOOTER
echo "Generated: index.html"
