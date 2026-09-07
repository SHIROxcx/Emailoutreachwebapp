import { NextResponse } from "next/server";
import { GRAPH_SCOPES, REDIRECT_URI, msalClient } from "@/lib/msal";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: GRAPH_SCOPES,
    redirectUri: REDIRECT_URI,
  });
  return NextResponse.redirect(authUrl);
}