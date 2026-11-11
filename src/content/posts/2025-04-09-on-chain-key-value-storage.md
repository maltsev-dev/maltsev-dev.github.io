---
title: "📦 On-Chain Key-Value Storage"
date: "2025-04-09"
description: "An Anchor program that stores and updates user-defined key-value entries on-chain, a small favorites manager."
tags: ["rust", "solana", "anchor", "project"]
---
**A Solana smart contract project that demonstrates how to send, store, and update data on-chain using keys.**
Built with **Rust** and the **Anchor** framework.

---

[📚 GitHub Repository](https://github.com/maltsev-dev/send_data)

This project explores how to interact with a **Solana program** by writing and updating user-defined data directly on-chain.
It simulates a simple **“favorites” manager** — where users can send strings or numbers to the chain, associate them with a unique key, and later update those entries.

A great starting point for:

* Understanding persistent on-chain state
* Managing user-specific data using derived accounts
* Creating decentralized CRUD-style apps

---

## 🧰 Stack & tools

* 🦀 **Rust** (Solana smart contract logic)
* ⚓ **Anchor** (framework for Solana programs)
* 🧪 **Local test validator**
* 🧪 **Rust unit/integration tests**

---

## ✨ Features

1. **Send Arbitrary Data to the Blockchain**

   * Insert a value associated with a custom key.

2. **Update Stored Data by Key**

   * Modify entries via a transaction that targets a specific key.

3. **Simple Chain Storage Pattern**

   * Uses Solana accounts to persist user-defined values.

4. **Full Test Coverage**

   * Rust-based tests validate program logic locally.

---

## 🚀 Getting started

### 1. 🧪 Start local Solana validator

Spin up a local blockchain testnet:

```bash
solana-test-validator
```

### 2. 🛠 Build and deploy

Compile and deploy the Anchor program:

```bash
anchor build && anchor deploy
```

### 3. 👛 Add wallet

Set your Solana CLI wallet path:

```bash
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 4. ✅ Run tests

Ensure everything works as expected with:

```bash
cargo test
```

### 5. 🔍 View transactions

Access the local explorer to track activity:
[http://localhost:8899](http://localhost:8899)

---

## 🧠 Use cases & ideas

* ⭐ Store favorite quotes, URLs, or topics by key
* 🧾 Use it as a base for decentralized note-taking or bookmarking
* 🔑 Extend it with access control and per-user namespaces

---

## 📄 License

This project is licensed under the **MIT License** — free for personal and commercial use.