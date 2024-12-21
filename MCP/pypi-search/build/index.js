import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
class PyPISearchServer {
    constructor() {
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
                    name: 'get_package_details',
                    description: 'Get detailed information about a specific package including maintenance status',
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
                    case 'get_package_details': {
                        // Input validation
                        if (!args?.package_name) {
                            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: package_name');
                        }
                        const trimmedName = args.package_name.trim();
                        if (trimmedName === '') {
                            throw new McpError(ErrorCode.InvalidParams, 'Invalid package name: cannot be empty');
                        }
                        try {
                            const details = await this.getPackageDetails(trimmedName);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(details, null, 2)
                                    }]
                            };
                        }
                        catch (error) {
                            if (error instanceof Error && 'response' in error) {
                                if (error.response?.status === 404) {
                                    return {
                                        content: [{
                                                type: 'text',
                                                text: JSON.stringify({ message: "Not Found" })
                                            }],
                                        isError: true
                                    };
                                }
                            }
                            throw error;
                        }
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                console.error('Error:', error);
                // Handle validation errors
                if (error instanceof McpError) {
                    return {
                        content: [{
                                type: 'text',
                                text: error.message
                            }],
                        isError: true
                    };
                }
                // Handle API errors
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
                // Handle unexpected errors
                console.error('Unexpected error:', error);
                return {
                    content: [{
                            type: 'text',
                            text: 'An unexpected error occurred'
                        }],
                    isError: true
                };
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