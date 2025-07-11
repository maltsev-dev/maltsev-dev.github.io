+++
title = "MCU Registers"
date = "2025-06-12"

[taxonomies]
tags = ["embedded", "basic", "registers"]
+++

A `processor register` is a quickly accessible location available to a computer's processor.
Registers usually consist of a small amount of fast storage, although some registers have specific hardware functions, and may be read-only or write-only.  
Its used to store **data**, **operands**, **calculation** results, **memory addressing**, **peripheral control**, and **microcontroller operation** during instruction execution. 

Each register has a specific function and bit capacity.  
🟠 When performing an arithmetic operation, the processor may load the operands into general-purpose registers, perform the operation, and then store the result in another register or in memory.


<!-- more -->
---

## 📌 Why registers are important

* They are the fastest way to access information and allow operations to be performed without accessing external `RAM` memory.  
* Almost every microprocessor `command` relies on the use of registers.
* Setting up the microcontroller `peripherals` directly depends on writing to **control registers**.

---

## 🧩 Basic types of registers

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
    vertical-align: top;
  }

  th {
    background-color: #f59140;
    color: white;
    text-align: center;
  }

  td:first-child {
    width: 25%;
    font-weight: bold;
  }
</style>

<table>
<thead>
<tr>
<th>Type</th>
<th>Purpose</th>
<th>Examples</th>
</tr>
</thead>
<tbody>
<tr>
<td>General-purpose registers (GPR) </td>
<td>* Stores data and intermediate values and adresses</br> * When adding numbers, the processor loads the values ​​from `RAM` into registers, performs the operation and stores the result back. </td>
<td><code>R0–R31</code> (AVR), <code>EAX–EDX</code> (x86), <code>R0–R12</code> (ARM)</td>
</tr>
<tr>
<td>Special-purpose registers (SFR)</td>
<td>* Hold some elements of the program state </br> * Each SFR has a **fixed address** in memory and is controlled by software </br>* They usually include the program counter, also called the instruction pointer </br> * Microcontrollers, can also have special function registers corresponding to specialized hardware elements.(timers, UART, ADC, etc.)</td>
<td><code>TCCR0</code>, <code>ADCSRA</code>, <code>USART_CR</code></td>
</tr>
<tr>
<td>Address Registers</td>
<td>* Hold addresses and are used by instructions that indirectly access primary memory. </td>
<td><code>SP</code>, <code>BP</code>, <code>SI</code>, <code>DI</code>, <code>X</code>, <code>Y</code>, <code>Z</code></td>
</tr>
<tr>
<td>Data Registers</td>
<td>* Can hold numeric data values such as `integers` and, (in some architectures `floating-point` numbers), as well as `characters`, small `bit arrays` and other data for I/O</td>
<td><code>PORTx</code>, <code>PINx</code>, <code>DDRx</code></td>
</tr>
<tr>
<td>Status (Flag) Registers </br> Condition code register (CCR)</td>
<td>* Contain bits of the flags of the operation result </br>* Hold truth values often used to determine whether some instruction should or should not be executed.</td>
<td><code>SREG</code>, <code>CPSR</code>, <code>FLAGS</code></td>
</tr>
<tr>
<td>Hardware registers </br> * hardware registers are like memory with additional hardware-related functions; or, memory circuits are like hardware registers that just store data </td>
<td>Used in the interface between software and peripherals </td>
<td>* Input/output (I/O) of different kinds </br> * Configuration and start-up of certain features, especially during initialization </br> * Used to interact with physical pins of the microcontroller: reading/writing levels, configuring directions, etc.</td>
</tr>
<tr>
<td>Command registers (IP/PC) </br> * not accessible by instructions and are used internally for processor operations </td>
<td>Point to the currently executing instruction</td>
<td><code>PC</code>, <code>EIP</code>, <code>R15</code></td>
</tr>
<tr>
<td>Segment registers </br> * not accessible by instructions and are used internally for processor operations </td>
<td>Point to memory segments (x86)</td>
<td><code>CS</code>, <code>DS</code>, <code>SS</code>, <code>ES</code></td>
</tr>
</tbody>
</table>

---

## 🛠 Example: Setting up SysTick (ARM Cortex-M)

To manually set up the system timer ([SysTick](https://developer.arm.com/documentation/dui0552/a/cortex-m3-peripherals/system-timer--systick)) three registers are used:

| Register Name | Purpose | Address |
| ----------------- | ---------------------- | ------------ |
| `SYST_CSR` | Control and Status | `0xE000E010` |
| `SYST_RVR` | Reset Value | `0xE000E014` |
| `SYST_CVR` | Current Value | `0xE000E018` |

* The `SYST_CSR` register enables the SysTick features. It has **three parameters** that we are interested in: 
    * `clock source` (which specifies what clock rates the timer should support), 
    * `tick interrupt enable` (which allows an interrupt to fire when the timer reaches zero) and
    * `enabling the timer itself`  
The parameters are controlled by the three least significant bits in our `32-bit` register. So for example, if you wanted to set all values ​​to one, our 32 bits would look like this. (`00000000_00000000_00000000_000000111`) The last three bits are set to one.

* The `SYST_RVR` register specifies the start value to load into the `SYST_CVR` register.  
It counts down from that value to `zero`.  
It's a 24-bit register, so the total number of values ​​we have is about `16.7 million.`

* The `SYST_CVR` register contains the current value of the counter.  
If the timer restarted with a reset value of `250` and `100` ticks have passed, the current value will be `150`.  
You can go to this register to clear the value.  
It is good practice to clear this register before enabling the timer so that its value makes sense when you read it.

### Rust example:

```rust
const SYST_CSR: u32 = 0xE000E010;
const SYST_RVR: u32 = 0xE000E014;
const SYST_CVR: u32 = 0xE000E018;

let sleep_dur = CPU_FREQ; // duration = 1 second

unsafe {
    *(SYST_RVR as *mut u32) = sleep_dur;    // set timer duration
    *(SYST_CVR as *mut u32) = 0;            // set current value to 0
    *(SYST_CSR as *mut u32) = 0b111;        // set source, enable timer and interrupts
}
```