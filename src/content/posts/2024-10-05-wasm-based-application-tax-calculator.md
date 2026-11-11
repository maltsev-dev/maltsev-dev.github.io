---
title: "🖥️ Wasm-based Application: Tax Calculator"
date: "2024-10-05"
description: "A Rust and wasm-bindgen experiment: build a WebAssembly tax calculator and serve it from a static page."
tags: ["rust", "webassembly", "project"]
---
An experiment using [wasm-bindgen](https://crates.io/crates/wasm-bindgen) to create a WebAssembly program.  
`wasm-bindgen 0.2.95`

---

[📚 GitHub Repository]](https://github.com/maltsev-dev/tax_app_webassembly)

<h2 style="text-align:center; margin-bottom:8px;">Tools</h2>
<p align="center" style="margin:0; padding:0;">
  <code>rust 1.83.0</code>
  <code>wasm_test 0.3</code>
  <a href="https://github.com/chemyl/tax_app_webassembly/actions/workflows/rust.yml"><code>CI</code></a>
</p>

## How to build and run:

* Create a library crate:

  ```bash
  cargo new project --lib
  ```
* Add crate type annotation for the compiler:

  ```toml
  [lib]
  crate-type = ["cdylib"]
  ```
* Create a basic `index.html` skeleton and extend the script block to handle loading and interacting with the wasm module.
* Install wasm-pack:

  ```bash
  cargo install wasm-pack
  ```
* Build the project with wasm-pack:

  ```bash
  wasm-pack build --target web
  ```
* Install a simple web server globally (if not installed):

  ```bash
  npm install -g http-server
  ```
* Start the web server from the project root folder:

  ```bash
  http-server .
  ```

![Browser recording of the WebAssembly tax calculator page, where a USD income is entered into a numeric field and the Calculate Tax button returns the result](/media/wasm_tax_app.gif)

---

### **License**

This project is licensed under the [MIT License](https://github.com/maltsev-dev/tax_app_webassembly?tab=MIT-1-ov-file).