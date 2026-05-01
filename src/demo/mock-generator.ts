export interface MockTestCase {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  shouldPass: boolean;
}

export class MockTestGenerator {
  /**
   * Generate realistic test cases from acceptance criteria without AI
   */
  generateTests(criteria: string[]): MockTestCase[] {
    const tests: MockTestCase[] = [];
    let testId = 1;

    for (const criterion of criteria) {
      const generatedTests = this.generateTestsForCriterion(criterion, testId);
      tests.push(...generatedTests);
      testId += generatedTests.length;
    }

    return tests;
  }

  private generateTestsForCriterion(criterion: string, startId: number): MockTestCase[] {
    const tests: MockTestCase[] = [];
    const lowerCriterion = criterion.toLowerCase();

    // Registration tests
    if (lowerCriterion.includes('register')) {
      tests.push({
        id: `TC${startId}`,
        title: 'Register with valid email and password',
        description: 'Verify user can successfully register with valid credentials',
        steps: [
          'Navigate to registration page',
          'Enter valid email address',
          'Enter valid password',
          'Click Register button',
        ],
        expectedResult: 'User is registered successfully and redirected to dashboard',
        priority: 'high',
        shouldPass: true,
      });

      tests.push({
        id: `TC${startId + 1}`,
        title: 'Register with invalid email format',
        description: 'Verify system rejects invalid email format',
        steps: [
          'Navigate to registration page',
          'Enter invalid email (e.g., "notanemail")',
          'Enter valid password',
          'Click Register button',
        ],
        expectedResult: 'Error message displayed: "Invalid email format"',
        priority: 'high',
        shouldPass: true,
      });
    }

    // Password validation tests
    if (lowerCriterion.includes('password') && lowerCriterion.includes('8 characters')) {
      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Register with weak password',
        description: 'Verify password validation enforces complexity requirements',
        steps: [
          'Navigate to registration page',
          'Enter valid email address',
          'Enter weak password (e.g., "pass123")',
          'Click Register button',
        ],
        expectedResult: 'Error message displayed: "Password must be at least 8 characters with uppercase, lowercase, and number"',
        priority: 'high',
        shouldPass: false, // This will fail in demo to show failure handling
      });

      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Password validation with strong password',
        description: 'Verify strong password is accepted',
        steps: [
          'Navigate to registration page',
          'Enter valid email address',
          'Enter strong password (e.g., "SecurePass123")',
          'Click Register button',
        ],
        expectedResult: 'Password accepted and user registered',
        priority: 'high',
        shouldPass: true,
      });
    }

    // Email confirmation tests
    if (lowerCriterion.includes('confirmation email')) {
      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Email confirmation sent after registration',
        description: 'Verify confirmation email is sent to user',
        steps: [
          'Complete registration with valid credentials',
          'Check email inbox',
        ],
        expectedResult: 'Confirmation email received with activation link',
        priority: 'medium',
        shouldPass: true,
      });
    }

    // Login tests
    if (lowerCriterion.includes('login') && lowerCriterion.includes('valid credentials')) {
      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Login with valid credentials',
        description: 'Verify user can login with correct username and password',
        steps: [
          'Navigate to login page',
          'Enter registered email',
          'Enter correct password',
          'Click Login button',
        ],
        expectedResult: 'User is logged in and redirected to dashboard',
        priority: 'high',
        shouldPass: true,
      });
    }

    if (lowerCriterion.includes('login') && lowerCriterion.includes('invalid credentials')) {
      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Login with invalid password',
        description: 'Verify system rejects incorrect password',
        steps: [
          'Navigate to login page',
          'Enter registered email',
          'Enter incorrect password',
          'Click Login button',
        ],
        expectedResult: 'Error message displayed: "Invalid credentials"',
        priority: 'high',
        shouldPass: true,
      });

      tests.push({
        id: `TC${startId + tests.length}`,
        title: 'Login with non-existent user',
        description: 'Verify system rejects non-existent user',
        steps: [
          'Navigate to login page',
          'Enter non-registered email',
          'Enter any password',
          'Click Login button',
        ],
        expectedResult: 'Error message displayed: "User not found"',
        priority: 'high',
        shouldPass: true,
      });
    }

    return tests;
  }

  /**
   * Simulate test execution with realistic timing and results
   */
  async executeTest(test: MockTestCase): Promise<{
    testId: string;
    passed: boolean;
    duration: number;
    evidence: string;
  }> {
    // Use deterministic duration based on test ID
    const testNumber = parseInt(test.id.replace('TC', ''), 10);
    const baseDuration = 100;
    const increment = 50;
    const duration = baseDuration + ((testNumber - 1) % 3) * increment;
    
    await new Promise(resolve => setTimeout(resolve, duration));

    const passed = test.shouldPass;
    let evidence = '';

    if (passed) {
      evidence = `✅ All steps executed successfully\n${test.expectedResult}`;
    } else {
      evidence = `❌ Test failed at step 3\nExpected: ${test.expectedResult}\nActual: Password "pass123" accepted (validation not working)`;
    }

    return {
      testId: test.id,
      passed,
      duration,
      evidence,
    };
  }
}

// Made with Bob
