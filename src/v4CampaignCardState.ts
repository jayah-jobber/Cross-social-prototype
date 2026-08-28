export type V4CampaignCardInputState =
  | "suggested"
  | "scheduled"
  | "sent"
  | "missed"
  | "error"
  | null
  | undefined;

export type V4CampaignCardVisualState =
  | { state: "suggested"; label: "Suggested" }
  | { state: "scheduled"; label: "Scheduled" }
  | { state: "sent"; label: "Sent" }
  | { state: "missed"; label: "Missed" }
  | { state: "failed"; label: string; failedCount: number };

export function deriveV4CampaignCardState(
  states: readonly V4CampaignCardInputState[],
): V4CampaignCardVisualState {
  const normalized = states.map((state) => state ?? "suggested");
  const failedCount = normalized.filter((state) => state === "error").length;

  if (failedCount > 0) {
    return {
      state: "failed",
      label: `${failedCount} failed`,
      failedCount,
    };
  }
  if (normalized.some((state) => state === "suggested")) {
    return { state: "suggested", label: "Suggested" };
  }
  if (normalized.some((state) => state === "sent")) {
    return { state: "sent", label: "Sent" };
  }
  if (normalized.some((state) => state === "missed")) {
    return { state: "missed", label: "Missed" };
  }
  return { state: "scheduled", label: "Scheduled" };
}
