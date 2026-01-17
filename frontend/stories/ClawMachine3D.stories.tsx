import type { Meta, StoryObj } from "@storybook/react";

import ClawMachine3D from "@/components/game/ClawMachine3D";

const meta: Meta<typeof ClawMachine3D> = {
  title: "Game/ClawMachine3D",
  component: ClawMachine3D,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    gameName: "GASHAPON",
    costDisplay: "1.25 TOKENS",
    isConnected: true,
    isActive: true,
    onPlay: () => undefined,
    onPlayAgain: () => undefined,
    onViewCollection: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof ClawMachine3D>;

export const Intro: Story = {
  args: {
    debugStage: "intro",
    showIntro: true,
    animationStarted: false,
    isPlaying: false,
  },
};

export const Loading: Story = {
  args: {
    debugStage: "loading",
    showIntro: true,
    animationStarted: false,
    isPlaying: true,
    loadingMessage: "Confirm the transaction in your wallet...",
  },
};

export const Playing: Story = {
  args: {
    debugStage: "playing",
    animationStarted: true,
    gameOutcome: null,
    showResult: false,
  },
};

export const WinReveal: Story = {
  args: {
    debugStage: "none",
    showResult: true,
    gameOutcome: "win",
    debugWinFlowStep: "reveal",
    enableRevealControls: true,
  },
};

export const WinChoice: Story = {
  args: {
    debugStage: "none",
    showResult: true,
    gameOutcome: "win",
    debugWinFlowStep: "choice",
    prizeName: "Mystery Capsule",
    prizeImageUrl: "/images/hero-claw-machine.png",
  },
};

export const WinRedeem: Story = {
  args: {
    debugStage: "none",
    showResult: true,
    gameOutcome: "win",
    debugWinFlowStep: "redeem",
    prizeName: "Mystery Capsule",
    prizeImageUrl: "/images/hero-claw-machine.png",
    prizeMint: "So11111111111111111111111111111111111111112",
    userWallet: "7n2tQ2rYw94h5uXf5C7zZzZzZzZzZzZzZzZzZzZzZzZ",
  },
};

export const WinSaved: Story = {
  args: {
    debugStage: "none",
    showResult: true,
    gameOutcome: "win",
    debugWinFlowStep: "saved",
    prizeName: "Mystery Capsule",
  },
};

export const Lose: Story = {
  args: {
    debugStage: "none",
    showResult: true,
    gameOutcome: "lose",
  },
};
