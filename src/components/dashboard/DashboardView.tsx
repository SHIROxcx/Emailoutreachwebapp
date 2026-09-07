"use client";

import { useState } from "react";
import { MailboxHealthCard } from "./MailboxHealthCard";
import { SendTestModal } from "./SendTestModal";
import { CampaignsOverview, CampaignItem } from "./CampaignsOverview";

interface DashboardViewProps {
  mailboxEmail: string;
  initialDailySendCount: number;
  initialCampaigns: CampaignItem[];
  totalLeadsCount: number;
  totalSentCount: number;
}

export function DashboardView({
  mailboxEmail,
  initialDailySendCount,
  initialCampaigns,
  totalLeadsCount,
  totalSentCount,
}: DashboardViewProps) {
  const [dailySendCount, setDailySendCount] = useState(initialDailySendCount);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Mailbox Health & Quota with Send Test Email Action */}
      <MailboxHealthCard
        mailboxEmail={mailboxEmail}
        dailySendCount={dailySendCount}
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      {/* Campaigns & Metrics */}
      <CampaignsOverview
        initialCampaigns={initialCampaigns}
        totalLeadsCount={totalLeadsCount}
        totalSentCount={totalSentCount}
      />

      {/* Send Test Email Modal (Milestone 1) */}
      <SendTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        senderEmail={mailboxEmail}
        onSendSuccess={(newCount) => setDailySendCount(newCount)}
      />
    </div>
  );
}
