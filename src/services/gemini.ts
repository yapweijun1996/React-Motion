import { loadSettings } from "./settingsStore";
import { ClassifiedError, classifyHttpStatus, logError } from "./errors";
import { addLogEntry } from "./geminiLog";
import { GEMINI_API_BASE } from "./apiConfig";

function getApiKey(): string {
  const { geminiApiKey } = loadSettings();
  if (!geminiApiKey) throw new ClassifiedError("API_KEY_MISSING", "Gemini API key not configured");
  return geminiApiKey;
}

function getModel(): string {
  return loadSettings().geminiModel;
}

// --- Message types ---

export type TextPart = { text: string };
export type FunctionCallPart = { functionCall: { name: string; args: Record<string, unknown> } };
export type FunctionResponsePart = { functionResponse: { name: string; response: Record<string, unknown> } };
export type GeminiPart = TextPart | FunctionCallPart | FunctionResponsePart;

export type GeminiMessage = {
  role: "user" | "model";
  parts: GeminiPart[];
};

// --- Tool / Function declaration types ---

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type GeminiTool = {
  function_declarations?: FunctionDeclaration[];
  google_search?: Record<string, never>;
};

// --- Response types ---

type GeminiResponsePart = {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: GeminiResponsePart[];
    };
    finishReason?: string;
  }[];
};

export type GeminiCallResult = {
  parts: GeminiResponsePart[];
  finishReason: string;
};

// --- Options ---

export type CallGeminiOptions = {
  tools?: GeminiTool[];
  temperature?: number;
  jsonOutput?: boolean;
};

// --- Original simple call (backward compatible) ---

export async function callGemini(
  systemPrompt: string,
  messages: GeminiMessage[],
): Promise<string> {
  const result = await callGeminiRaw(systemPrompt, messages, {
    jsonOutput: true,
    temperature: 0.7,
  });
  const text = result.parts.find((p) => p.text)?.text;
  if (!text) throw new ClassifiedError("API_EMPTY_RESPONSE", "Gemini returned no text in response");
  return text;
}

// --- Enhanced call with function calling support ---

export async function callGeminiRaw(
  systemPrompt: string,
  messages: GeminiMessage[],
  options: CallGeminiOptions = {},
): Promise<GeminiCallResult> {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.jsonOutput ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;

    // Gemini 3 requires this flag when mixing function calling with built-in tools (Google Search)
    const hasBuiltInTool = options.tools.some((t) => t.google_search);
    const hasFunctionDecl = options.tools.some((t) => t.function_declarations);
    if (hasBuiltInTool && hasFunctionDecl) {
      body.tool_config = { include_server_side_tool_invocations: true };
    }
  }

  console.log("[Gemini] Model:", model, "| Tools:", options.tools?.length ?? 0);

  const toolNames = (options.tools ?? []).flatMap((t) => t.function_declarations?.map((d) => d.name) ?? (t.google_search ? ["google_search"] : []));
  const t0 = performance.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    const code = classifyHttpStatus(res.status);
    logError("Gemini", code, errBody, { status: res.status, model });
    addLogEntry({
      timestamp: Date.now(), model, systemPrompt, messageCount: messages.length,
      tools: toolNames, temperature: options.temperature ?? 0.7, requestBody: body,
      status: "error", httpStatus: res.status, responseSummary: `HTTP ${res.status}`,
      responseData: errBody, durationMs: Math.round(performance.now() - t0), error: errBody,
    });
    throw new ClassifiedError(code, `Gemini API error (${res.status}): ${errBody}`);
  }

  const data: GeminiResponse = await res.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const finishReason = candidate?.finishReason ?? "UNKNOWN";

  if (parts.length === 0) {
    // MALFORMED_FUNCTION_CALL is retryable — return a synthetic text part
    // so the agent loop can inject a retry nudge instead of crashing.
    if (finishReason === "MALFORMED_FUNCTION_CALL") {
      console.warn("[Gemini] MALFORMED_FUNCTION_CALL — returning retry hint to agent loop");
      return {
        parts: [{ text: "[System: Your previous function call was malformed. Please try again with correct JSON syntax.]" }],
        finishReason,
      };
    }
    logError("Gemini", "API_EMPTY_RESPONSE", "Empty parts array", { finishReason, candidateCount: data.candidates?.length });
    throw new ClassifiedError("API_EMPTY_RESPONSE", "Gemini returned empty response");
  }

  const textLen = parts.filter((p) => p.text).reduce((n, p) => n + (p.text?.length ?? 0), 0);
  const fnCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!.name);

  console.log(
    `[Gemini] Response: ${textLen} chars text, ${fnCalls.length} tool calls${fnCalls.length ? ` [${fnCalls.join(", ")}]` : ""}, finish: ${finishReason}`,
  );

  if (finishReason === "MAX_TOKENS") {
    console.warn("[Gemini] Response was truncated (MAX_TOKENS) — output may be incomplete");
  } else if (finishReason === "SAFETY") {
    console.warn("[Gemini] Response was blocked by safety filters");
  }

  addLogEntry({
    timestamp: Date.now(), model, systemPrompt, messageCount: messages.length,
    tools: toolNames, temperature: options.temperature ?? 0.7, requestBody: body,
    status: "ok", httpStatus: res.status,
    responseSummary: `${textLen} chars, ${fnCalls.length} tools [${fnCalls.join(",")}], ${finishReason}`,
    responseData: data, durationMs: Math.round(performance.now() - t0),
  });

  return { parts, finishReason };
}
