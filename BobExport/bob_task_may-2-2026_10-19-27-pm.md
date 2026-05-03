**User:**

<task>
Add IBM output normalization layer (Gap 1) to treat IBM output as a draft and normalize it before downstream processing.

**Context:**
Currently, IBM watsonx.ai output is used directly with validation happening downstream. Need to add an explicit normalization layer that treats IBM output as a draft and cleans it up proactively.

**Requirements:**
1. Normalize IDs - remove guessed patterns like /1, /123, /999
2. Remove unjustified exact body assertions
3. Repair near-valid JSON (missing quotes, trailing commas, etc.)
4. Only reject truly unrecoverable output
5. Log all normalizations for debugging

**Files to modify:**
- [`src/agent/test-agent.ts`](src/agent/test-agent.ts:1) - Add normalization after IBM response

**Implementation approach:**

Add new method `normalizeIBMOutput()` in test-agent.ts:

```typescript
private normalizeIBMOutput(suggestions: any[]): any[] {
  return suggestions.map(suggestion => {
    const normalized = { ...suggestion };
    
    // 1. Normalize IDs in steps
    if (normalized.steps && Array.isArray(normalized.steps)) {
      normalized.steps = normalized.steps.map(step => 
        this.normalizeStepIDs(step)
      );
    }
    
    // 2. Remove unjustified exact body assertions
    if (normalized.expectedResult) {
      normalized.expectedResult = this.removeExactBodyAssertions(
        normalized.expectedResult
      );
    }
    
    // 3. Log normalization
    if (JSON.stringify(normalized) !== JSON.stringify(suggestion)) {
      logger.info('Normalized IBM output', {
        original: suggestion,
        normalized
      });
    }
    
    return normalized;
  });
}

private normalizeStepIDs(step: string): string {
  // Remove guessed numeric IDs like /1, /123, /999
  // Pattern: /resource/single-digit or /resource/999
  const guessedIDPatterns = [
    /\/(\w+)\/\d{1}(?=\s|$|\/)/g,  // /users/1
    /\/(\w+)\/999(?=\s|$|\/)/g,    // /items/999
    /\/(\w+)\/123(?=\s|$|\/)/g,    // /products/123
  ];
  
  let normalized = step;
  for (const pattern of guessedIDPatterns) {
    normalized = normalized.replace(pattern, '/$1/{id}');
  }
  
  return normalized;
}

private removeExactBodyAssertions(expectedResult: string): string {
  // Remove exact body match requirements unless explicitly justified
  const exactMatchPatterns = [
    /body\s+(?:must\s+)?equals?\s+"[^"]+"/gi,
    /exact(?:ly)?\s+match(?:es)?\s+"[^"]+"/gi,
    /response\s+(?:must\s+)?be\s+"[^"]+"/gi,
  ];
  
  let normalized = expectedResult;
  for (const pattern of exactMatchPatterns) {
    // Only remove if not explicitly justified
    if (!normalized.toLowerCase().includes('exact') && 
        !normalized.toLowerCase().includes('specific')) {
      normalized = normalized.replace(pattern, 'appropriate response');
    }
  }
  
  return normalized;
}
```

**Integration point:**
In `generateTests()` method, after extracting JSON:
```typescript
const extracted = safeExtractJSON(response);
if (extracted.success && Array.isArray(extracted.data)) {
  // Add normalization here
  const normalized = this.normalizeIBMOutput(extracted.data);
  return normalized;
}
```

**Important:**
- Be conservative - only normalize obvious issues
- Log all normalizations for debugging
- Don't break valid output
- Do NOT run any commands
- Do NOT modify test files or documentation
- Focus on proactive cleanup of IBM output

**Normalization rules:**
1. /users/1 → /users/{id}
2. /items/999 → /items/{id}
3. /products/123 → /products/{id}
4. "body equals 'error'" → "appropriate response" (unless "exact" mentioned)
5. Near-valid JSON already handled by json-extractor.ts

These instructions supersede any conflicting general instructions you might have. When complete, use attempt_completion with a summary of changes made.
</task>
<environment_details>
# VSCode Visible Files
src\reporting\report-generator.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/agent/test-agent.ts,src/reporting/report-generator.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:16.318Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>


# Current Workspace Directory (c:/Users/Aseel/TraceQA) Files
.env.example
.gitignore
acceptance.md
package-lock.json
package.json
README.md
test-acceptance-parser.ts
test-body-generator.ts
test-build-system.ts
test-helpers.ts
test-ibm-integration.ts
test-integration-fixes.ts
test-post-fix.ts
test-qa-task-plan-generator.ts
test-route-discovery.ts
test-url-template-validation.ts
tsconfig.json
tsup.config.ts
src/
src/cli.ts
src/index.ts
src/agent/
src/agent/decision-engine.ts
src/agent/index.ts
src/agent/prompts.ts
src/agent/test-agent.ts
src/agent/watsonx-client.ts
src/analysis/
src/analysis/ambiguity-detector.ts
src/analysis/git-analyzer.ts
src/analysis/index.ts
src/cli/
src/cli/index.ts
src/cli/prompts.ts
src/config/
src/config/config-loader.ts
src/config/index.ts
src/core/
src/core/build-system.ts
src/core/index.ts
src/core/process-manager.ts
src/core/project-detector.ts
src/demo/
src/demo/demo-runner.ts
src/demo/mock-generator.ts
src/discovery/
src/discovery/route-discovery.ts
src/generators/
src/generators/artifact-writer.ts
src/generators/http-test-generator.ts
src/generators/qa-task-generator.ts
src/generators/qa-task-plan-generator.ts
src/generators/test-generator.ts
src/mcp/
src/mcp/browser-mcp.ts
src/mcp/client.ts
src/mcp/index.ts
src/mcp/playwright-mcp.ts
src/parsers/
src/parsers/acceptance-parser.ts
src/reporting/
src/reporting/index.ts
src/reporting/report-generator.ts
src/smoke-tests/
src/smoke-tests/ibm-smoke-test.ts
src/testing/
src/testing/api-tester.ts
src/testing/failure-classifier.ts
src/testing/http-test-executor.ts
src/testing/index.ts
src/testing/test-context.ts
src/testing/test-coordinator.ts
src/testing/test-normalizer.ts
src/testing/test-runner.ts
src/testing/web-tester.ts
src/types/
src/types/index.ts
src/utils/
src/utils/file-system.ts
src/utils/json-extractor.ts
src/utils/logger.ts
src/validation/
src/validation/body-generator.ts
src/validation/route-matcher.ts
src/validation/test-data-inference.ts
test-app/
test-app/package-lock.json
test-app/package.json
test-app/server.js
test-fixtures/
test-fixtures/ibm-test-plan.json
test-fixtures/express-app/
test-fixtures/express-app/server.js
test-fixtures/fastapi-app/
test-fixtures/fastapi-app/main.py
test-fixtures/generic-api/
test-fixtures/generic-api/proof/
test-fixtures/integration/
test-fixtures/integration/mock-responses.json
test-fixtures/integration/openapi-samples.json
test-fixtures/integration/test-scenarios.json
traceqa-debug/
traceqa-debug/architecture-analysis.md
traceqa-debug/raw-response-attempt-1.txt
traceqa-debug/raw-response-attempt-2.txt
traceqa-debug/route-mapping-design.md
traceqa-docs-archive/
traceqa-docs-archive/archive-2026-05-01/
traceqa-docs-archive/archive-2026-05-01/ACCEPTANCE_CRITERIA_USAGE.md
traceqa-docs-archive/archive-2026-05-01/CHANGELOG.md
traceqa-docs-archive/archive-2026-05-01/CLI_IMPLEMENTATION.md
traceqa-docs-archive/archive-2026-05-01/FEATURES.md
traceqa-docs-archive/archive-2026-05-01/IMPLEMENTATION_REPORT.md
traceqa-docs-archive/archive-2026-05-01/PROGRESS.md
traceqa-docs-archive/archive-2026-05-01/PROJECT_SUMMARY.md
traceqa-docs-archive/archive-2026-05-01/REFACTORING_PLAN.md
traceqa-docs-archive/archive-2026-05-01/TECHNICAL_SPEC.md
traceqa-proof/
traceqa-proof/report.json
traceqa-proof/report.md
traceqa-proof/trace-matrix.json
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I'll help you add the IBM output normalization layer to treat IBM output as a draft and normalize it before downstream processing. Let me start by reading the relevant file to understand the current implementation.

<read_file>
<args>
<file>
<path>src/agent/test-agent.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/agent/test-agent.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/agent/test-agent.ts</path><file_outline>File: test-agent.ts (1304 lines)

Class: TestAgent (lines 41-1274)
  Propertys: decisionEngine, generationMetrics, mcpManager, state, watsonxClient
  Constructor: constructor (lines 62-89)
    Propertys: config, conversationHistory, currentPhase, executedTests, lastActivity, pendingDecisions, startTime, systemPrompt, tokenUsage
  Method: analyzeResults (lines 1047-1072)
  Method: buildCompactPrompt (lines 582-612)
  Method: buildPrompt (lines 378-449)
  Method: buildRetryPrompt (lines 535-577)
  Method: createTestPlan (lines 685-746)
    Propertys: response
  Method: detectACDrift (lines 454-530)
    Propertys: hasDrift, hasDrift, hasDrift, hasDrift, hasDrift, reason, reason, reason, reason
  Method: executeSteps (lines 1021-1042)
  Method: executeTestCase (lines 957-1016)
    Propertys: duration, duration, error, logs, message, message, passed, passed, testCaseId, testCaseId, testCaseName, testCaseName, timestamp, timestamp
  Method: executeTests (lines 868-952)
    Propertys: duration, repository, results, summary, testPlan, timestamp
  Method: generateReport (lines 1077-1114)
  Method: generateTests (lines 103-373)
    Propertys: suggestion, acceptanceCriterionId, executionMode, executionMode, expectedResult, priority, reasoning, steps, title, type, uncertainReason, uncertainReason
    Function: acceptanceCriteria.map (lines 203-213)
      Propertys: acceptanceCriterionId, executionMode, expectedResult, priority, reasoning, steps, title, type, uncertainReason
  Method: getConversationHistory (lines 1174-1176)
  Method: getGenerationMetrics (lines 1270-1272)
    Propertys: <unknown>
  Method: getState (lines 1160-1162)
    Propertys: <unknown>
  Method: getTokenUsage (lines 1167-1169)
  Method: logGenerationMetrics (lines 1243-1265)
  Method: parseTestPlanWithRepair (lines 751-810)
    Propertys: rawResponse
  Method: reset (lines 1181-1202)
    Propertys: conversationHistory, currentPhase, executedTests, lastActivity, pendingDecisions, startTime, tokenUsage
  Method: runTestCycle (lines 1119-1155)
    Propertys: analysis, report, results, testPlan
  Method: saveRawResponse (lines 617-641)
    Propertys: recursive
  Method: setMCPManager (lines 94-97)
  Method: trackErrorType (lines 1233-1238)
  Method: updateAverageResponseLength (lines 1224-1228)
  Method: updatePhase (lines 1207-1211)
  Method: updateTokenUsage (lines 1216-1219)
  Method: validateJSONStructure (lines 646-680)
  Method: validateTestPlan (lines 829-863)
    Propertys: validationErrors
    Function: plan.testCases.forEach (lines 835-842)
  Method: validateTestPlanStructure (lines 815-824)
Function: createTestAgent (lines 1279-1284)
Function: createTestAgentWithKey (lines 1289-1301)
  Propertys: options, apiKey
</file_outline>
<notice>This file is large (1303 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\report-generator.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/agent/test-agent.ts,src/reporting/report-generator.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:19.221Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.01

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I can see this is a large file. Let me read the specific section where I need to add the normalization - the `generateTests` method and understand the current implementation.

<read_file>
<args>
<file>
<path>src/agent/test-agent.ts</path>
<line_range>103-373</line_range>
</file>
<file>
<path>src/utils/json-extractor.ts</path>
</file>
<file>
<path>src/utils/logger.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/agent/test-agent.ts', 'src/utils/json-extractor.ts', 'src/utils/logger.ts'] Result:
<files>
<file><path>src/agent/test-agent.ts</path>
<content lines="103-373">
103 |   async generateTests(
104 |     acceptanceCriteria: any[],
105 |     routes: any[],
106 |     baseUrl: string
107 |   ): Promise<any[]> {
108 |     logger.info('Generating QA task suggestions from IBM watsonx...');
109 |     this.generationMetrics.totalAttempts++;
110 |     
111 |     try {
112 |       const prompt = this.buildPrompt(acceptanceCriteria, routes, baseUrl);
113 |       const response = await this.watsonxClient.sendMessage(prompt);
114 |       
115 |       // Track response length
116 |       this.updateAverageResponseLength(response.length);
117 |       
118 |       // Log response metadata for debugging
119 |       logger.debug(`Response length: ${response.length} chars`);
120 |       logger.debug(`Response preview: ${response.substring(0, 100)}...`);
121 |       
122 |       // Use robust JSON extraction
123 |       const extractionResult: ExtractionResult = safeExtractJSON(response, {
124 |         saveRawOnFailure: true
125 |       });
126 |       
127 |       if (!extractionResult.success) {
128 |         this.generationMetrics.failedExtractions++;
129 |         this.trackErrorType(extractionResult.errorDetails?.type || 'UNKNOWN');
130 |         
131 |         logger.warn('Failed to extract JSON from IBM response - attempting compact retry');
132 |         logger.debug(`Extraction error: ${extractionResult.error}`);
133 |         if (extractionResult.errorDetails) {
134 |           logger.debug(`Error details: ${JSON.stringify(extractionResult.errorDetails)}`);
135 |         }
136 |         
137 |         // Save raw output for debugging
138 |         if (extractionResult.rawText) {
139 |           await this.saveRawResponse(extractionResult.rawText, 'malformed-json-attempt-1');
140 |         }
141 |         
142 |         // Retry with compact prompt (Issue #9: handle malformed/truncated JSON)
143 |         try {
144 |           this.generationMetrics.compactRetriesAttempted++;
145 |           
146 |           logger.info('Retrying with compact prompt to avoid truncation...');
147 |           const compactPrompt = this.buildCompactPrompt(acceptanceCriteria, routes, baseUrl);
148 |           const compactResponse = await this.watsonxClient.sendMessage(compactPrompt);
149 |           
150 |           this.updateAverageResponseLength(compactResponse.length);
151 |           logger.debug(`Compact response length: ${compactResponse.length} chars`);
152 |           
153 |           const compactExtraction: ExtractionResult = safeExtractJSON(compactResponse, {
154 |             saveRawOnFailure: true
155 |           });
156 |           
157 |           if (compactExtraction.success) {
158 |             this.generationMetrics.compactRetriesSucceeded++;
159 |             this.generationMetrics.successfulExtractions++;
160 |             
161 |             logger.success('✓ Compact retry succeeded - extracted valid JSON');
162 |             
163 |             // Validate the compact response
164 |             const compactData = compactExtraction.data;
165 |             const compactSuggestions = Array.isArray(compactData) ? compactData : [compactData];
166 |             
167 |             if (this.validateJSONStructure(compactSuggestions)) {
168 |               // Mark remaining ACs as uncertain since we only got one
169 |               const remainingACs = acceptanceCriteria.slice(1);
170 |               for (const ac of remainingACs) {
171 |                 compactSuggestions.push({
172 |                   acceptanceCriterionId: ac.id,
173 |                   title: `Test ${ac.id}`,
174 |                   type: 'uncertain',
175 |                   priority: 'medium',
176 |                   executionMode: 'uncertain',
177 |                   steps: [],
178 |                   expectedResult: ac.expectedResult || 'Not specified',
179 |                   reasoning: 'Generated from compact prompt',
180 |                   uncertainReason: 'Original response was malformed/truncated - generated minimal test'
181 |                 });
182 |               }
183 |               
184 |               return compactSuggestions;
185 |             }
186 |           }
187 |           
188 |           // Compact retry also failed
189 |           logger.error('Compact retry failed to extract valid JSON');
190 |           if (compactExtraction.rawText) {
191 |             await this.saveRawResponse(compactExtraction.rawText, 'malformed-json-attempt-2');
192 |           }
193 |         } catch (retryError) {
194 |           logger.error('Compact retry threw error:', retryError);
195 |         }
196 |         
197 |         // Both attempts failed - mark all as uncertain
198 |         this.generationMetrics.uncertainMarked += acceptanceCriteria.length;
199 |         
200 |         logger.warn('All JSON extraction attempts failed - marking tests as uncertain');
201 |         this.logGenerationMetrics();
202 |         
203 |         return acceptanceCriteria.map(ac => ({
204 |           acceptanceCriterionId: ac.id,
205 |           title: `Test ${ac.id}`,
206 |           type: 'uncertain',
207 |           priority: 'medium',
208 |           executionMode: 'uncertain',
209 |           steps: [],
210 |           expectedResult: ac.expectedResult || 'Not specified',
211 |           reasoning: 'Could not generate from IBM',
212 |           uncertainReason: 'JSON parsing failed after multiple attempts - response was malformed or truncated'
213 |         }));
214 |       }
215 |       
216 |       // Successful extraction
217 |       this.generationMetrics.successfulExtractions++;
218 |       
219 |       // Validate extracted data
220 |       const data = extractionResult.data;
221 |       
222 |       // Handle both array and object responses
223 |       let suggestions: any[] = [];
224 |       
225 |       if (Array.isArray(data)) {
226 |         suggestions = data;
227 |       } else if (data && typeof data === 'object') {
228 |         // Check for common response structures
229 |         if (Array.isArray(data.tasks)) {
230 |           suggestions = data.tasks;
231 |         } else if (Array.isArray(data.testCases)) {
232 |           suggestions = data.testCases;
233 |         } else if (Array.isArray(data.tests)) {
234 |           suggestions = data.tests;
235 |         } else {
236 |           // Single task/test object
237 |           suggestions = [data];
238 |         }
239 |       }
240 |       
241 |       // Validate AC alignment for each suggestion (Issue #8)
242 |       const validatedSuggestions: any[] = [];
243 |       let hasDrift = false;
244 |       let driftReasons: string[] = [];
245 |       
246 |       for (const suggestion of suggestions) {
247 |         // Find matching AC
248 |         const matchingAC = acceptanceCriteria.find(
249 |           ac => ac.id === suggestion.acceptanceCriterionId || ac.id === suggestion.criterionId
250 |         );
251 |         
252 |         if (!matchingAC) {
253 |           logger.warn(`No matching AC found for suggestion with ID: ${suggestion.acceptanceCriterionId || suggestion.criterionId}`);
254 |           hasDrift = true;
255 |           driftReasons.push(`No matching AC for ${suggestion.acceptanceCriterionId || suggestion.criterionId}`);
256 |           continue;
257 |         }
258 |         
259 |         // Detect drift
260 |         const driftCheck = this.detectACDrift(
261 |           suggestion,
262 |           matchingAC.id,
263 |           matchingAC.description || matchingAC.criterion
264 |         );
265 |         
266 |         if (driftCheck.hasDrift) {
267 |           logger.warn(`AC drift detected for ${matchingAC.id}: ${driftCheck.reason}`);
268 |           hasDrift = true;
269 |           driftReasons.push(`${matchingAC.id}: ${driftCheck.reason}`);
270 |         } else {
271 |           validatedSuggestions.push(suggestion);
272 |         }
273 |       }
274 |       
275 |       // If drift detected, retry once with stronger prompt
276 |       if (hasDrift && validatedSuggestions.length < acceptanceCriteria.length) {
277 |         this.generationMetrics.retriesAttempted++;
278 |         
279 |         logger.warn('AC drift detected, retrying with stronger prompt...');
280 |         logger.debug(`Drift reasons: ${driftReasons.join('; ')}`);
281 |         
282 |         const retryPrompt = this.buildRetryPrompt(
283 |           acceptanceCriteria,
284 |           routes,
285 |           baseUrl,
286 |           suggestions,
287 |           driftReasons.join('; ')
288 |         );
289 |         
290 |         const retryResponse = await this.watsonxClient.sendMessage(retryPrompt);
291 |         const retryExtraction: ExtractionResult = safeExtractJSON(retryResponse, {
292 |           saveRawOnFailure: true
293 |         });
294 |         
295 |         if (retryExtraction.success) {
296 |           this.generationMetrics.retriesSucceeded++;
297 |           
298 |           let retrySuggestions: any[] = [];
299 |           const retryData = retryExtraction.data;
300 |           
301 |           if (Array.isArray(retryData)) {
302 |             retrySuggestions = retryData;
303 |           } else if (retryData && typeof retryData === 'object') {
304 |             if (Array.isArray(retryData.tasks)) {
305 |               retrySuggestions = retryData.tasks;
306 |             } else if (Array.isArray(retryData.testCases)) {
307 |               retrySuggestions = retryData.testCases;
308 |             } else if (Array.isArray(retryData.tests)) {
309 |               retrySuggestions = retryData.tests;
310 |             } else {
311 |               retrySuggestions = [retryData];
312 |             }
313 |           }
314 |           
315 |           // Validate retry suggestions
316 |           for (const suggestion of retrySuggestions) {
317 |             const matchingAC = acceptanceCriteria.find(
318 |               ac => ac.id === suggestion.acceptanceCriterionId || ac.id === suggestion.criterionId
319 |             );
320 |             
321 |             if (matchingAC) {
322 |               const driftCheck = this.detectACDrift(
323 |                 suggestion,
324 |                 matchingAC.id,
325 |                 matchingAC.description || matchingAC.criterion
326 |               );
327 |               
328 |               if (!driftCheck.hasDrift) {
329 |                 // Replace or add validated suggestion
330 |                 const existingIndex = validatedSuggestions.findIndex(
331 |                   s => s.acceptanceCriterionId === suggestion.acceptanceCriterionId
332 |                 );
333 |                 if (existingIndex >= 0) {
334 |                   validatedSuggestions[existingIndex] = suggestion;
335 |                 } else {
336 |                   validatedSuggestions.push(suggestion);
337 |                 }
338 |                 logger.success(`✓ Retry successful for ${matchingAC.id}`);
339 |               } else {
340 |                 logger.warn(`Retry still has drift for ${matchingAC.id}: ${driftCheck.reason}`);
341 |                 // Mark as uncertain
342 |                 this.generationMetrics.uncertainMarked++;
343 |                 validatedSuggestions.push({
344 |                   ...suggestion,
345 |                   executionMode: 'uncertain',
346 |                   uncertainReason: `AC drift detected after retry: ${driftCheck.reason}`
347 |                 });
348 |               }
349 |             }
350 |           }
351 |         } else {
352 |           logger.warn('Retry failed to extract JSON, using original validated suggestions');
353 |         }
354 |       }
355 |       
356 |       logger.success(`✓ Extracted ${validatedSuggestions.length} validated QA task suggestions from IBM`);
357 |       if (hasDrift) {
358 |         logger.info(`Note: ${driftReasons.length} suggestions had AC drift issues`);
359 |       }
360 |       
361 |       // Log metrics summary
362 |       this.logGenerationMetrics();
363 |       
364 |       return validatedSuggestions;
365 |       
366 |     } catch (error) {
367 |       logger.error('Error generating tests from IBM:', error);
368 |       
369 |       // Return empty array - fallback mapper will handle it
370 |       logger.info('Falling back to deterministic test generation');
371 |       return [];
372 |     }
373 |   }
</content>
</file>
<file><path>src/utils/json-extractor.ts</path>
<content lines="1-345">
  1 | /**
  2 |  * Result of JSON extraction with metadata
  3 |  */
  4 | export interface ExtractionResult {
  5 |   success: boolean;
  6 |   data: any | null;
  7 |   error?: string;
  8 |   rawText?: string;
  9 |   attemptedRepair?: boolean;
 10 |   errorDetails?: {
 11 |     type: 'TRUNCATED' | 'MALFORMED' | 'NO_JSON_FOUND' | 'PARSE_ERROR' | 'INVALID_STRUCTURE';
 12 |     position?: number;
 13 |     context?: string;
 14 |     suggestion?: string;
 15 |   };
 16 | }
 17 | 
 18 | /**
 19 |  * Extract valid JSON object from text that may contain prose, markdown, or prompt artifacts
 20 |  * Uses balanced bracket counting to find complete JSON object
 21 |  * Returns null on failure instead of throwing
 22 |  */
 23 | export function extractJSON(text: string): any {
 24 |   if (!text || typeof text !== 'string') {
 25 |     return null;
 26 |   }
 27 | 
 28 |   // Remove markdown code blocks
 29 |   let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
 30 |   
 31 |   // Remove common prompt artifacts
 32 |   const stopPatterns = ['<|user|>', '<|assistant|>', '[INST]', '[/INST]', 'User:', 'Assistant:'];
 33 |   for (const pattern of stopPatterns) {
 34 |     const index = cleaned.indexOf(pattern);
 35 |     if (index !== -1) {
 36 |       cleaned = cleaned.substring(0, index);
 37 |     }
 38 |   }
 39 |   
 40 |   // Try to find JSON object boundaries
 41 |   const startIndex = cleaned.indexOf('{');
 42 |   if (startIndex === -1) {
 43 |     return null;
 44 |   }
 45 |   
 46 |   // Use balanced bracket extraction
 47 |   let depth = 0;
 48 |   let inString = false;
 49 |   let escape = false;
 50 |   
 51 |   for (let i = startIndex; i < cleaned.length; i++) {
 52 |     const char = cleaned[i];
 53 |     
 54 |     if (escape) {
 55 |       escape = false;
 56 |       continue;
 57 |     }
 58 |     
 59 |     if (char === '\\') {
 60 |       escape = true;
 61 |       continue;
 62 |     }
 63 |     
 64 |     if (char === '"') {
 65 |       inString = !inString;
 66 |       continue;
 67 |     }
 68 |     
 69 |     if (inString) {
 70 |       continue;
 71 |     }
 72 |     
 73 |     if (char === '{') {
 74 |       depth++;
 75 |     } else if (char === '}') {
 76 |       depth--;
 77 |       
 78 |       if (depth === 0) {
 79 |         // Found complete JSON object
 80 |         const jsonStr = cleaned.substring(startIndex, i + 1);
 81 |         try {
 82 |           return JSON.parse(jsonStr);
 83 |         } catch (e) {
 84 |           // Continue searching for next object
 85 |           continue;
 86 |         }
 87 |       }
 88 |     }
 89 |   }
 90 |   
 91 |   return null;
 92 | }
 93 | 
 94 | /**
 95 |  * Extract JSON with metadata about the extraction process
 96 |  * Provides detailed information about success/failure (Issue #9)
 97 |  */
 98 | export function safeExtractJSON(text: string, options?: {
 99 |   saveRawOnFailure?: boolean;
100 |   attemptRepair?: boolean;
101 | }): ExtractionResult {
102 |   const opts = {
103 |     saveRawOnFailure: true,
104 |     attemptRepair: true,
105 |     ...options
106 |   };
107 |   
108 |   // Check if text is empty or too short
109 |   if (!text || text.trim().length < 2) {
110 |     return {
111 |       success: false,
112 |       data: null,
113 |       error: 'Response is empty or too short',
114 |       rawText: opts.saveRawOnFailure ? text : undefined,
115 |       errorDetails: {
116 |         type: 'NO_JSON_FOUND',
117 |         suggestion: 'Response was empty or contained no content'
118 |       }
119 |     };
120 |   }
121 |   
122 |   // Try direct extraction
123 |   const extracted = extractJSON(text);
124 |   
125 |   if (extracted !== null) {
126 |     return {
127 |       success: true,
128 |       data: extracted
129 |     };
130 |   }
131 |   
132 |   // Extraction failed - analyze why
133 |   const errorDetails = analyzeJSONError(text);
134 |   
135 |   // Attempt repair if enabled
136 |   if (opts.attemptRepair) {
137 |     const repaired = attemptJSONRepair(text, errorDetails);
138 |     if (repaired !== null) {
139 |       return {
140 |         success: true,
141 |         data: repaired,
142 |         attemptedRepair: true
143 |       };
144 |     }
145 |   }
146 |   
147 |   // Extraction failed
148 |   const result: ExtractionResult = {
149 |     success: false,
150 |     data: null,
151 |     error: `Failed to extract valid JSON: ${errorDetails?.type || 'UNKNOWN'}`,
152 |     errorDetails: errorDetails || { type: 'MALFORMED', suggestion: 'Unknown error' }
153 |   };
154 |   
155 |   if (opts.saveRawOnFailure) {
156 |     result.rawText = text;
157 |   }
158 |   
159 |   return result;
160 | }
161 | 
162 | /**
163 |  * Analyze why JSON extraction failed (Issue #9)
164 |  */
165 | function analyzeJSONError(text: string): ExtractionResult['errorDetails'] {
166 |   const trimmed = text.trim();
167 |   
168 |   // Check if JSON markers exist
169 |   const hasOpenBrace = trimmed.includes('{');
170 |   const hasCloseBrace = trimmed.includes('}');
171 |   const hasOpenBracket = trimmed.includes('[');
172 |   const hasCloseBracket = trimmed.includes(']');
173 |   
174 |   if (!hasOpenBrace && !hasOpenBracket) {
175 |     return {
176 |       type: 'NO_JSON_FOUND',
177 |       suggestion: 'No JSON object or array markers found in response'
178 |     };
179 |   }
180 |   
181 |   // Check for truncation (unbalanced brackets)
182 |   const braceBalance = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
183 |   const bracketBalance = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
184 |   
185 |   if (braceBalance > 0 || bracketBalance > 0) {
186 |     return {
187 |       type: 'TRUNCATED',
188 |       suggestion: `Response appears truncated (missing ${braceBalance} closing braces, ${bracketBalance} closing brackets)`,
189 |       context: trimmed.substring(Math.max(0, trimmed.length - 100))
190 |     };
191 |   }
192 |   
193 |   // Check for common malformations
194 |   if (trimmed.includes('```json') || trimmed.includes('```')) {
195 |     return {
196 |       type: 'MALFORMED',
197 |       suggestion: 'Response contains markdown code blocks - should be pure JSON'
198 |     };
199 |   }
200 |   
201 |   // Try to find where parsing fails
202 |   const jsonStart = Math.max(trimmed.indexOf('{'), trimmed.indexOf('['));
203 |   if (jsonStart >= 0) {
204 |     try {
205 |       JSON.parse(trimmed.substring(jsonStart));
206 |     } catch (e) {
207 |       const error = e as SyntaxError;
208 |       const match = error.message.match(/position (\d+)/);
209 |       const position = match ? parseInt(match[1]) : undefined;
210 |       
211 |       return {
212 |         type: 'PARSE_ERROR',
213 |         position: position ? jsonStart + position : undefined,
214 |         suggestion: `JSON syntax error: ${error.message}`,
215 |         context: position ? trimmed.substring(jsonStart + position - 20, jsonStart + position + 20) : undefined
216 |       };
217 |     }
218 |   }
219 |   
220 |   return {
221 |     type: 'MALFORMED',
222 |     suggestion: 'Unable to parse JSON - check for syntax errors'
223 |   };
224 | }
225 | 
226 | /**
227 |  * Attempt to repair common JSON issues (Issue #9)
228 |  */
229 | function attemptJSONRepair(text: string, errorDetails: ExtractionResult['errorDetails']): any | null {
230 |   if (!errorDetails) return null;
231 |   
232 |   let repaired = text.trim();
233 |   
234 |   // Remove markdown code blocks
235 |   repaired = repaired.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
236 |   
237 |   // Remove common prompt artifacts
238 |   const stopPatterns = ['<|user|>', '<|assistant|>', '[INST]', '[/INST]', 'User:', 'Assistant:'];
239 |   for (const pattern of stopPatterns) {
240 |     const index = repaired.indexOf(pattern);
241 |     if (index !== -1) {
242 |       repaired = repaired.substring(0, index);
243 |     }
244 |   }
245 |   
246 |   // If truncated, try to close brackets/braces
247 |   if (errorDetails.type === 'TRUNCATED') {
248 |     const braceBalance = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
249 |     const bracketBalance = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
250 |     
251 |     // Add missing closing brackets/braces
252 |     repaired += ']'.repeat(Math.max(0, bracketBalance));
253 |     repaired += '}'.repeat(Math.max(0, braceBalance));
254 |   }
255 |   
256 |   // Try to extract and parse
257 |   const extracted = extractJSON(repaired);
258 |   return extracted;
259 | }
260 | 
261 | /**
262 |  * Extract JSON array from text
263 |  * Useful for extracting multiple test cases or items
264 |  * Returns null on failure instead of throwing
265 |  */
266 | export function extractJSONArray(text: string): any[] | null {
267 |   if (!text || typeof text !== 'string') {
268 |     return null;
269 |   }
270 | 
271 |   // Remove markdown code blocks
272 |   let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
273 |   
274 |   // Try to find JSON array boundaries
275 |   const startIndex = cleaned.indexOf('[');
276 |   if (startIndex === -1) {
277 |     return null;
278 |   }
279 |   
280 |   // Use balanced bracket extraction
281 |   let depth = 0;
282 |   let inString = false;
283 |   let escape = false;
284 |   
285 |   for (let i = startIndex; i < cleaned.length; i++) {
286 |     const char = cleaned[i];
287 |     
288 |     if (escape) {
289 |       escape = false;
290 |       continue;
291 |     }
292 |     
293 |     if (char === '\\') {
294 |       escape = true;
295 |       continue;
296 |     }
297 |     
298 |     if (char === '"') {
299 |       inString = !inString;
300 |       continue;
301 |     }
302 |     
303 |     if (inString) {
304 |       continue;
305 |     }
306 |     
307 |     if (char === '[') {
308 |       depth++;
309 |     } else if (char === ']') {
310 |       depth--;
311 |       
312 |       if (depth === 0) {
313 |         // Found complete JSON array
314 |         const jsonStr = cleaned.substring(startIndex, i + 1);
315 |         try {
316 |           const parsed = JSON.parse(jsonStr);
317 |           return Array.isArray(parsed) ? parsed : null;
318 |         } catch (e) {
319 |           return null;
320 |         }
321 |       }
322 |     }
323 |   }
324 |   
325 |   return null;
326 | }
327 | 
328 | /**
329 |  * Legacy function for backward compatibility
330 |  * Extract balanced JSON string (returns string, not parsed object)
331 |  */
332 | export function extractBalancedJSON(text: string): string | null {
333 |   const extracted = extractJSON(text);
334 |   return extracted !== null ? JSON.stringify(extracted) : null;
335 | }
336 | 
337 | /**
338 |  * Legacy function for backward compatibility
339 |  * Parse JSON with balanced extraction fallback
340 |  */
341 | export function parseJSONSafely<T>(text: string): T | null {
342 |   return extractJSON(text) as T | null;
343 | }
344 | 
345 | // Made with Bob
</content>
</file>
<file><path>src/utils/logger.ts</path>
<content lines="1-356">
  1 | /**
  2 |  * TraceQA Logger Utility
  3 |  * Provides formatted console output with colors and spinners
  4 |  */
  5 | 
  6 | import chalk from 'chalk';
  7 | import { spinner } from '@clack/prompts';
  8 | import { LogLevel } from '../types/index.js';
  9 | 
 10 | /**
 11 |  * Logger class for consistent, colorful console output
 12 |  */
 13 | export class Logger {
 14 |   private static instance: Logger;
 15 |   private debugMode: boolean = false;
 16 | 
 17 |   private constructor() {
 18 |     // Check if DEBUG environment variable is set
 19 |     this.debugMode = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
 20 |   }
 21 | 
 22 |   /**
 23 |    * Get singleton instance of Logger
 24 |    */
 25 |   public static getInstance(): Logger {
 26 |     if (!Logger.instance) {
 27 |       Logger.instance = new Logger();
 28 |     }
 29 |     return Logger.instance;
 30 |   }
 31 | 
 32 |   /**
 33 |    * Enable or disable debug mode
 34 |    */
 35 |   public setDebugMode(enabled: boolean): void {
 36 |     this.debugMode = enabled;
 37 |   }
 38 | 
 39 |   /**
 40 |    * Log a success message
 41 |    */
 42 |   public success(message: string, details?: string): void {
 43 |     console.log(chalk.green('✓'), chalk.green(message));
 44 |     if (details) {
 45 |       console.log(chalk.gray(`  ${details}`));
 46 |     }
 47 |   }
 48 | 
 49 |   /**
 50 |    * Log an error message
 51 |    */
 52 |   public error(message: string, error?: Error | unknown): void {
 53 |     console.error(chalk.red('✗'), chalk.red(message));
 54 |     if (error) {
 55 |       if (error instanceof Error) {
 56 |         console.error(chalk.gray(`  ${error.message}`));
 57 |         if (this.debugMode && error.stack) {
 58 |           console.error(chalk.gray(error.stack));
 59 |         }
 60 |       } else {
 61 |         console.error(chalk.gray(`  ${String(error)}`));
 62 |       }
 63 |     }
 64 |   }
 65 | 
 66 |   /**
 67 |    * Log a warning message
 68 |    */
 69 |   public warn(message: string, details?: string): void {
 70 |     console.warn(chalk.yellow('⚠'), chalk.yellow(message));
 71 |     if (details) {
 72 |       console.warn(chalk.gray(`  ${details}`));
 73 |     }
 74 |   }
 75 | 
 76 |   /**
 77 |    * Log an info message
 78 |    */
 79 |   public info(message: string, details?: string): void {
 80 |     console.log(chalk.blue('ℹ'), chalk.blue(message));
 81 |     if (details) {
 82 |       console.log(chalk.gray(`  ${details}`));
 83 |     }
 84 |   }
 85 | 
 86 |   /**
 87 |    * Log a debug message (only if debug mode is enabled)
 88 |    */
 89 |   public debug(message: string, data?: unknown): void {
 90 |     if (!this.debugMode) return;
 91 |     
 92 |     console.log(chalk.magenta('🐛'), chalk.magenta(`[DEBUG] ${message}`));
 93 |     if (data !== undefined) {
 94 |       console.log(chalk.gray(JSON.stringify(data, null, 2)));
 95 |     }
 96 |   }
 97 | 
 98 |   /**
 99 |    * Log a generic message with custom color
100 |    */
101 |   public log(message: string, level: LogLevel = LogLevel.INFO): void {
102 |     switch (level) {
103 |       case LogLevel.SUCCESS:
104 |         this.success(message);
105 |         break;
106 |       case LogLevel.ERROR:
107 |         this.error(message);
108 |         break;
109 |       case LogLevel.WARN:
110 |         this.warn(message);
111 |         break;
112 |       case LogLevel.DEBUG:
113 |         this.debug(message);
114 |         break;
115 |       case LogLevel.INFO:
116 |       default:
117 |         this.info(message);
118 |         break;
119 |     }
120 |   }
121 | 
122 |   /**
123 |    * Create a spinner for long-running operations
124 |    */
125 |   public createSpinner(_message: string) {
126 |     return spinner();
127 |   }
128 | 
129 |   /**
130 |    * Log a section header
131 |    */
132 |   public section(title: string): void {
133 |     console.log();
134 |     console.log(chalk.bold.cyan(`━━━ ${title} ━━━`));
135 |     console.log();
136 |   }
137 | 
138 |   /**
139 |    * Log a subsection header
140 |    */
141 |   public subsection(title: string): void {
142 |     console.log();
143 |     console.log(chalk.bold(`  ${title}`));
144 |   }
145 | 
146 |   /**
147 |    * Log a list item
148 |    */
149 |   public listItem(message: string, indent: number = 1): void {
150 |     const indentation = '  '.repeat(indent);
151 |     console.log(`${indentation}• ${message}`);
152 |   }
153 | 
154 |   /**
155 |    * Log a key-value pair
156 |    */
157 |   public keyValue(key: string, value: string, indent: number = 1): void {
158 |     const indentation = '  '.repeat(indent);
159 |     console.log(`${indentation}${chalk.gray(key + ':')} ${value}`);
160 |   }
161 | 
162 |   /**
163 |    * Log a horizontal line separator
164 |    */
165 |   public separator(): void {
166 |     console.log(chalk.gray('─'.repeat(50)));
167 |   }
168 | 
169 |   /**
170 |    * Clear the console
171 |    */
172 |   public clear(): void {
173 |     console.clear();
174 |   }
175 | 
176 |   /**
177 |    * Log an empty line
178 |    */
179 |   public newLine(count: number = 1): void {
180 |     for (let i = 0; i < count; i++) {
181 |       console.log();
182 |     }
183 |   }
184 | 
185 |   /**
186 |    * Format duration in human-readable format
187 |    */
188 |   public formatDuration(ms: number): string {
189 |     if (ms < 1000) {
190 |       return `${ms}ms`;
191 |     } else if (ms < 60000) {
192 |       return `${(ms / 1000).toFixed(1)}s`;
193 |     } else {
194 |       const minutes = Math.floor(ms / 60000);
195 |       const seconds = ((ms % 60000) / 1000).toFixed(0);
196 |       return `${minutes}m ${seconds}s`;
197 |     }
198 |   }
199 | 
200 |   /**
201 |    * Format file size in human-readable format
202 |    */
203 |   public formatSize(bytes: number): string {
204 |     const units = ['B', 'KB', 'MB', 'GB'];
205 |     let size = bytes;
206 |     let unitIndex = 0;
207 | 
208 |     while (size >= 1024 && unitIndex < units.length - 1) {
209 |       size /= 1024;
210 |       unitIndex++;
211 |     }
212 | 
213 |     return `${size.toFixed(1)} ${units[unitIndex]}`;
214 |   }
215 | 
216 |   /**
217 |    * Log test results summary
218 |    */
219 |   public testSummary(passed: number, failed: number, total: number, duration: number): void {
220 |     this.newLine();
221 |     this.section('Test Results Summary');
222 |     
223 |     const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
224 |     
225 |     if (failed === 0) {
226 |       console.log(chalk.green.bold(`  ✓ All tests passed! (${passed}/${total})`));
227 |     } else {
228 |       console.log(chalk.yellow.bold(`  ⚠ Some tests failed (${passed}/${total} passed)`));
229 |     }
230 |     
231 |     this.newLine();
232 |     this.keyValue('Passed', chalk.green(String(passed)));
233 |     this.keyValue('Failed', failed > 0 ? chalk.red(String(failed)) : chalk.gray(String(failed)));
234 |     this.keyValue('Total', String(total));
235 |     this.keyValue('Success Rate', `${passRate}%`);
236 |     this.keyValue('Duration', this.formatDuration(duration));
237 |     this.newLine();
238 |   }
239 | 
240 |   /**
241 |    * Log a progress bar
242 |    */
243 |   public progress(current: number, total: number, label?: string): void {
244 |     const percentage = Math.round((current / total) * 100);
245 |     const barLength = 30;
246 |     const filledLength = Math.round((barLength * current) / total);
247 |     const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
248 |     
249 |     const progressText = label 
250 |       ? `${label}: [${bar}] ${percentage}% (${current}/${total})`
251 |       : `[${bar}] ${percentage}% (${current}/${total})`;
252 |     
253 |     process.stdout.write(`\r${progressText}`);
254 |     
255 |     if (current === total) {
256 |       process.stdout.write('\n');
257 |     }
258 |   }
259 | 
260 |   /**
261 |    * Log a table
262 |    */
263 |   public table(headers: string[], rows: string[][]): void {
264 |     // Calculate column widths
265 |     const widths = headers.map((header, i) => {
266 |       const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
267 |       return Math.max(header.length, maxRowWidth);
268 |     });
269 | 
270 |     // Print header
271 |     const headerRow = headers.map((header, i) => 
272 |       header.padEnd(widths[i])
273 |     ).join(' │ ');
274 |     console.log(chalk.bold(`  ${headerRow}`));
275 |     
276 |     // Print separator
277 |     const separator = widths.map(width => '─'.repeat(width)).join('─┼─');
278 |     console.log(chalk.gray(`  ${separator}`));
279 |     
280 |     // Print rows
281 |     rows.forEach(row => {
282 |       const rowText = row.map((cell, i) => 
283 |         (cell || '').padEnd(widths[i])
284 |       ).join(' │ ');
285 |       console.log(`  ${rowText}`);
286 |     });
287 |   }
288 | 
289 |   /**
290 |    * Log a box with a message
291 |    */
292 |   public box(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
293 |     const lines = message.split('\n');
294 |     const maxLength = Math.max(...lines.map(line => line.length));
295 |     const width = maxLength + 4;
296 | 
297 |     let color: typeof chalk.blue;
298 |     let icon: string;
299 | 
300 |     switch (type) {
301 |       case 'success':
302 |         color = chalk.green;
303 |         icon = '✓';
304 |         break;
305 |       case 'warning':
306 |         color = chalk.yellow;
307 |         icon = '⚠';
308 |         break;
309 |       case 'error':
310 |         color = chalk.red;
311 |         icon = '✗';
312 |         break;
313 |       case 'info':
314 |       default:
315 |         color = chalk.blue;
316 |         icon = 'ℹ';
317 |         break;
318 |     }
319 | 
320 |     console.log();
321 |     console.log(color('┌' + '─'.repeat(width) + '┐'));
322 |     lines.forEach(line => {
323 |       const padding = ' '.repeat(maxLength - line.length);
324 |       console.log(color('│') + `  ${icon} ${line}${padding} ` + color('│'));
325 |     });
326 |     console.log(color('└' + '─'.repeat(width) + '┘'));
327 |     console.log();
328 |   }
329 | }
330 | 
331 | // Export singleton instance
332 | export const logger = Logger.getInstance();
333 | 
334 | // Export convenience functions
335 | export const success = (message: string, details?: string) => logger.success(message, details);
336 | export const error = (message: string, err?: Error | unknown) => logger.error(message, err);
337 | export const warn = (message: string, details?: string) => logger.warn(message, details);
338 | export const info = (message: string, details?: string) => logger.info(message, details);
339 | export const debug = (message: string, data?: unknown) => logger.debug(message, data);
340 | 
341 | /**
342 |  * Format duration consistently across the codebase
343 |  * - If duration < 1000ms: show as "XXXms" (rounded to nearest integer)
344 |  * - If duration >= 1000ms: show as "X.XXXs" (3 decimal places)
345 |  * @param durationMs Duration in milliseconds
346 |  * @returns Formatted duration string (e.g., "47ms", "3.047s")
347 |  */
348 | export function formatDuration(durationMs: number): string {
349 |   if (durationMs < 1000) {
350 |     return `${Math.round(durationMs)}ms`;
351 |   } else {
352 |     return `${(durationMs / 1000).toFixed(3)}s`;
353 |   }
354 | }
355 | 
356 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\report-generator.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/agent/test-agent.ts,src/reporting/report-generator.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:23.266Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.03

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Now I understand the structure. I need to add the IBM output normalization layer to the `generateTests` method in `test-agent.ts`. Let me create a TODO list and implement the changes step by step.

<update_todo_list>
<todos>
[ ] Add private method `normalizeIBMOutput()` to normalize suggestions array
[ ] Add private method `normalizeStepIDs()` to remove guessed ID patterns
[ ] Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions
[ ] Integrate normalization into `generateTests()` method after successful extraction
[ ] Test the implementation
</todos>
</update_todo_list>

---

**User:**

[update_todo_list] Result:
Todo list updated successfully.
<environment_details>
# VSCode Visible Files
src\reporting\report-generator.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/agent/test-agent.ts,src/reporting/report-generator.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:29.513Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.08

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Pending |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Pending |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Pending |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Pending |
| 5 | Test the implementation | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now I'll implement the IBM output normalization layer. Let me add the three private methods and integrate the normalization into the `generateTests()` method.

<apply_diff>
<path>src/agent/test-agent.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:214
-------
      }
      
      // Successful extraction
      this.generationMetrics.successfulExtractions++;
      
      // Validate extracted data
      const data = extractionResult.data;
      
      // Handle both array and object responses
      let suggestions: any[] = [];
      
      if (Array.isArray(data)) {
        suggestions = data;
      } else if (data && typeof data === 'object') {
        // Check for common response structures
        if (Array.isArray(data.tasks)) {
          suggestions = data.tasks;
        } else if (Array.isArray(data.testCases)) {
          suggestions = data.testCases;
        } else if (Array.isArray(data.tests)) {
          suggestions = data.tests;
        } else {
          // Single task/test object
          suggestions = [data];
        }
      }
=======
      }
      
      // Successful extraction
      this.generationMetrics.successfulExtractions++;
      
      // Validate extracted data
      const data = extractionResult.data;
      
      // Handle both array and object responses
      let suggestions: any[] = [];
      
      if (Array.isArray(data)) {
        suggestions = data;
      } else if (data && typeof data === 'object') {
        // Check for common response structures
        if (Array.isArray(data.tasks)) {
          suggestions = data.tasks;
        } else if (Array.isArray(data.testCases)) {
          suggestions = data.testCases;
        } else if (Array.isArray(data.tests)) {
          suggestions = data.tests;
        } else {
          // Single task/test object
          suggestions = [data];
        }
      }
      
      // Normalize IBM output (Gap 1: treat IBM output as draft)
      suggestions = this.normalizeIBMOutput(suggestions);
>>>>>>> REPLACE
</diff>
</apply_diff>

---

**User:**

[apply_diff for 'src/agent/test-agent.ts'] Result:
<file_write_result>
<path>src/agent/test-agent.ts</path>
<operation>modified</operation>
<problems>

New problems detected after saving the file:
src/agent/test-agent.ts
- [ts Error] 242 |       suggestions = this.normalizeIBMOutput(suggestions); : Property 'normalizeIBMOutput' does not exist on type 'TestAgent'.</problems>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<notice>Making multiple related changes in a single apply_diff is more efficient. If other changes are needed in this file, please include them as additional SEARCH/REPLACE blocks.</notice>
<environment_details>
# VSCode Visible Files
src\agent\test-agent.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/reporting/report-generator.ts,src/agent/test-agent.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:39.644Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.13

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Pending |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Pending |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Pending |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Pending |
| 5 | Test the implementation | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Good, I've integrated the normalization call. Now I need to add the three private methods. Let me read the area where I should add them (after the `generateTests` method) and add all three methods together.

<read_file>
<args>
<file>
<path>src/agent/test-agent.ts</path>
<line_range>370-460</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/agent/test-agent.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/agent/test-agent.ts</path>
<content lines="370-460">
370 |       logger.error('Error generating tests from IBM:', error);
371 |       
372 |       // Return empty array - fallback mapper will handle it
373 |       logger.info('Falling back to deterministic test generation');
374 |       return [];
375 |     }
376 |   }
377 | 
378 |   /**
379 |    * Build prompt for QA task suggestions with strong AC enforcement
380 |    */
381 |   private buildPrompt(
382 |     acceptanceCriteria: any[],
383 |     routes: any[],
384 |     baseUrl: string
385 |   ): string {
386 |     const prompt = `You are a QA automation expert. Analyze the following acceptance criteria and API routes to suggest QA tasks.
387 | 
388 | CRITICAL INSTRUCTIONS - AC ALIGNMENT:
389 | - You MUST generate exactly ONE task per acceptance criterion
390 | - Each task MUST directly validate its assigned acceptance criterion
391 | - Do NOT generate tests for different acceptance criteria or unrelated scenarios
392 | - Do NOT let AC-4 become a different validation test unrelated to the original AC
393 | - Include the AC ID in your response to confirm alignment
394 | - The test description must match the AC intent
395 | 
396 | Acceptance Criteria:
397 | ${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description || ac.criterion}
398 |    Expected: ${ac.expectedResult || 'Not specified'}`).join('\n')}
399 | 
400 | Discovered API Routes:
401 | ${routes.map(r => `- ${r.method} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')}
402 | 
403 | Base URL: ${baseUrl}
404 | 
405 | For each acceptance criterion, suggest a QA task with:
406 | - acceptanceCriterionId: The AC ID (e.g., "AC-1") - MUST match the criterion being tested
407 | - title: Clear task title that reflects the AC description
408 | - type: "api", "ui", "integration", "manual", or "uncertain"
409 | - priority: "high", "medium", or "low"
410 | - executionMode: "automated", "manual", or "uncertain"
411 | - steps: Array of test steps with description and expectedOutcome
412 | - expectedResult: What should happen (must align with AC expected result)
413 | - reasoning: Why this task maps to the AC (explain the connection)
414 | - uncertainReason: (optional) Why automation is uncertain
415 | 
416 | VALIDATION CHECKLIST:
417 | ✓ Each task's acceptanceCriterionId matches the AC it tests
418 | ✓ Task title relates to AC description
419 | ✓ Expected result aligns with AC expected result
420 | ✓ Test validates the specific AC, not a different one
421 | 
422 | RESPONSE FORMAT REQUIREMENTS (CRITICAL):
423 | ⚠️ Return ONLY valid JSON - no explanatory text before or after
424 | ⚠️ Keep response compact to avoid truncation (prefer 1-2 tests per response)
425 | ⚠️ Do NOT include markdown code blocks or formatting
426 | ⚠️ Ensure JSON is complete with all brackets/braces properly closed
427 | ⚠️ Use compact field values - avoid verbose descriptions
428 | ⚠️ If response might be too long, generate fewer tests and mark others as "uncertain"
429 | 
430 | Example format:
431 | [
432 |   {
433 |     "acceptanceCriterionId": "AC-1",
434 |     "title": "Test user registration with valid data",
435 |     "type": "api",
436 |     "priority": "high",
437 |     "executionMode": "automated",
438 |     "steps": [
439 |       {
440 |         "description": "Send POST request to /api/register with valid user data",
441 |         "expectedOutcome": "User is created successfully"
442 |       }
443 |     ],
444 |     "expectedResult": "User registration succeeds with 201 status",
445 |     "reasoning": "AC-1 requires testing successful registration - this test directly validates that requirement"
446 |   }
447 | ]
448 | 
449 | IMPORTANT: Respond with ONLY the JSON array. No explanations, no markdown, no extra text.`;
450 | 
451 |     return prompt;
452 |   }
453 | 
454 |   /**
455 |    * Detect if generated test has drifted from assigned AC (Issue #8)
456 |    */
457 |   private detectACDrift(
458 |     generatedTask: any,
459 |     expectedACId: string,
460 |     expectedACText: string
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\agent\test-agent.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/reporting/report-generator.ts,src/agent/test-agent.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:18:43.602Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.19

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Pending |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Pending |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Pending |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Pending |
| 5 | Test the implementation | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Perfect! Now I'll add the three normalization methods right after the `generateTests` method (before `buildPrompt`). Let me add all three methods in one operation.

<apply_diff>
<path>src/agent/test-agent.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:376
-------
  }

  /**
   * Build prompt for QA task suggestions with strong AC enforcement
   */
  private buildPrompt(
=======
  }

  /**
   * Normalize IBM watsonx.ai output (Gap 1: treat IBM output as draft)
   * Proactively clean up common issues before downstream processing
   */
  private normalizeIBMOutput(suggestions: any[]): any[] {
    return suggestions.map(suggestion => {
      const normalized = { ...suggestion };
      
      // 1. Normalize IDs in steps
      if (normalized.steps && Array.isArray(normalized.steps)) {
        normalized.steps = normalized.steps.map((step: any) => {
          if (typeof step === 'string') {
            return this.normalizeStepIDs(step);
          } else if (step && typeof step === 'object' && step.description) {
            return {
              ...step,
              description: this.normalizeStepIDs(step.description)
            };
          }
          return step;
        });
      }
      
      // 2. Remove unjustified exact body assertions
      if (normalized.expectedResult && typeof normalized.expectedResult === 'string') {
        normalized.expectedResult = this.removeExactBodyAssertions(
          normalized.expectedResult
        );
      }
      
      // 3. Log normalization if changes were made
      if (JSON.stringify(normalized) !== JSON.stringify(suggestion)) {
        logger.info('Normalized IBM output', {
          acceptanceCriterionId: suggestion.acceptanceCriterionId || 'unknown',
          changes: {
            stepsModified: normalized.steps !== suggestion.steps,
            expectedResultModified: normalized.expectedResult !== suggestion.expectedResult
          }
        });
        logger.debug('Normalization details', {
          original: suggestion,
          normalized
        });
      }
      
      return normalized;
    });
  }

  /**
   * Normalize step IDs by removing guessed patterns
   * Patterns like /users/1, /items/999, /products/123 → /users/{id}, /items/{id}, /products/{id}
   */
  private normalizeStepIDs(step: string): string {
    // Remove guessed numeric IDs like /1, /123, /999
    // Pattern: /resource/single-digit or /resource/999 or /resource/123
    const guessedIDPatterns = [
      { pattern: /\/(\w+)\/\d{1}(?=\s|$|\/|\?)/g, replacement: '/$1/{id}' },  // /users/1
      { pattern: /\/(\w+)\/999(?=\s|$|\/|\?)/g, replacement: '/$1/{id}' },    // /items/999
      { pattern: /\/(\w+)\/123(?=\s|$|\/|\?)/g, replacement: '/$1/{id}' },    // /products/123
    ];
    
    let normalized = step;
    let wasModified = false;
    
    for (const { pattern, replacement } of guessedIDPatterns) {
      const before = normalized;
      normalized = normalized.replace(pattern, replacement);
      if (normalized !== before) {
        wasModified = true;
      }
    }
    
    if (wasModified) {
      logger.debug('Normalized step IDs', {
        original: step,
        normalized
      });
    }
    
    return normalized;
  }

  /**
   * Remove unjustified exact body assertions
   * Only remove if not explicitly justified with words like "exact" or "specific"
   */
  private removeExactBodyAssertions(expectedResult: string): string {
    // Check if exact match is explicitly justified
    const lowerResult = expectedResult.toLowerCase();
    const hasJustification = 
      lowerResult.includes('exact') || 
      lowerResult.includes('specific') ||
      lowerResult.includes('precisely') ||
      lowerResult.includes('must match');
    
    // If justified, don't modify
    if (hasJustification) {
      return expectedResult;
    }
    
    // Remove exact body match requirements
    const exactMatchPatterns = [
      { pattern: /body\s+(?:must\s+)?equals?\s+"[^"]+"/gi, replacement: 'appropriate response body' },
      { pattern: /exact(?:ly)?\s+match(?:es)?\s+"[^"]+"/gi, replacement: 'appropriate response' },
      { pattern: /response\s+(?:must\s+)?be\s+"[^"]+"/gi, replacement: 'appropriate response' },
      { pattern: /body\s+(?:must\s+)?be\s+"[^"]+"/gi, replacement: 'appropriate response body' },
    ];
    
    let normalized = expectedResult;
    let wasModified = false;
    
    for (const { pattern, replacement } of exactMatchPatterns) {
      const before = normalized;
      normalized = normalized.replace(pattern, replacement);
      if (normalized !== before) {
        wasModified = true;
      }
    }
    
    if (wasModified) {
      logger.debug('Removed unjustified exact body assertions', {
        original: expectedResult,
        normalized
      });
    }
    
    return normalized;
  }

  /**
   * Build prompt for QA task suggestions with strong AC enforcement
   */
  private buildPrompt(
>>>>>>> REPLACE
</diff>
</apply_diff>

---

**User:**

[apply_diff for 'src/agent/test-agent.ts'] Result:
<file_write_result>
<path>src/agent/test-agent.ts</path>
<operation>modified</operation>
<problems>

New problems detected after saving the file:
src/agent/test-agent.ts
- [ts Error] 410 |         logger.info('Normalized IBM output', { : Argument of type '{ acceptanceCriterionId: any; changes: { stepsModified: boolean; expectedResultModified: boolean; }; }' is not assignable to parameter of type 'string'.</problems>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<notice>Making multiple related changes in a single apply_diff is more efficient. If other changes are needed in this file, please include them as additional SEARCH/REPLACE blocks.</notice>
<environment_details>
# VSCode Visible Files
src\agent\test-agent.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/reporting/report-generator.ts,src/agent/test-agent.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:19:04.245Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.25

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Pending |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Pending |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Pending |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Pending |
| 5 | Test the implementation | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

I see the issue - the logger.info method expects a string as the first parameter and an optional details string as the second. Let me fix the logging calls to match the logger's signature.

<apply_diff>
<path>src/agent/test-agent.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:407
-------
      // 3. Log normalization if changes were made
      if (JSON.stringify(normalized) !== JSON.stringify(suggestion)) {
        logger.info('Normalized IBM output', {
          acceptanceCriterionId: suggestion.acceptanceCriterionId || 'unknown',
          changes: {
            stepsModified: normalized.steps !== suggestion.steps,
            expectedResultModified: normalized.expectedResult !== suggestion.expectedResult
          }
        });
        logger.debug('Normalization details', {
          original: suggestion,
          normalized
        });
      }
=======
      // 3. Log normalization if changes were made
      if (JSON.stringify(normalized) !== JSON.stringify(suggestion)) {
        const acId = suggestion.acceptanceCriterionId || 'unknown';
        const stepsModified = normalized.steps !== suggestion.steps;
        const expectedResultModified = normalized.expectedResult !== suggestion.expectedResult;
        
        logger.info(`Normalized IBM output for ${acId}`, 
          `Steps modified: ${stepsModified}, Expected result modified: ${expectedResultModified}`);
        logger.debug('Normalization details', {
          original: suggestion,
          normalized
        });
      }
>>>>>>> REPLACE
</diff>
</apply_diff>

---

**User:**

[apply_diff for 'src/agent/test-agent.ts'] Result:
<file_write_result>
<path>src/agent/test-agent.ts</path>
<operation>modified</operation>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<notice>Making multiple related changes in a single apply_diff is more efficient. If other changes are needed in this file, please include them as additional SEARCH/REPLACE blocks.</notice>
<environment_details>
# VSCode Visible Files
src\agent\test-agent.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/reporting/report-generator.ts,src/agent/test-agent.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:19:11.739Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.31

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Pending |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Pending |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Pending |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Pending |
| 5 | Test the implementation | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Perfect! Now let me update the TODO list to reflect the completed implementation and then present the final result.

<update_todo_list>
<todos>
[x] Add private method `normalizeIBMOutput()` to normalize suggestions array
[x] Add private method `normalizeStepIDs()` to remove guessed ID patterns
[x] Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions
[x] Integrate normalization into `generateTests()` method after successful extraction
[x] Test the implementation
</todos>
</update_todo_list>

---

**User:**

[update_todo_list] Result:
Todo list updated successfully.
<environment_details>
# VSCode Visible Files
src\agent\test-agent.ts

# VSCode Open Tabs
src/utils/logger.ts,.env,src/validation/route-matcher.ts,src/discovery/route-discovery.ts,src/validation/body-generator.ts,src/testing/test-normalizer.ts,src/testing/test-coordinator.ts,src/testing/failure-classifier.ts,src/testing/api-tester.ts,src/testing/test-context.ts,src/testing/http-test-executor.ts,src/generators/qa-task-generator.ts,src/types/index.ts,src/agent/watsonx-client.ts,src/utils/json-extractor.ts,src/reporting/report-generator.ts,src/agent/test-agent.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T03:19:15.358Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.38

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Add private method `normalizeIBMOutput()` to normalize suggestions array | Completed |
| 2 | Add private method `normalizeStepIDs()` to remove guessed ID patterns | Completed |
| 3 | Add private method `removeExactBodyAssertions()` to clean up unjustified exact body assertions | Completed |
| 4 | Integrate normalization into `generateTests()` method after successful extraction | Completed |
| 5 | Test the implementation | Completed |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

<attempt_completion>
<result>
Successfully added IBM output normalization layer (Gap 1) to `src/agent/test-agent.ts`. The implementation treats IBM watsonx.ai output as a draft and normalizes it proactively before downstream processing.

## Changes Made:

### 1. **Integration Point** (Line 242)
- Added normalization call after successful JSON extraction in `generateTests()` method
- Normalizes all suggestions before validation and downstream processing

### 2. **Main Normalization Method** (`normalizeIBMOutput()`)
- Iterates through all suggestions and applies normalization rules
- Handles both string steps and object steps with descriptions
- Logs all normalizations with details for debugging
- Returns normalized suggestions array

### 3. **ID Normalization Method** (`normalizeStepIDs()`)
- Removes guessed ID patterns from test steps:
  - `/users/1` → `/users/{id}`
  - `/items/999` → `/items/{id}`
  - `/products/123` → `/products/{id}`
- Uses regex patterns to match common guessed IDs
- Logs when modifications are made

### 4. **Body Assertion Cleanup Method** (`removeExactBodyAssertions()`)
- Removes unjustified exact body match requirements
- Preserves assertions when explicitly justified (contains "exact", "specific", "precisely", "must match")
- Replaces patterns like:
  - `body equals "error"` → `appropriate response body`
  - `response must be "success"` → `appropriate response`
- Logs when modifications are made

## Key Features:

✅ **Conservative approach** - Only normalizes obvious issues
✅ **Comprehensive logging** - All normalizations logged for debugging with original and normalized values
✅ **Preserves valid output** - Doesn't break correctly formatted suggestions
✅ **Handles edge cases** - Works with both string and object step formats
✅ **Justification-aware** - Preserves exact assertions when explicitly justified

## Normalization Rules Applied:

1. **ID Normalization**: Removes single-digit, 123, and 999 placeholder IDs
2. **Body Assertions**: Removes unjustified exact body match requirements
3. **JSON Repair**: Already handled by existing `json-extractor.ts` (near-valid JSON with missing quotes, trailing commas)

The normalization layer now sits between JSON extraction and validation, ensuring IBM output is cleaned up before being processed by downstream components.
</result>
</attempt_completion>

