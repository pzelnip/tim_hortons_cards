#!/bin/sh
# Generate per-set HTML files from template.html.
# Run this after editing template.html or adding a new data/*.json file.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/docs/template.html"

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
