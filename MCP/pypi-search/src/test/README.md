# PyPI Search MCP Server Tests

This directory contains the test suite for the PyPI Search MCP server. The tests are written using Jest and TypeScript.

## Test Structure

- `helpers.ts`: Common test utilities and mock data
- `types.d.ts`: TypeScript declarations for Jest and mock-axios
- `package-details.test.ts`: Example tests demonstrating API mocking patterns

## Running Tests

From the pypi-search directory:

```bash
# Run tests once
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

## Test Patterns

### Mocking PyPI Responses

```typescript
const mockResponse = mockPyPIResponse(samplePackageData);
mockAxios.get.mockResolvedValueOnce(mockResponse);
```

### Error Handling

```typescript
const mockError = mockPyPIResponse(sampleErrorResponse, 404);
mockAxios.get.mockRejectedValueOnce({
  response: mockError,
} as AxiosError);
```

## Adding New Tests

1. Create a new test file with the `.test.ts` extension
2. Import necessary utilities from `helpers.ts`
3. Use the patterns demonstrated in `package-details.test.ts`
4. Run `make check` from the root directory to ensure all tests pass and meet style requirements
