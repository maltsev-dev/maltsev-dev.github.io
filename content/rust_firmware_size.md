+++
title = "Optimizing Rust Firmware Size"
date = "2025-05-29"

[taxonomies]
tags = ["rust", "embedded"]
+++

<!-- more -->
---

```
C:\Users\Anatolii Maltsev\Documents\Coding\Rust\pico_w_blink>cargo size -- -Ax
warning: unused manifest key: target.thumbv6m-none-eabi.runner
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.06s
pico_w_blink  :
section                size         addr
.vector_table          0xc0   0x10000000
.text                 0x2a0   0x100000c0
.rodata               0x1b0   0x10000360
.data                     0   0x20000000
.gnu.sgstubs              0   0x10000520
.bss                      0   0x20000000
.uninit                   0   0x20000000
.debug_abbrev        0x5371          0x0
.debug_info         0xa1523          0x0
.debug_aranges       0x6058          0x0
.debug_ranges       0x1d408          0x0
.debug_str          0xd6ffb          0x0
.comment               0x99          0x0
.ARM.attributes        0x32          0x0
.debug_frame        0x12cb4          0x0
.debug_line         0x4897d          0x0
.debug_loc           0x1436          0x0
.debug_pubnames       0x1e9          0x0
.debug_pubtypes        0x47          0x0
Total              0x1fdf61
```

