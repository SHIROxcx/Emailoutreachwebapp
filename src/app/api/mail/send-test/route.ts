import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sendMail } from "@/lib/graph";
import { GRAPH_SCOPES, msalClient } from "@/lib/msal";
import { renderTemplate } from "@/lib/template-engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      toEmail,
      subject,
      bodyText,
      mergeVariables,
      simulationScenario,
    } = body;

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

    // Resolve template variables and spintax for test preview
    const vars: Record<string, string | undefined> = {
      email: toEmail,
      firstName: mergeVariables?.firstName || undefined,
      lastName: mergeVariables?.lastName || undefined,
      company: mergeVariables?.company || undefined,
      ...mergeVariables,
    };

    const resolvedSubject = renderTemplate(
      subject || "Test Email from Outreach Scheduler",
      vars,
    );
    const resolvedBody = renderTemplate(
      bodyText || "Hello! This test confirms that your Outlook sending pipeline is working properly via Microsoft Graph.",
      vars,
    );

    // Test Parameter Scenario: Simulate Throttling (HTTP 429)
    if (simulationScenario === "rate_limit_429") {
      const failedLog = await prisma.sendLog.create({
        data: {
          recipientEmail: toEmail,
          subject: resolvedSubject,
          bodyPreview: resolvedBody,
          campaignName: null,
          isTest: true,
          enrollmentId: null,
          stepId: null,
          graphMessageId: `sim_429_${Date.now()}`,
          status: "failed",
          errorMessage: "Microsoft Graph HTTP 429: Rate limit quota exceeded (simulated test scenario).",
        },
      });

      return NextResponse.json(
        {
          error: "Simulated Microsoft Graph HTTP 429: Sending rate limit exceeded. Retry queued with exponential backoff.",
          log: {
            id: failedLog.id,
            recipientEmail: failedLog.recipientEmail,
            subject: failedLog.subject,
            bodyPreview: failedLog.bodyPreview,
            campaignName: failedLog.campaignName,
            isTest: failedLog.isTest,
            sentAt: failedLog.sentAt.toISOString(),
            graphMessageId: failedLog.graphMessageId,
            status: failedLog.status,
          },
        },
        { status: 429 },
      );
    }

    // Test Parameter Scenario: Simulate Server Error (HTTP 500)
    if (simulationScenario === "server_error_500") {
      const failedLog = await prisma.sendLog.create({
        data: {
          recipientEmail: toEmail,
          subject: resolvedSubject,
          bodyPreview: resolvedBody,
          campaignName: null,
          isTest: true,
          enrollmentId: null,
          stepId: null,
          graphMessageId: `sim_500_${Date.now()}`,
          status: "failed",
          errorMessage: "Microsoft Graph HTTP 500: Internal server error (simulated test scenario).",
        },
      });

      return NextResponse.json(
        {
          error: "Simulated Microsoft Graph HTTP 500: Mailbox API internal failure.",
          log: {
            id: failedLog.id,
            recipientEmail: failedLog.recipientEmail,
            subject: failedLog.subject,
            bodyPreview: failedLog.bodyPreview,
            campaignName: failedLog.campaignName,
            isTest: failedLog.isTest,
            sentAt: failedLog.sentAt.toISOString(),
            graphMessageId: failedLog.graphMessageId,
            status: failedLog.status,
          },
        },
        { status: 500 },
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
        subject: resolvedSubject,
        bodyText: resolvedBody,
      });

      messageId = `graph_${Date.now()}`;
    }

    // Increment daily send count
    const updated = await prisma.mailboxConnection.update({
      where: { id: connection.id },
      data: {
        dailySendCount: { increment: 1 },
      },
    });

    // Record send log entry for full dashboard activity visibility
    const sendLog = await prisma.sendLog.create({
      data: {
        recipientEmail: toEmail,
        subject: resolvedSubject,
        bodyPreview: resolvedBody,
        campaignName: null,
        isTest: true,
        enrollmentId: null,
        stepId: null,
        graphMessageId: messageId,
        status: isDemo ? "simulated" : "sent",
      },
    });

    return NextResponse.json({
      success: true,
      messageId,
      dailySendCount: updated.dailySendCount,
      dailyLimit: DAILY_LIMIT,
      isDemo,
      sentTo: toEmail,
      log: {
        id: sendLog.id,
        recipientEmail: sendLog.recipientEmail,
        subject: sendLog.subject,
        bodyPreview: sendLog.bodyPreview,
        campaignName: sendLog.campaignName,
        isTest: sendLog.isTest,
        sentAt: sendLog.sentAt.toISOString(),
        graphMessageId: sendLog.graphMessageId,
        status: sendLog.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
