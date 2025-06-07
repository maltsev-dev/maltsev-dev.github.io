+++
title = "TUI Inventory App"
date = "2024-10-11"

[taxonomies]
tags = ["rust", "tui", "project"]
+++

The result of an experiment with a [Cursive](https://crates.io/crates/cursive) to create a Text User Interface(TUI) program in the style of old terminal programs.  
![cursive Version](https://img.shields.io/badge/cursive-0.21.1%20-orange)
<!-- more -->
---

### &emsp;&emsp;&emsp; Text-based User Interface app. Inventory System

[📚 Inventory System](https://github.com/maltsev-dev/inventory_system_app)

<h3 style="text-align:center; margin-bottom:8px;">Tools</h3>
<p align="center" style="margin:0; padding:0;">
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/rust-1.83.0%20-green" alt="Rust Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/cursive-0.21.1%20-orange" alt="cursive Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://github.com/chemyl/inventory_system_app/actions/workflows/rust.yml/badge.svg" alt="Build Status"/>
</p>

### &emsp;&emsp;&emsp; Features
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


#### &emsp;&emsp;&emsp; **License**
This project is licensed under the MIT License 