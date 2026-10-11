import "server-only";

import { google } from "googleapis";
import type { SecretStore } from "@/core/tenant-config/secret-store";

const SECRET_RESOURCE_PATTERN = /^projects\/[a-zA-Z0-9.-]+\/secrets\/[a-zA-Z0-9_-]+\/versions\/(?:latest|[1-9][0-9]*)$/;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} wajib diisi untuk Google Secret Manager.`);
  return value;
}

function getPrivateKey(): string {
  return requiredEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
}

/**
 * Resolves references such as projects/my-project/secrets/tenant-midtrans/versions/latest.
 * Uses the server service account and never logs or returns a secret to client code.
 */
export class GoogleSecretManagerStore implements SecretStore {
  async getSecret(secretRef: string): Promise<string> {
    const resource = secretRef.trim();
    if (!SECRET_RESOURCE_PATTERN.test(resource)) {
      throw new Error("secret_ref harus berupa resource Google Secret Manager yang valid.");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
        private_key: getPrivateKey(),
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken.token) throw new Error("Tidak dapat memperoleh token akses Secret Manager.");

    const response = await fetch(`https://secretmanager.googleapis.com/v1/${resource}:access`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const body = (await response.json()) as {
      payload?: { data?: string };
      error?: { message?: string };
    };
    if (!response.ok || !body.payload?.data) {
      throw new Error(body.error?.message ?? "Secret Manager tidak dapat mengambil secret yang diminta.");
    }

    const value = Buffer.from(body.payload.data, "base64").toString("utf8");
    if (!value.trim()) throw new Error("Secret yang dirujuk kosong.");
    return value;
  }
}
