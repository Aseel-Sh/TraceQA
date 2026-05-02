/**
 * Extract valid JSON object from text that may contain prose before/after
 * Uses balanced brace counting to find complete JSON object
 */
export function extractBalancedJSON(text: string): string | null {
  // Find first opening brace
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Found matching closing brace
        return text.substring(startIndex, i + 1);
      }
    }
  }

  return null; // No matching closing brace found
}

/**
 * Parse JSON with balanced extraction fallback
 */
export function parseJSONSafely<T>(text: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // Try balanced extraction
    const extracted = extractBalancedJSON(text);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

// Made with Bob
