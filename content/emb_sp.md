+++
title = "Serial Protocols"
date = "2025-06-28"

[taxonomies]
tags = ["rust", "embedded", "basic", "sp"]
+++

Digital systems are based on the concept of **bits**, in addition to using bits they often have to transfer them back and forth usually between two components (MCU and Sensor, LCD etc).  
All the different methods of bit transfer can be divided into 2 categories - `Parallel` and `Serial` transfer  

<!-- more -->
---

# &emsp;&emsp;&emsp; Serial Protocol fundamentals

### Parallel transfer 
The earliest protocols for transmitting data were mostly parallel.  
In parallel data transmission, many bits are transmitted simultaneously over **many separate channels** from a transmitter to a receiver.  
Good for short distances, have simple time synchronization and are fairly easy to analyze.  
Simple to implement, inexpensive, but very difficult to scale due to the many pins needed to transmit and receive information, low speed and distance. Almost never used today.

### Serial transfer 
Serial transmission transfers one bit at a time over a bus that can be used by **multiple nodes** simultaneously.  
In addition to the data line, there may be synchronization, control, monitoring, etc. lines.  
Such transmission can be synchronous and asynchronous.  
* synchronous - uses a separate clock signal to determine the moment of reading the signals.
* support over long distances
* higher throughput
* a larger number of potential nodes.
Most modern serial data transmission protocols use multiple channels (buses, wires). This type of transmission becomes more complex to create and analyze.  

### Families of Serial Protocols

| **Low-speed (General)**                                                                                                                                         | **Automotive**                                                                                                                                                                                                                                   | **Aerospace**, **Defence** | **High-speed** | **MIPI** |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ----- | ----- |----- |
| [UART](https://maltsev-dev.github.io/emb-sp-uart/)</br> [I2C](https://maltsev-dev.github.io/emb-sp-i2c/) </br> [SPI](https://maltsev-dev.github.io/emb-sp-spi/) | `CAN` - high speed application, often used with sensors </br> `LIN` - low speed. Usually works with car accessories - windows, mirrors, etc. </br>`FlexRay` - for critical parts of the car, such as braking. Reliability, speed and redundancy. | MIL-STD-1553, etc | USB, PCIe, etc | RFFE, SPMI, etc |

### Levels, Timing, Framing, Protocols
**Levels** - answers the question of what voltage is used to represent `zero` and `one`.
**Timing** - determines how often bits should be `sent` and `read`.
**Framing** - determines how the bits will be organized into `groups`, in what order (`idle`, `start`, `data`, `arc`, `stop`..) and what the transitions between groups mean.
**Protocols** - a set of rules for exchanging information, in additional to the previous characteristics.

### Serial Protocols Decoding
A modern approach to analyzing and decoding serial data transmission protocols is the use of an **oscilloscope**.  
After selecting a suitable protocol, it is necessary to set the `synchronization` and `framing levels` on the oscilloscope in accordance with the signal that needs to be analyzed, and then connect.  
**Oscilloscope** - is the most common pin-tool for decoding and analyzing parallel and serial protocols.
* `analog method` - when each data transmission line is connected to a separate analog **optical channel** of the oscilloscope through probes, and the software built into the oscilloscope shows some graphs for analysis.
* `digital or logical` - connecting a sensor that interprets the input data as digital signals. A larger number of lines \ wires are available.