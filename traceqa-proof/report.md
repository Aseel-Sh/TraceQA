# TraceQA Test Report

**Generated**: 2026-05-02T00:50:36.927Z
**Project**: test
**Branch**: current
**TraceQA Version**: 1.0.0

## Merge Readiness: ❌ DO NOT MERGE (Score: 40/100)

### Summary

- **Total Tests**: 7
- **Passed**: 3 ✅
- **Failed**: 4 ❌
- **Uncertain**: 0 ❓
- **Coverage**: 100.0%
- **Success Rate**: 0.4%
- **Duration**: 48.108s

### Recommendation

Critical issues detected. Do not merge until 4 failed test(s) are resolved. Score: 40/100.

### Risks

- ⚠️ 4 test(s) failed

## Trace Matrix

| Acceptance Criterion | Generated Tests | Status | Evidence |
|---------------------|----------------|--------|----------|
| AC-1: A user can register with a valid email and strong password. | Valid email and strong password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Weak password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Password must be at least 8 characters and include uppercase, lowercase, and a number"} |
|  | Duplicate email registration | ✅ passed | Logs: Response Body: {"error":"Email already registered"} |
|  | Valid credentials login | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
|  | Invalid login credentials | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
| AC-2: Registration rejects invalid email formats. | Valid email and strong password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Weak password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Password must be at least 8 characters and include uppercase, lowercase, and a number"} |
|  | Duplicate email registration | ✅ passed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid login credentials | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
| AC-3: Registration rejects weak passwords. | Valid email and strong password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Weak password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Password must be at least 8 characters and include uppercase, lowercase, and a number"} |
|  | Duplicate email registration | ✅ passed | Logs: Response Body: {"error":"Email already registered"} |
| AC-4: Duplicate email registration returns a clear conflict error. | Valid email and strong password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Weak password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Password must be at least 8 characters and include uppercase, lowercase, and a number"} |
|  | Duplicate email registration | ✅ passed | Logs: Response Body: {"error":"Email already registered"} |
| AC-5: A registered user can log in with valid credentials. | Valid email and strong password registration | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Email already registered"} |
|  | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Valid credentials login | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
|  | Invalid login credentials | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
| AC-6: Invalid login credentials are rejected. | Invalid email format registration | ✅ passed | Logs: Response Body: {"error":"Invalid email format"} |
|  | Valid credentials login | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
|  | Invalid login credentials | ❌ failed | Message: API test failed: Assertions failed | Logs: Response Body: {"error":"Invalid credentials"} |
| AC-7: The health endpoint returns OK. | Health endpoint | ✅ passed | - |

## Detailed Test Results

### ✅ Passed Tests (3)

- **Invalid email format registration** - 4ms
- **Duplicate email registration** - 3ms
- **Health endpoint** - 2ms

### ❌ Failed Tests - Application Errors (4)

*These failures indicate issues with the application under test.*

#### Valid email and strong password registration

- **Duration**: 9ms
- **Message**: API test failed: Assertions failed

#### Weak password registration

- **Duration**: 4ms
- **Message**: API test failed: Assertions failed

#### Valid credentials login

- **Duration**: 2ms
- **Message**: API test failed: Assertions failed

#### Invalid login credentials

- **Duration**: 3ms
- **Message**: API test failed: Assertions failed

---

*Report generated by TraceQA v1.0.0 on 2026-05-02T00:50:36.927Z*
