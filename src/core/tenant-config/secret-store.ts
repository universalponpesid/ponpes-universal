/** Server-side adapter contract. Secret values must never leave the server. */
export interface SecretStore {
  getSecret(secretRef: string): Promise<string>;
}
