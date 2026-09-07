export interface WorkflowStep {
  id: string;
  number: number;
  label: string;
  title: string;
  summary: string;
  tip: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "connect",
    number: 1,
    label: "Connect",
    title: "Connect your Outlook",
    summary:
      "Send cold emails directly through your real Outlook account. Because they come from a genuine mailbox, they land in the primary inbox rather than spam.",
    tip: "Secured directly through Microsoft. We never see or store your password.",
  },
  {
    id: "leads",
    number: 2,
    label: "Leads",
    title: "Upload your contact list",
    summary:
      "Drop in a CSV of your prospects. Match your columns for email, name, and company — duplicate emails are automatically detected and skipped.",
    tip: "You can keep all your custom spreadsheet columns to personalize your emails.",
  },
  {
    id: "sequence",
    number: 3,
    label: "Sequence",
    title: "Build automated follow-ups",
    summary:
      "Set up multi-step campaigns with delay days between touches (e.g. follow up 3 days later). Personalize each email using tags like {{firstName}} and {{company}}.",
    tip: "Most replies come from follow-ups. Set 2 to 3 steps for the best response rates.",
  },
  {
    id: "send",
    number: 4,
    label: "Send",
    title: "Automated, safe delivery",
    summary:
      "Your sequence sends in the background with randomized pauses between emails. Daily volume is capped so your Outlook account stays completely healthy.",
    tip: "Sends 30 to 50 emails a day with pauses to mimic natural human sending.",
  },
];
