+++
title = "Solana Favorites"
date = "2025-04-09"

[taxonomies]
tags = ["rust", "solana", "anchor", "project"]
+++

Solana Program with chain interaction.  
<!-- more -->
---

[📚 Send Data Project](https://github.com/maltsev-dev/send_data)

#### &emsp;&emsp;&emsp; Project 
Send data to chain, change with key.  

#### &emsp;&emsp;&emsp; How to start
1. Start local validator  
`solana-test-validator`

2. Build and deploy the Program  
`anchor build && anchor deploy`  

3. Add wallet  
`export ANCHOR_WALLET=~/.config/solana/id.json`

4. Run Rust tests  
`cargo test`  

5. Find transactions at http://localhost:8899

