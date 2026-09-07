import { Client } from "@microsoft/microsoft-graph-client";

export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function getMyProfile(accessToken: string) {
  const result = await createGraphClient(accessToken)
    .api("/me")
    .select("id,userPrincipalName,mail,displayName")
    .get();
  return result as {
    id: string;
    userPrincipalName?: string;
    mail?: string;
    displayName?: string;
  };
}