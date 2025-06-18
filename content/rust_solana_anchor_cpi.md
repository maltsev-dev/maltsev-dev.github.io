+++
title = "🔗 Anchor CPI – Cross-Program Invocation on Solana"
date = "2025-03-19"

[taxonomies]
tags = ["rust", "solana", "anchor", "project"]
+++

**A working example of Anchor-based CPI (Cross Program Invocation) — when one Solana program calls another.**
This project demonstrates best practices for inter-program communication using the Anchor framework.

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/anchor_cpi)

This project illustrates how to structure two Solana programs (`program-a` and `program-b`) where **Program A** performs a CPI to **Program B**, and also interacts with **System Program** (for SOL transfers).

CPI (Cross-Program Invocation) is a critical building block for modular, reusable smart contracts on Solana. This example is ideal for:

* Developers learning advanced Solana development
* Those building protocol layers or modular dApps
* Projects where multiple programs need to coordinate actions

---

## 🔧 Stack & Tools

* 🦀 **Rust** — primary language
* ⚓ **Anchor** — Solana framework
* 🔁 **CPI Pattern**
* 🔍 **Transaction Explorer**
* 🧪 **Anchor tests with local validator**

---

## ✨ Features

1. **Call Another Program from Your Program**

   * CPI pattern with `invoke_signed()` in Anchor

2. **Pass Accounts & Instruction Data**

   * Structured instruction building for inner program calls

3. **Work with System Program**

   * Demonstrates how to invoke built-in programs (e.g., SOL transfers)

4. **Observe Execution Flow**

   * View log output to understand program interaction sequence

---

## 🚀 Setup & Usage

### 1. 🏗️ Initialize Projects

Create two Anchor programs:

```bash
anchor init program-a
cd ..
anchor init program-b
```

### 2. 🔁 Configure Dependencies

In `Cargo.toml` of `program-a`, add:

```toml
program-b = { path = "../program-b", features = ["cpi"] }
```

In `Anchor.toml` of `program-a`, disable auto-resolution of dependencies:

```toml
[programs.localnet]
program_b = "..." # Your local key

[workspace.dependencies]
program-b = { path = "../program-b", features = ["cpi"], resolution = false }
```

---

### 3. 🧪 Run Tests

Build and test CPI interaction:

```bash
anchor build && anchor test
```

---

### 4. 🧱 Start Local Validator

```bash
cd .anchor/
solana-test-validator
```

---

### 5. 🔍 View Transactions

1. Open [explorer.solana.com](https://explorer.solana.com)
2. Switch to "Localhost" network
3. Find your transaction signature in test output logs

---

## 🖥️ Sample Logs

```bash
Program logged: "Instruction: Initialize"
Program logged: "Greetings from: Program A"
Program invoked: System Program
Program returned success
Program invoked: Unknown Program (...)
Program logged: "Instruction: Initialize"
Program logged: "Greetings from: Program B"
Program consumed: 676 of 190087 compute units
Program returned success
```

These logs show:

* Instruction flow through both programs
* System-level interaction
* Success/failure of each step

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and extend.