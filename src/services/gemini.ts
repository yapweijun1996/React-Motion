const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const key =
    import.meta.env.DEVELOPMENT_GEMINI_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    "";
  if (!key) throw new Error("Gemini API key not configured");
  return key;
}

function getModel(): string {
  return (
    import.meta.env.DEVELOPMENT_GEMINI_MODEL ||
    import.meta.env.VITE_GEMINI_MODEL ||
    "gemini-2.0-flash"
  );
}

export type GeminiMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

export async function callGemini(
  systemPrompt: string,
  messages: GeminiMessage[],
): Promise<string> {
  const apiKey = getApiKey();
  const model = getModel();

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  console.log("[Gemini] Model:", model);
  console.log("[Gemini] Messages:", messages.length, "turns");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Gemini] API error:", res.status, err);
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data: GeminiResponse = await res.json();

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("[Gemini] Empty response, full data:", data);
    throw new Error("Gemini returned empty response");
  }

  console.log("[Gemini] Response length:", text.length, "chars");
  return text;
}
