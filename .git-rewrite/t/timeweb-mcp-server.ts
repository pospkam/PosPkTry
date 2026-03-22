#!/usr/bin/env node

/**
 * Timeweb Cloud MCP Server
 * Provides tools for managing Timeweb Cloud Apps via GitHub Copilot
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const TIMEWEB_API = 'https://api.timeweb.cloud/api/v1';
const APP_ID = '159529';
const TOKEN = process.env.TIMEWEB_TOKEN || process.env.TIMEWEB_TOKEN1;

if (!TOKEN) {
  console.error('Error: TIMEWEB_TOKEN or TIMEWEB_TOKEN1 environment variable is required');
  process.exit(1);
}

// Fetch wrapper for Timeweb API
async function timewebFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${TIMEWEB_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Timeweb API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'timeweb-cloud',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_app_status',
        description: 'Get current Timeweb app status, configuration, and deployment info',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_logs',
        description: 'Get build or runtime logs from Timeweb app',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['build', 'runtime'],
              description: 'Type of logs to retrieve',
            },
            limit: {
              type: 'number',
              description: 'Number of log entries to retrieve (default: 50)',
              default: 50,
            },
          },
          required: ['type'],
        },
      },
      {
        name: 'trigger_deploy',
        description: 'Trigger a new deployment of the Timeweb app',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_env_vars',
        description: 'Update environment variables for the Timeweb app',
        inputSchema: {
          type: 'object',
          properties: {
            envs: {
              type: 'object',
              description: 'Environment variables as key-value pairs',
              additionalProperties: {
                type: 'string',
              },
            },
          },
          required: ['envs'],
        },
      },
      {
        name: 'get_deployments',
        description: 'Get list of recent deployments',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of deployments to retrieve (default: 10)',
              default: 10,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_app_status': {
        const status = await timewebFetch(`/apps/${APP_ID}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'get_logs': {
        const logType = (args as any).type || 'runtime';
        const limit = (args as any).limit || 50;
        const logs = await timewebFetch(`/apps/${APP_ID}/logs?type=${logType}&limit=${limit}`);
        
        const formattedLogs = logs.logs
          ?.map((log: any) => `[${log.timestamp}] ${log.message}`)
          .join('\n') || 'No logs found';

        return {
          content: [
            {
              type: 'text',
              text: formattedLogs,
            },
          ],
        };
      }

      case 'trigger_deploy': {
        const result = await timewebFetch(`/apps/${APP_ID}/deployments`, {
          method: 'POST',
        });
        return {
          content: [
            {
              type: 'text',
              text: `✅ Deployment triggered successfully!\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'update_env_vars': {
        const envs = (args as any).envs || {};
        const result = await timewebFetch(`/apps/${APP_ID}`, {
          method: 'PATCH',
          body: JSON.stringify({ envs }),
        });
        return {
          content: [
            {
              type: 'text',
              text: `✅ Environment variables updated!\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'get_deployments': {
        const limit = (args as any).limit || 10;
        const deployments = await timewebFetch(`/apps/${APP_ID}/deployments?limit=${limit}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deployments, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Timeweb Cloud MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
