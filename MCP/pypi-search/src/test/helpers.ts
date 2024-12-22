import { AxiosResponse } from "axios";

/**
 * Creates a mock PyPI API response with the specified data and status code.
 * This helper simplifies testing by providing a consistent response structure.
 *
 * @param data - The response data to include in the mock response
 * @param status - HTTP status code (defaults to 200)
 * @returns A mocked AxiosResponse object
 */
export const mockPyPIResponse = (
  data: Record<string, unknown>,
  status = 200,
): AxiosResponse => ({
  data,
  status,
  statusText: status === 200 ? "OK" : "Error",
  headers: {},
  config: { headers: {} } as AxiosResponse["config"],
});

/**
 * Sample package data for testing PyPI package information responses.
 * This represents a typical successful response from the PyPI API.
 */
export const samplePackageData = {
  info: {
    name: "requests",
    version: "2.31.0",
    summary: "Python HTTP for Humans.",
    description: "Requests is an elegant and simple HTTP library for Python.",
    home_page: "https://requests.readthedocs.io",
    package_url: "https://pypi.org/project/requests/",
    project_urls: {
      Source: "https://github.com/psf/requests",
      Documentation: "https://requests.readthedocs.io",
    },
    author: "Kenneth Reitz",
    maintainer: "Seth Michael Larson",
    license: "Apache 2.0",
    requires_python: ">=3.7",
  },
  urls: [],
  last_serial: 123456,
};

/**
 * Sample error response for testing error handling scenarios.
 * This represents a typical error response from the PyPI API.
 */
export const sampleErrorResponse = {
  message: "Not Found",
  status: 404,
};

/**
 * Creates a mock MCP request object for testing.
 * This helper ensures consistent request structure across tests.
 *
 * @param params - Request parameters to include
 * @returns A mock MCP request object
 */
export const createMockRequest = (params: Record<string, unknown> = {}) => ({
  params,
  id: "test-request-id",
  jsonrpc: "2.0",
  method: "test-method",
});

/**
 * Utility function to introduce delays in tests.
 * Useful for testing async behavior or simulating network latency.
 *
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the specified delay
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
