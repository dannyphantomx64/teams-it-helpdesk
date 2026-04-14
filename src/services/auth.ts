import { ClientSecretCredential } from '@azure/identity';
import { config } from '../config/config';

let credential: ClientSecretCredential | null = null;

export function getCredential(): ClientSecretCredential {
  if (!credential) {
    credential = new ClientSecretCredential(
      config.azureAdTenantId,
      config.azureAdClientId,
      config.azureAdClientSecret,
    );
  }
  return credential;
}

export async function getAccessToken(scopes: string[]): Promise<string> {
  const token = await getCredential().getToken(scopes);
  return token.token;
}
