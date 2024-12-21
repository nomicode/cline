# PyPI MCP Development Plan

## Development Workflow

### Repository Management
- All work must be done in: /Volumes/Code/2025/github/nomicode/cline

#### Branching Strategy
1. Create branches from main with prefix:
   ```bash
   git checkout -b cline/feature-slug
   ```

2. Keep changes rebased on main:
   ```bash
   git rebase -i origin/main
   ```

3. Push changes with atomic commits:
   - Each commit should represent a single logical change
   - Use clear, descriptive commit messages

4. Before merging multiple commits:
   - Squash history by rebasing onto main
   - Mark all commits except first as fixup commits
   - Results in clean, single-purpose commits

5. Branch Naming:
   - Use `cline/` prefix
   - Add descriptive slug (e.g., `cline/fix-pypi-search`)
   - Keep names short but meaningful

### Task Completion Requirements
1. Implement the changes
2. Add/update tests
3. Verify functionality
4. Update documentation if needed
5. Mark task as complete only after full verification

### Quality Checklist
- [x] Code changes tested (manual testing complete)
- [x] Documentation updated (test_draft.md and test_results.md)
- [x] Tests passing (manual tests passing)
- [x] Branch clean and ready for review

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

## Phase 2: Automated Testing
- [ ] Set up testing framework
  - Add Jest configuration
  - Add test helpers and utilities
  - Set up mock PyPI responses
- [ ] Add unit tests
  - Test input validation
  - Test error handling
  - Test maintenance scoring
- [ ] Add integration tests
  - Test PyPI API interaction
  - Test error scenarios
  - Test rate limiting

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
- Ready for automated testing phase
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
- [ ] Update this file with completion status
- [ ] Note any design changes in pypi_mcp.md
- [ ] Document any issues encountered
- [ ] List any pending improvements
