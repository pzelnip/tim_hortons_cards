#!/usr/bin/env python3
"""Interactive script to scaffold a new card set JSON file."""

import json
import os


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "docs", "data")


def prompt_category(index, base_used):
    """Prompt the user for a single category's details."""
    print(f"\n--- Category {index} ---")

    if not base_used:
        is_base = input("Is this the base category? [y/N]: ").strip().lower() == "y"
    else:
        is_base = False

    if is_base:
        return {
            "name": "Base",
            "tabId": "tab-base",
            "prefix": "base",
            "showPrefix": False,
            "odds": None,
            "cards": [],
        }, True

    name = input("Category name: ").strip()
    while not name:
        name = input("Category name (required): ").strip()

    default_tab_id = "tab-" + name.lower().replace(" ", "-")
    tab_id = input(f"Tab ID [{default_tab_id}]: ").strip() or default_tab_id

    prefix = input("Prefix (e.g. NS): ").strip()
    while not prefix:
        prefix = input("Prefix (required): ").strip()

    show_prefix_input = input("Show prefix? [Y/n]: ").strip().lower()
    show_prefix = show_prefix_input != "n"

    odds_input = input("Odds (e.g. 1:10, blank for null): ").strip()
    odds = odds_input if odds_input else None

    return {
        "name": name,
        "tabId": tab_id,
        "prefix": prefix,
        "showPrefix": show_prefix,
        "odds": odds,
        "cards": [],
    }, False


def main():
    title = input("Series name: ").strip()
    while not title:
        title = input("Series name (required): ").strip()

    default_slug = title.lower().replace(" ", "_")
    slug = input(f"Slug name [{default_slug}]: ").strip() or default_slug

    while True:
        try:
            num_categories = int(input("How many categories? "))
            if num_categories < 1:
                print("Must be at least 1.")
                continue
            break
        except ValueError:
            print("Please enter a number.")

    categories = []
    base_used = False
    for i in range(1, num_categories + 1):
        category, is_base = prompt_category(i, base_used)
        if is_base:
            base_used = True
        categories.append(category)

    data = {"title": title, "categories": categories}

    output_path = os.path.join(DATA_DIR, f"{slug}.json")
    if os.path.exists(output_path):
        overwrite = (
            input(f"\n{output_path} already exists. Overwrite? [y/N]: ").strip().lower()
        )
        if overwrite != "y":
            print("Aborted.")
            return

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"\nWrote {output_path}")
    print("Next steps:")
    print(f"  1. Edit {output_path} and add cards to each category")
    print("  2. Run ./generate.sh to create the HTML page")


if __name__ == "__main__":
    main()
