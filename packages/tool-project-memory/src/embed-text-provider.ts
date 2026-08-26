/** Optional async hook to enhance text before local embedding (Phase 2c). */

export type EmbedTextProvider = (text: string) => Promise<string>

let provider: EmbedTextProvider | undefined

/** Register embed text enhancer (plugin sets when memory LLM enabled). */
export function setEmbedTextProvider(fn: EmbedTextProvider | undefined): void {
  provider = fn
}

/** Resolve embed input; falls back to original text on missing provider or error. */
export async function resolveEmbedText(text: string): Promise<string> {
  if (!provider) return text
  try {
    const enhanced = await provider(text)
    return enhanced.trim().length > 0 ? enhanced : text
  }
  catch {
    return text
  }
}
