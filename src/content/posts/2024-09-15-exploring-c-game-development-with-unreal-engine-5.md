---
title: "Exploring C++ Game Development with Unreal Engine 5"
date: "2024-09-15"
description: "Three C++ games built in Unreal Engine 5 - Dungeon Raider, Toon Tanks and ISSRiot - and what they taught me about level design."
tags: ["cpp", "gamedev", "project"]
---
Three C++ games built inside Unreal Engine 5, and what they taught me about level design.

## My journey into Unreal Engine

I get genuinely excited when I can make a computer do something I can touch, see and interact with. That is what pulled me toward game development.

I started without a clear roadmap for making pixels move on command, so I took a few popular online courses. They gave me enough to build three full games, each with its own mechanics and level design.

Every project begins with an idea, and from there I pick textures, materials and assets, testing many options to find the right fit. Scene creation, lighting control, sound design, post-processing effects, landscapes and level layouts all give me room to experiment.

After weeks of documentation, tutorials and AI-assisted learning, I understood how C++ code talks to the engine and to the objects inside the game.

Past the point of following tutorials, small parameter tweaks started producing new enemy behaviors, obstacles and dynamic playgrounds.

Behavior trees are what bring the characters to life. Designing state machines, transitions and animations is what makes the worlds feel reactive.

## Featured projects

### Dungeon Raider

A project that expanded my understanding of puzzle mechanics and physics interactions.

- Genre: Puzzle-Grabber
- Medieval dungeon assets for the level design
- Custom C++ components:
  - *Grabber* using PhysicsHandleComponent
  - *Mover* leveraging UnrealMathUtility
  - *Trigger* based on BoxComponent

<video controls preload="none" poster="/media/posters/dungeon-raider-preview.jpg" width="720">
<source src="/media/dungeon-raider-preview.webm" type="video/webm" />
</video>

[ArtStation](https://www.artstation.com/artwork/kNE3e2) | [GitHub Repository](https://github.com/maltsev-dev/unrealProjects/tree/main/src/grabber)

### Toon Tanks

A compact project packed with the fundamental gameplay features and engine techniques:

- Enhanced Input handling
- Projectile spawning and damage application
- Timers and UI widget integration
- Game mode logic
- Sound and camera configuration

<video controls preload="none" poster="/media/posters/toon-tanks-preview.jpg" width="720">
<source src="/media/toon-tanks-preview.webm" type="video/webm" />
</video>

[ArtStation](https://www.artstation.com/artwork/kND2Z0) | [GitHub Repository](https://github.com/maltsev-dev/unrealProjects/tree/main/src/toontanks)

### ISSRiot

A sci-fi shooter that went deep into the more complex Unreal features:

- Advanced behavior trees and services
- Detailed character animation workflows
- Complex animation state machines
- SoundCue implementation
- Advanced line tracing techniques
- HUD design and game condition management

<video controls preload="none" poster="/media/posters/cssriot-preview.jpg" width="720">
<source src="/media/cssriot-preview.webm" type="video/webm" />
</video>

[ArtStation](https://www.artstation.com/artwork/RK3LXm) | [GitHub Repository](https://github.com/maltsev-dev/unrealProjects/tree/main/src/simpleShooter)

## License

This project collection is licensed under the MIT License.
