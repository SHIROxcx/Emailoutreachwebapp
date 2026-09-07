import { ConfidentialClientApplication } from "@azure/msal-node";

export const GRAPH_SCOPES = [
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
];

export const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/microsoft/callback`;

let _msalClient: ConfidentialClientApplication | null = null;

export function getMsalClient(): ConfidentialClientApplication {
  if (!_msalClient) {
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("MS_CLIENT_ID and MS_CLIENT_SECRET must be set");
    }
    const tenant = process.env.MS_TENANT_ID ?? "consumers";
    _msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenant}`,
      },
    });
  }
  return _msalClient;
}

export const msalClient = new Proxy({} as ConfidentialClientApplication, {
  get(_target, prop) {
    const client = getMsalClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

export function extractRefreshTokenFromCache(): string | null {
  const serialized = msalClient.getTokenCache().serialize();
  const parsed = JSON.parse(serialized) as {
    RefreshToken?: Record<string, { secret?: string }>;
  };
  const tokens = parsed.RefreshToken ?? {};
  const keys = Object.keys(tokens);
  if (keys.length === 0) {
    return null;
  }
  return tokens[keys[0]].secret ?? null;
}