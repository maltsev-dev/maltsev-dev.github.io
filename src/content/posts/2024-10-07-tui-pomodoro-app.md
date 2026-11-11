---
title: "🍅 TUI Pomodoro App"
date: "2024-10-07"
description: "A keyboard-driven Pomodoro timer built with Rust and Cursive, with a configurable session length and a minimal interface."
tags: ["rust", "tui", "project"]
---
**A terminal-based Pomodoro timer built with Rust and [Cursive](https://crates.io/crates/cursive), replicating the feel of vintage console tools.**  
`cursive 0.21.1`

---

## ⏳ Text-based user interface pomodoro timer

[📚 GitHub Repository](https://github.com/maltsev-dev/tui_pomodoro)

This project is an experimental implementation of the **Pomodoro Technique** in a text-based user interface, leveraging the [`cursive`](https://crates.io/crates/cursive) crate to build a clean, keyboard-navigated experience in the terminal.

Ideal for Rust developers looking to:

* Practice TUI development
* Create distraction-free productivity tools
* Understand timer-based logic in async or event-driven environments

---

### ⚙️ Tools & tech

<h3 style="text-align:center; margin-bottom:8px;">Tools</h3>
<p align="center" style="margin:0; padding:0;">
  <code>rust 1.83.0</code>
  <code>cursive 0.21.1</code>
  <a href="https://github.com/maltsev-dev/tui_pomodoro/actions/workflows/rust.yml"><code>CI</code></a>
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

![Terminal recording of the Pomodoro timer window counting down a 25-minute session, with keyboard shortcuts to adjust the time, start or stop it, and exit](/media/tui_pomodoro_app.gif)

---

## 📦 Installation & usage

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