/**
 * Shared animation variants and helpers for dashboard components.
 * Uses motion/react (Framer Motion v12) — already in package.json.
 *
 * Standard easing: spring-like cubic-bezier [0.16, 1, 0.3, 1]
 * Reduced-motion: all variants collapse to opacity-only, duration 0.15s
 */
import type { Variants } from "motion/react";

// ── Easing ──────────────────────────────────────────────────────────────────
export const ease = [0.16, 1, 0.3, 1] as const;

// ── Entrance variants ────────────────────────────────────────────────────────

/** Single item fade + slide up */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};

/** Stagger container — wraps a list of fadeUp children */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

/** Faster stagger for denser lists (findings queue rows) */
export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

/** Scale in from center — for KPI cards, donut chart */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease },
  },
};

/** Slide in from left — for sidebar-style panels */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease },
  },
};

/** Tab content fade when switching tabs */
export const tabFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

// ── Interactive variants ────────────────────────────────────────────────────

/** Lift on hover — for clickable finding rows */
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.18, ease } },
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
};

/** Glow border pulse — for KPI cards on hover */
export const hoverGlow = {
  whileHover: { scale: 1.015, transition: { duration: 0.2, ease } },
};
