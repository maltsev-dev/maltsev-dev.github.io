---
title: "Game on Solana: Guess the Number"
date: "2025-03-07"
description: "A minimalist on-chain guessing game built with Rust and Anchor: the contract picks a number, the player guesses it."
tags: ["rust", "solana", "anchor", "project"]
---
A simple interactive number guessing game, powered by smart contracts on the Solana blockchain. Written in Rust with the Anchor framework.

[GitHub Repository](https://github.com/maltsev-dev/guess_the_number_on_solana)

The game is a minimalist on-chain program built with [Anchor](https://book.anchor-lang.com/) on Solana. It combines basic game logic with the chain infrastructure: the contract thinks of a number and the player has to guess it.

It works well as a demo for:

- Learning how to build interactive dApps on Solana
- Understanding Solana account state and transactions
- Combining game mechanics with blockchain immutability

## Stack

- Rust, for the smart contract logic
- Anchor, for building and testing Solana programs
- A local Solana validator for development and simulation

## Features

1. On-chain random number generation. The program stores a secret number within its state, pseudo-random for now.
2. Guess by transaction. Users guess the number by sending a transaction with their attempt.
3. Immediate response. The program replies whether the guess is too low, too high or correct.
4. Stateless client. All game logic and storage is managed on-chain, so the client only sends guesses.

## Getting started

1. Start the local validator:

   ```bash
   solana-test-validator
   ```

2. Build and deploy the program:

   ```bash
   anchor build && anchor deploy
   ```

3. Play the game. Send transactions with your guess to the validator:

   ```bash
   anchor run guess -- --number 42
   ```

   This assumes you have set up a client command or script to interact with the program using the Anchor CLI or custom JS/TS scripts.

## How it works

- Upon initialization, the program stores a secret number, generated on start.
- Each guess is a transaction carrying an integer.
- The program processes the guess and emits a response via logs or account state.

## License

This project is open-source and licensed under the MIT License. Feel free to build upon, modify, or expand it.
