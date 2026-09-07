"use client";

import { useState } from "react";
import { MailboxHealthCard } from "./MailboxHealthCard";
import { SendTestModal } from "./SendTestModal";
import { CampaignsOverview, CampaignItem } from "./CampaignsOverview";
import { ActivityFeed } from "./ActivityFeed";
import { SendLogItem } from "./EmailDetailModal";

interface DashboardViewProps {
  mailboxEmail: string;
  initialDailySendCount: number;
  initialCampaigns: CampaignItem[];
  initialLogs: SendLogItem[];
  totalLeadsCount: number;
  totalSentCount: number;
}

export function DashboardView({
  mailboxEmail,
  initialDailySendCount,
  initialCampaigns,
  initialLogs,
  totalLeadsCount,
  totalSentCount,
}: DashboardViewProps) {
  const [dailySendCount, setDailySendCount] = useState(initialDailySendCount);
  const [sentCount, setSentCount] = useState(totalSentCount);
  const [logs, setLogs] = useState<SendLogItem[]>(initialLogs);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const handleRefreshLogs = async () => {
    try {
      const res = await fetch("/api/mail/logs");
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {
      // Keep existing logs on fetch error
    }
  };

  const handleSendSuccess = (newCount: number, newLog?: SendLogItem) => {
    setDailySendCount(newCount);
    if (newLog) {
      setLogs((prev) => [newLog, ...prev]);
      setSentCount((prev) => prev + 1);
    }
  };

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
        totalSentCount={sentCount}
      />

      {/* Dispatched Emails & Live Send Activity Feed */}
      <ActivityFeed
        logs={logs}
        mailboxEmail={mailboxEmail}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onRefresh={handleRefreshLogs}
      />

      {/* Send Test Email Modal (Milestone 1) */}
      <SendTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        senderEmail={mailboxEmail}
        onSendSuccess={handleSendSuccess}
      />
    </div>
  );
}

