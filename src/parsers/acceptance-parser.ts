export interface AcceptanceCriterion {
  id: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ParsedAcceptanceCriteria {
  criteria: AcceptanceCriterion[];
  rawContent: string;
}

/**
 * Parse acceptance criteria from markdown content
 * Supports multiple formats:
 * - AC-1: Description (explicit ID)
 * - 1. Description (numbered list, generates AC-1)
 * - - Description (bullet list, generates AC-1, AC-2, etc.)
 */
export function parseAcceptanceCriteria(markdown: string): ParsedAcceptanceCriteria {
  const criteria: AcceptanceCriterion[] = [];
  const lines = markdown.split('\n');
  
  let currentCriterion: { id?: string; description: string[] } | null = null;
  let autoIdCounter = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('<!--') || line.startsWith('//')) {
      continue;
    }
    
    // Skip headers (but don't skip content after them)
    if (line.startsWith('#')) {
      continue;
    }
    
    // Match explicit AC-N: format
    const explicitMatch = line.match(/^AC-(\d+):\s*(.+)$/i);
    if (explicitMatch) {
      // Save previous criterion if exists
      if (currentCriterion && currentCriterion.description.length > 0) {
        criteria.push({
          id: currentCriterion.id || `AC-${autoIdCounter++}`,
          description: currentCriterion.description.join(' ').trim()
        });
      }
      
      currentCriterion = {
        id: `AC-${explicitMatch[1]}`,
        description: [explicitMatch[2]]
      };
      continue;
    }
    
    // Match numbered list: 1. Description
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      // Save previous criterion if exists
      if (currentCriterion && currentCriterion.description.length > 0) {
        criteria.push({
          id: currentCriterion.id || `AC-${autoIdCounter++}`,
          description: currentCriterion.description.join(' ').trim()
        });
      }
      
      currentCriterion = {
        id: `AC-${numberedMatch[1]}`,
        description: [numberedMatch[2]]
      };
      continue;
    }
    
    // Match bullet list: - Description or * Description
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      // Save previous criterion if exists
      if (currentCriterion && currentCriterion.description.length > 0) {
        criteria.push({
          id: currentCriterion.id || `AC-${autoIdCounter++}`,
          description: currentCriterion.description.join(' ').trim()
        });
      }
      
      currentCriterion = {
        description: [bulletMatch[1]]
      };
      continue;
    }
    
    // If we have a current criterion and this line doesn't start a new one,
    // it's a continuation of the previous criterion (multi-line support)
    if (currentCriterion && line && !line.startsWith('#')) {
      currentCriterion.description.push(line);
    }
  }
  
  // Don't forget the last criterion
  if (currentCriterion && currentCriterion.description.length > 0) {
    criteria.push({
      id: currentCriterion.id || `AC-${autoIdCounter++}`,
      description: currentCriterion.description.join(' ').trim()
    });
  }
  
  return {
    criteria,
    rawContent: markdown
  };
}

/**
 * Parse acceptance criteria from a file
 */
export async function parseAcceptanceCriteriaFromFile(filePath: string): Promise<ParsedAcceptanceCriteria> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseAcceptanceCriteria(content);
}

// Made with Bob
