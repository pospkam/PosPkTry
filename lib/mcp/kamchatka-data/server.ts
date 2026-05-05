import Anthropic from '@anthropic-ai/sdk';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { parseMchesAlerts } from './sources/mches-telegram.js';
import { parseLocalIncidents } from './sources/local-vk.js';
import { parseTourismObjects } from './sources/tourism-db.js';

const client = new Anthropic();

const server = new Server({
  name: 'kamchatka-data-ingestion',
  version: '1.0.0',
});

const tools: Tool[] = [
  {
    name: 'fetch_mches_alerts',
    description: 'Parse МЧС Telegram channel for recent alerts (landslides, avalanches, closures)',
    inputSchema: {
      type: 'object',
      properties: {
        hours_back: {
          type: 'number',
          description: 'How many hours to look back (default 24)',
        },
      },
    },
  },
  {
    name: 'fetch_local_incidents',
    description: 'Parse local VK/TG communities for incidents (accidents, wildlife, road issues)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max incidents to fetch',
        },
      },
    },
  },
  {
    name: 'fetch_tourism_objects',
    description: 'Parse tourism databases for locations, routes, descriptions',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "volcano", "fishing", "Kamchatka")',
        },
      },
    },
  },
  {
    name: 'extract_structured',
    description: 'Use Claude to extract structured JSON from raw text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Raw text to extract from',
        },
        schema_type: {
          type: 'string',
          enum: ['alert', 'incident', 'location', 'route', 'capacity'],
        },
      },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'fetch_mches_alerts': {
        const alerts = await parseMchesAlerts(args.hours_back || 24);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(alerts, null, 2),
            },
          ],
        };
      }

      case 'fetch_local_incidents': {
        const incidents = await parseLocalIncidents(args.limit || 20);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(incidents, null, 2),
            },
          ],
        };
      }

      case 'fetch_tourism_objects': {
        const objects = await parseTourismObjects(args.query || 'Kamchatka');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(objects, null, 2),
            },
          ],
        };
      }

      case 'extract_structured': {
        const extracted = await structuredExtract(args.text, args.schema_type);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(extracted, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

async function structuredExtract(text: string, schemaType: string): Promise<unknown> {
  const schemas: Record<string, Record<string, unknown>> = {
    alert: {
      type: 'object',
      properties: {
        alert_type: {
          type: 'string',
          enum: ['avalanche', 'landslide', 'road_closed', 'weather', 'wildlife', 'other'],
        },
        severity: { type: 'number' },
        location: { type: 'string' },
        coordinates: {
          type: 'object',
          properties: { lat: { type: 'number' }, lng: { type: 'number' } },
        },
        message: { type: 'string' },
        expires_hours: { type: 'number' },
      },
    },
    location: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        location_type: {
          type: 'string',
          enum: ['volcano', 'hot_spring', 'bay', 'lake', 'mountain', 'river', 'geyser', 'other'],
        },
        coordinates: {
          type: 'object',
          properties: { lat: { type: 'number' }, lng: { type: 'number' } },
        },
        description: { type: 'string' },
        activities: { type: 'array', items: { type: 'string' } },
        difficulty: { type: 'number' },
        best_season: { type: 'string' },
      },
    },
    route: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        difficulty: { type: 'number' },
        duration_hours: { type: 'number' },
        distance_km: { type: 'number' },
        description: { type: 'string' },
      },
    },
    capacity: {
      type: 'object',
      properties: {
        location_name: { type: 'string' },
        capacity_per_day: { type: 'number' },
        capacity_per_hour: { type: 'number' },
        optimal_group_size: { type: 'number' },
        reason: { type: 'string' },
      },
    },
    incident: {
      type: 'object',
      properties: {
        incident_type: {
          type: 'string',
          enum: ['accident', 'wildlife', 'road', 'injury', 'lost', 'other'],
        },
        location: { type: 'string' },
        severity: { type: 'number' },
        message: { type: 'string' },
        date: { type: 'string' },
      },
    },
  };

  const schema = schemas[schemaType] || schemas.alert;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract structured data from this text. Return VALID JSON ONLY (no markdown, no explanation):\n\n${text}\n\nSchema: ${JSON.stringify(schema)}`,
      },
    ],
  });

  const content = response.content.find((c) => c.type === 'text');
  if (!content || content.type !== 'text') throw new Error('No text response');

  try {
    return JSON.parse(content.text);
  } catch {
    return {
      raw: content.text,
      error: 'Failed to parse JSON',
    };
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
