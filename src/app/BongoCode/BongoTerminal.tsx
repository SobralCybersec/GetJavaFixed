import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import bongoMarkup from "./bongo.html?raw";

const TYPING_STEPS = [
  { id: "f1-l1", from: "M0,1L0,1", to: "M0,1L160,1", start: 0, end: 0.14 },
  { id: "f1-l2", from: "M8,13L8,13", to: "M8,13L124,13", start: 0.14, end: 0.24 },
  { id: "f1-l3", from: "M8,25L8,25", to: "M8,25L61,25", start: 0.24, end: 0.3 },
  { id: "f2-l4", from: "M0,1L0,1", to: "M0,1L136,1", start: 0.3, end: 0.44 },
  { id: "f2-l5", from: "M8,13L8,13", to: "M8,13L114,13", start: 0.44, end: 0.54 },
  { id: "f2-l6", from: "M8,25L8,25", to: "M8,25L69,25", start: 0.54, end: 0.6 },
  { id: "f3-l7", from: "M0,1L0,1", to: "M0,1L96,1", start: 0.6, end: 0.68 },
  { id: "f3-l8", from: "M8,13L8,13", to: "M8,13L146,13", start: 0.68, end: 0.82 },
  { id: "f3-l9", from: "M8,25L8,25", to: "M8,25L96,25", start: 0.82, end: 0.92 },
] as const;

const BONGO_STYLES = `
  .bongo-terminal-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .bongo-terminal-root .content,
  .bongo-terminal-root .container {
    position: absolute;
    inset: 0;
  }

  .bongo-terminal-root #bongo-cat {
    position: absolute;
    left: 50%;
    top: 56%;
    width: min(240px, 94%);
    height: auto;
    transform: translate(-50%, -50%);
  }

  .bongo-terminal-root #paw-right--down,
  .bongo-terminal-root #paw-left--up,
  .bongo-terminal-root #paw-right--up,
  .bongo-terminal-root #paw-left--down {
    transform-box: fill-box;
    transform-origin: center;
  }

  .bongo-terminal-root #paw-right--down,
  .bongo-terminal-root #paw-left--up {
    animation: bongo-paw-blink 300ms infinite;
  }

  .bongo-terminal-root #paw-right--up,
  .bongo-terminal-root #paw-left--down {
    animation: bongo-paw-blink 300ms infinite;
    animation-delay: 150ms;
  }

  .bongo-terminal-root #laptop__code {
    transform-box: fill-box;
    transform-origin: center;
    transform: rotateX(-37deg) rotateY(-46deg) rotateZ(-23deg) translateX(8px) translateY(20px) translateZ(-50px);
  }

  @keyframes bongo-paw-blink {
    0%, 49% { opacity: 0; }
    50%, 100% { opacity: 1; }
  }
`;

const COMPILED_BONGO = compilePugLikeMarkup(bongoMarkup);

export function BongoTerminal({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const svg = host.querySelector("svg");
    if (!svg) return;

    for (const step of TYPING_STEPS) {
      const path = svg.querySelector(`#${step.id}`);
      if (!(path instanceof SVGPathElement)) continue;
      if (path.querySelector("animate[attributeName='d']")) continue;

      const animation = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animation.setAttribute("attributeName", "d");
      animation.setAttribute("dur", "1200ms");
      animation.setAttribute("repeatCount", "indefinite");
      animation.setAttribute(
        "values",
        `${step.from};${step.from};${step.to};${step.to}`,
      );
      animation.setAttribute(
        "keyTimes",
        `0;${step.start.toFixed(2)};${step.end.toFixed(2)};1`,
      );
      path.appendChild(animation);
    }
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <style>{BONGO_STYLES}</style>
      <div
        ref={hostRef}
        className="bongo-terminal-root h-full w-full"
        dangerouslySetInnerHTML={{ __html: COMPILED_BONGO }}
      />
    </div>
  );
}

function compilePugLikeMarkup(source: string): string {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line) => line.trim().length > 0);

  const stack: Array<{ indent: number; tag: string }> = [];
  let output = "";

  for (const line of lines) {
    const indent = line.match(/^ */)?.[0].length ?? 0;
    const content = line.trim();
    if (!content) continue;

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      const node = stack.pop();
      if (node) output += `</${node.tag}>`;
    }

    const { tag, id, classNames, attributes } = parsePugLikeNode(content);
    const attrs = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
    const classAttr = classNames.length > 0 ? ` class="${classNames.join(" ")}"` : "";
    const idAttr = id ? ` id="${id}"` : "";

    output += `<${tag}${idAttr}${classAttr}${attrs}>`;
    stack.push({ indent, tag });
  }

  while (stack.length > 0) {
    const node = stack.pop();
    if (node) output += `</${node.tag}>`;
  }

  return output;
}

function parsePugLikeNode(line: string): {
  tag: string;
  id: string | null;
  classNames: string[];
  attributes: string[];
} {
  const attrStart = line.indexOf("(");
  const selector = attrStart === -1 ? line : line.slice(0, attrStart).trim();
  const attrSource = attrStart === -1 ? "" : line.slice(attrStart + 1, line.lastIndexOf(")"));

  let tag = "div";
  let remainder = selector;
  let id: string | null = null;
  const classNames: string[] = [];

  if (remainder && remainder[0] !== "." && remainder[0] !== "#") {
    const match = remainder.match(/^[^.#]+/);
    if (match) {
      tag = match[0];
      remainder = remainder.slice(match[0].length);
    }
  }

  while (remainder.length > 0) {
    if (remainder[0] === "#") {
      const match = remainder.match(/^#([A-Za-z0-9:_-]+)/);
      if (!match) break;
      id = match[1];
      remainder = remainder.slice(match[0].length);
      continue;
    }

    if (remainder[0] === ".") {
      const match = remainder.match(/^\.(?:[A-Za-z0-9:_-]+)/);
      if (!match) break;
      classNames.push(match[0].slice(1));
      remainder = remainder.slice(match[0].length);
      continue;
    }

    break;
  }

  return {
    tag,
    id,
    classNames,
    attributes: splitAttributes(attrSource),
  };
}

function splitAttributes(source: string): string[] {
  if (!source.trim()) return [];

  const parts: string[] = [];
  let current = "";
  let inQuote = false;

  for (const char of source) {
    if (char === "'") {
      inQuote = !inQuote;
      current += char;
      continue;
    }

    if (char === "," && !inQuote) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
