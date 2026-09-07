import { NextRequest, NextResponse } from "next/server";
import { GRAPH_SCOPES, REDIRECT_URI, extractRefreshTokenFromCache, msalClient } from "@/lib/msal";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { getMyProfile } from "@/lib/graph";
import { upsertDemoUser } from "@/lib/demo-user";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error || !code) {
    return NextResponse.redirect(
      `${APP_URL}/?auth_error=${encodeURIComponent(
        errorDescription ?? error ?? "missing_code",
      )}`,
    );
  }

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      scopes: GRAPH_SCOPES,
      redirectUri: REDIRECT_URI,
      code,
    });

    const profile = await getMyProfile(tokenResponse.accessToken);
    const accountEmail = (profile.mail ?? profile.userPrincipalName ?? "").toLowerCase();
    if (!accountEmail) {
      throw new Error("Could not determine connected account email");
    }

    const { id: userId } = await upsertDemoUser(accountEmail);

    const accessTokenEncrypted = encryptSecret(tokenResponse.accessToken);
    const refreshToken = extractRefreshTokenFromCache();
    if (!refreshToken) {
      throw new Error("No refresh token returned from Microsoft");
    }
    const refreshTokenEncrypted = encryptSecret(refreshToken);
    const tokenExpiresAt = new Date(
      (tokenResponse.expiresOn ?? new Date()).getTime() - 60_000,
    );

    const existing = await prisma.mailboxConnection.findFirst({
      where: { msAccountEmail: accountEmail },
    });

    const data = {
      userId,
      msAccountEmail: accountEmail,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      status: "connected",
    };

    if (existing) {
      await prisma.mailboxConnection.update({ where: { id: existing.id }, data });
    } else {
      await prisma.mailboxConnection.create({ data });
    }

    return NextResponse.redirect(
      `${APP_URL}/?connected=1&mailbox=${encodeURIComponent(accountEmail)}`,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.redirect(
      `${APP_URL}/?auth_error=${encodeURIComponent(message)}`,
    );
  }
}