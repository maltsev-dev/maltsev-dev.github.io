+++
title = "Null Pointer Optimization"
date = "2025-06-01"

[taxonomies]
tags = ["rust", "box", "memory"]
+++

Rust uses the **null pointer optimization** (or "niche optimization") for pointer types that can never represent the value 0 (null).
<!-- more -->
---
