import { Fragment, useState, type KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

const PRODUCT_TABS = [
  "Dashboard",
  "Marketing Plan",
  "Label",
  "Facebook",
  "Job showcase",
] as const;

const STATIC_SHOWCASE_ROWS = [
  {
    title: "Content title",
    creator: "{SP name}",
    channel: "Facebook",
  },
  {
    title: "Content title",
    creator: "AI Recommended",
    channel: "Facebook",
  },
  {
    title: "Content title",
    creator: "AI Recommended",
    channel: "Facebook",
  },
  {
    title: "Content title",
    creator: "AI Recommended",
    channel: "Facebook",
  },
] as const;

export type AdHocCampaignChannel = {
  id: "google" | "facebook" | "instagram" | "email" | "website";
  label: string;
  status: {
    value: "suggested" | "scheduled" | "sent" | "missed" | "error";
    label: string;
    tone: "neutral" | "informative" | "success" | "warning" | "critical";
  };
};

export type AdHocCreatedCampaign = {
  id: string;
  title: string;
  channels: AdHocCampaignChannel[];
};

function CampaignStatusBadge({
  status,
  label,
  tone,
}: {
  status: string;
  label: string;
  tone: AdHocCampaignChannel["status"]["tone"];
}) {
  return (
    <span
      className={`v4-summary-status ${
        tone === "neutral" ? "adhoc-campaign-status--neutral" : `v4-summary-status--${tone}`
      } adhoc-campaign-status`}
      data-status={status}
    >
      <span className="v4-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function HeroIllustration() {
  return (
    <img
      className="adhoc-hero-illustration"
      src="/assets/v4-adhoc-job-showcase-hero.png"
      alt="A completed Jobber job becoming marketing across social, email, and website channels"
    />
  );
}

export function VersionFourAdHoc({
  campaignChannels,
  createdCampaigns,
  onNewShowcase,
  onOpenCampaign,
  onOpenChannel,
  onOpenCreatedCampaign,
  onOpenCreatedChannel,
}: {
  campaignChannels: AdHocCampaignChannel[];
  createdCampaigns: AdHocCreatedCampaign[];
  onNewShowcase: () => void;
  onOpenCampaign: () => void;
  onOpenChannel: (channel: AdHocCampaignChannel["id"]) => void;
  onOpenCreatedCampaign: (campaignId: string) => void;
  onOpenCreatedChannel: (
    campaignId: string,
    channel: AdHocCampaignChannel["id"],
  ) => void;
}) {
  const [campaignExpanded, setCampaignExpanded] = useState(false);
  const [createdExpanded, setCreatedExpanded] = useState<Record<string, boolean>>({});
  const failedCount = campaignChannels.filter(({ status }) => status.value === "error").length;
  const uniformStatus = campaignChannels.length > 0
    && new Set(campaignChannels.map(({ status }) => status.value)).size === 1
    ? campaignChannels[0].status
    : null;
  const parentStatus = failedCount > 0
    ? {
        status: "failed",
        label: `${failedCount} Failed`,
        tone: "critical" as const,
      }
    : uniformStatus
      ? {
          status: uniformStatus.value,
          label: uniformStatus.label,
          tone: uniformStatus.tone,
        }
      : null;
  const childRowIds = campaignChannels.map(({ id }) => `adhoc-campaign-${id}`).join(" ");

  const activateRow = (
    event: KeyboardEvent<HTMLTableRowElement>,
    action: () => void,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  };

  return (
    <main className="v4-adhoc-page" data-entry-surface="adhoc">
      <header className="adhoc-title-section">
        <div className="adhoc-title-row">
          <div className="adhoc-heading">
            <h1>Job Showcase</h1>
            <span className="adhoc-beta-pill">Beta</span>
          </div>
          <button className="adhoc-primary-action" type="button" onClick={onNewShowcase}>
            <Plus size={18} aria-hidden="true" />
            New Job Showcase
          </button>
        </div>
        <div className="adhoc-product-tabs" role="tablist" aria-label="Marketing products">
          {PRODUCT_TABS.map((tab) => {
            const active = tab === "Job showcase";
            return (
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled="true"
                key={tab}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <section className="adhoc-hero" aria-labelledby="adhoc-hero-title">
        <div className="adhoc-hero-copy">
          <h2 id="adhoc-hero-title">Turn finished jobs into new ones</h2>
          <p>
            With the job showcase, you can turn the photos and details of your jobs into
            engaging posts that can be shared across your social channels, website and via
            email campaigns
          </p>
          <button type="button" aria-disabled="true">Pick a Job to Showcase</button>
        </div>
        <HeroIllustration />
      </section>

      <section className="adhoc-list-section" aria-labelledby="adhoc-list-title">
        <div className="adhoc-list-toolbar">
          <div className="adhoc-list-heading">
            <h2 id="adhoc-list-title">All job showcases</h2>
            <span>(0,000 results)</span>
          </div>
          <div className="adhoc-list-controls">
            <div className="adhoc-filter-chips" aria-label="Job showcase filters">
              <button type="button" aria-disabled="true">
                <span>Created By</span>
                <strong>{"{User Name}"}</strong>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-disabled="true">
                <span>Status</span>
                <strong>All</strong>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-disabled="true">
                <span>Channel</span>
                <strong>All</strong>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            <label className="adhoc-search">
              <span className="sr-only">Search job showcases</span>
              <Search size={17} aria-hidden="true" />
              <input type="search" placeholder="Search" readOnly />
            </label>
          </div>
        </div>

        <div className="adhoc-table-wrap">
          <table className="adhoc-showcase-table">
            <caption className="sr-only">Job showcase examples and current campaign</caption>
            <colgroup>
              <col className="adhoc-content-column" />
              <col className="adhoc-created-column" />
              <col className="adhoc-status-column" />
              <col className="adhoc-channel-column" />
              <col className="adhoc-updated-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Content</th>
                <th scope="col">Created by</th>
                <th scope="col">Status</th>
                <th scope="col">Channel</th>
                <th scope="col">
                  <span>Last Updated <ChevronsUpDown size={15} aria-hidden="true" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="adhoc-content-cell">
                    <span>{STATIC_SHOWCASE_ROWS[0].title}</span>
                  </span>
                </td>
                <td>{STATIC_SHOWCASE_ROWS[0].creator}</td>
                <td>
                  <span className="adhoc-draft-pill"><i aria-hidden="true" />Draft</span>
                </td>
                <td>
                  <span className="adhoc-channel-cell">
                    {STATIC_SHOWCASE_ROWS[0].channel}
                  </span>
                </td>
                <td>Jul 20, 2023 at 10:45PM</td>
              </tr>
              {campaignChannels.length > 0 && (
                <>
                  <tr
                    className="adhoc-live-campaign-row"
                    tabIndex={0}
                    aria-label="Open Seasonal property clean up in Hamilton campaign summary"
                    onClick={onOpenCampaign}
                    onKeyDown={(event) => activateRow(event, onOpenCampaign)}
                  >
                    <td>
                      <span className="adhoc-content-cell">
                        <button
                          className="adhoc-expand-button"
                          type="button"
                          aria-label={`${campaignExpanded ? "Collapse" : "Expand"} campaign channels`}
                          aria-expanded={campaignExpanded}
                          aria-controls={childRowIds}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCampaignExpanded((current) => !current);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ChevronRight
                            className={campaignExpanded ? "is-expanded" : ""}
                            size={18}
                            aria-hidden="true"
                          />
                        </button>
                        <span>Seasonal property clean up in Hamilton</span>
                      </span>
                    </td>
                    <td>
                      <span className="adhoc-ai-pill">
                        <Sparkles size={13} aria-hidden="true" />
                        AI Recommended
                      </span>
                    </td>
                    <td>
                      {parentStatus && (
                        <CampaignStatusBadge
                          status={parentStatus.status}
                          label={parentStatus.label}
                          tone={parentStatus.tone}
                        />
                      )}
                    </td>
                    <td>
                      <span className="adhoc-channel-cell">Multi-channel</span>
                    </td>
                    <td>Jul 20, 2023 at 10:45PM</td>
                  </tr>
                  {campaignExpanded && campaignChannels.map((channel) => (
                    <tr
                      className="adhoc-campaign-child-row"
                      id={`adhoc-campaign-${channel.id}`}
                      data-channel={channel.id}
                      tabIndex={0}
                      aria-label={`Open ${channel.label} campaign details`}
                      onClick={() => onOpenChannel(channel.id)}
                      onKeyDown={(event) => activateRow(
                        event,
                        () => onOpenChannel(channel.id),
                      )}
                      key={channel.id}
                    >
                      <td className="adhoc-child-empty-content" aria-hidden="true" />
                      <td />
                      <td>
                        <CampaignStatusBadge
                          status={channel.status.value}
                          label={channel.status.label}
                          tone={channel.status.tone}
                        />
                      </td>
                      <td>
                        <span className="adhoc-channel-cell">{channel.label}</span>
                      </td>
                      <td>Jul 20, 2023 at 10:45PM</td>
                    </tr>
                  ))}
                </>
              )}
              {createdCampaigns.map((campaign) => {
                const expanded = Boolean(createdExpanded[campaign.id]);
                const failed = campaign.channels.filter(
                  ({ status }) => status.value === "error",
                ).length;
                const uniform = campaign.channels.length > 0
                  && new Set(campaign.channels.map(({ status }) => status.value)).size === 1
                  ? campaign.channels[0].status
                  : null;
                const aggregate = failed > 0
                  ? { status: "failed", label: `${failed} Failed`, tone: "critical" as const }
                  : uniform
                    ? {
                        status: uniform.value,
                        label: uniform.label,
                        tone: uniform.tone,
                      }
                    : null;
                const controls = campaign.channels
                  .map(({ id }) => `adhoc-created-${campaign.id}-${id}`)
                  .join(" ");

                return (
                  <Fragment key={campaign.id}>
                    <tr
                      className="adhoc-live-campaign-row adhoc-created-campaign-row"
                      data-campaign-id={campaign.id}
                      tabIndex={0}
                      aria-label={`Open ${campaign.title} generated showcase summary`}
                      onClick={() => onOpenCreatedCampaign(campaign.id)}
                      onKeyDown={(event) => activateRow(
                        event,
                        () => onOpenCreatedCampaign(campaign.id),
                      )}
                    >
                      <td>
                        <span className="adhoc-content-cell">
                          <button
                            className="adhoc-expand-button"
                            type="button"
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${campaign.title} channels`}
                            aria-expanded={expanded}
                            aria-controls={controls}
                            onClick={(event) => {
                              event.stopPropagation();
                              setCreatedExpanded((current) => ({
                                ...current,
                                [campaign.id]: !current[campaign.id],
                              }));
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <ChevronRight
                              className={expanded ? "is-expanded" : ""}
                              size={18}
                              aria-hidden="true"
                            />
                          </button>
                          <span>{campaign.title}</span>
                        </span>
                      </td>
                      <td>
                        <span className="adhoc-ai-pill">
                          <Sparkles size={13} aria-hidden="true" />
                          AI Recommended
                        </span>
                      </td>
                      <td>
                        {aggregate && (
                          <CampaignStatusBadge
                            status={aggregate.status}
                            label={aggregate.label}
                            tone={aggregate.tone}
                          />
                        )}
                      </td>
                      <td>
                        <span className="adhoc-channel-cell">Multi-channel</span>
                      </td>
                      <td>Jul 20, 2023 at 10:45PM</td>
                    </tr>
                    {expanded && campaign.channels.map((channel) => (
                      <tr
                        className="adhoc-campaign-child-row adhoc-created-child-row"
                        id={`adhoc-created-${campaign.id}-${channel.id}`}
                        data-campaign-id={campaign.id}
                        data-channel={channel.id}
                        tabIndex={0}
                        aria-label={`Open ${channel.label} generated showcase details`}
                        onClick={() => onOpenCreatedChannel(campaign.id, channel.id)}
                        onKeyDown={(event) => activateRow(
                          event,
                          () => onOpenCreatedChannel(campaign.id, channel.id),
                        )}
                        key={channel.id}
                      >
                        <td className="adhoc-child-empty-content" aria-hidden="true" />
                        <td />
                        <td>
                          <CampaignStatusBadge
                            status={channel.status.value}
                            label={channel.status.label}
                            tone={channel.status.tone}
                          />
                        </td>
                        <td>
                          <span className="adhoc-channel-cell">{channel.label}</span>
                        </td>
                        <td>Jul 20, 2023 at 10:45PM</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {STATIC_SHOWCASE_ROWS.slice(1).map((row, index) => (
                <tr key={`${row.title}-${index + 1}`}>
                  <td>
                    <span className="adhoc-content-cell">
                      <span>{row.title}</span>
                    </span>
                  </td>
                  <td>
                    {row.creator === "AI Recommended" ? (
                      <span className="adhoc-ai-pill">
                        <Sparkles size={13} aria-hidden="true" />
                        AI Recommended
                      </span>
                    ) : row.creator}
                  </td>
                  <td>
                    <span className="adhoc-draft-pill"><i aria-hidden="true" />Draft</span>
                  </td>
                  <td>
                    <span className="adhoc-channel-cell">{row.channel}</span>
                  </td>
                  <td>Jul 20, 2023 at 10:45PM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
