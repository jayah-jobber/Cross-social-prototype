import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";

const REVIEW_TEXT = `“Quick, tidy, and honest about pricing — cleared our kitchen line the same day I called. We'd been putting it off for weeks dreading the mess and the bill, but the crew was in and out in under an hour and left everything cleaner than they found it. Would absolutely use South Texas Piping again and have already recommended them to two neighbors.”`;

const DRAFT_REPLY = `Thanks so much, Dana! We're glad we could get you flowing again fast — and that the pricing was clear up front. Passing your kind words along to the crew, they'll be thrilled to hear it. Thanks for spreading the word to your neighbors too, that means a lot to a small local team like ours. Give us a shout anytime you need us.`;

export type V4CalendarTaskId = "respond-review" | "rating-dropped" | "connect-google";

export const V4_CALENDAR_TASK_IDS: V4CalendarTaskId[] = [
  "respond-review",
  "rating-dropped",
  "connect-google",
];

export const V4_CALENDAR_TASK_SUCCESS_COPY: Record<V4CalendarTaskId, string> = {
  "respond-review": "Your response has been successfully posted.",
  "rating-dropped": "Task successfully marked as read.",
  "connect-google": "Google Business Profile successfully connected.",
};

const TASKS: Record<V4CalendarTaskId, {
  id: V4CalendarTaskId;
  title: string;
  description: string;
  action: string;
}> = {
  "respond-review": {
    id: "respond-review",
    title: "Respond to a new review",
    description:
      "A timely response shows clients you value their feedback and helps build trust in your business",
    action: "Post Response",
  },
  "rating-dropped": {
    id: "rating-dropped",
    title: "Your Google rating has dropped",
    description: "Your rating is now {current rating}, an decrease of {change amount}",
    action: "Mark As Read",
  },
  "connect-google": {
    id: "connect-google",
    title: "Connect your Google Business Profile",
    description:
      "Connect your Google Business Profile to improve how you appear in Google Search",
    action: "Connect",
  },
};

function PhoneSurface({ variant }: { variant: "rating" | "connect" }) {
  const texture = `/assets/v4-task-${variant}-phone-texture.png`;
  const background = `/assets/v4-task-${variant}-phone-background.png`;

  return (
    <div className="v4-task-phone" aria-hidden="true">
      <div className="v4-task-phone-screen">
        <img
          className="v4-task-phone-texture"
          src={texture}
          width={300}
          height={650}
          alt=""
        />
        <img
          className="v4-task-phone-background"
          src={background}
          width={300}
          height={650}
          alt=""
        />
      </div>
      <span className="v4-task-phone-time">9:41</span>
      <span className="v4-task-phone-island" />
    </div>
  );
}

function RatingArtwork() {
  return (
    <div className="v4-task-artwork v4-task-rating-artwork" aria-label="Google rating illustration">
      <PhoneSurface variant="rating" />
      <div className="v4-task-rating-card" aria-hidden="true">
        <div className="v4-task-rating-row">
          <img src="/assets/google-channel-icon.svg" width={28} height={28} alt="" />
          {[0, 1, 2, 3].map((star) => (
            <img
              src="/assets/v4-task-star.svg"
              width={22}
              height={22}
              alt=""
              key={star}
            />
          ))}
          <Star className="v4-task-outline-star" size={22} />
        </div>
        <div className="v4-task-rating-placeholder" />
        <div className="v4-task-rating-lines">
          <i /><span /><i /><span /><i /><span /><i /><span /><span />
        </div>
      </div>
      <img
        className="v4-task-rating-circle"
        src="/assets/v4-task-rating-circle.svg"
        width={264}
        height={93}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}

function ConnectArtwork() {
  return (
    <div className="v4-task-artwork v4-task-connect-artwork" aria-label="Google and Jobber connection illustration">
      <PhoneSurface variant="connect" />
      <div className="v4-task-connect-card google" aria-hidden="true">
        <img src="/assets/google-channel-icon.svg" width={58} height={58} alt="" />
      </div>
      <div className="v4-task-connect-card jobber" aria-hidden="true">
        <img src="/assets/v4-task-jobber-mark.svg" width={51} height={51} alt="" />
      </div>
      <div className="v4-task-connect-link" aria-hidden="true">
        <img src="/assets/v4-task-connect-arrow-a.svg" width={24} height={7} alt="" />
        <img src="/assets/v4-task-connect-arrow-b.svg" width={24} height={7} alt="" />
      </div>
    </div>
  );
}

function ReviewTask() {
  return (
    <div className="v4-task-review-stack">
      <article className="v4-task-review-card">
        <header>
          <span className="v4-task-avatar" aria-hidden="true">AA</span>
          <span>
            <strong>Dana Jones</strong>
            <small>12 reviews</small>
          </span>
        </header>
        <div className="v4-task-review-rating">
          <span aria-label="5 out of 5 stars">
            {[0, 1, 2, 3, 4].map((star) => (
              <img
                src="/assets/v4-task-star.svg"
                width={17}
                height={17}
                alt=""
                aria-hidden="true"
                key={star}
              />
            ))}
          </span>
          <small>2 days ago</small>
        </div>
        <p>{REVIEW_TEXT}</p>
      </article>

      <article className="v4-task-draft-card">
        <span className="v4-task-ai-label">
          <img
            src="/assets/v4-task-ai-sparkle.svg"
            width={14}
            height={14}
            alt=""
            aria-hidden="true"
          />
          Your drafted reply
        </span>
        <p>{DRAFT_REPLY}</p>
      </article>
    </div>
  );
}

export function V4CalendarTaskModal({
  remainingTaskIds,
  onComplete,
  onClose,
}: {
  remainingTaskIds: V4CalendarTaskId[];
  onComplete: (taskId: V4CalendarTaskId, finalTask: boolean) => void;
  onClose: () => void;
}) {
  const [activeTaskId, setActiveTaskId] = useState<V4CalendarTaskId>(remainingTaskIds[0]);
  const [completing, setCompleting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const completingRef = useRef(false);
  const focusCompletedSuccessorRef = useRef(false);
  const taskIndex = Math.max(0, remainingTaskIds.indexOf(activeTaskId));
  const task = TASKS[remainingTaskIds[taskIndex]];
  const showPrevious = () => setActiveTaskId(
    remainingTaskIds[(taskIndex + remainingTaskIds.length - 1) % remainingTaskIds.length],
  );
  const showNext = () => setActiveTaskId(
    remainingTaskIds[(taskIndex + 1) % remainingTaskIds.length],
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!focusCompletedSuccessorRef.current) return;
    focusCompletedSuccessorRef.current = false;
    completingRef.current = false;
    setCompleting(false);
    headingRef.current?.focus();
  }, [activeTaskId, remainingTaskIds]);

  const completeCurrentTask = () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    const finalTask = remainingTaskIds.length === 1;
    if (!finalTask) {
      focusCompletedSuccessorRef.current = true;
      setActiveTaskId(remainingTaskIds[(taskIndex + 1) % remainingTaskIds.length]);
    }
    onComplete(task.id, finalTask);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="calendar-modal-overlay v4-context-overlay v4-task-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="v4-task-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-task-modal-title"
        onKeyDown={handleKeyDown}
      >
        <header className="v4-task-modal-header">
          <strong>REVIEW MULTIPLE TASKS</strong>
          <nav aria-label="Task navigation">
            <button type="button" aria-label="Previous task" onClick={showPrevious}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <span aria-live="polite">{taskIndex + 1} of {remainingTaskIds.length}</span>
            <button type="button" aria-label="Next task" onClick={showNext}>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </nav>
          <button
            className="v4-task-modal-close"
            type="button"
            aria-label="Close tasks"
            ref={closeRef}
            onClick={onClose}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </header>

        <div className="v4-task-modal-body">
          <div className="v4-task-modal-content">
            <div className="v4-task-modal-intro">
              <h1 id="v4-task-modal-title" ref={headingRef} tabIndex={-1}>{task.title}</h1>
              <p>{task.description}</p>
            </div>
            {task.id === "respond-review" && <ReviewTask />}
            {task.id === "rating-dropped" && <RatingArtwork />}
            {task.id === "connect-google" && <ConnectArtwork />}
          </div>
        </div>

        <footer className="v4-task-modal-footer">
          <button className="v4-task-skip" type="button">Skip</button>
          <button
            className="v4-task-primary"
            type="button"
            disabled={completing}
            onClick={completeCurrentTask}
          >
            {task.action}
          </button>
        </footer>
      </div>
    </div>
  );
}
