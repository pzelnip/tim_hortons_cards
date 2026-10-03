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
    <link rel="stylesheet" id="skin-css" href="skins/classic.css">
    <script src="skins.js"></script>
</head>
<body>
    <main class="page">
        <section class="hero">
            <h1>Tim Hortons Hockey Cards Checklists</h1>
        </section>
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
    </main>
    <footer class="site-footer">
        <a href="https://github.com/pzelnip/tim_hortons_cards/" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
        <a href="changelog.html">Changelog</a>
        <span class="version-sha">__GIT_SHA__</span>
    </footer>
</body>
</html>
FOOTER
echo "Generated: index.html"
