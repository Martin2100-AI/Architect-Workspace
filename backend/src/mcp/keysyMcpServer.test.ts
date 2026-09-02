import { Sequelize } from 'sequelize';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { MlsClient } from '../services/mlsClient';
import { initTourRequestModel, TourRequest } from '../models/TourRequest';
import { createKeysyMcpServer } from './keysyMcpServer';
import { Property } from '../types/property';

interface CapturedLog {
  level: string;
  data: Record<string, unknown>;
}

function collectLogs(client: Client): CapturedLog[] {
  const logs: CapturedLog[] = [];
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    logs.push({
      level: notification.params.level,
      data: notification.params.data as Record<string, unknown>,
    });
  });
  return logs;
}

const sampleProperty: Property = {
  id: 'stub-1',
  imageUrl: 'https://example.com/1.jpg',
  listingPrice: 425000,
  address: '123 Maple St, Springfield, IL',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1850,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2650,
};

function fakeMlsClient(properties: Property[]): MlsClient {
  return { getPropertyFeed: async () => properties };
}

function futureIsoDatetime(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

describe('createKeysyMcpServer', () => {
  let sequelize: Sequelize;
  let tourRequestModel: typeof TourRequest;
  let client: Client;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    tourRequestModel = initTourRequestModel(sequelize);
    await sequelize.sync();

    const server = createKeysyMcpServer({ mlsClient: fakeMlsClient([sampleProperty]), tourRequestModel });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.1.0' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await sequelize.close();
  });

  it('resource keysy-property returns the property as JSON', async () => {
    const result = await client.readResource({ uri: 'keysy://properties/stub-1' });

    const content = result.contents[0] as { text: string; mimeType?: string };
    const parsed = JSON.parse(content.text);
    expect(parsed).toEqual(sampleProperty);
    expect(content.mimeType).toBe('application/json');
  });

  it('tool schedule_property_tour creates a tour request', async () => {
    const requestedDatetime = futureIsoDatetime();

    const result = await client.callTool({
      name: 'schedule_property_tour',
      arguments: {
        property_id: 'stub-1',
        requested_datetime: requestedDatetime,
        buyer_email: 'buyer@example.com',
      },
    });

    expect(result.isError).not.toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.property_id).toBe('stub-1');
    expect(parsed.buyer_email).toBe('buyer@example.com');
    expect(parsed.already_scheduled).toBe(false);
  });

  it('tool schedule_property_tour is idempotent for the same property/buyer/time', async () => {
    const requestedDatetime = futureIsoDatetime();
    const args = { property_id: 'stub-1', requested_datetime: requestedDatetime, buyer_email: 'buyer@example.com' };

    const first = await client.callTool({ name: 'schedule_property_tour', arguments: args });
    const second = await client.callTool({ name: 'schedule_property_tour', arguments: args });

    const firstParsed = JSON.parse((first.content as Array<{ text: string }>)[0].text);
    const secondParsed = JSON.parse((second.content as Array<{ text: string }>)[0].text);
    expect(secondParsed.tour_id).toBe(firstParsed.tour_id);
    expect(secondParsed.already_scheduled).toBe(true);
    await expect(tourRequestModel.count()).resolves.toBe(1);
  });

  it('tool schedule_property_tour returns an error result for an unknown property', async () => {
    const result = await client.callTool({
      name: 'schedule_property_tour',
      arguments: {
        property_id: 'does-not-exist',
        requested_datetime: futureIsoDatetime(),
        buyer_email: 'buyer@example.com',
      },
    });

    expect(result.isError).toBe(true);
  });

  it('tool schedule_property_tour emits notifications/progress when the caller supplies a progress token', async () => {
    const updates: Array<{ progress: number; total?: number; message?: string }> = [];

    await client.callTool(
      {
        name: 'schedule_property_tour',
        arguments: {
          property_id: 'stub-1',
          requested_datetime: futureIsoDatetime(),
          buyer_email: 'buyer@example.com',
        },
      },
      undefined,
      { onprogress: (progress) => updates.push(progress) },
    );

    expect(updates).toEqual([
      { progress: 1, total: 3, message: 'Looking up property stub-1' },
      { progress: 2, total: 3, message: 'Validating requested tour time' },
      { progress: 3, total: 3, message: 'Recording tour request for buyer@example.com' },
    ]);
  });

  it('prompt confirm-property-tour drafts a message referencing the property', async () => {
    const requestedDatetime = futureIsoDatetime();

    const result = await client.getPrompt({
      name: 'confirm-property-tour',
      arguments: { property_id: 'stub-1', requested_datetime: requestedDatetime },
    });

    const messageText = (result.messages[0].content as { text: string }).text;
    expect(messageText).toContain('123 Maple St, Springfield, IL');
    expect(messageText).toContain(requestedDatetime);
  });

  it('tool schedule_property_tour emits structured logs sharing one correlation id, with no buyer email in the payload', async () => {
    const logs = collectLogs(client);

    await client.callTool({
      name: 'schedule_property_tour',
      arguments: {
        property_id: 'stub-1',
        requested_datetime: futureIsoDatetime(),
        buyer_email: 'buyer@example.com',
      },
    });

    expect(logs.length).toBeGreaterThan(0);
    const correlationIds = new Set(logs.map((entry) => entry.data.correlation_id));
    expect(correlationIds.size).toBe(1);

    const eventNames = logs.map((entry) => entry.data.event);
    expect(eventNames).toEqual([
      'invocation_start',
      'external_call_start',
      'external_call_finished',
      'invocation_finished',
    ]);

    for (const entry of logs) {
      expect(JSON.stringify(entry.data)).not.toContain('buyer@example.com');
    }
  });

  it('resource keysy-property logs a failed lookup with a stable error class and does not throw out of the logger', async () => {
    const logs = collectLogs(client);

    await expect(client.readResource({ uri: 'keysy://properties/does-not-exist' })).rejects.toThrow();

    const errorEvent = logs.find((entry) => entry.data.event === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.data.error_class).toBe('PropertyNotFoundError');
    expect(errorEvent?.data.surface).toBe('resource');
  });
});
