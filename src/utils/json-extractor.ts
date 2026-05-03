/**
 * Result of JSON extraction with metadata
 */
export interface ExtractionResult {
  success: boolean;
  data: any | null;
  error?: string;
  rawText?: string;
  attemptedRepair?: boolean;
  errorDetails?: {
    type: 'TRUNCATED' | 'MALFORMED' | 'NO_JSON_FOUND' | 'PARSE_ERROR' | 'INVALID_STRUCTURE';
    position?: number;
    context?: string;
    suggestion?: string;
  };
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
 * Provides detailed information about success/failure (Issue #9)
 */
export function safeExtractJSON(text: string, options?: {
  saveRawOnFailure?: boolean;
  attemptRepair?: boolean;
}): ExtractionResult {
  const opts = {
    saveRawOnFailure: true,
    attemptRepair: true,
    ...options
  };
  
  // Check if text is empty or too short
  if (!text || text.trim().length < 2) {
    return {
      success: false,
      data: null,
      error: 'Response is empty or too short',
      rawText: opts.saveRawOnFailure ? text : undefined,
      errorDetails: {
        type: 'NO_JSON_FOUND',
        suggestion: 'Response was empty or contained no content'
      }
    };
  }
  
  // Try direct extraction
  const extracted = extractJSON(text);
  
  if (extracted !== null) {
    return {
      success: true,
      data: extracted
    };
  }
  
  // Extraction failed - analyze why
  const errorDetails = analyzeJSONError(text);
  
  // Attempt repair if enabled
  if (opts.attemptRepair) {
    const repaired = attemptJSONRepair(text, errorDetails);
    if (repaired !== null) {
      return {
        success: true,
        data: repaired,
        attemptedRepair: true
      };
    }
  }
  
  // Extraction failed
  const result: ExtractionResult = {
    success: false,
    data: null,
    error: `Failed to extract valid JSON: ${errorDetails?.type || 'UNKNOWN'}`,
    errorDetails: errorDetails || { type: 'MALFORMED', suggestion: 'Unknown error' }
  };
  
  if (opts.saveRawOnFailure) {
    result.rawText = text;
  }
  
  return result;
}

/**
 * Analyze why JSON extraction failed (Issue #9)
 */
function analyzeJSONError(text: string): ExtractionResult['errorDetails'] {
  const trimmed = text.trim();
  
  // Check if JSON markers exist
  const hasOpenBrace = trimmed.includes('{');
  const hasOpenBracket = trimmed.includes('[');
  
  if (!hasOpenBrace && !hasOpenBracket) {
    return {
      type: 'NO_JSON_FOUND',
      suggestion: 'No JSON object or array markers found in response'
    };
  }
  
  // Check for truncation (unbalanced brackets)
  const braceBalance = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
  const bracketBalance = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
  
  if (braceBalance > 0 || bracketBalance > 0) {
    return {
      type: 'TRUNCATED',
      suggestion: `Response appears truncated (missing ${braceBalance} closing braces, ${bracketBalance} closing brackets)`,
      context: trimmed.substring(Math.max(0, trimmed.length - 100))
    };
  }
  
  // Check for common malformations
  if (trimmed.includes('```json') || trimmed.includes('```')) {
    return {
      type: 'MALFORMED',
      suggestion: 'Response contains markdown code blocks - should be pure JSON'
    };
  }
  
  // Try to find where parsing fails
  const jsonStart = Math.max(trimmed.indexOf('{'), trimmed.indexOf('['));
  if (jsonStart >= 0) {
    try {
      JSON.parse(trimmed.substring(jsonStart));
    } catch (e) {
      const error = e as SyntaxError;
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : undefined;
      
      return {
        type: 'PARSE_ERROR',
        position: position ? jsonStart + position : undefined,
        suggestion: `JSON syntax error: ${error.message}`,
        context: position ? trimmed.substring(jsonStart + position - 20, jsonStart + position + 20) : undefined
      };
    }
  }
  
  return {
    type: 'MALFORMED',
    suggestion: 'Unable to parse JSON - check for syntax errors'
  };
}

/**
 * Attempt to repair common JSON issues (Issue #9)
 */
function attemptJSONRepair(text: string, errorDetails: ExtractionResult['errorDetails']): any | null {
  if (!errorDetails) return null;
  
  let repaired = text.trim();
  
  // Remove markdown code blocks
  repaired = repaired.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Remove common prompt artifacts
  const stopPatterns = ['<|user|>', '<|assistant|>', '[INST]', '[/INST]', 'User:', 'Assistant:'];
  for (const pattern of stopPatterns) {
    const index = repaired.indexOf(pattern);
    if (index !== -1) {
      repaired = repaired.substring(0, index);
    }
  }
  
  // If truncated, try to close brackets/braces
  if (errorDetails.type === 'TRUNCATED') {
    const braceBalance = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    const bracketBalance = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    
    // Add missing closing brackets/braces
    repaired += ']'.repeat(Math.max(0, bracketBalance));
    repaired += '}'.repeat(Math.max(0, braceBalance));
  }
  
  // Try to extract and parse
  const extracted = extractJSON(repaired);
  return extracted;
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
