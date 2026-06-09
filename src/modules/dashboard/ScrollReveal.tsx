/**
 * ScrollReveal — animates children in when they enter the viewport.
 * Respects prefers-reduced-motion via useReducedMotion.
 */
import { type ReactNode, useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { fadeUp } from "./animations";

interface Props {
  children: ReactNode;
  className?: string;
  /** Extra delay in seconds before this element animates. Default 0. */
  delay?: number;
}

export function ScrollReveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -32px 0px" });
  const reduced = useReducedMotion();

  const variants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : fadeUp;

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}
