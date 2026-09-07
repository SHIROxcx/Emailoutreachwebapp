import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sendMail } from "@/lib/graph";
import { GRAPH_SCOPES, msalClient } from "@/lib/msal";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toEmail, subject, bodyText } = body;

    if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid recipient email address." },
        { status: 400 },
      );
    }

    const connection = await prisma.mailboxConnection.findFirst();
    if (!connection) {
      return NextResponse.json(
        { error: "No connected Outlook mailbox found. Please connect an account first." },
        { status: 400 },
      );
    }

    // Daily quota safety check
    const DAILY_LIMIT = 50;
    if (connection.dailySendCount >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `Daily sending limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Wait until midnight UTC for reset to protect your sender score.`,
        },
        { status: 429 },
      );
    }

    const isDemo =
      connection.msAccountEmail.startsWith("demo.") ||
      connection.msAccountEmail.endsWith("@example.com") ||
      !process.env.MS_CLIENT_ID;

    let messageId = `simulated_${Date.now()}`;

    if (!isDemo) {
      // Real Microsoft Graph dispatch
      let accessToken = decryptSecret(connection.accessTokenEncrypted);

      // Pre-flight token expiration check (refresh if within 2 minutes of expiring)
      const now = new Date();
      if (connection.tokenExpiresAt.getTime() - now.getTime() < 120_000) {
        const refreshToken = decryptSecret(connection.refreshTokenEncrypted);
        const refreshed = await msalClient.acquireTokenByRefreshToken({
          scopes: GRAPH_SCOPES,
          refreshToken,
        });

        if (!refreshed?.accessToken) {
          throw new Error("Could not refresh expired Microsoft access token");
        }

        accessToken = refreshed.accessToken;
        const newAccessTokenEncrypted = encryptSecret(accessToken);
        const newExpiresAt = new Date(
          (refreshed.expiresOn ?? new Date()).getTime() - 60_000,
        );

        await prisma.mailboxConnection.update({
          where: { id: connection.id },
          data: {
            accessTokenEncrypted: newAccessTokenEncrypted,
            tokenExpiresAt: newExpiresAt,
          },
        });
      }

      await sendMail(accessToken, {
        toEmail,
        subject: subject || "Test Email from Outreach Scheduler",
        bodyText: bodyText || "Hello! This is a test message confirming your Outlook connection works.",
      });

      messageId = `graph_${Date.now()}`;
    }

    // Increment daily send count and log dispatch
    const updated = await prisma.mailboxConnection.update({
      where: { id: connection.id },
      data: {
        dailySendCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      messageId,
      dailySendCount: updated.dailySendCount,
      dailyLimit: DAILY_LIMIT,
      isDemo,
      sentTo: toEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
