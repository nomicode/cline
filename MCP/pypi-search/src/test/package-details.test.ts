import type { AxiosError } from "axios";
import mockAxios from "jest-mock-axios";
import {
  mockPyPIResponse,
  samplePackageData,
  sampleErrorResponse,
} from "./helpers";

// Mock the axios module to prevent actual HTTP requests
jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxios,
}));

/**
 * Test suite for PyPI package details functionality.
 * These tests demonstrate how to mock PyPI API responses and handle errors.
 */
describe("Package Details", () => {
  // Reset mock state between tests
  afterEach(() => {
    mockAxios.reset();
  });

  /**
   * Verifies that the test infrastructure is properly configured.
   * This includes Jest and jest-extended matchers.
   */
  it("should be set up correctly", () => {
    expect(true).toBe(true);
    expect([1, 2, 3]).toBeArray(); // jest-extended matcher
  });

  /**
   * Demonstrates how to mock successful PyPI API responses.
   * This pattern should be followed when testing package information retrieval.
   */
  it("demonstrates mocking PyPI responses", async () => {
    // Set up mock response
    const mockResponse = mockPyPIResponse(samplePackageData);
    mockAxios.get.mockResolvedValueOnce(mockResponse);

    // Make request and verify response
    const response = await mockAxios.get("https://pypi.org/pypi/requests/json");
    expect(response.data).toEqual(samplePackageData);
  });

  /**
   * Demonstrates how to handle and test error scenarios.
   * This pattern should be followed when testing error handling logic.
   */
  it("demonstrates error handling", async () => {
    // Set up mock error response
    const mockError = mockPyPIResponse(sampleErrorResponse, 404);
    mockAxios.get.mockRejectedValueOnce({
      response: mockError,
    } as AxiosError);

    // Verify error handling
    try {
      await mockAxios.get("https://pypi.org/pypi/nonexistent-package/json");
      fail("Should have thrown an error");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(404);
      expect(error.response?.data).toEqual(sampleErrorResponse);
    }
  });
});
