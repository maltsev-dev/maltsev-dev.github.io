---
title: "🎮 Game on Solana: Guess the Number"
date: "2025-03-07"
tags: ["rust", "solana", "anchor", "project"]
---
**A simple interactive number guessing game powered by smart contracts on the Solana blockchain.**
Developed with **Rust** and the **Anchor framework**.

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/guess_the_number_on_solana)

This project showcases a minimalist **on-chain game** built using [Anchor](https://book.anchor-lang.com/) on the Solana blockchain. It combines basic game logic with decentralized infrastructure, allowing players to interact with a smart contract that "thinks of" a number — and challenges them to guess it.

A great demo for:

* Learning how to build interactive dApps on Solana
* Understanding Solana account state & transactions
* Combining game mechanics with blockchain immutability

---

## ⚙️ Stack

* 🦀 Rust (smart contract logic)
* ⚓ Anchor (for building & testing Solana programs)
* 🧪 Local Solana validator for development and simulation

---

## ✨ Features

1. **On-chain Random Number Generation**

   * The program stores a secret number within its state (pseudo-random for now).

2. **Guess by Transaction**

   * Users guess the number by sending a transaction with their attempt.

3. **Immediate Response**

   * Program replies whether the guess is too low, too high, or correct.

4. **Stateless Client**

   * All game logic and storage is managed on-chain; the client just sends guesses.

---

## 🚀 Getting Started

### 1. 🔧 Start the Local Validator

Launch the Solana test environment locally:

```bash
solana-test-validator
```

### 2. 🛠️ Build and Deploy the Program

Compile and deploy the Anchor smart contract:

```bash
anchor build && anchor deploy
```

### 3. 🎮 Play the Game

Send transactions with your guess to the validator. Example:

```bash
anchor run guess -- --number 42
```

> This assumes you've set up a client command/script to interact with the program using Anchor CLI or custom JS/TS scripts.

---

## 🧠 How It Works

* Upon initialization, the program stores a secret number (randomly generated on start).
* Each guess is a transaction with an integer.
* The program processes the guess and emits a response via logs or account state.

---

## 📄 License

This project is open-source and licensed under the **MIT License** — feel free to build upon, modify, or expand.
