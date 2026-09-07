export interface OnboardingStepData {
  id: string;
  stepNumber: number;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  highlights: string[];
  type: "connect" | "upload" | "sequence" | "send";
}

export const ONBOARDING_STEPS: OnboardingStepData[] = [
  {
    id: "connect",
    stepNumber: 1,
    label: "Connect",
    title: "Connect Your Outlook Account",
    subtitle: "Secure, direct integration via Microsoft Graph",
    description:
      "Authenticate with your personal or organizational Microsoft account. Emails are dispatched directly through your own Outlook mailbox, ensuring authentic sender reputation and top-tier deliverability.",
    badge: "Step 1 of 4",
    highlights: [
      "OAuth 2.0 delegated permissions (Mail.Send, Mail.Read, User.Read)",
      "AES-256-GCM encryption for credentials stored at rest",
      "No passwords stored — revoke access anytime in Microsoft account settings",
    ],
    type: "connect",
  },
  {
    id: "upload",
    stepNumber: 2,
    label: "Leads",
    title: "Import and Map Your Leads",
    subtitle: "Simple CSV upload with smart column mapping",
    description:
      "Upload your lead lists in CSV format. Preview the incoming data, effortlessly map headers to standard fields (email, name, company), and let the system automatically filter duplicates.",
    badge: "Step 2 of 4",
    highlights: [
      "Intuitive drag-and-drop CSV parser powered by PapaParse",
      "Field mapping for email, first name, last name, and company",
      "Automated per-tenant email deduplication safeguards",
    ],
    type: "upload",
  },
  {
    id: "sequence",
    stepNumber: 3,
    label: "Sequence",
    title: "Design Multi-Step Sequences",
    subtitle: "Personalized outreach with intelligent delays",
    description:
      "Build tailored multi-touch email campaigns. Specify delay days between touches and enrich messages using dynamic template merge tags to connect with prospects naturally.",
    badge: "Step 3 of 4",
    highlights: [
      "Configurable day delays between sequence follow-up touches",
      "Dynamic merge variables: {{firstName}}, {{lastName}}, {{company}}",
      "Targeted lead batch enrollment tied directly to your campaigns",
    ],
    type: "sequence",
  },
  {
    id: "send",
    stepNumber: 4,
    label: "Dispatch",
    title: "Automate, Schedule & Track",
    subtitle: "Safe sending engine respecting Outlook quotas",
    description:
      "Let the BullMQ scheduler take over. Emails are safely throttled and staggered throughout the day to avoid Microsoft spam filters, with instant pause and resume controls.",
    badge: "Step 4 of 4",
    highlights: [
      "Automated 5-minute background queue with randomized staggering",
      "Daily sending limits (30–50 sends/day) to safeguard mailbox health",
      "Complete delivery audit logs and one-click campaign pause/resume",
    ],
    type: "send",
  },
];
