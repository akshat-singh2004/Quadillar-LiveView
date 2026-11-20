"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveProject } from "@/context/ProjectContext";
import type { UiActionPlan } from "@/lib/agents/uiActionPlanner";

function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function QuadmaxAutonomousOperator() {
  const router = useRouter();
  const { selectProject } = useActiveProject();

  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 320, y: 240 });
  const [cursorActionLabel, setCursorActionLabel] = useState<string>("");
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runPlan = async (plan: UiActionPlan) => {
      if (!plan?.steps?.length) return;
      setCursorVisible(true);

      for (const step of plan.steps) {
        if (cancelled) break;
        setCursorActionLabel(step.label);

        if (step.kind === "SELECT_SITE" && step.projectId) {
          setCursorPos({ x: 240, y: 28 });
          await sleep(step.delayMs || 500);
          selectProject(step.projectId);
          window.dispatchEvent(
            new CustomEvent("quadillar-project-change", { detail: step.projectId })
          );
          await sleep(400);
          continue;
        }

        if (step.kind === "NAVIGATE" && step.routeHref) {
          setCursorPos({ x: Math.round(window.innerWidth * 0.5), y: 90 });
          setIsClicking(true);
          await sleep(step.delayMs || 550);
          setIsClicking(false);
          router.push(step.routeHref);
          await sleep(500);
          continue;
        }

        if (step.selector) {
          const el = document.querySelector(step.selector) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            await sleep(250);
            const rect = el.getBoundingClientRect();
            setCursorPos({
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
            });
            el.classList.add("ring-2", "ring-emerald-400", "ring-offset-2", "ring-offset-zinc-950");
            await sleep(step.delayMs || 550);

            if (step.kind === "CLICK") {
              setIsClicking(true);
              await sleep(180);
              el.click();
              setIsClicking(false);
            } else if (
              step.kind === "TYPE" &&
              typeof step.textToType === "string" &&
              (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
            ) {
              el.focus();
              let acc = "";
              for (const ch of step.textToType) {
                if (cancelled) break;
                acc += ch;
                setNativeInputValue(el, acc);
                await sleep(65);
              }
            }

            await sleep(300);
            el.classList.remove("ring-2", "ring-emerald-400", "ring-offset-2", "ring-offset-zinc-950");
          }
        }
      }

      await sleep(750);
      if (!cancelled) {
        setCursorVisible(false);
        setCursorActionLabel("");
      }
    };

    const onExecutePlan = (e: Event) => {
      const plan = (e as CustomEvent<UiActionPlan>).detail;
      if (plan) void runPlan(plan);
    };

    window.addEventListener("quadmax-execute-plan", onExecutePlan);
    return () => {
      cancelled = true;
      window.removeEventListener("quadmax-execute-plan", onExecutePlan);
    };
  }, [router, selectProject]);

  if (!cursorVisible) return null;

  return (
    <div
      style={{
        transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-[9999] pointer-events-none transition-transform duration-500 ease-out font-mono"
    >
      <div className="relative flex items-start gap-2">
        <div
          className={`w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-emerald-400 bg-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.9)] transition-transform ${
            isClicking ? "scale-75 bg-emerald-300" : "scale-100"
          }`}
        />
        <div className="px-2.5 py-1 rounded-xl bg-zinc-950/95 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold shadow-2xl whitespace-nowrap">
          🤖 QUADMAX: {cursorActionLabel}
        </div>
      </div>
    </div>
  );
}
