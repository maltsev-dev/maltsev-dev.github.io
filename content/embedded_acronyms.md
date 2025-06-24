+++
title = "abbreviations and acronyms in embedded systems dev"
date = "2025-06-12"

[taxonomies]
tags = ["rust", "embedded", "basic"]
+++

A series of notes about the world of embedded systems.
Intended as a reference material for those who are interested and new.

<!-- more -->
---

## ==Аппаратные интерфейсы==

- **SPI (Serial Peripheral Interface)** — is a synchronous serial communication protocol that you can use for short-distance and high-speed synchronous data transfer between embedded systems. SPI is a three or four-wire bus and SPI devices communicate in full-duplex mode with a dedicated channel for transmitting data and a separate channel for receiving data

В SPI используются 4 цифровых сигнала:
* MOSI (Master Out Slave In) / SDO (Serial Data Out)  — выход master, вход slave. Служит для передачи данных от master устройства ведомому.
* MISO (Master In Slave Out) / SDI (Serial Data In)  — вход master, выход slave. Служит для передачи данных от slave устройства ведущему.
* SCLK или SCK (Serial Clock) — последовательный тактовый сигнал. Служит для передачи тактового сигнала для ведомых устройств.
* CS или SS (Chip Select, Slave Select) — выбор микросхемы, выбор slave.

В HAL для STM32 SPI1 инициализируется как:
``` rust
let spi = dp.SPI1.spi((sck, miso, mosi), Mode { polarity: IdleLow, phase: CaptureOnFirstTransition }, 1.MHz(), clocks);
```
([stm32h7xx_hal::spi](https://docs.rs/stm32h7xx-hal/latest/stm32h7xx_hal/spi/index.html)) 
    
- **I²C (Inter-Integrated Circuit)** — последовательная асимметричная шина для связи между интегральными схемами внутри электронных приборов.  
Использует две двунаправленные линии связи ( линия данные SDA и линия тактирования SCL), применяется для соединения низкоскоростных периферийных компонентов с процессорами и микроконтроллерами (например, на материнских платах, во встраиваемых системах, в мобильных телефонах).
Инициатором обмена всегда выступает master, обмен между двумя slave **невозможен**. Всего на одной двухпроводной шине может быть до 127 устройств.

Такты на линии SCL генерирует master.  
Линией SDA могут управлять как мастер, так и ведомый в зависимости от направления передачи.  
Единицей обмена информации является **пакет**, обрамленный уникальными условиями на шине, именуемыми стартовым и стоповым условиями. Maste в начале каждого пакета передает один байт, где указывает адрес slave и направление передачи последующих данных. Данные передаются 8-битными словами. После каждого слова передается один бит подтверждения приема приемной стороной.

Широко используется для датчиков, EEPROM, RTC и т.п. 

([stm32h7xx_hal::i2c](https://docs.rs/stm32h7xx-hal/latest/stm32h7xx_hal/i2c/index.html)) 


_Пример:_ в stm32f1xx-hal создают шину:
```rust
let i2c = I2c::i2c1(dp.I2C1, (scl_pin, sda_pin), 100.kHz(), clocks);
```
    
- **UART (Universal Asynchronous Receiver-Transmitter)** — периферийный модуль вычислительных устройств, предназначенный для организации связи с другими цифровыми устройствами. Преобразует передаваемые данные в последовательный вид таким образом, чтобы было возможно передать их по одной физической цифровой линии другому аналогичному устройству.  
UART представляет собой логическую схему, с одной стороны подключённую к шине вычислительного устройства, а с другой имеющую два или более выводов для внешнего соединения.

([stm32h7xx_hal::serial](https://docs.rs/stm32h7xx-hal/latest/stm32h7xx_hal/serial/index.html)) 

_Пример:_ на STM32 инициализация UART:

```rust
let serial = Serial::new(dp.USART1,(tx_pin, rx_pin),&mut afio.mapr,Config::default().baudrate(9600.bps()),&clocks,); 

 ```
    
- **PWM (Pulse-Width Modulation)** —  Управляет средним уровнем сигнала (например, яркостью LED или скоростью мотора) путём изменения длительности «включённого» интервала (скважности) импульсов. 
ШИМ использует **цифровые контакты** для передачи определенных частот прямоугольных волн, те вывода высоких и низких уровней, которые попеременно длятся некоторое время.
Общее время для каждого набора высоких и низких уровней обычно фиксировано и называется **периодом**. (обратной величиной периода является **частота**) 
Время работы выходов высокого уровня обычно называется "**длительностью импульса**", а **рабочий цикл** - это процент отношения **==длительности импульса==** или ==**ширины импальса**== (PW) к общему периоду (T) формы сигнала.

  Пример:_ пульт чтения. настраивает ШИМ на 50%.:
```rust
let mut pwm = Timer::tim2(dp.TIM2, 1.kHz(), clocks).pwm(pin); 
        pwm.set_duty(max_duty/2);
```  

([stm32h7xx_hal::pwm](https://docs.rs/stm32h7xx-hal/latest/stm32h7xx_hal/pwm/index.html)) 

    
- **DMA (Direct Memory Access)** — контроллер прямого доступа к памяти. Позволяет периферии (например, UART, SPI) передавать данные в память и обратно без участия CPU, повышая эффективность. Например, прием данных UART через DMA без прерываний, когда DMA-модуль сам переписывает буфер памяти при поступлении байтов.
    
- **ADC (Analog-to-Digital Converter)** — устройство, преобразующее входной аналоговый сигнал (напряжение) в двоичный цифровой код (цифровой сигнал)
 
_Пример:_ чтение с аналогового входа:
```rust
let value: u16 = adc.read(&mut adc_pin).unwrap();
```
  
- **DAC (Digital-to-Analog Converter)** — преобразующее входной дискретный код в аналоговый сигнал.

- **GPIO (General Purpose Input/Output)** — интерфейс для связи между компонентами компьютерной системы, к примеру, микропроцессором и различными периферийными устройствами. Контакты GPIO могут выступать как в роли входа, так и в роли выхода — это, как правило, конфигурируется. GPIO-контакты часто группируются в порты.

 _Пример:_   — включение светодиода.
```rust
let mut led = gpioa.pa5.into_push_pull_output(); led.set_high().unwrap();
```

- **RTC (Real-Time Clock)** — электронная схема, предназначенная для учёта хронометрических данных (текущее время, дата, день недели и др.), представляющая собой систему из автономного источника питания и учитывающего устройства. RTIC присутствуют практически во всех электронных устройствах, которые должны хранить время.
Например чтение текущего времени с RTC в STM32 или запуск будильника.
    
- **CAN (Controller Area Network)** — стандарт промышленной сети, ориентированный, прежде всего, на объединение в единую сеть различных исполнительных устройств и датчиков.  
В настоящее время широко распространён в промышленной автоматизации, технологиях домашней автоматизации («умного дома»), автомобильной промышленности и многих других областях. Стандарт для автомобильной автоматики.
На практике под CAN-сетью обычно подразумевается сеть топологии «шина» с физическим уровнем в виде дифференциальной пары, определённым в стандарте `ISO 11898`. Передача ведётся кадрами (до 8 байт), которые принимаются всеми узлами сети. Для доступа к шине выпускаются специализированные микросхемы — драйверы CAN-шины. 

([stm32h7xx_hal::can](https://docs.rs/stm32h7xx-hal/latest/stm32h7xx_hal/can/index.html)) 
    
- **USB (Universal Serial Bus)** —  последовательный интерфейс для подключения периферийных устройств к вычислительной технике. Получил широчайшее распространение и стал основным интерфейсом подключения периферии к бытовой цифровой технике.  
Поддерживает Plug-and-Play и различные скорости (USB 1.x/2.0/3.x/4). 
_Пример:_ в Rust-встраиваемом используется crate ([`usb-device`](https://crates.io/crates/usb-device)) для реализации USB-устройства на МК.
    
- **BLE (Bluetooth Low Energy/Bluetooth Smart)** — выпущенная в декабре 2009 года версия спецификации ядра беспроводной технологии Bluetooth (включена в Bluetooth 4.0), наиболее существенным достоинством которой является сверхмалое пиковое энергопотребление, среднее энергопотребление и энергопотребление в режиме простоя.
Беспроводная технология **PAN** для отправки небольших пакетов данных (IoT-датчики, wearables), поддерживает BLE связи с минимальным энергозатратами. 

- **WPAN (Беспроводная персональная сеть)** является маломощной **PAN (Personal Area Network)**, которая организуется на небольшом расстоянии с использованием беспроводных сетевых технологий.
    
- **NFC (Near-Field Communication)** — технология беспроводной передачи данных малого радиуса действия, которая даёт возможность обмена данными между устройствами, находящимися на расстоянии около 10 сантиметров (например, метки и смартфоны). 

_Пример:_ модуль PN532 читает NFC-метки через I²C/SPI и реализуется в Rust-драйверах для NFC.

    
- **SDIO (Secure Digital Input Output)** — расширенный интерфейс SD. Позволяет подключать к SD-шине помимо Flash-памяти и другие модули (Wi-Fi, GPS и др.) через стандартный разъём SD. — это интерфейс связи, позволяющий устройствам подключаться к SD-карте и обмениваться данными.
_Пример:_ плата с ESP32 использует SDIO-интерфейс для связи с собственным Wi-Fi-модулем.
    
- **JTAG (Joint Test Action Group)** — специализированный аппаратный интерфейс на базе стандарта IEEE 1149.1. Официальное название стандарта **Standard Test Access Port and Boundary-Scan Architecture**. Интерфейс предназначен для подключения сложных цифровых микросхем или устройств уровня печатной платы к стандартной аппаратуре тестирования и отладки.
Обеспечивает доступ к внутренним регистрам и памяти чипа для отладки.
_Пример:_ программаторы/отладчики (OpenOCD, probe-rs) используют JTAG для прошивки и отладки МК.
    
- **SWD (Serial Wire Debug)** — альтернативный 2-пиновый ARM-интерфейс отладки. Похож на JTAG, но использует только линии SWDIO и SWCLK, экономя выводы МК. 
_Пример:_ ST-LINK устройство подключается к SWD-пинам STM32 вместо полного 5-пинового JTAG.


## MCU vs MPU

* **MCU (Microcontroller Unit)**, когда приоритет — низкое энергопотребление, компактность, низкая стоимость и жёсткие требования по отклику.
* **MPU (Microprocessor Unit)**, когда нужна производительность, поддержка ОС, сложный UI или работа с большим объёмом данных/видео.

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
    text-align: left;
  }

  th {
    font-weight: bold;
    /*color: orange;*/
  }
  thead {
    background-color: #f59140;
  }
</style>

<table>
  <thead>
    <tr>
      <th>Criterion</th>
      <th>MCU (Microcontroller Unit)</th>
      <th>MPU (Microprocessor Unit)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Description</strong></td>
      <td>Single-chip system: CPU + Flash + SRAM + peripherals</td>
      <td>Processor requiring external memory and peripherals</td>
    </tr>
    <tr>
      <td><strong>Program Memory Characteristics</strong></td>
      <td>Built-in Flash memory (typically up to 2 MB)</td>
      <td>External Flash (NAND/Serial), program loaded into DRAM</td>
    </tr>
    <tr>
      <td><strong>Random Access Memory (RAM)</strong></td>
      <td>Built-in SRAM (from hundreds of bytes to ~512 KB)</td>
      <td>External DRAM (from 64 MB to several GB)</td>
    </tr>
    <tr>
      <td><strong>Power Supply</strong></td>
      <td>Single power rail (e.g., 3.3V or 1.8V)</td>
      <td>Multiple sources (core, peripherals, memory — with different voltages)</td>
    </tr>
    <tr>
      <td><strong>Power Consumption</strong></td>
      <td>Very low (μA – mA), optimal for autonomous operation</td>
      <td>Significantly higher (mA – hundreds of mA and more)</td>
    </tr>
    <tr>
      <td><strong>Operating System</strong></td>
      <td>No OS or with RTOS (FreeRTOS, Zephyr, etc.)</td>
      <td>Runs a full-fledged OS (Linux, Android, QNX, etc.)</td>
    </tr>
    <tr>
      <td><strong>Real-Time</strong></td>
      <td>High determinism, real-time behavior easily achieved</td>
      <td>Without RTOS, requires additional configuration or a separate core</td>
    </tr>
    <tr>
      <td><strong>Peripherals</strong></td>
      <td>GPIO, UART, SPI, I2C, ADC, DAC, PWM, timers, CAN, etc. — onboard</td>
      <td>Requires external controllers via USB, PCIe, I2C/SPI, etc.</td>
    </tr>
    <tr>
      <td><strong>UI/Graphics</strong></td>
      <td>Simple displays: segmented LCD, monochrome, TFT with SPI/I2C</td>
      <td>Color screens, GPU, HDMI, touch input</td>
    </tr>
    <tr>
      <td><strong>Performance (CPU)</strong></td>
      <td>Frequency up to ~200 MHz, mostly 32-bit cores (ARM Cortex-M, AVR, MSP430)</td>
      <td>Frequency 500 MHz – 2+ GHz, 32/64-bit (ARM Cortex-A, RISC-V, x86)</td>
    </tr>
    <tr>
      <td><strong>Multitasking / Multithreading</strong></td>
      <td>Limited by RTOS or entirely absent</td>
      <td>Full support for multitasking/multithreading (via OS)</td>
    </tr>
    <tr>
      <td><strong>Data Storage Support</strong></td>
      <td>EEPROM / built-in Flash</td>
      <td>External NAND/SD/eMMC connection</td>
    </tr>
    <tr>
      <td><strong>Application Scenarios</strong></td>
      <td>Sensors, IoT, smart meters, power management, home appliances, autopilots</td>
      <td>Industrial controllers, terminals, Edge AI, HMI, multimedia systems</td>
    </tr>
    <tr>
      <td><strong>Response Latency / Predictability</strong></td>
      <td>Minimal delays, ideal for time-critical tasks</td>
      <td>Non-deterministic response due to OS/DRAM/cache</td>
    </tr>
    <tr>
      <td><strong>Chip Examples</strong></td>
      <td>STM32F103, ATmega328, MSP430, nRF52</td>
      <td>i.MX6, Allwinner A33, Raspberry Pi CM4, Sitara AM335x, RK3566</td>
    </tr>
    <tr>
      <td><strong>Price Range (approx.)</strong></td>
      <td>$0.3 – $10</td>
      <td>$5 – $50+ (including external components)</td>
    </tr>
    <tr>
      <td><strong>Board / Component Size</strong></td>
      <td>Compact, single-sided assembly possible</td>
      <td>Requires more space, complex routing</td>
    </tr>
  </tbody>
</table>


## ==Архитектурные и системные аббревиатуры==

- **MPU (Memory Protection Unit)** — блок защиты памяти. Обеспечивает разграничение доступа к областям памяти (например, «только для чтения» или запрет доступа ядру/программам) для безопасности и стабильности.
    
- **DSP (Digital Signal Processor)** — процессор цифровой обработки сигналов. Специализированное ядро для быстрого выполнения операций с данными (Фурье-преобразования, фильтрация). _Пример:_ многие аудиокодеки и смартфоны имеют DSP-ядер.
    
- **SoC (System on Chip)** — система на кристалле. Полностью интегрированный чип, включающий CPU, память, периферийные контроллеры, и часто коммуникационные модули (например, Wi-Fi/Bluetooth). _Пример:_ Raspberry Pi (на базе Broadcom SoC), ESP32, современные смартфоны.
    
- **RTOS (Real-Time Operating System)** — операционная система реального времени. Гарантирует выполнение задач в заданные сроки. Используется там, где важно детерминированное поведение (управление роботом, авиационная электроника и т.п.). _Пример:_ FreeRTOS, Zephyr, RTIC (на Rust).
    
- **ISR (Interrupt Service Routine)** — обработчик прерывания. Специальная функция, которая вызывается при возникновении аппаратного прерывания (напр., таймер, UART) для быстрой обработки события.
    
- **NMI (Non-Maskable Interrupt)** — немаскируемое прерывание. Аппаратное прерывание, которое нельзя отключить программно (обычно используется для критических ошибок).
    
- **NVIC (Nested Vectored Interrupt Controller)** — контроллер вложенных векторов прерываний в Cortex-M. Управляет приоритетами прерываний и векторизацией обработчиков. _Пример:_ в Cortex-M все внешние прерывания обрабатываются через NVIC.
    
- **MMIO (Memory-Mapped I/O)** — память, отображённая под ввода-вывода. Метод, при котором **регистры периферийных устройств** доступны по адресам основной памяти. CPU читает/записывает их так же, как обычную память.
    
- **CPU (Central Processing Unit)** — центральный процессор.
    
- **FPU (Floating-Point Unit)** — модуль вычислений с плавающей точкой.
    
- **PL (Phase-Locked Loop)** — синхронизатор тактовой частоты.

Endianness
- Порядок байтов в памяти (little/big-endian) жестко задаётся ISA и аппаратурой; некоторые архитектуры би-ендийны, но переключение часто доступно только при старте .

## ==Rust Embedded-специфичные аббревиатуры==

- **PAC (Peripheral Access Crate)** — автогенерированный crate для доступа к регистрам МК. Предоставляет небезопасные low-level обертки над MMIO-регистрами конкретного контроллера. _Пример:_ `stm32f4::stm32f401::Peripherals` (PAC crate) дает доступ к `GPIOA`, `USART1` и др. через Rust-код.
    
- **HAL (Hardware Abstraction Layer)** — аппаратно-абстракционный слой. Надстраивается над PAC и предоставляет удобный безопасный API для периферии (GPIO, SPI, I²C, UART и т.д.). _Пример:_ `stm32f1xx_hal::serial::Serial` абстрагирует настройку UART через высокоуровневые функции.
    
- **BSP (Board Support Package/Crate)** — поддержка конкретной платы. Набор конфигураций и инициализаций для конкретного dev-board (pre-configured HAL/PAC для датчиков, кнопок, светодиодов на плате). _Пример:_ `microbit-v2` crate настраивает все GPIO платы micro:bit v2 (строки/столбцы светодиодов) за вас.
    
- **RTIC (Real-Time Interrupt-driven Concurrency)** — фреймворк на Rust для написания embedded-приложений с расписанием на основе прерываний . Ранее назывался RTFM. _Пример:_ приложение на RTIC описывает задачи через `#[app(device = ...)]` и гарантирует детерминированный приоритет исполнения задач.
    
- **defmt** — библиотека логирования для embedded. Обеспечивает компактное (деферированное) форматирование сообщений для низких ресурсов (Economy of flash/RAM). _Пример:_ `defmt::info!("x = {}", x);` отправит сообщение по RTT/ITM с минимальным профилем памяти.
    
- **RTT (Real-Time Transfer)** — метод передачи отладочных сообщений «на лету». Позволяет MCU отправлять логи и получать команды через SWD-интерфейс без UART/USB. _Пример:_ с помощью RTT можно выводить `iprintln!` (из `rtt-target`) прямо в отладочную консоль компьютера.
    
- **no_std** — атрибут Rust, означающий отсутствие стандартной библиотеки. Указывает на отсутствие `std`, сборка идет с ядром `core` . Используется в «бездрайверной» встраиваемой среде, где нет ОС. _Пример:_ `#![no_std]` в начале `main.rs` на bare-metal STM32.
    
- **cortex-m** — crate для поддержки архитектуры ARM Cortex-M. Содержит низкоуровневые функции (WFI, контекст прерываний, стеки). _Пример:_ `cortex_m::asm::wfi()` переводит ядро в режим ожидания прерывания.
    
- **embassy** — современный асинхронный фреймворк Embedded Rust на основе `async/await` . Позволяет писать драйверы и приложения в стиле async для контроллеров. _Пример:_ `embassy-executor` обрабатывает асинхронные задачи для микроконтроллера.
    
- **embedded-hal** — стандартная библиотека с `trait`-ами для общих периферий (GPIO, SPI, I²C, ADC, PWM, таймеры и др.). Обеспечивает независимость кода от конкретного МК. _Пример:_ драйвер датчика может требовать объект с `embedded_hal::blocking::i2c::WriteRead`.
    
- **probe-rs** — утилита и библиотека для отладки и прошивки микроконтроллеров. Работает как альтернатива OpenOCD (поддерживает SWD/JTAG). _Пример:_ `probe-rs-cli` позволяет прошивать бинарник и читать память через USB-отладчик.
    
- **cargo-embed** — расширение Cargo для быстрой загрузки прошивок и взаимодействия с отладчиком. Объединяет сборку, прошивку по probe-rs, вывод логов по RTT и подключение GDB. _Пример:_ `cargo embed --chip STM32F103` загрузит программу на плату и запустит вывод в консоли.

## ==Сетевые протоколы и технологии==

- **MQTT (Message Queuing Telemetry Transport)** — лёгковесный протокол обмена сообщениями по схеме «издатель-подписчик». Широко используется в IoT для связи устройств через брокер (напр., датчик публикует данные, клиент подписывается). _Пример:_ на Rust есть `rumqttc` для работы с MQTT-брокером.
    
- **TCP (Transmission Control Protocol)** — надёжный транспортный протокол Интернета. Обеспечивает установление соединения, проверку доставки и упорядочивание байтов. _Пример:_ Rust-библиотека `std::net::TcpStream` для обмена данными по TCP (хотя в `no_std` можно использовать `smoltcp`).
    
- **UDP (User Datagram Protocol)** — простой протокол без установления соединения. Отправляет датаграммы без гарантии доставки или порядка , но с меньшей задержкой. _Пример:_ полезен для передачи телеметрии IoT, стриминга (где потеря пакетов допустима). В embedded Rust есть `smoltcp` с реализацией UDP.
    
- **HTTP (HyperText Transfer Protocol)** — прикладной протокол для передачи гипертекстовых данных (WWW). Часто используется поверх TCP между клиентом и сервером. _Пример:_ `esp-idf-svc` на ESP32 включает HTTP клиент/сервер. Лёгковесный вариант для IoT – **CoAP**.
    
- **CoAP (Constrained Application Protocol)** — «сокращённый HTTP» для устройств с ограниченными ресурсами 

- **LoRa (Long Range)** — беспроводная технология дальнобойной связи для IoT. Модули LoRa обеспечивают передачу на километры при очень малом энергопотреблении. **LoRaWAN (Long Range Wide Area Network)** — сетевой протокол LPWAN поверх LoRa. _Пример:_ датчики на батарейках в лесу передают показания по LoRaWAN через gateway в интернет.
    
- **ZigBee** — беспроводной протокол для энергосберегающих сетей (mesh-сети) Базируется на IEEE 802.15.4 и часто используется в домашней автоматизации (сенсоры, освещение). _Пример:_ модули XBee на базе ZigBee могут передавать данные с датчиков в локальную сеть.












as an
MCU but the amount of DRAM and **NVM** you can connect to the processor is in the range of hundreds of
Mbytes and even Gbytes for **NAND**.

Processing power, measured in terms of Dhrystone MIPS (**DMIPS**)., Running a full operating system (OS), such as Linux, Android or Windows
CE, for your application would demand at least 300 – 400 DMIPS
For a UI library such as Qt,
which is widely used on top of Linux, an overhead of 80 – 100 DMIPS might suffice.


Using an **RTOS** also
has the benefit that it requires little memory space; a kernel of just a few kB being typical. Unfortunately,
a full OS demands a memory management unit (MMU) in order to run; this in turn specifies the type of
processor core to be used and require more processor capability.




The TFT LCD controller. So, while possible to achieve with an MCU, the developer needs to look at the overall BOM.
For example, the QVGA 320 x 240 16-colour format requires 150 kB of SRAM to feed and refresh the display.




But high speed communication peripherals such as HS USB 2.0, multiple 10/100 Ethernet ports or Gigabit Ethernet port are generally only found on MPU because they are better capable to handle and process large amounts of data.