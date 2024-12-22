# PyPI MCP Development Plan

## Phase 1: Package Details (Complete)

- [x] Basic package details fetching
  - ✓ Get package metadata from PyPI JSON API
  - ✓ Parse response into PackageDetails type
  - ✓ Add error handling
  - ✓ Test with known packages
  - ✓ Add maintenance scoring
  - ✓ Add status categorization
  - ✓ Add proper input validation
  - ✓ Match PyPI's error response format

Note: Package search functionality has been removed as PyPI no longer supports search via API. Users should:

1. Visit pypi.org/search in a browser to find packages
2. Use get_package_details to get detailed information about specific packages

API Behavior:

- Package details: GET /pypi/{package}/json
  - Success: Returns package metadata
  - Not Found: Returns JSON with message
  - Error: Returns error details

## Phase 2: Automated Testing (In Progress)

- [x] Set up testing framework
  - ✓ Add Jest configuration with TypeScript support
  - ✓ Configure ESM modules
  - ✓ Add test helpers and utilities
  - ✓ Set up mock PyPI responses
  - ✓ Add proper type declarations
- [ ] Add unit tests
  - [ ] Test input validation
  - [ ] Test error handling
  - [ ] Test maintenance scoring
- [ ] Add integration tests
  - [ ] Test PyPI API interaction
  - [ ] Test error scenarios
  - [ ] Test rate limiting

Current Testing Infrastructure:
- Jest with TypeScript and ESM support
- Mock axios for API testing
- Helper utilities for common test scenarios
- Type declarations for mocks and matchers
- Example tests demonstrating patterns

## Phase 3: GitHub Integration

- [ ] Add GitHub integration
  - Parse repository URLs
  - Fetch additional metadata (stars, issues)
  - Handle rate limiting
  - Test with GitHub-hosted packages

## Phase 4: Candidate Set Management

- [ ] Basic set operations
  - Implement add/get/clear operations
  - Add deduplication
  - Test set management
- [ ] Add persistence
  - Implement file-based storage
  - Add auto-cleanup of stale results
  - Test persistence across sessions

## Phase 5: Package Analysis

- [ ] Basic scoring system
  - Implement 5-star rating calculation
  - Add maintenance scoring
  - Test scoring consistency
- [ ] Add recommendations
  - Generate package summaries
  - Add verdict generation
  - Test with various package types

## Phase 6: Trusted Packages

- [ ] Basic trust management
  - Implement ~/.pypi_trusted.json storage
  - Add add/remove/list operations
  - Test persistence
- [ ] Trust integration
  - Add trusted flag to search results
  - Add trust info to package details
  - Test trust propagation

## Phase 7: Documentation & Polish

- [ ] Add detailed endpoint documentation
  - Document each endpoint
  - Add usage examples
  - Test examples for accuracy
- [ ] Add workflow documentation
  - Document common patterns
  - Add integration examples
  - Test all workflows

## Implementation Notes

### Current Status

- Package details endpoint complete and tested
- Search functionality removed (users directed to pypi.org/search)
- Testing framework implemented with Jest
- Manual testing procedures documented

### Testing Strategy

#### General Guidelines

- Focus on testing changed functionality
- Test both happy and sad paths
- Verify server startup and basic responsiveness
- Document test results and any issues found

#### Testing Changed Functionality

For each modified endpoint:

1. Start the MCP server fresh (`npm run build && node build/index.js`)
2. Test happy path:
   - Valid inputs
   - Expected response format
   - Correct behavior (e.g., exact vs partial matches)
3. Test sad path:
   - Invalid inputs
   - Empty/missing parameters
   - Error handling
4. Document results in PR

#### Current Phase Test Cases

Package Details:

- Happy Path:
  - Get details for well-maintained package
  - Get details for less active package
  - Verify maintenance scoring
- Sad Path:
  - Empty package name
  - Missing package name
  - Non-existent package

#### Test Results Template

```markdown
## Test Results

Endpoint: [endpoint name]
Date: [test date]

### Happy Path Tests

- [ ] Test case 1: [description]
  - Input: [input]
  - Expected: [expected result]
  - Actual: [actual result]
  - Status: [PASS/FAIL]

### Sad Path Tests

- [ ] Test case 1: [description]
  - Input: [input]
  - Expected: [expected error]
  - Actual: [actual error]
  - Status: [PASS/FAIL]

### Issues Found

- [List any issues found]

### Notes

- [Any additional notes or observations]
```

### Progress Tracking

After completing each task:

- [x] Update this file with completion status
- [x] Note any design changes in pypi_mcp.md
- [x] Document any issues encountered
- [x] List any pending improvements
