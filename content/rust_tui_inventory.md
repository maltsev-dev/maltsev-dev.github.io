+++
title = "TUI Inventory App"
date = "2024-10-11"

[taxonomies]
tags = ["rust", "tui", "project"]
+++

The result of an experiment with a [Cursive](https://crates.io/crates/cursive) to create a text user interface(TUI) program in the style of old terminal programs.  
![cursive Version](https://img.shields.io/badge/cursive-0.21.1%20-orange)
<!-- more -->
---

### Text-based User Interface app. Inventory System

[📚 Inventory System](https://github.com/maltsev-dev/inventory_system_app)

![Rust Version](https://img.shields.io/badge/rust-1.82.0%20-green) ![cursive Version](https://img.shields.io/badge/cursive-0.21.1%20-orange) ![serde Version](https://img.shields.io/badge/serde-1.0.0%20-orange) ![Build Status](https://github.com/chemyl/inventory_system_app/actions/workflows/rust.yml/badge.svg)

### Features
 1. Create and save new item 
    * product type
    * quantity
    * price per unit
 2. Show all items 
    * total price
    * sales tax
 3. Delete item by ID
 4. DB located at `const FILE_PATH: &str = "products.json";`

{{ img(src = "/media/tui_inventory_app.gif") }}