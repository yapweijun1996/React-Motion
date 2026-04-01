import type { FunctionDeclaration } from "./gemini";
import type { BusinessData } from "../types";
import type { Palette } from "./palette";

// --- Palette state (captured by generate_palette, consumed by produce_script) ---

let lastGeneratedPalette: Palette | null = null;

/** Get the last generated palette (used by produce_script). */
export function getLastPalette(): Palette | null {
  return lastGeneratedPalette;
}

/** Set the last generated palette (used by generate_palette). */
export function setLastPalette(p: Palette | null): void {
  lastGeneratedPalette = p;
}

/** Reset palette state between generation runs. Called at start of agentLoop. */
export function resetPaletteState(): void {
  lastGeneratedPalette = null;
}

// --- Last script state (captured by produce_script, patched by refine_scene) ---

let lastProducedScript: Record<string, unknown> | null = null;

/** Get the last produced script (used by refine_scene). */
export function getLastScript(): Record<string, unknown> | null {
  return lastProducedScript;
}

/** Set the last produced script (used by produce_script / refine_scene). */
export function setLastScript(s: Record<string, unknown> | null): void {
  lastProducedScript = s;
}

/** Reset script state between generation runs. Called at start of agentLoop. */
export function resetScriptState(): void {
  lastProducedScript = null;
}

// --- Tool result type ---

export type ToolResult = {
  result: Record<string, unknown>;
};

// --- Tool executor signature ---

export type ToolExecutor = (
  args: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolResult>;

export type ToolContext = {
  userPrompt: string;
  data?: BusinessData;
};

// --- Tool registry ---

type ToolEntry = {
  declaration: FunctionDeclaration;
  execute: ToolExecutor;
};

const TOOL_REGISTRY = new Map<string, ToolEntry>();

export function register(declaration: FunctionDeclaration, execute: ToolExecutor) {
  TOOL_REGISTRY.set(declaration.name, { declaration, execute });
}

export function getToolDeclarations(): FunctionDeclaration[] {
  return Array.from(TOOL_REGISTRY.values()).map((t) => t.declaration);
}

export function getToolExecutor(name: string): ToolExecutor | undefined {
  return TOOL_REGISTRY.get(name)?.execute;
}

// --- Multi-Agent tool filtering ---

export const STORYBOARD_TOOLS = new Set(["analyze_data", "draft_storyboard"]);

export const VISUAL_DIRECTOR_TOOLS = new Set([
  "generate_palette", "direct_visuals", "produce_script", "get_element_catalog",
]);

/** Get tool declarations filtered to a specific set of names. */
export function getToolDeclarationsFiltered(names: Set<string>): FunctionDeclaration[] {
  return Array.from(TOOL_REGISTRY.values())
    .filter((t) => names.has(t.declaration.name))
    .map((t) => t.declaration);
}
