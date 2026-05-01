# TraceQA Test Report

**Generated**: 2026-05-01T23:10:43.069Z
**Project**: test
**Branch**: current
**TraceQA Version**: 1.0.0

## Merge Readiness: ❌ DO NOT MERGE (Score: 0/100)

### Summary

- **Total Tests**: 7
- **Passed**: 1 ✅
- **Failed**: 6 ❌
- **Uncertain**: 0 ❓
- **Coverage**: 28.6%
- **Success Rate**: 0.1%
- **Duration**: 36974.00s

### Recommendation

Critical issues detected. Do not merge until 6 failed test(s) are resolved. Score: 0/100.

### Risks

- ⚠️ 6 test(s) failed
- ⚠️ Low coverage: 28.6%
- ⚠️ 6 critical test(s) failed (API/integration)

## Trace Matrix

| Acceptance Criterion | Generated Tests | Status | Evidence |
|---------------------|----------------|--------|----------|
| AC-1: GET /health should return 200 with status ok. | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
|  | GET /health returns 200 with status ok | ✅ passed | Logs: Method: GET, URL: http://localhost:3000/health, Expected Status: 200, Actual Status: 200, Response Body: {"status":"ok"}, Assertion Result: PASS, Duration: 2ms |
| AC-2: POST /api/register should create a user with valid email and strong password. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
| AC-3: POST /api/register should reject invalid email. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
| AC-4: POST /api/register should reject weak password. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
| AC-5: POST /api/register should return 409 for duplicate email. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
|  | GET /health returns 200 with status ok | ✅ passed | Logs: Method: GET, URL: http://localhost:3000/health, Expected Status: 200, Actual Status: 200, Response Body: {"status":"ok"}, Assertion Result: PASS, Duration: 2ms |
| AC-6: POST /api/login should allow valid credentials. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |
| AC-7: POST /api/login should reject invalid credentials with 401. | POST /api/register creates a user with valid email and strong password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 201, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3045ms |
|  | POST /api/register rejects invalid email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3039ms |
|  | POST /api/register rejects weak password | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 400, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3044ms |
|  | POST /api/login allows valid credentials | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 200, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3041ms |
|  | POST /api/login rejects invalid credentials with 401 | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/login, Expected Status: 401, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3042ms |
|  | POST /api/register returns 409 for duplicate email | ❌ failed | API test failed: Assertions failed | Logs: Method: GET, URL: http://localhost:3000/api/register, Expected Status: 409, Actual Status: 404, Response Body: {"error":"Not found"}, Assertion Result: FAIL, Duration: 3043ms |

## Detailed Test Results

### ❌ POST /api/register creates a user with valid email and strong password

- **Status**: Failed
- **Duration**: 3045.00s
- **Timestamp**: 2026-05-01T23:10:21.728Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/register
- Expected Status: 201
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3045ms

### ❌ POST /api/register rejects invalid email

- **Status**: Failed
- **Duration**: 3039.00s
- **Timestamp**: 2026-05-01T23:10:24.768Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/register
- Expected Status: 400
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3039ms

### ❌ POST /api/register rejects weak password

- **Status**: Failed
- **Duration**: 3044.00s
- **Timestamp**: 2026-05-01T23:10:27.813Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/register
- Expected Status: 400
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3044ms

### ❌ POST /api/login allows valid credentials

- **Status**: Failed
- **Duration**: 3041.00s
- **Timestamp**: 2026-05-01T23:10:30.856Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/login
- Expected Status: 200
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3041ms

### ❌ POST /api/login rejects invalid credentials with 401

- **Status**: Failed
- **Duration**: 3042.00s
- **Timestamp**: 2026-05-01T23:10:33.898Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/login
- Expected Status: 401
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3042ms

### ❌ POST /api/register returns 409 for duplicate email

- **Status**: Failed
- **Duration**: 3043.00s
- **Timestamp**: 2026-05-01T23:10:36.941Z
- **Message**: API test failed: Assertions failed

**Logs**:
- Method: GET
- URL: http://localhost:3000/api/register
- Expected Status: 409
- Actual Status: 404
- Response Body: {"error":"Not found"}
- Assertion Result: FAIL
- Duration: 3043ms

### ✅ GET /health returns 200 with status ok

- **Status**: Passed
- **Duration**: 2.00s
- **Timestamp**: 2026-05-01T23:10:36.944Z
- **Message**: API test passed - GET http://localhost:3000/health returned 200

**Logs**:
- Method: GET
- URL: http://localhost:3000/health
- Expected Status: 200
- Actual Status: 200
- Response Body: {"status":"ok"}
- Assertion Result: PASS
- Duration: 2ms

---

*Report generated by TraceQA v1.0.0 on 2026-05-01T23:10:43.069Z*
