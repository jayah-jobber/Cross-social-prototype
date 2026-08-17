import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";

export type AdHocJobId = "property-cleanup" | "weather-stripping" | "toilet-tank";
export type AdHocChannelId = "google" | "facebook" | "instagram" | "email" | "website";
export type AdHocCreationStep = "job" | "channels";

const JOBS: Array<{
  id: AdHocJobId;
  title: string;
  extraImages?: number;
  imageCount: number;
  posted?: boolean;
}> = [
  {
    id: "property-cleanup",
    title: "#8 Property Cleanup",
    extraImages: 2,
    imageCount: 5,
  },
  {
    id: "weather-stripping",
    title: "#7 Weather stripping",
    extraImages: 33,
    imageCount: 5,
  },
  {
    id: "toilet-tank",
    title: "#5 Toilet tank issue",
    imageCount: 3,
    posted: true,
  },
];

const CHANNELS: Array<{ id: AdHocChannelId; label: string }> = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Email" },
  { id: "website", label: "Website" },
];

function JobOption({
  job,
  selected,
  onSelect,
}: {
  job: (typeof JOBS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`adhoc-job-option${selected ? " is-selected" : ""}`}>
      <input
        type="radio"
        name="adhoc-showcase-job"
        value={job.id}
        checked={selected}
        onChange={onSelect}
      />
      <span className="adhoc-job-option-radio" aria-hidden="true" />
      <span className="adhoc-job-option-content">
        <span className="adhoc-job-option-heading">
          <strong>{job.title}</strong>
          {job.posted && <span className="adhoc-posted-pill">Posted</span>}
        </span>
        <span className="adhoc-job-metadata">
          <span>03/15/2023</span><i>|</i><span>Amy Lin</span><i>|</i>
          <span>{"{Property Address}"}</span>
        </span>
        <span className="adhoc-job-thumbnails" aria-label={`${job.imageCount} job images`}>
          {Array.from({ length: job.imageCount }, (_, index) => (
            <img
              src="/assets/v4-adhoc-job-thumbnail.png"
              alt=""
              aria-hidden="true"
              key={index}
            />
          ))}
          {job.extraImages && <span>+{job.extraImages}</span>}
        </span>
      </span>
      <span className="adhoc-view-job" aria-disabled="true">
        View job <ExternalLink size={14} aria-hidden="true" />
      </span>
    </label>
  );
}

export function AdHocCreationDialog({
  step,
  selectedJob,
  selectedChannels,
  onSelectJob,
  onToggleChannel,
  onNext,
  onBack,
  onCreate,
  onCancel,
}: {
  step: AdHocCreationStep;
  selectedJob: AdHocJobId;
  selectedChannels: AdHocChannelId[];
  onSelectJob: (job: AdHocJobId) => void;
  onToggleChannel: (channel: AdHocChannelId) => void;
  onNext: () => void;
  onBack: () => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [step]);

  return (
    <div
      className="calendar-modal-overlay adhoc-create-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="adhoc-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adhoc-create-title"
      >
        <header className="adhoc-create-header">
          <span>
            {step === "channels" && (
              <button type="button" aria-label="Back to job selection" onClick={onBack}>
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
            )}
            <h1 id="adhoc-create-title">Showcase a Job</h1>
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close Showcase a Job"
            onClick={onCancel}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        {step === "job" ? (
          <>
            <div className="adhoc-job-tabs" role="tablist" aria-label="Job selection views">
              <button type="button" role="tab" aria-selected="true">
                <Sparkles size={16} aria-hidden="true" />
                Recommended Jobs
              </button>
              <button type="button" role="tab" aria-selected="false" aria-disabled="true">
                All Jobs
              </button>
            </div>
            <div className="adhoc-job-dialog-body">
              <p>
                Select the job you’d like to feature, then we’ll create a draft for you to
                review. We’ve highlighted jobs with strong images, complete details, and
                quality content
              </p>
              <fieldset className="adhoc-job-list">
                <legend className="sr-only">Select a job to showcase</legend>
                {JOBS.map((job) => (
                  <JobOption
                    job={job}
                    selected={selectedJob === job.id}
                    onSelect={() => onSelectJob(job.id)}
                    key={job.id}
                  />
                ))}
              </fieldset>
            </div>
            <footer className="adhoc-create-footer">
              <button className="adhoc-cancel-button" type="button" onClick={onCancel}>
                Cancel
              </button>
              <span>
                <button type="button" aria-disabled="true">Provide My Own</button>
                <button className="primary-button" type="button" onClick={onNext}>
                  Next <ChevronRight size={17} aria-hidden="true" />
                </button>
              </span>
            </footer>
          </>
        ) : (
          <>
            <div className="adhoc-channel-dialog-body">
              <p>Select the channel that you want to showcase a job</p>
              <fieldset className="adhoc-create-channel-list">
                <legend className="sr-only">Select showcase channels</legend>
                {CHANNELS.map((channel) => {
                  const checked = selectedChannels.includes(channel.id);
                  return (
                    <label key={channel.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleChannel(channel.id)}
                      />
                      <span className="adhoc-channel-checkbox" aria-hidden="true">
                        {checked && (
                          <img src="/assets/v4-adhoc-checkbox-check.svg" alt="" />
                        )}
                      </span>
                      <strong>{channel.label}</strong>
                    </label>
                  );
                })}
              </fieldset>
            </div>
            <footer className="adhoc-create-footer">
              <button className="adhoc-cancel-button" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={selectedChannels.length === 0}
                onClick={onCreate}
              >
                Create Draft Post
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

export function AdHocGenerationOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="calendar-modal-overlay adhoc-generation-overlay" role="presentation">
      <section
        className="adhoc-generation-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Generating job showcase"
      >
        {children}
      </section>
    </div>
  );
}
