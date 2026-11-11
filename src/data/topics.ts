/**
 * The topics the writing is filed under.
 *
 * The index used to group the posts by year. A year answers "when", and it is
 * the one question about a body of writing that the reader usually does not
 * have: nobody opens an archive to find out what happened in 2025 when the
 * archive is about one continuous argument. Fifty-three tags were the other
 * answer, and they were worse — `basic` and `basic_electronics` are the same
 * subject with two spellings, and twenty-nine of the tags carry a single post.
 *
 * So the topics are hand-assigned: five subjects, each one a thread the
 * author actually returned to, and every post in exactly one of them. The
 * assignment is data rather than a guess made at render time, so a post's
 * topic does not change when a tag is added or a date moves.
 *
 * A post that is not listed here has no topic. It is still published and still
 * reachable; it simply has no subject line. `unassigned()` reports them, and
 * the build warns about them, so a new post cannot be published without a
 * decision about where it belongs.
 */

export interface Topic {
  /** Stable id: the key in the map, and the value a filter carries. */
  id: string;
  /** The name as it appears on a card and on a chip. */
  label: string;
  /** The shorter name, for the chips when the label does not fit. */
  short: string;
  /** One line: what this thread is. */
  desc: string;
  /** The post ids in this topic, oldest first. */
  posts: string[];
}

export const TOPICS: Topic[] = [
  {
    id: 'agent-runtime',
    label: 'Agent runtime & security',
    short: 'Agent runtime',
    desc: 'The argument that an agent is two systems joined by a seam, and that the seam needs its own authority, budget and evidence.',
    posts: [
      '2026-04-07-the-ai-pipeline-is-not-optional',
      '2026-06-01-the-seam-between-model-and-execution',
      '2026-06-07-intercept-tool-calls-before-execution',
      '2026-06-13-permissions-are-categories-authorizations-are-instances',
      '2026-06-19-choosing-an-agent-runtime-security-layer',
      '2026-06-26-agent-budget-is-a-permission-not-a-limit',
      '2026-07-02-budget-enforcement-per-llm-call',
      '2026-07-08-atomic-budget-reservation-redis-lua',
      '2026-07-14-agent-loops-need-an-external-stopping-boundary',
      '2026-07-20-fail-closed-is-not-a-single-switch',
      '2026-07-26-how-hitl-approvals-get-bypassed',
      '2026-08-01-human-approval-is-not-authorization',
      '2026-08-08-approval-is-security-state-not-session-state',
      '2026-08-14-material-fields-and-canonicalization',
      '2026-08-20-reducing-hitl-approval-fatigue',
      '2026-08-26-scope-agent-permissions-to-the-credential',
      '2026-09-01-mcp-tool-identity-not-tool-name',
      '2026-09-07-authority-and-evidence-have-separate-lifecycles',
      '2026-09-13-authority-over-its-own-authority',
      '2026-09-19-operator-control-must-be-external-state',
      '2026-09-25-audit-trail-for-ai-agent-tool-calls',
      '2026-10-01-testing-agent-policies-against-adversarial-inputs',
      '2026-10-07-four-valid-permissions-one-unacceptable-chain',
      '2026-10-10-unknown-outcome-is-not-a-failure-state',
    ],
  },
  {
    id: 'embedded',
    label: 'Embedded Rust & firmware',
    short: 'Embedded',
    desc: 'Twenty-six posts on embedded Rust: firmware, peripherals, and the edge inference built on top of them.',
    posts: [
      '2025-05-29-critical-compression-of-embedded-firmware-understanding-cargo-size-and-linker-strategies-in-rust',
      '2025-06-05-from-rust-source-to-embedded-executable-a-deep-dive-into-the-compilation-process-for-embedded-systems',
      '2025-06-12-gpio-general-purpose-input-output',
      '2025-06-16-building-trustworthy-embedded-systems-with-rust',
      '2025-06-24-rp2040-pico-w-lab',
      '2025-06-25-embedded-crates-ecosystem',
      '2025-06-28-serial-protocols',
      '2025-06-30-i2c-inter-integrated-circuit',
      '2025-06-30-spi-serial-peripheral-interface',
      '2025-06-30-uart-universal-asynchronous-receiver-transmitter',
      '2025-07-01-debugging-firmware',
      '2025-07-02-cpu-peripheral-i-o-communication-approaches-and-trade-offs',
      '2025-07-02-mmio-memory-mapped-i-o',
      '2025-07-11-basic-embedded-rust-flow-cortex-m',
      '2025-07-11-mcu-peripherals',
      '2025-07-11-mcu-registers',
      '2025-07-13-pwm-pulse-width-modulation',
      '2025-07-14-timers',
      '2025-07-15-interrupts-isr-ivt-nvic',
      '2025-07-15-mcu-clock-system',
      '2025-07-16-mcu-synchronization',
      '2025-07-24-nrf52833-bbc-micro-bit',
      '2025-12-02-why-overspecialization-is-over-and-how-i-decided-to-create-my-own-ai-device-on-mcu',
      '2025-12-05-hardware-and-firmware-organization-the-foundation-of-an-ai-device-on-the-esp32-s3',
      '2025-12-26-tinyml-on-mcu-from-dataset-to-real-time-inference-in-rust-firmware',
      '2026-01-07-from-device-to-system-communication-backend-and-dashboard-for-an-embedded-ai-product',
    ],
  },
  {
    id: 'systems',
    label: 'Systems & tooling',
    short: 'Systems',
    desc: 'What is under the application: the compiler, the memory model, the web server, the toolchain.',
    posts: [
      '2023-06-26-html-scraper',
      '2023-07-05-android-emulator-launcher',
      '2024-10-05-wasm-based-application-tax-calculator',
      '2024-10-19-actix-web-server',
      '2024-12-10-std-web-server',
      '2025-01-15-rust-toolchain-a-complete-guide-to-managing-and-configuring-your-rust-environment',
      '2025-01-26-actix-web-ai-agent',
      '2025-05-27-from-rust-source-code-to-optimized-executable-inside-the-rust-compiler-pipeline',
      '2025-06-09-understanding-memory-management-in-rust-from-dynamically-sized-types-to-fat-pointers',
    ],
  },
  {
    id: 'making',
    label: 'Making & side quests',
    short: 'Making',
    desc: 'The things built because they were interesting: a shooter, a Solana program, a cross-stitch generator, a pomodoro timer.',
    posts: [
      '2024-09-15-exploring-c-game-development-with-unreal-engine-5',
      '2024-10-07-tui-pomodoro-app',
      '2024-10-11-tui-inventory-app',
      '2025-03-04-simple-solana-counter-program',
      '2025-03-07-game-on-solana-guess-the-number',
      '2025-03-19-anchor-cpi-cross-program-invocation-on-solana',
      '2025-04-09-on-chain-key-value-storage',
      '2025-11-30-from-image-to-pattern-building-a-cross-stitch-generator-as-a-cli-tool',
    ],
  },
  {
    id: 'silicon',
    label: 'Silicon & hardware',
    short: 'Silicon',
    desc: 'Two long reads on what the hardware is actually made of, written around the firmware series for the same reason.',
    posts: [
      '2025-05-28-diving-into-the-world-of-semiconductors-from-atoms-to-crystals',
      '2025-06-01-the-aesthetics-of-semiconductor-destruction-understanding-the-pn-junction',
    ],
  },
];

/** Post id to topic id. */
const BY_POST = new Map<string, string>();
for (const topic of TOPICS) {
  for (const id of topic.posts) BY_POST.set(id, topic.id);
}

/** The topic a post belongs to, or null when it has not been filed. */
export function topicFor(postId: string): Topic | null {
  const id = BY_POST.get(postId);
  if (!id) return null;
  return TOPICS.find((t) => t.id === id) ?? null;
}

/** The post ids that no topic claims. */
export function unassigned(postIds: string[]): string[] {
  return postIds.filter((id) => !BY_POST.has(id));
}

/** How many posts a topic holds, for the chip counters. */
export function topicCount(id: string): number {
  return TOPICS.find((t) => t.id === id)?.posts.length ?? 0;
}
