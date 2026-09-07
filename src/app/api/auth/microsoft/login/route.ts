import { NextResponse } from "next/server";
import { GRAPH_SCOPES, REDIRECT_URI, msalClient } from "@/lib/msal";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  try {
    if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${APP_URL}/?auth_error=${encodeURIComponent(
          "Microsoft Entra App credentials (MS_CLIENT_ID and MS_CLIENT_SECRET) are missing in .env. Please configure them to connect a live Outlook account.",
        )}`,
      );
    }

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: GRAPH_SCOPES,
      redirectUri: REDIRECT_URI,
    });
    return NextResponse.redirect(authUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Authentication error";
    return NextResponse.redirect(
      `${APP_URL}/?auth_error=${encodeURIComponent(message)}`,
    );
  }
}