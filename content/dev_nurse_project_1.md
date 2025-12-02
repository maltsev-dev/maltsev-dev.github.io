+++
title = "Why overspecialization is over, and how I decided to create my own AI device on MCU"
date = "2025-12-02"

[taxonomies]
tags = ["project", "rust", "nurse", "product"]
+++

In this series of articles, I want to show you how I created my own ESP32-S3-based device with ML onboard.  
The project is both a learning pet project and a minimal, repeatable, practical approach.  
🟠 I'll try to describe not only what I'm doing, but also how I got there—all the decisions, compromises, and challenges that arose along the way.  

<!-- more -->
---

##      Why and for what reason?
There are several reasons why I decided to undertake this project and document the process:

1. Because it's objectively difficult for me  
I don't have deep experience with microcontrollers, and I only have a superficial knowledge of machine learning.  
This sounds like a complex technical challenge to me.

2. I want to improve my Rust skills  
I want to use Rust as the primary language for developing firmware and the entire server side.  
I've long liked it, and after several successfully implemented projects using it, I've never had to question what to use for firmware.

3. Build a full cycle: MCU → AI → Actix Web → Dashboard  
The philosophy of overspecialization is being replaced by interdisciplinarity and brave generalist engineers who are capable of understanding the entire product and improving any part of it.  
Therefore, I'm interested in creating a full-cycle IoT product that will require a wealth of interdisciplinary technical knowledge and skills.

4. Document your journey  
I'd be happy to return to this series of articles, in which I plan to document my learnings and describe a structured process.  
This could also be useful for other developers, employers, or partners.


##      What exactly do I want to build?
My future **device** will contain:
1. AI inference for image classification and human feature detection
2. Camera and image processing stream
3. Wi-Fi connection via QR code with the ability to reset network settings
4. Obtaining UTC time
5. Communication with the server via MQTT

The **server side** will be responsible for:
1. Authorization processing
2. Collecting and processing data from devices
3. API

On the **front end**, I see the following as optimal:
1. User/device personal account
2. Real-time event log
3. Graphs and statistics for human detection data
4. Device cards

The **main stages** of this project are:
* Training and optimizing the machine learning model
* Creating firmware on the MCU and integrating the model into it
* Configuring a transport layer for MCU communication with the outside world
* Creating a server for receiving data, processing it, and managing authorizations
* Data visualization and working with UI/UX
* Creating a prototype enclosure for 3D printing


##      Project architecture (high-level plan)
{{ img(src = "/images/nurse_high_level_arch.png") }}


##      How the article series will be structured
I'll try to divide the entire journey into logical modules. In the following articles, I'll cover:

* Hardware, component selection, and Rust firmware organization
* TinyML and MCU models
* Running inference: the real pipeline
* Network: Wi-Fi, MQTT, HTTP
* Backend on Actix
* Dashboard
* 3D modeling
* Current results and plans
