/**
 * Result of JSON extraction with metadata
 */
export interface ExtractionResult {
  success: boolean;
  data: any | null;
  error?: string;
  rawText?: string;
  attemptedRepair?: boolean;
}

/**
 * Extract valid JSON object from text that may contain prose, markdown, or prompt artifacts
 * Uses balanced bracket counting to find complete JSON object
 * Returns null on failure instead of throwing
 */
export function extractJSON(text: string): any {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Remove common prompt artifacts
  const stopPatterns = ['<|user|>', '<|assistant|>', '[INST]', '[/INST]', 'User:', 'Assistant:'];
  for (const pattern of stopPatterns) {
    const index = cleaned.indexOf(pattern);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index);
    }
  }
  
  // Try to find JSON object boundaries
  const startIndex = cleaned.indexOf('{');
  if (startIndex === -1) {
    return null;
  }
  
  // Use balanced bracket extraction
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = startIndex; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      
      if (depth === 0) {
        // Found complete JSON object
        const jsonStr = cleaned.substring(startIndex, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          // Continue searching for next object
          continue;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract JSON with metadata about the extraction process
 * Provides detailed information about success/failure
 */
export function safeExtractJSON(text: string, options?: {
  saveRawOnFailure?: boolean;
  attemptRepair?: boolean;
}): ExtractionResult {
  const opts = {
    saveRawOnFailure: true,
    attemptRepair: false,
    ...options
  };
  
  // Try direct extraction
  const extracted = extractJSON(text);
  
  if (extracted !== null) {
    return {
      success: true,
      data: extracted
    };
  }
  
  // Extraction failed
  const result: ExtractionResult = {
    success: false,
    data: null,
    error: 'Failed to extract valid JSON from response'
  };
  
  if (opts.saveRawOnFailure) {
    result.rawText = text;
  }
  
  return result;
}

/**
 * Extract JSON array from text
 * Useful for extracting multiple test cases or items
 * Returns null on failure instead of throwing
 */
export function extractJSONArray(text: string): any[] | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Try to find JSON array boundaries
  const startIndex = cleaned.indexOf('[');
  if (startIndex === -1) {
    return null;
  }
  
  // Use balanced bracket extraction
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = startIndex; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      
      if (depth === 0) {
        // Found complete JSON array
        const jsonStr = cleaned.substring(startIndex, i + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
          return null;
        }
      }
    }
  }
  
  return null;
}

/**
 * Legacy function for backward compatibility
 * Extract balanced JSON string (returns string, not parsed object)
 */
export function extractBalancedJSON(text: string): string | null {
  const extracted = extractJSON(text);
  return extracted !== null ? JSON.stringify(extracted) : null;
}

/**
 * Legacy function for backward compatibility
 * Parse JSON with balanced extraction fallback
 */
export function parseJSONSafely<T>(text: string): T | null {
  return extractJSON(text) as T | null;
}

// Made with Bob
