// ─────────────────────────────────────────────────────────────────────────────
// Onboarding tours — Seller (UI en inglés)
// Anclas: atributos data-tour en los componentes (NUNCA clases Tailwind).
// Steps sin `element` = popover centrado (explican pasos aún no renderizados).
// ─────────────────────────────────────────────────────────────────────────────

import type { DriveStep } from 'driver.js';

export const SELL_DASHBOARD_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to your Seller Hub',
      description: "A 30-second tour of the essentials. Press ESC anytime to skip — you can replay it from the '?' button in the top bar.",
    },
  },
  {
    element: '[data-tour="sell-stats"]',
    popover: {
      title: 'Your money at a glance',
      description: 'Pending Payout is what we owe you. Total Earned is what already hit your wallet.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="sell-cta"]',
    popover: {
      title: 'Start here',
      description: 'The main action: publish a batch of gift cards for sale.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="sell-recent-batches"]',
    popover: {
      title: 'Track your batches',
      description: 'Every batch moves: Pending → Confirmed → Paid. With your wallet set up in Account, payouts are automatic.',
      side: 'top',
    },
  },
];

export const SELL_BATCHES_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Your batch history',
      description: "Every batch you have published lives here. Let's see how to read it — replay this tour anytime from the '?' button in the top bar.",
    },
  },
  {
    element: '[data-tour="batches-filters"]',
    popover: {
      title: 'Find any batch fast',
      description: 'Search by claim code or batch number, filter by status, or sort by date.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="batch-card"]',
    // Empty history → this step (and the details one) is skipped automatically.
    skipMissingElement: true,
    onHighlightStarted: () => {
      // Expand the first card so the next step can show its inside. Idempotent:
      // if it's already expanded (back navigation), don't toggle it closed.
      if (document.querySelector('[data-tour="batch-details"]')) return;
      (document.querySelector('[data-tour="batch-card"] [id^="registry-card-"]') as HTMLElement | null)?.click();
    },
    popover: {
      title: 'Reading a batch',
      description: 'Brand and totals up top; status and progress bar below. The colors tell the story: amber = processing, blue = fully confirmed, green = paid, red = cancelled. We just expanded it for you.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="batch-details"]',
    skipMissingElement: true,
    // The expansion renders async — driver observes the DOM until it appears.
    waitForElement: 4000,
    popover: {
      title: 'Inside the batch',
      description: 'Every card with its individual status. Cards reported with issues (wrong amount, invalid...) are flagged here and deducted from the payout.',
      side: 'top',
    },
  },
  {
    popover: {
      title: 'Getting paid',
      description: "Once every card in a batch is confirmed, the batch becomes payable and the payout is released to your wallet. Watch for the Paid status — that's money in your account.",
    },
    onHighlightStarted: () => {
      // Collapse the card back so the full list is restored as the tour ends.
      if (!document.querySelector('[data-tour="batch-details"]')) return;
      (document.querySelector('[data-tour="batch-card"] [id^="registry-card-"]') as HTMLElement | null)?.click();
    },
  },
];

export const SELL_WIZARD_STEPS: DriveStep[] = [  {
    element: '[data-tour="sell-progress"]',
    popover: {
      title: 'Only 3 steps',
      description: 'Config → Load → Review. Your batch is live at the end.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="sell-config"]',
    popover: {
      title: 'Step 1 — Country & brand',
      description: 'Pick a country first, then a brand. Your sell rate for that combination loads automatically.',
      side: 'top',
    },
  },
  {
    popover: {
      title: 'Step 2 — Load your codes',
      description: 'Paste one code per line: CODE AMOUNT [PIN]. Or upload a screenshot and AI extracts the codes for you (OCR).',
    },
  },
  {
    popover: {
      title: 'Step 3 — Review & publish',
      description: 'Verify the totals and publish. Duplicate codes are rejected automatically — a code can only exist once on the platform.',
    },
  },
];
