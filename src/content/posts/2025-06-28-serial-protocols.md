---
title: "Serial Protocols"
date: "2025-06-28"
tags: ["embedded", "basic", "sp"]
---
Digital systems are built on bits, and beyond using bits they often have to move them between two components, an MCU and a sensor or an LCD, for instance. There are two ways to do that: `parallel` transfer and `serial` transfer.

## Serial protocol fundamentals

### Parallel transfer

The earliest protocols for transmitting data were mostly parallel. Many bits are transmitted simultaneously over many separate channels from a transmitter to a receiver.

That is good for short distances, with simple time synchronization, and it is fairly easy to analyze, simple to implement and inexpensive. What it does not scale is the number of pins needed to transmit and receive information, and the speed and distance you get over them. Almost never used today.

### Serial transfer

Serial transmission transfers one bit at a time over a bus that can be used by multiple nodes simultaneously. In addition to the data line, there may be synchronization, control, monitoring and other lines. Such transmission can be synchronous or asynchronous.

A synchronous transfer uses a separate clock signal to determine the moment of reading the signals. Serial transfer also supports long distances, reaches a higher throughput and allows a larger number of potential nodes.

Most modern serial data transmission protocols use multiple channels (buses, wires). This type of transmission becomes more complex to create and analyze.

### Families of serial protocols

| Low-speed (general) | Automotive | Aerospace / defense | High-speed | MIPI |
|---|---|---|---|---|
| [UART](/blog/2025-06-30-uart-universal-asynchronous-receiver-transmitter/)<br>[I2C](/blog/2025-06-30-i2c-inter-integrated-circuit/)<br>[SPI](/blog/2025-06-30-spi-serial-peripheral-interface/) | `CAN`: high speed application, often used with sensors<br>`LIN`: low speed, usually works with car accessories (windows, mirrors, etc.)<br>`FlexRay`: for critical parts of the car, such as braking. Reliability, speed and redundancy | MIL-STD-1553, etc | USB, PCIe, etc | RFFE, SPMI, etc |

### Levels, timing, framing, protocols
Levels answer the question of what voltage is used to represent `zero` and `one`. Timing determines how often bits should be `sent` and `read`. Framing determines how the bits will be organized into `groups`, in what order (`idle`, `start`, `data`, `arc`, `stop`...) and what the transitions between groups mean. Protocols are a set of rules for exchanging information, in addition to the previous characteristics.

### Serial protocols decoding
A modern approach to analyzing and decoding serial data transmission protocols is the use of an oscilloscope. After selecting a suitable protocol, you set the `synchronization` and `framing levels` on the oscilloscope to match the signal that needs to be analyzed, and then connect.

The oscilloscope is the most common tool for decoding and analyzing parallel and serial protocols. The analog method connects each data transmission line to a separate analog optical channel of the oscilloscope through probes, and the software built into the oscilloscope shows graphs for analysis. The digital or logical method connects a sensor that interprets the input data as digital signals, which makes a larger number of lines or wires available.
