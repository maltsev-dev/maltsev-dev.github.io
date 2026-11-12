---
title: "TUI Pomodoro App"
date: "2024-10-07"
description: "A keyboard-driven Pomodoro timer built with Rust and Cursive, with a configurable session length and a minimal interface."
tags: ["rust", "tui", "project"]
---
A terminal-based Pomodoro timer built with Rust and [Cursive](https://crates.io/crates/cursive), with the feel of a vintage console tool. Built with `cursive 0.21.1`.

[GitHub Repository](https://github.com/maltsev-dev/tui_pomodoro)

This project is an experimental implementation of the Pomodoro Technique in a text-based user interface, using the [`cursive`](https://crates.io/crates/cursive) crate to build a clean, keyboard-navigated experience in the terminal.

It suits Rust developers who want to:

- Practice TUI development
- Create distraction-free productivity tools
- Understand timer-based logic in async or event-driven environments

## Tools and tech

- `rust 1.83.0`
- `cursive 0.21.1`
- [CI](https://github.com/maltsev-dev/tui_pomodoro/actions/workflows/rust.yml)

## Features

1. Set a custom timer. Configure the session length, for example 25 minutes of focus.
2. Start and stop the timer. Manual control over timer execution, designed for single-session focus tracking.
3. Minimal interface. Clean and distraction-free, suitable for full-screen terminal use.

## Demo

![Terminal recording of the Pomodoro timer window counting down a 25-minute session, with keyboard shortcuts to adjust the time, start or stop it, and exit](/media/tui_pomodoro_app.gif)

## Installation and usage

1. Clone the repository:

   ```bash
   git clone https://github.com/maltsev-dev/tui_pomodoro
   cd tui_pomodoro
   ```

2. Build the project:

   ```bash
   cargo build --release
   ```

3. Run the application:

   ```bash
   cargo run
   ```

Use arrow keys to navigate the TUI and manage your Pomodoro sessions.

## License

This project is open-source under the MIT License. Use it, modify it and distribute it freely.
