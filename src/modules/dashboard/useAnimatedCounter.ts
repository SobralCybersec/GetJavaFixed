/**
 * useAnimatedCounter — count-up hook using motion spring + useInView.
 *
 * Usage:
 *   const { ref, display } = useAnimatedCounter(analytics.totalFindings);
 *   <span ref={ref}>{display}</span>
 */
import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring, useTransform } from "motion/react";

interface Options {
  /** Decimal places in the output string. Default 0. */
  decimals?: number;
  /** Spring stiffness. Default 60. */
  stiffness?: number;
  /** Spring damping. Default 18. */
  damping?: number;
}

export function useAnimatedCounter(
  target: number,
  { decimals = 0, stiffness = 60, damping = 18 }: Options = {},
) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness, damping });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  const [displayStr, setDisplayStr] = useState(target.toFixed(decimals));

  useEffect(() => {
    if (!isInView) return;
    motionValue.set(target);
  }, [isInView, target, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayStr(v));
    return unsubscribe;
  }, [display]);

  return { ref, display: displayStr };
}
