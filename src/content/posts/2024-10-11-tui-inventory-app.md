---
title: "TUI Inventory App"
date: "2024-10-11"
description: "A terminal inventory manager built with Rust and Cursive: create, list and delete items, persisted in a flat JSON file."
tags: ["rust", "tui", "project"]
---
An old-school terminal-based inventory management system built with Rust and [Cursive](https://crates.io/crates/cursive). Built with `cursive 0.21.1`.

[GitHub Repository](https://github.com/maltsev-dev/inventory_system_app)

This project is an experiment in building a Text User Interface application with the [Cursive](https://github.com/gyscos/cursive) library, a TUI framework for Rust. Inspired by classic terminal apps, it manages a simple inventory of products with full keyboard interaction.

It suits Rust learners and enthusiasts exploring terminal UI development.

## Tools and stack

- `rust 1.83.0`
- `cursive 0.21.1`
- [CI](https://github.com/chemyl/inventory_system_app/actions/workflows/rust.yml)

## Features

1. Create and save items. Define the product type, set the quantity and input the price per unit.
2. Display all items. View the inventory in a structured list, with the total price and sales tax calculated automatically.
3. Delete items. Remove an item by specifying its ID.
4. Local JSON-based database. Persistent storage using a flat file database, with the path defined as:

   ```rust
   const FILE_PATH: &str = "products.json";
   ```

## Demo

![Terminal recording of the inventory app being launched and navigated with the keyboard to add, list and delete products](/media/tui_inventory_app.gif)

## Installation and run

1. Clone the repository:

   ```bash
   git clone https://github.com/maltsev-dev/inventory_system_app
   cd inventory_system_app
   ```

2. Build the project:

   ```bash
   cargo build --release
   ```

3. Run the app:

   ```bash
   cargo run
   ```

## License

This project is licensed under the MIT License. Free to use, modify and distribute.
