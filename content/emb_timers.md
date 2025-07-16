+++
title = "Timers"
date = "2025-06-12"

[taxonomies]
tags = ["embedded", "basic", "timers"]
+++

🟠 Timers are hardware modules of the microcontroller for actions with time counting and event generation **without the participation of the main code**.  
 The accuracy of the timer and its maximum time range depends on its `bit depth`, the clock `frequency` to which it is connected and the value of the `divider`.
<!-- more -->
---

### 🔍 Timers Use Cases

- **Time Measurement** — Signal Duration, Interval Between Events
- **Event Generation** — Periodic Interrupts, PWM, ADC Triggers
- **Hang Control** — Watchdog Timer (Restart MCU when hung)
- **System Intervals** — `SysTick`, used in RTOS and Basic Delays (System Timer, built into Cortex-M core)

---

### 🕒 Timers and Clock

- Timers operate from a clock signal coming from the **clock system**.
- The timer frequency depends on:
	- Input signal frequency
	- **prescaler** value
- **The lower the frequency**, the **longer the interval between ticks**, and vice versa.

---

### ⚡ Timer and Interrupts
Timers can generate different types of interrupts:

- `Update Event` — triggered when the end of the count is reached (`ARR`)
- `Compare Match` — triggered when the counter matches the specified value
- `Overflow` — counter overflow

- Used for:
- Precise periodic sampling (e.g. every 10 ms)
- PWM generation
- Time delays (sleep/delay)

---

### ⚙️ Timer Settings
1. **Counting Direction**
- Up, Down, or Both

2. **Resolution (Timer Bit Capacity)**
- The number of bits determines the maximum duration of the timer.
- At a frequency of 1 mHz - the clock ticks 1 million times per second. (1 time per 1 microsecond µs)
	- 8-bit timer: max interval = 255 µs
	- 16-bit timer: ≈ 65,535 µs (0.065536 seconds)
	- 32-bit: ≈ `2^32 / 1,000,000 Hz = 4.294967296` seconds
        
3. **Prescaler Factor**
- Timers are often connected to a high frequency system clock (e.g. 12.5 MHz).
- Without a prescaler, a 16-bit timer at 12.5 MHz will "overflow" in ~5 ms.
- Divides the input frequency, increasing the interval between ticks
- By decreasing the frequency, you can increase the total amount of time that the timers can count, since each value represents a longer period of time.
- formula `Maximum time = (2^n - 1) / (clock_freq / prescaler)`
        

``` bash
Frequency: 1 MHz = 1,000,000 Hz, which means 1,000,000 pulses per second.
Pulse period: 1 / 1,000,000 = 0.000001 seconds (1 microsecond).
The maximum value of a 16-bit timer is 65535.
Overflow time: 65535 * 0.000001 = 0.065535 seconds.
```

| Timer size | 1MHz | 8MHz | 12MHz | 16MHz | 72MHz |
| ------------------- | ---------- | ---------- | ---------- | ---------- | ----------- |
| **8 bits (2⁸)** | 0.000255s | 0.000031s | 0.000021s | 0.000015s | 0.0000035s |
| **16 bits (2¹⁶)** | 0.065s | 0.008s | 0.005s | 0.004s | 0.00091s |
| **32 bits (2³²)** | 4295s | 536c | 357c | 268c | 59.6s |

---

### ⚙️ Timer programming
What we want to do is manipulate the pre-scaling. To do this, we need to configure the clock configuration of the operating mode.
* Manipulate the `RCC` register to set the system clock divider.
* (Context: microcontroller in QEMU, PLL frequency is 400 MHz, divided by 2 → SYSCLK = 200 MHz).

### Steps:

1. **Define the RCC base address**
    
```rust
const RCC: u32 = 0x400FE060;  					// just paste this address, but remember that it has offset 060
```

2. **Определим нужное значение делителя**

```rust
const SYSCTL_SYSDIV_16: u32 = 0xF; 				// Divisor = 16 (frequency 12.5 megahertz)
```

3. **Установим новое значение в RCC**
    
```rust
unsafe {
	let sysdiv = SYSCTL_SYSDIV_16 << 23; 		// we are going to shift it 23 bits to the left so that it occupies bits 23 through 26
	let orig = *(RCC as *const u32); 			// to avoid overwriting the entire RCC register, we need to read the value that is in RCC.
	let mask = !(0b1111 << 23); 				// create a mask of 4 bits and invert them. The mask will occupy bits 23 through 26
	let rcc = (orig & mask) | sysdiv; 			// replace the bit values in the original with the mask.
	*(RCC as *mut u32) = rcc; 					// set the preliminary scaling value.
}
```

4. **Change the divider to increase the frequency**
    
```rust
const SYSCTL_SYSDIV_12: u32 = 0xB; 		// Divisor = 12 → higher frequency (new frequency 16.67 MHz)
```

With a change in the divider, the timer frequency changes, and therefore the **interval between interrupts**.
A smaller divider means that the timers work faster, a larger one means that the timers work slower, but the counting takes longer.
A higher frequency means that the interruption occurs more often.


| Frequency | Divisor | Interval |
| :------ | :------- | :------- |
| Higher | Lower | Less |
| Lower | Higher | More |

