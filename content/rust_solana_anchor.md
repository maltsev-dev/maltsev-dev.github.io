+++
title = "Game on Solana"
date = "2025-03-07"

[taxonomies]
tags = ["rust", "solana", "anchor", "project"]
+++

Guess the number game on Solana Chain.  
Developed with Anchor.
<!-- more -->
---

[📚 Guess the number](https://github.com/maltsev-dev/guess_the_number_on_solana)

#### Project 
A simple chain game.  
The program generates a number.  
The user tries to guess by sending a transaction and getting an answer.

### How to start
1. Start local validator  
`solana-test-validator`

2. Build and deploy the Program  
`anchor build && anchor deploy`  

4. Play the game by sending numbers to validator terminal