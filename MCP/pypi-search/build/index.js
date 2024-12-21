import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
class PyPISearchServer {
    constructor() {
        this.server = new Server({
            name: 'pypi-search',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.axiosInstance = axios.create({
            baseURL: 'https://pypi.org',
            timeout: 10000,
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    calculateSimilarityScore(str1, str2) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        if (str1 === str2)
            return 1;
        if (str1.includes(str2) || str2.includes(str1))
            return 0.9;
        const words1 = str1.split(/[\W_]+/);
        const words2 = str2.split(/[\W_]+/);
        let matches = 0;
        words1.forEach(word1 => {
            words2.forEach(word2 => {
                if (word1.length > 2 && word2.length > 2) {
                    if (word1.includes(word2) || word2.includes(word1))
                        matches += 0.5;
                    if (this.areWordsRelated(word1, word2))
                        matches += 0.3;
                }
            });
        });
        return Math.min(1, matches / Math.max(words1.length, words2.length));
    }
    areWordsRelated(word1, word2) {
        const variations = [
            [word1, word1 + 's'],
            [word1, word1 + 'es'],
            [word1, word1 + 'er'],
            [word1, word1 + 'or'],
            [word1, word1 + 'able'],
            [word1, word1 + 'ible'],
            [word1, word1 + 'util'],
            [word1, word1 + 'utils'],
            [word1, word1 + 'helper'],
            [word1, word1 + 'handler'],
            [word1, word1 + 'manager'],
            [word1, 'py' + word1],
            [word1, word1 + 'py'],
            [word1, word1 + 'lib'],
            [word1, 'lib' + word1],
            // Common Python package naming patterns
            [word1, word1.replace('-', '_')],
            [word1, word1.replace('_', '-')],
            [word1, 'python-' + word1],
            [word1, 'python_' + word1],
            [word1, word1 + '-python'],
            [word1, word1 + '_python'],
        ];
        return variations.some(([base, variant]) => word2 === variant || word2 === base);
    }
    async searchPackages(query, alternativeTerms = [], limit = 100) {
        // Combine all search terms
        const searchTerms = [query, ...alternativeTerms];
        // Search results for each term
        const allResults = new Map();
        for (const term of searchTerms) {
            try {
                // Use the XML-RPC search API
                const response = await this.axiosInstance.get('/pypi', {
                    params: {
                        action: 'search',
                        term: term,
                        type: 'package',
                        'submit.x': 0,
                        'submit.y': 0,
                    },
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                const searchResults = response.data;
                if (Array.isArray(searchResults)) {
                    for (const pkg of searchResults) {
                        if (!allResults.has(pkg.name)) {
                            const score = this.calculateSimilarityScore(pkg.name, query);
                            if (score > 0.2) { // Minimum relevance threshold
                                allResults.set(pkg.name, {
                                    name: pkg.name,
                                    searchScore: score,
                                    summary: pkg.summary,
                                });
                            }
                        }
                    }
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Error searching for term "${term}":`, error.message);
                    if ('response' in error && error.response) {
                        console.error('Response:', error.response);
                    }
                }
            }
        }
        // Sort by search score and limit results
        return Array.from(allResults.values())
            .sort((a, b) => b.searchScore - a.searchScore)
            .slice(0, limit);
    }
    async getPackageInfo(packageName) {
        const response = await this.axiosInstance.get(`/pypi/${packageName}/json`);
        return response.data;
    }
    calculateMaintenanceScore(releaseHistory) {
        if (releaseHistory.length === 0)
            return 0;
        const now = new Date();
        const lastRelease = new Date(releaseHistory[0].date);
        const monthsSinceLastRelease = (now.getTime() - lastRelease.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const releasesLastYear = releaseHistory.filter(release => new Date(release.date) > oneYearAgo).length;
        const recencyScore = Math.max(0, 50 - monthsSinceLastRelease * 2);
        const frequencyScore = Math.min(50, releasesLastYear * 5);
        return Math.round(recencyScore + frequencyScore);
    }
    getMaintenanceStatus(score) {
        if (score >= 80)
            return "Actively maintained";
        if (score >= 60)
            return "Regularly maintained";
        if (score >= 40)
            return "Occasionally maintained";
        if (score >= 20)
            return "Minimally maintained";
        return "Poorly maintained";
    }
    async getPackageDetails(packageName) {
        const info = await this.getPackageInfo(packageName);
        const releaseHistory = Object.entries(info.releases)
            .flatMap(([version, releases]) => releases.map(release => ({
            version,
            date: release.upload_time
        })))
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
            releaseHistory: releaseHistory.slice(0, 10),
            maintenanceScore,
            maintenanceStatus: this.getMaintenanceStatus(maintenanceScore)
        };
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search_packages',
                    description: 'Search PyPI packages with semantic search capabilities',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Primary search query',
                            },
                            alternativeTerms: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: 'Alternative search terms or patterns (e.g., ["video-split", "video_splitter", "split_video"])',
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results (default: 100)',
                                minimum: 1,
                                maximum: 500,
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'get_package_details',
                    description: 'Get detailed package information including maintenance status',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            package_name: {
                                type: 'string',
                                description: 'Name of the package',
                            },
                        },
                        required: ['package_name'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                switch (name) {
                    case 'search_packages': {
                        const query = args?.query;
                        const alternativeTerms = args?.alternativeTerms;
                        const limit = args?.limit;
                        if (!query) {
                            throw new McpError(ErrorCode.InvalidParams, 'Query is required');
                        }
                        const results = await this.searchPackages(query, alternativeTerms, limit);
                        if (results.length === 0) {
                            return {
                                content: [{
                                        type: 'text',
                                        text: 'No packages found matching the search criteria.',
                                    }],
                            };
                        }
                        const detailedResults = await Promise.all(results.map(async (result) => {
                            try {
                                const details = await this.getPackageDetails(result.name);
                                return { ...details, searchScore: result.searchScore };
                            }
                            catch (error) {
                                console.error(`Error fetching details for ${result.name}:`, error);
                                return null;
                            }
                        }));
                        const validResults = detailedResults.filter((r) => r !== null);
                        if (validResults.length === 0) {
                            return {
                                content: [{
                                        type: 'text',
                                        text: 'No valid package details found.',
                                    }],
                            };
                        }
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify(validResults, null, 2),
                                }],
                        };
                    }
                    case 'get_package_details': {
                        const packageName = args?.package_name;
                        if (!packageName) {
                            throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
                        }
                        const details = await this.getPackageDetails(packageName);
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify(details, null, 2),
                                }],
                        };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                console.error('Error:', error);
                if (error instanceof McpError) {
                    throw error;
                }
                if (error instanceof Error && 'response' in error) {
                    console.error('Full error:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        headers: error.response?.headers
                    });
                    if (error.response?.status === 404) {
                        return {
                            content: [{
                                    type: 'text',
                                    text: 'Package not found',
                                }],
                            isError: true,
                        };
                    }
                    return {
                        content: [{
                                type: 'text',
                                text: `PyPI API error: ${error.message}`,
                            }],
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
//# sourceMappingURL=index.js.map