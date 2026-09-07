import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertDemoUser } from "@/lib/demo-user";
import { encryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  try {
    const demoEmail = "demo.outreach@outlook.com";
    const { id: userId } = await upsertDemoUser(demoEmail);

    const dummyAccessToken = "mock_access_token_demo_" + Date.now();
    const dummyRefreshToken = "mock_refresh_token_demo_" + Date.now();

    const accessTokenEncrypted = encryptSecret(dummyAccessToken);
    const refreshTokenEncrypted = encryptSecret(dummyRefreshToken);
    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000 * 24 * 30);

    const existing = await prisma.mailboxConnection.findFirst({
      where: { msAccountEmail: demoEmail },
    });

    const data = {
      userId,
      msAccountEmail: demoEmail,
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
      `${APP_URL}/?connected=1&mailbox=${encodeURIComponent(demoEmail)}`,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to connect demo account";
    return NextResponse.redirect(
      `${APP_URL}/?auth_error=${encodeURIComponent(message)}`,
    );
  }
}
