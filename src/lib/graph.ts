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

export async function sendMail(
  accessToken: string,
  options: {
    toEmail: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
  },
) {
  const client = createGraphClient(accessToken);
  const message = {
    message: {
      subject: options.subject,
      body: {
        contentType: options.bodyHtml ? "HTML" : "Text",
        content: options.bodyHtml ?? options.bodyText,
      },
      toRecipients: [
        {
          emailAddress: {
            address: options.toEmail,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  return client.api("/me/sendMail").post(message);
}