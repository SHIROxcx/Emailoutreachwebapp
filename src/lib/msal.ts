import { ConfidentialClientApplication } from "@azure/msal-node";

export const GRAPH_SCOPES = [
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
];

export const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/microsoft/callback`;

function buildMsalClient(): ConfidentialClientApplication {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MS_CLIENT_ID and MS_CLIENT_SECRET must be set");
  }
  const tenant = process.env.MS_TENANT_ID ?? "consumers";
  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenant}`,
    },
  });
}

export const msalClient = buildMsalClient();

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