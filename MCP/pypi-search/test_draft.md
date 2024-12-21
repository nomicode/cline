# PyPI MCP Test Draft

## Package Details Endpoint Tests

### Basic Functionality
```typescript
describe('get_package_details', () => {
  test('should return full details for well-maintained package', async () => {
    // Test: Verify we can get complete details for a known good package
    // Why: Core functionality - must work for basic package lookup
    const input = { package_name: "requests" };
    const result = await pypi.get_package_details(input);

    // Response included all expected fields
    expect(result.name).toBe("requests");
    expect(result.version).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.author).toBeDefined();
    expect(result.license).toBeDefined();
    expect(result.repository).toBe("https://github.com/psf/requests");

    // Maintenance scoring works
    expect(result.maintenanceScore).toBe(76);
    expect(result.maintenanceStatus).toBe("Regularly maintained");

    // Release history is present and sorted
    expect(result.releaseHistory.length).toBeGreaterThan(0);
    expect(result.releaseHistory[0].date).toBe("2024-05-29T15:37:49");
  });

  test('should handle non-existent package', async () => {
    // Test: Verify proper error handling for non-existent packages
    // Why: Error handling - must gracefully handle invalid packages
    const input = { package_name: "this-package-does-not-exist-12345" };
    const result = await pypi.get_package_details(input);

    expect(result.error).toBe("Package not found");
  });
});

### Input Validation
```typescript
describe('get_package_details input validation', () => {
  test('should reject empty package name', async () => {
    // Test: Verify empty package name is rejected
    // Why: Input validation - prevent unnecessary API calls
    const input = { package_name: "" };
    // Test pending - to be executed
  });

  test('should reject missing package name', async () => {
    // Test: Verify missing package name parameter is rejected
    // Why: Input validation - ensure required parameters
    const input = {};
    // Test pending - to be executed
  });
});

### Maintenance Scoring
```typescript
describe('maintenance scoring', () => {
  test('should calculate correct score for active package', async () => {
    // Test: Verify maintenance scoring for well-maintained package
    // Why: Scoring system - must accurately reflect package health
    const input = { package_name: "requests" };
    const result = await pypi.get_package_details(input);

    // Score calculation verified:
    // - Recent releases (within last month)
    // - Multiple releases in past year
    // - Score: 76 (Regularly maintained)
    expect(result.maintenanceScore).toBe(76);
    expect(result.maintenanceStatus).toBe("Regularly maintained");
  });

  test('should handle package with no releases', () => {
    // Test: Verify scoring for package with no release history
    // Why: Edge case handling - must handle incomplete data
    // Test pending - need to identify suitable test package
  });
});

## Test Results So Far

### Completed Tests
1. ✓ Basic package details retrieval (requests)
   - All fields present and correctly formatted
   - Repository URL correctly extracted
   - Release history properly sorted

2. ✓ Non-existent package handling
   - Clear error message
   - Appropriate error status

3. ✓ Maintenance scoring
   - Score calculation verified
   - Status mapping correct
   - Release history analysis working

### Pending Tests
1. Empty package name validation
2. Missing parameter validation
3. Rate limiting behavior
4. Edge cases (no releases, no repository, etc.)

### PyPI API Behavior Analysis
1. Empty Package Name (`/pypi//json`):
   - Returns 404 with HTML response
   - Content-Type: text/html
   - Full HTML error page returned

2. Non-existent Package (`/pypi/non-existent/json`):
   - Returns 404 with JSON response
   - Content-Type: application/json
   - Response: `{"message": "Not Found"}`

### Implementation Changes
1. Input Validation:
   - Missing package_name: McpError with "Missing required parameter: package_name"
   - Empty package_name: McpError with "Invalid package name: cannot be empty"
   - Validation happens before API call

2. Error Responses:
   - Input validation errors: Return error message directly
   - Package not found: Return JSON format `{"message": "Not Found"}`
   - API errors: Return descriptive error message

### Test Cases
1. Input Validation:
   ```typescript
   // Missing parameter
   const result1 = await pypi.get_package_details({});
   expect(result1.error).toBe("Missing required parameter: package_name");

   // Empty string
   const result2 = await pypi.get_package_details({ package_name: "" });
   expect(result2.error).toBe("Invalid package name: cannot be empty");
   ```

2. Package Not Found:
   ```typescript
   const result = await pypi.get_package_details({
     package_name: "this-package-does-not-exist-12345"
   });
   expect(result.error).toBe(JSON.stringify({ message: "Not Found" }));
   ```

### Notes for Test Implementation
1. Need mock PyPI responses for consistent testing
2. Should add rate limiting tests
3. Consider adding timeout tests
4. Need to test all maintenance score ranges
5. Input validation tests should run before any API calls
6. Need consistent error types and messages:
   - InvalidParams: For input validation failures
   - NotFound: For non-existent packages
   - APIError: For PyPI API issues

### Server Management During Testing

#### Finding Running Servers
```bash
# List all running PyPI MCP servers
ps aux | grep pypi | grep -v grep

# Get server process ID
ps aux | grep pypi | grep -v grep | awk '{print $2}'

# Get server JS file path
ps aux | grep pypi | grep -v grep | awk '{print $12}'
```

#### Verifying Server Version
```bash
# Show server configuration (including version)
cat INDEX_JS_PATH | grep -A 3 'new Server('

# Extract just the version number
cat INDEX_JS_PATH | grep -A 3 'new Server(' | grep 'version' | sed -E 's,([^.0-9]*),,g'
```

#### VSCode Version Check
```bash
code -v  # Shows version, commit, architecture
```

#### Server Management Steps
1. Before testing:
   - Check for running instances
   - Verify correct version is running
   - Kill old instances if needed

2. Starting server:
   ```bash
   cd /path/to/server && npm run build && node build/index.js
   ```

3. Stopping server:
   ```bash
   # Find and kill by process name
   kill $(ps aux | grep pypi | grep -v grep | awk '{print $2}')
   ```

4. Restarting for tests:
   - Stop any running instances
   - Rebuild with latest changes
   - Start fresh instance
   - Verify correct version is running

### Required Fixes
1. Add input validation:
   ```typescript
   if (!args?.package_name) {
     throw new McpError(
       ErrorCode.InvalidParams,
       'package_name parameter is required'
     );
   }
   if (args.package_name.trim() === '') {
     throw new McpError(
       ErrorCode.InvalidParams,
       'package_name cannot be empty'
     );
   }
   ```
2. Add error type consistency:
   - Use McpError with appropriate ErrorCode
   - Provide clear error messages
   - Document error cases in API schema
