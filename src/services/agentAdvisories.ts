/**
 * Agent workflow advisories — required tool sequence before produce_script.
 *
 * When AI calls produce_script without completing required steps,
 * the loop sends back an advisory message and rejects the script (one-time each).
 *
 * Workflow order: draft_storyboard → plan_visual_rhythm → direct_visuals → produce_script
 */

export type Advisory = { tool: string; label: string; message: string };

const REQUIRED_WORKFLOW: Advisory[] = [
  {
    tool: "draft_storyboard",
    label: "No storyboard drafted before produce_script",
    message:
      "Note: You produced a script without drafting a storyboard. " +
      "Scripts without narrative planning typically lack: " +
      "a compelling hook (scene 1), emotional arc (tension → climax), and action close. " +
      "Consider calling draft_storyboard first and then produce_script again with an improved narrative.",
  },
  {
    tool: "plan_visual_rhythm",
    label: "No visual rhythm plan before produce_script",
    message:
      "You produced a script without planning visual rhythm. " +
      "Call plan_visual_rhythm to plan per-scene layout, background mode, transition, and energy " +
      "BEFORE calling produce_script. This ensures visual variety: " +
      "no 3 consecutive same layouts, diverse element types, breathing + climax scenes, " +
      "and varied backgrounds (gradient/image/effect, not just solid colors).",
  },
  {
    tool: "direct_visuals",
    label: "No visual direction before produce_script",
    message:
      "You produced a script without visual direction. " +
      "Call direct_visuals to plan visual metaphors for each scene — " +
      "decide where to use SVG diagrams, maps, progress gauges, comparisons, or timelines " +
      "instead of defaulting to bar-chart/pie-chart for everything.",
  },
];

/** Return the first missing advisory, or null if all required tools were called. */
export function checkAdvisories(
  calledTools: Set<string>,
  advisoryGiven: Set<string>,
): Advisory | null {
  for (const adv of REQUIRED_WORKFLOW) {
    if (!calledTools.has(adv.tool) && !advisoryGiven.has(adv.tool)) {
      return adv;
    }
  }
  return null;
}
