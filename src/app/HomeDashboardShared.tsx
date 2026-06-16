import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { HugeiconsIcon } from "@hugeicons/react";

export type HomeDashboardEntry = {
  path: string;
  title: string;
  subtitle: string;
  stamp: string;
};

export type HomeDashboardFileEntry = {
  path: string;
  title: string;
  subtitle: string;
};

export type HomeDashboardAgentStatus = {
  title: string;
  status: string;
  body: string;
  active?: boolean;
};

export function ViewHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--dash-border-soft)] pb-2">
      <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-[var(--dash-primary)]">
        {title}
      </span>
      <div className="flex gap-1">
        <span className="h-2 w-2 bg-[var(--dash-primary)]" />
        <span className="h-2 w-2 bg-[var(--dash-primary-soft)]" />
        <span className="h-2 w-2 border border-[var(--dash-border)]" />
      </div>
    </div>
  );
}

export function ActionCard({
  icon,
  title,
  description,
  onClick,
  className,
  disabled,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-auto justify-start gap-4 rounded-none border-[var(--dash-border)] bg-[var(--dash-panel)] px-4 py-4 text-left hover:border-[var(--dash-primary)] hover:bg-[var(--dash-panel-strong)]",
        className,
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--dash-border-soft)] bg-[var(--dash-panel-strong)]">
        <HugeiconsIcon
          icon={icon}
          size={20}
          strokeWidth={1.7}
          className="text-[var(--dash-primary)]"
        />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--dash-text)]">
          {title}
        </div>
        <div className="mt-1 whitespace-normal font-mono text-[10px] text-[var(--dash-muted)]">
          {description}
        </div>
      </div>
    </Button>
  );
}

export function AgentCard({
  title,
  status,
  body,
  className,
  active,
}: {
  title: string;
  status: string;
  body: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-3",
        active
          ? "border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)]"
          : "border-[var(--dash-border)] bg-[var(--dash-panel)]",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
          {title}
        </span>
        <span
          className={cn(
            "border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
            active
              ? "border-[var(--dash-primary)] bg-[var(--dash-primary)] text-[var(--background)]"
              : "border-[var(--dash-border)] text-[var(--dash-muted)]",
          )}
        >
          {status}
        </span>
      </div>
      <div className="font-mono text-[10px] text-[var(--dash-muted)]">{body}</div>
    </div>
  );
}

export function InfoBlock({
  label,
  value,
  tone = "primary",
  className,
}: {
  label: string;
  value: string;
  tone?: "primary" | "cyan";
  className?: string;
}) {
  return (
    <div className={cn("border border-[var(--dash-border)] bg-[var(--dash-panel)] px-3 py-3", className)}>
      <div
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.16em]",
          tone === "primary" ? "text-[var(--dash-primary)]" : "text-[var(--dash-accent)]",
        )}
      >
        {label}
      </div>
      <div className="mt-2 truncate font-mono text-[12px] font-bold text-[var(--dash-text)]">
        {value}
      </div>
    </div>
  );
}

export function UtilityButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dash-text)] transition-colors hover:border-[var(--dash-primary)] hover:text-[var(--dash-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--dash-border)] disabled:hover:text-[var(--dash-text)]"
    >
      {children}
    </button>
  );
}

export function NewsBadge({
  text,
  tone,
}: {
  text: string;
  tone: "primary" | "cyan" | "muted";
}) {
  const classes =
    tone === "primary"
      ? "border-[var(--dash-primary-soft)] text-[var(--dash-primary)]"
      : tone === "cyan"
        ? "border-[var(--dash-accent-soft)] text-[var(--dash-accent)]"
        : "border-[var(--dash-border)] text-[var(--dash-muted)]";
  return (
    <span
      className={cn(
        "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
        classes,
      )}
    >
      {text}
    </span>
  );
}

export function EmptyStrip({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[var(--dash-border)] bg-[var(--dash-panel)] px-3 py-4 font-mono text-[11px] text-[var(--dash-muted)]">
      {children}
    </div>
  );
}

export function WorkflowWireframeScene({
  primaryColor,
  accentColor,
  backgroundColor,
}: {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
}) {
  const reducedMotion = useReducedMotion();
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3.1;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(backgroundColor, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 1),
      new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.62,
        wireframe: true,
      }),
    );
    scene.add(outer);

    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.58, 0),
      new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.42,
        wireframe: true,
      }),
    );
    scene.add(inner);

    const timer = new THREE.Timer();
    timer.connect(document);

    const handleResize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer?.setSize(width, height, false);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      window.cancelAnimationFrame(frameId);
    };

    renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false);

    handleResize();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(mount);
    window.addEventListener("resize", handleResize);

    let frameId = 0;

    const renderFrame = (timestamp: number) => {
      if (!renderer) return;
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      const delta = timer.getDelta();

      outer.rotation.x += delta * 0.22;
      outer.rotation.y += delta * 0.4;
      inner.rotation.x -= delta * 0.32;
      inner.rotation.z += delta * 0.26;
      outer.position.y = Math.sin(elapsed * 0.8) * 0.05;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      frameId = window.requestAnimationFrame(renderFrame);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      renderer?.domElement.removeEventListener("webglcontextlost", handleContextLost);
      timer.disconnect();
      timer.dispose();
      outer.geometry.dispose();
      (outer.material as THREE.Material).dispose();
      inner.geometry.dispose();
      (inner.material as THREE.Material).dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [accentColor, backgroundColor, primaryColor, reducedMotion]);

  return <div ref={mountRef} className="h-full w-full" />;
}

export type DashboardButtonProps = ComponentProps<"button">;
