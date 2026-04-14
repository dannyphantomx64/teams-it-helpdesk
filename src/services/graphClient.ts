import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './auth';

let client: Client | null = null;

export function getGraphClient(): Client {
  if (!client) {
    client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await getAccessToken(['https://graph.microsoft.com/.default']);
          done(null, token);
        } catch (err) {
          done(err as Error, null);
        }
      },
    });
  }
  return client;
}
