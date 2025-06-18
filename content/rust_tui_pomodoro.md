+++
title = "🍅 TUI Pomodoro App"
date = "2024-10-07"

[taxonomies]
tags = ["rust", "tui", "project"]
+++

**A terminal-based Pomodoro timer built with Rust and [Cursive](https://crates.io/crates/cursive), replicating the feel of vintage console tools.**  
![cursive Version](https://img.shields.io/badge/cursive-0.21.1%20-orange)

<!-- more -->
---

## ⏳ Text-based User Interface Pomodoro Timer

[📚 GitHub Repository](https://github.com/maltsev-dev/tui_pomodoro)

This project is an experimental implementation of the **Pomodoro Technique** in a text-based user interface, leveraging the [`cursive`](https://crates.io/crates/cursive) crate to build a clean, keyboard-navigated experience in the terminal.

Ideal for Rust developers looking to:

* Practice TUI development
* Create distraction-free productivity tools
* Understand timer-based logic in async or event-driven environments

---

### ⚙️ Tools & Tech

<h3 style="text-align:center; margin-bottom:8px;">Tools</h3>
<p align="center" style="margin:0; padding:0;">
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/rust-1.83.0%20-green" alt="Rust Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/cursive-0.21.1%20-orange" alt="cursive Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://github.com/maltsev-dev/tui_pomodoro/actions/workflows/rust.yml/badge.svg" alt="Build Status"/>
</p>

---

## ✨ Features

1. **⏲️ Set Custom Timer**

   * Configure session length (e.g., 25 minutes of focus)

2. **▶️ Start / ⏹️ Stop Timer**

   * Manual control over timer execution
   * Designed for single-session focus tracking

3. **🧘 Minimal Interface**

   * Clean and distraction-free
   * Suitable for full-screen terminal use

---

### 🖼️ Demo

{{ img(src = "/media/tui_pomodoro_app.gif") }}

---

## 📦 Installation & Usage

1. **Clone the Repository**

   ```bash
   git clone https://github.com/maltsev-dev/tui_pomodoro
   cd tui_pomodoro
   ```

2. **Build the Project**

   ```bash
   cargo build --release
   ```

3. **Run the Application**

   ```bash
   cargo run
   ```

Use arrow keys to navigate the TUI and manage your Pomodoro sessions.

---

## 📄 License

This project is open-source under the **MIT License** — use, modify, and distribute freely.