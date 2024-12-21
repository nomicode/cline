import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
class PyPISearchServer {
    constructor() {
        this.packageCache = null;
        this.lastCacheUpdate = 0;
        this.CACHE_TTL = 3600000; // 1 hour in milliseconds
        this.server = new Server({
            name: 'pypi-search',
            version: '0.1.0'
        }, {
            capabilities: {
                tools: {}
            }
        });
        this.axiosInstance = axios.create({
            baseURL: 'https://pypi.org',
            timeout: 10000
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    async getAllPackages() {
        const now = Date.now();
        if (this.packageCache && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
            return this.packageCache;
        }
        try {
            const response = await this.axiosInstance.get('/simple/', {
                headers: {
                    'Accept': 'text/html'
                }
            });
            // Extract package names from HTML response
            const html = response.data;
            const packageNames = html.match(/href="([^"]+)"/g)?.map(href => {
                const match = href.match(/href="([^"]+)"/);
                return match ? decodeURIComponent(match[1].replace(/\/$/, '')) : '';
            }).filter(name => name) || [];
            this.packageCache = packageNames;
            this.lastCacheUpdate = now;
            return packageNames;
        }
        catch (error) {
            console.error('Error fetching package list:', error);
            if (this.packageCache) {
                console.warn('Using stale package cache');
                return this.packageCache;
            }
            throw error;
        }
    }
    async searchPackages(query, limit = 100) {
        const packages = await this.getAllPackages();
        const results = [];
        // First look for exact matches
        const exactMatches = packages.filter(pkg => pkg.toLowerCase() === query.toLowerCase());
        exactMatches.forEach(name => {
            results.push({ name, score: 1.0 });
        });
        // If we need more results, look for packages containing the query
        if (results.length < limit) {
            const partialMatches = packages
                .filter(pkg => !exactMatches.includes(pkg) &&
                pkg.toLowerCase().includes(query.toLowerCase()))
                .map(name => ({
                name,
                score: 0.5 // Lower score for partial matches
            }));
            results.push(...partialMatches);
        }
        return results
            .sort((a, b) => b.score - a.score)
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
                    description: 'Search PyPI packages by name',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Package name to search for'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results (default: 100)',
                                minimum: 1,
                                maximum: 500
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'get_package_details',
                    description: 'Get detailed information about a specific package',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            package_name: {
                                type: 'string',
                                description: 'Name of the package'
                            }
                        },
                        required: ['package_name']
                    }
                }
            ]
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                switch (name) {
                    case 'search_packages': {
                        const query = args?.query;
                        const limit = args?.limit;
                        if (!query) {
                            throw new McpError(ErrorCode.InvalidParams, 'Query is required');
                        }
                        const results = await this.searchPackages(query, limit);
                        if (results.length === 0) {
                            return {
                                content: [{
                                        type: 'text',
                                        text: 'No packages found matching the search criteria.'
                                    }]
                            };
                        }
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify(results, null, 2)
                                }]
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
                                    text: JSON.stringify(details, null, 2)
                                }]
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
                                    text: 'Package not found'
                                }],
                            isError: true
                        };
                    }
                    return {
                        content: [{
                                type: 'text',
                                text: `PyPI API error: ${error.message}`
                            }],
                        isError: true
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