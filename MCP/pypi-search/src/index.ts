#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

interface PyPISearchResult {
  name: string;
  version: string;
  description: string;
  summary: string;
}

interface PyPISearchResponse {
  results: PyPISearchResult[];
}

interface PyPIPackageInfo {
  info: {
    name: string;
    version: string;
    summary: string;
    description: string;
    author: string;
    license: string;
    project_urls: Record<string, string>;
    home_page: string;
  };
  releases: Record<string, Array<{
    upload_time: string;
    filename: string;
    python_version: string;
  }>>;
  urls: Array<{
    upload_time: string;
  }>;
}

interface PackageDetails {
  name: string;
  version: string;
  summary: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  repository: string;
  lastRelease: string;
  releaseHistory: Array<{
    version: string;
    date: string;
  }>;
  maintenanceScore: number;
  maintenanceStatus: string;
}

class PyPISearchServer {
  private server: Server;
  private axiosInstance;
  private readonly relevantTerms = [
    'scene', 'detect', 'split', 'segment', 'video', 'frame', 'shot', 'boundary',
    'temporal', 'sequence', 'transition', 'cut', 'keyframe', 'visual'
  ];

  constructor() {
    this.server = new Server(
      {
        name: 'pypi-search',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://pypi.org',
      timeout: 10000,
    });

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async searchPackages(query: string): Promise<string[]> {
    const response = await this.axiosInstance.get<{ names: string[] }>(
      `/simple/-/all/json`
    );

    // Generate search terms from query and our relevant terms
    const searchTerms = new Set([
      ...query.toLowerCase().split(/\s+/),
      ...this.relevantTerms
    ]);

    // Score each package name based on how many search terms it contains
    const scoredPackages = response.data.names.map(name => {
      const nameLower = name.toLowerCase();
      const score = Array.from(searchTerms).reduce((count, term) =>
        nameLower.includes(term) ? count + 1 : count, 0
      );
      return { name, score };
    });

    // Filter packages with at least one matching term and sort by score
    return scoredPackages
      .filter(pkg => pkg.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(pkg => pkg.name);
  }

  private async getPackageInfo(packageName: string): Promise<PyPIPackageInfo> {
    const response = await this.axiosInstance.get<PyPIPackageInfo>(`/pypi/${packageName}/json`);
    return response.data;
  }

  private calculateMaintenanceScore(releaseHistory: Array<{ date: string }>): number {
    if (releaseHistory.length === 0) return 0;

    const now = new Date();
    const lastRelease = new Date(releaseHistory[0].date);
    const monthsSinceLastRelease = (now.getTime() - lastRelease.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Calculate release frequency over the last year
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const releasesLastYear = releaseHistory.filter(
      release => new Date(release.date) > oneYearAgo
    ).length;

    // Score based on recency (max 50 points)
    const recencyScore = Math.max(0, 50 - monthsSinceLastRelease * 2);

    // Score based on frequency (max 50 points)
    const frequencyScore = Math.min(50, releasesLastYear * 5);

    return Math.round(recencyScore + frequencyScore);
  }

  private getMaintenanceStatus(score: number): string {
    if (score >= 80) return "Actively maintained";
    if (score >= 60) return "Regularly maintained";
    if (score >= 40) return "Occasionally maintained";
    if (score >= 20) return "Minimally maintained";
    return "Poorly maintained";
  }

  private isRelevantPackage(details: PackageDetails): boolean {
    const textToSearch = [
      details.name.toLowerCase(),
      details.summary?.toLowerCase() || '',
      details.description?.toLowerCase() || ''
    ].join(' ');

    // Check for video-related terms
    const hasVideoTerm = textToSearch.includes('video');

    // Check for scene/segment/split related terms
    const hasSceneTerm = this.relevantTerms.some(term =>
      textToSearch.includes(term)
    );

    // Check for negative indicators
    const hasNegativeTerms = [
      'convert', 'compression', 'codec', 'format', 'player', 'streaming'
    ].some(term => textToSearch.includes(term) &&
      !textToSearch.includes('scene') &&
      !textToSearch.includes('detect') &&
      !textToSearch.includes('split'));

    return hasVideoTerm && hasSceneTerm && !hasNegativeTerms;
  }

  private async getPackageDetails(packageName: string): Promise<PackageDetails> {
    const info = await this.getPackageInfo(packageName);

    // Sort releases by date
    const releaseHistory = Object.entries(info.releases)
      .flatMap(([version, releases]) =>
        releases.map(release => ({
          version,
          date: release.upload_time
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const maintenanceScore = this.calculateMaintenanceScore(releaseHistory);

    return {
      name: info.info.name,
      version: info.info.version,
      summary: info.info.summary,
      description: info.info.description,
      author: info.info.author,
      license: info.info.license,
      homepage: info.info.home_page || '',
      repository: info.info.project_urls?.['Source'] || info.info.project_urls?.['Repository'] || '',
      lastRelease: releaseHistory[0]?.date || 'No releases found',
      releaseHistory: releaseHistory.slice(0, 10), // Last 10 releases
      maintenanceScore,
      maintenanceStatus: this.getMaintenanceStatus(maintenanceScore)
    };
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_packages',
          description: 'Search PyPI for packages with detailed information about maintenance status',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for finding packages',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 100)',
                minimum: 1,
                maximum: 200,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_package_details',
          description: 'Get detailed information about a specific package including maintenance status',
          inputSchema: {
            type: 'object',
            properties: {
              package_name: {
                type: 'string',
                description: 'Name of the package to get details for',
              },
            },
            required: ['package_name'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_packages': {
            const { query, limit = 100 } = request.params.arguments as {
              query: string;
              limit?: number;
            };

            const packageNames = await this.searchPackages(query);
            const detailedResults = await Promise.all(
              packageNames.slice(0, limit).map(async name => {
                try {
                  return await this.getPackageDetails(name);
                } catch (error) {
                  console.error(`Error fetching details for ${name}:`, error);
                  return null;
                }
              })
            );

            const validResults = detailedResults
              .filter((result): result is PackageDetails =>
                result !== null && this.isRelevantPackage(result)
              )
              .sort((a, b) => b.maintenanceScore - a.maintenanceScore);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(validResults, null, 2),
                },
              ],
            };
          }

          case 'get_package_details': {
            const { package_name } = request.params.arguments as {
              package_name: string;
            };

            const details = await this.getPackageDetails(package_name);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(details, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof Error && axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Package not found',
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: `PyPI API error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PyPI Search MCP server running on stdio');
  }
}

const server = new PyPISearchServer();
server.run().catch(console.error);
