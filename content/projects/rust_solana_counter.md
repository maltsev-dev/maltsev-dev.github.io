+++
title = "🧮 Simple Solana Counter Program"
date = "2025-03-04"

[taxonomies]
tags = ["rust", "solana", "project"]
+++

**A lightweight, native Solana smart contract for incrementing and decrementing a counter.**
Developed with native **Rust** for performance and simplicity.

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/counter_on_native_solana)
This project demonstrates a minimalistic **Solana on-chain program (smart contract)** written in native Rust. The core functionality revolves around managing a simple counter:

* 📈 **Increment** the counter by sending a transaction
* 📉 **Decrement** the counter similarly
* 🔐 State is stored on-chain and owned by the user's keypair
* ⚙️ Built using low-level Solana primitives (no Anchor framework on-chain) — excellent for learning core Solana mechanics

The program is ideal for developers who want to:

* Understand how to work with Solana’s native runtime
* Learn the basics of account handling, transaction flow, and state management
* Use it as a boilerplate to build more complex programs

---

## 🛠️ How to Get Started

### 1. 🧪 Start a Local Solana Validator

Run the following command to simulate the Solana blockchain locally:

```bash
solana-test-validator
```

### 2. 🧱 Build and Deploy the Program

Use Anchor CLI to build and deploy the smart contract to the local validator:

```bash
anchor build && anchor deploy
```

> **Note**: Although the on-chain code is native Rust, Anchor is used for deployment and local testing convenience.

### 3. 👛 Set Up Your Wallet

Export your Solana CLI wallet path so it can be used for deployments and interactions:

```bash
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 4. 🔁 Interact with the Program

Once deployed, you can send transactions to:

* **Increment** the stored counter
* **Decrement** the counter
* **Fetch and log** the current value

These actions can be scripted in TypeScript/JavaScript using Anchor client or done manually with `solana` CLI.

---

## 📄 License

This project is open-source and available under the terms of the **MIT License**.
Feel free to fork, modify, and use it for both personal and commercial purposes.