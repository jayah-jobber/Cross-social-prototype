import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  ClipboardList,
  Clock3,
  FileChartColumn,
  FileText,
  ExternalLink,
  GripVertical,
  Heart,
  Home,
  Image,
  Info,
  Link2,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  Plus,
  ReceiptText,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  prototypeEnv,
  type ResearchEntrySurface,
  type ResearchNavigationStyle,
} from "./prototype-env";
import {
  VersionFourAdHoc,
  type AdHocCampaignChannel,
  type AdHocCreatedCampaign,
} from "./AdHocScreen";
import {
  AdHocCreationDialog,
  AdHocGenerationOverlay,
  type AdHocChannelId,
  type AdHocCreationStep,
  type AdHocJobId,
} from "./AdHocCreationFlow";
import {
  V4_CALENDAR_TASK_IDS,
  V4_CALENDAR_TASK_SUCCESS_COPY,
  V4CalendarTaskModal,
  type V4CalendarTaskId,
} from "./V4CalendarTasks";
import {
  deriveV4CampaignCardState,
  type V4CampaignCardInputState,
} from "./v4CampaignCardState";

const INITIAL_MESSAGE = `This Hamilton property needed a seasonal refresh, starting with a clean up and mulching to bring the landscape back to a maintained state. 🌿

Our work included a general property clean up to remove debris and tidy landscaped areas, followed by fresh mulch applied to existing garden beds to help define and protect them.

The result was a cleaner, more orderly outdoor space, with garden beds refreshed and ready for the season.

If you’re planning a clean up and mulching project in Hamilton, feel free to reach out to discuss your property and timing.`;
const INITIAL_EMAIL_MESSAGE = INITIAL_MESSAGE;
const INITIAL_WEBSITE_MESSAGE = INITIAL_MESSAGE;
const INITIAL_EMAIL_SUBJECT = "A seasonal refresh for your Hamilton property";
const INITIAL_WEBSITE_TITLE = "Seasonal property clean up in Hamilton";

const INITIAL_V1_MESSAGE = `${INITIAL_MESSAGE}

#HamiltonLandscaping #OutdoorLiving #HomeUpgrade`;

type GalleryImage = {
  id: string;
  src: string;
  alt: string;
};

const INITIAL_IMAGES: GalleryImage[] = [
  { id: "garden-two", src: "/assets/gallery-2.png", alt: "Landscaped garden beds" },
  { id: "garden-three", src: "/assets/gallery-3.png", alt: "Landscaped garden walkway" },
  { id: "garden-one", src: "/assets/gallery-1.png", alt: "Ornamental grass" },
];

const GENERATED_V4_PROMOTION_ARTWORK: GalleryImage = {
  id: "v4-15-percent-promotion",
  src: "/assets/v4-generated-summary-channel-artwork.png",
  alt: "Layered previews for Google, Facebook, Instagram, and Email",
};

const GENERATED_V4_BODY = `🎄 Christmas Special: Save 15% on Winter Landscaping Services

Give your landscape the care it deserves this winter with 15% off our winter landscaping services.

Our winter services include:
• Winter property cleanups
• Garden bed protection
• Leaf and debris removal
• Seasonal landscape maintenance

Book before Christmas to take advantage of this limited-time offer and keep your property looking its best through the winter months.

📞 Contact us today for a free quote and reserve your spot before our schedule fills up.`;
const GENERATED_V4_HASHTAGS = "#ChristmasSpecial #WinterLandscaping #LandscapeMaintenance #HolidaySavings";
const GENERATED_V4_GOOGLE_MESSAGE = GENERATED_V4_BODY;
const GENERATED_V4_FACEBOOK_MESSAGE = GENERATED_V4_BODY;
const GENERATED_V4_INSTAGRAM_MESSAGE = GENERATED_V4_BODY;
const GENERATED_V4_EMAIL_MESSAGE = GENERATED_V4_BODY;
const GENERATED_V4_EMAIL_SUBJECT = "Save 15% on your next landscaping project";

const INITIAL_V2_MESSAGE = `${INITIAL_MESSAGE}

#HamiltonLandscaping #OutdoorLiving #HomeUpgrade`;
const INITIAL_HASHTAGS = "#HamiltonLandscaping #OutdoorLiving #HomeUpgrade";
const INITIAL_SOCIAL_CTA = "📞 416-624-3188\n💬 mycompany@gmail.com";
const INITIAL_EXTERNAL_LINK = "http://yourwebsite.com";

type PrototypeVersion = "v1" | "v2" | "v3" | "v4" | "v5";
type DaisyPrototypeVersion = Extract<PrototypeVersion, "v4" | "v5">;
const LOCKED_PROTOTYPE_VERSION = prototypeEnv.lockedVersion;
type V2Tab = "all" | "google" | "facebook" | "instagram";
type PreviewChannel = Exclude<V2Tab, "all">;
type SocialIconStyle = "jobber" | "brand";
type V4NavigationStyle = ResearchNavigationStyle;
type V4EntrySurface = ResearchEntrySurface | "adhoc";
type V4GeneratedFlowOrigin = ResearchEntrySurface;
type GeneratedV4Phase = "idle" | "idea-loading" | "idea-summary" | "draft-review";
type GoogleButtonAction = "learn-more" | "book" | "call-now";
type GoogleLinkDestination = "external" | "booking" | "default-form" | "other-form";
type EnabledChannels = Record<PreviewChannel, boolean>;
type SchedulableVersion = PrototypeVersion;
type ContextualAction = "schedule" | "post";
type ContextualToast = {
  message: string;
  id: number;
  dark?: boolean;
  deliveryMotion?: boolean;
  fading?: boolean;
};
type SuggestedTextDraft = { title: string; message: string };
type SuggestedCompletion = {
  card: CalendarItem;
  destinations: Partial<Record<ContextualChannel, { label: string; value: string }>>;
};

type ChannelDraft = {
  message: string;
  images: GalleryImage[];
  cta?: string;
  hashtags?: string;
  externalLink?: string;
  googleButtonEnabled?: boolean;
  googleButtonAction?: GoogleButtonAction;
  googleLinkDestination?: GoogleLinkDestination;
};

type V2Drafts = Record<V2Tab, ChannelDraft>;

const createInitialV2Drafts = (): V2Drafts => ({
  all: { message: INITIAL_V2_MESSAGE, images: [...INITIAL_IMAGES] },
  google: {
    message: INITIAL_V2_MESSAGE,
    images: [...INITIAL_IMAGES],
    externalLink: INITIAL_EXTERNAL_LINK,
  },
  facebook: { message: INITIAL_V2_MESSAGE, images: [...INITIAL_IMAGES] },
  instagram: { message: INITIAL_V2_MESSAGE, images: [...INITIAL_IMAGES] },
});

const createInitialV4Drafts = (): V2Drafts => ({
  all: { message: INITIAL_MESSAGE, images: [...INITIAL_IMAGES], hashtags: "" },
  google: {
    message: INITIAL_MESSAGE,
    images: [...INITIAL_IMAGES],
    hashtags: "",
    externalLink: INITIAL_EXTERNAL_LINK,
    googleButtonEnabled: true,
    googleButtonAction: "learn-more",
    googleLinkDestination: "external",
  },
  facebook: {
    message: INITIAL_MESSAGE,
    images: [...INITIAL_IMAGES],
    cta: INITIAL_SOCIAL_CTA,
    hashtags: INITIAL_HASHTAGS,
  },
  instagram: {
    message: INITIAL_MESSAGE,
    images: [...INITIAL_IMAGES],
    cta: INITIAL_SOCIAL_CTA,
    hashtags: INITIAL_HASHTAGS,
  },
});

const createGeneratedV4Drafts = (): V2Drafts => ({
  all: {
    message: GENERATED_V4_GOOGLE_MESSAGE,
    images: [],
    hashtags: "",
  },
  google: {
    message: GENERATED_V4_GOOGLE_MESSAGE,
    images: [],
    hashtags: "",
    externalLink: INITIAL_EXTERNAL_LINK,
    googleButtonEnabled: true,
    googleButtonAction: "book",
    googleLinkDestination: "booking",
  },
  facebook: {
    message: GENERATED_V4_FACEBOOK_MESSAGE,
    images: [],
    cta: "",
    hashtags: GENERATED_V4_HASHTAGS,
  },
  instagram: {
    message: GENERATED_V4_INSTAGRAM_MESSAGE,
    images: [],
    cta: "",
    hashtags: GENERATED_V4_HASHTAGS,
  },
});

function splitPostMessage(message: string) {
  const bodyLines: string[] = [];
  const hashtagLines: string[] = [];

  message.split("\n").forEach((line) => {
    if (line.trim().startsWith("#")) hashtagLines.push(line.trim());
    else bodyLines.push(line);
  });

  return {
    body: bodyLines.join("\n").trim(),
    hashtags: hashtagLines.join(" "),
  };
}

function cloneDrafts(drafts: V2Drafts): V2Drafts {
  return Object.fromEntries(
    Object.entries(drafts).map(([channel, draft]) => [
      channel,
      { ...draft, images: [...draft.images] },
    ]),
  ) as V2Drafts;
}

function flattenV4SocialDraft(draft: ChannelDraft): ChannelDraft {
  const messageParts = [draft.message.trim()];
  [draft.cta, draft.hashtags].forEach((part) => {
    const normalizedPart = part?.trim();
    if (normalizedPart && !messageParts.join("\n\n").includes(normalizedPart)) {
      messageParts.push(normalizedPart);
    }
  });
  return {
    ...draft,
    message: messageParts.filter(Boolean).join("\n\n"),
    cta: "",
    hashtags: "",
    images: [...draft.images],
  };
}

function flattenV4SocialDrafts(drafts: V2Drafts): V2Drafts {
  return {
    ...cloneDrafts(drafts),
    facebook: flattenV4SocialDraft(drafts.facebook),
    instagram: flattenV4SocialDraft(drafts.instagram),
  };
}

function suggestionCardTitle(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  if (!normalized) return "Generated marketing content";
  const title = normalized[0].toUpperCase() + normalized.slice(1);
  return title.length > 88 ? `${title.slice(0, 85).trimEnd()}...` : title;
}

function AutoSizeTextarea({
  id,
  value,
  maxLength,
  onChange,
}: {
  id: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      rows={1}
      maxLength={maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

const navGroups = [
  [
    { label: "Create", icon: CirclePlus },
    { label: "Home", icon: Home },
    { label: "Schedule", icon: CalendarDays },
  ],
  [
    { label: "Clients", icon: Users },
    { label: "Requests", icon: ClipboardList },
    { label: "Quotes", icon: WalletCards },
    { label: "Jobs", icon: BriefcaseBusiness },
    { label: "Invoices", icon: ReceiptText },
  ],
  [
    { label: "Marketing", icon: Megaphone },
    { label: "Reports", icon: FileChartColumn },
    { label: "Expenses", icon: FileText },
    { label: "Timesheets", icon: Clock3 },
    { label: "Apps", icon: AppWindow },
  ],
];

const IMAGE_DROP_ZONE_PREFIX = "image-drop-zone-";

function ImageDropZone({
  index,
  active,
  disabled,
}: {
  index: number;
  active: boolean;
  disabled: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `${IMAGE_DROP_ZONE_PREFIX}${index}`,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`gallery-drop-zone ${active ? "active" : ""}`}
      aria-hidden="true"
    />
  );
}

function SortableImageCard({
  image,
  index,
  onRemove,
  dropIndicator,
}: {
  image: GalleryImage;
  index: number;
  onRemove: (id: string) => void;
  dropIndicator?: "before" | "after";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      className={[
        "image-card-shell",
        isDragging ? "is-dragging" : "",
        dropIndicator ? `drop-${dropIndicator}` : "",
      ].filter(Boolean).join(" ")}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
        <button
          className="drag-handle"
          type="button"
          aria-label={`Reorder image ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} strokeWidth={2.5} />
        </button>
      <div className="image-card-layout">
        <div className="image-card">
          <img src={image.src} alt={image.alt} />
          <div className="image-hover-overlay" />
          <span className="image-order">{index + 1}</span>
          <button
            className="delete-image"
            type="button"
            aria-label={`Remove image ${index + 1}`}
            onClick={() => onRemove(image.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DragPreview({ image, scale }: { image: GalleryImage; scale: number }) {
  return (
    <div
      className="drag-preview"
      style={{ "--drag-preview-scale": scale } as React.CSSProperties}
    >
      <span className="drag-preview-handle"><GripVertical size={15} /></span>
      <img src={image.src} alt="" />
    </div>
  );
}

function InteractiveGallery({
  images,
  setImages,
}: {
  images: GalleryImage[];
  setImages: (images: GalleryImage[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [suppressHover, setSuppressHover] = useState(false);
  const [dragPreviewScale, setDragPreviewScale] = useState(1);
  const activeImage = images.find(({ id }) => id === activeId);
  const activeIndex = images.findIndex(({ id }) => id === activeId);
  const overIndex = images.findIndex(({ id }) => id === overId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setSuppressHover(false);
    setDragPreviewScale((active.rect.current.initial?.width ?? 56) / 56);
    setActiveId(String(active.id));
    setOverId(String(active.id));
  };
  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over ? String(over.id) : null);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    setSuppressHover(true);
    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex(({ id }) => id === active.id);
    const overValue = String(over.id);
    const dropZoneIndex = overValue.startsWith(IMAGE_DROP_ZONE_PREFIX)
      ? Number(overValue.slice(IMAGE_DROP_ZONE_PREFIX.length))
      : null;
    const newIndex = dropZoneIndex === null
      ? images.findIndex(({ id }) => id === over.id)
      : dropZoneIndex > oldIndex
        ? dropZoneIndex - 1
        : dropZoneIndex;
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    setImages(arrayMove(images, oldIndex, newIndex));
  };
  const indicatorSide =
    activeIndex === -1 || overIndex === -1 || activeIndex === overIndex
      ? undefined
      : activeIndex < overIndex
        ? "after"
        : "before";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
        setSuppressHover(true);
      }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map(({ id }) => id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className={[
            "gallery-list",
            activeId ? "is-reordering" : "",
            suppressHover ? "suppress-hover" : "",
          ].filter(Boolean).join(" ")}
          onPointerLeave={() => setSuppressHover(false)}
          onPointerMove={() => {
            if (suppressHover && !activeId) setSuppressHover(false);
          }}
        >
          {images.flatMap((image, index) => [
            <ImageDropZone
              key={`${IMAGE_DROP_ZONE_PREFIX}${index}`}
              index={index}
              active={overId === `${IMAGE_DROP_ZONE_PREFIX}${index}`}
              disabled={activeIndex === -1 || index === activeIndex || index === activeIndex + 1}
            />,
            <SortableImageCard
              key={image.id}
              image={image}
              index={index}
              onRemove={(id) => setImages(images.filter((item) => item.id !== id))}
              dropIndicator={image.id === overId ? indicatorSide : undefined}
            />,
          ])}
          <ImageDropZone
            index={images.length}
            active={overId === `${IMAGE_DROP_ZONE_PREFIX}${images.length}`}
            disabled={activeIndex === -1 || images.length === activeIndex + 1}
          />
        </div>
      </SortableContext>
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 220, easing: "ease" }}>
          {activeImage ? <DragPreview image={activeImage} scale={dragPreviewScale} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

function SideNavigation() {
  return (
    <aside className="side-nav">
      <img className="jobber-logo" src="/assets/jobber-logo.svg" alt="Jobber" />
      <nav aria-label="Primary navigation">
        {navGroups.map((group, groupIndex) => (
          <div className="nav-group" key={groupIndex}>
            {group.map(({ label, icon: Icon }) => (
              <button className="nav-item" type="button" key={label}>
                <Icon size={19} strokeWidth={1.9} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button className="back-button" type="button" aria-label="Go back">
        <ArrowLeft size={20} />
      </button>
    </aside>
  );
}

function CompactSideNavigation() {
  const compactItems = [
    CirclePlus,
    Home,
    CalendarDays,
    Users,
    ClipboardList,
    WalletCards,
    BriefcaseBusiness,
    ReceiptText,
    Megaphone,
    FileChartColumn,
    FileText,
    Clock3,
    AppWindow,
  ];

  return (
    <aside className="compact-side-nav">
      <img className="jobber-logo" src="/assets/jobber-logo.svg" alt="Jobber" />
      <nav aria-label="Primary navigation">
        {compactItems.map((Icon, index) => (
          <span className="compact-nav-item" key={index}>
            <Icon size={18} strokeWidth={1.9} />
          </span>
        ))}
      </nav>
      <span className="compact-back"><ArrowLeft size={19} /></span>
    </aside>
  );
}

function TopBar({
  compact = false,
  staticControls = false,
  marketingEssentials = false,
}: {
  compact?: boolean;
  staticControls?: boolean;
  marketingEssentials?: boolean;
}) {
  return (
    <header className={`top-bar${compact ? " compact" : ""}`}>
      <span className="workspace-name">
        ABC Landscaping{marketingEssentials ? " / Marketing Essentials" : ""}
      </span>
      <div className="top-actions">
        <button className="search-button" type="button" disabled={staticControls}>
          <Search size={20} />
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <button type="button" aria-label="Assistant" disabled={staticControls}><Sparkles size={20} /></button>
        <button type="button" aria-label="Messages" disabled={staticControls}><MessageSquareText size={20} /></button>
        <button type="button" aria-label="Notifications" disabled={staticControls}><Bell size={20} /></button>
        <button type="button" aria-label="Help" disabled={staticControls}><CircleHelp size={20} /></button>
      </div>
    </header>
  );
}

type CalendarItem = {
  title: string;
  channel?: "Facebook post" | "Google post" | "Instagram post" | "Email" | "Website";
  channels?: Array<"Facebook post" | "Google post" | "Instagram post" | "Email" | "Website">;
  status: "Failed" | "Sent" | "Published" | "Missed" | "Scheduled" | "Needs review";
  tone?: "critical" | "warning" | "review";
  automated?: boolean;
  target?: boolean;
  combinedTarget?: boolean;
  generatedSuggestion?: boolean;
  generatedDelivery?: boolean;
  showDate?: boolean;
  campaignDate?: string;
  campaignSource?: V4CampaignSource;
  channelStatuses?: Partial<Record<CalendarChannel, CalendarChannelStatus>>;
};

type CalendarGroup = {
  key?: string;
  label: string;
  items: CalendarItem[];
};

const CALENDAR_CHANNEL_BY_PREVIEW: Record<PreviewChannel, CalendarChannel> = {
  google: "Google post",
  facebook: "Facebook post",
  instagram: "Instagram post",
};

const CALENDAR_COLUMNS: { day: string; groups: CalendarGroup[] }[] = [
  { day: "Sunday, Nov 1", groups: [] },
  {
    day: "Monday, Nov 2",
    groups: [
      {
        label: "Failed (1)",
        items: [{ title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Failed", tone: "critical" }],
      },
      {
        label: "Sent (1)",
        items: [{ title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Sent" }],
      },
    ],
  },
  {
    day: "Tuesday, Nov 3",
    groups: [
      {
        label: "Failed (1)",
        items: [{ title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Failed", tone: "critical" }],
      },
      {
        label: "Sent (2)",
        items: [
          { title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Sent" },
          { title: "Win back lost leads with automated campaign", channel: "Email", status: "Sent", automated: true },
        ],
      },
    ],
  },
  {
    day: "Wednesday, Nov 4",
    groups: [
      {
        label: "Sent (4)",
        items: [
          { title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Sent" },
          { title: "Review your Jobber created website", channel: "Website", status: "Published" },
          { title: "Kitchen deep clean before Thanksgiving", channel: "Email", status: "Sent" },
          { title: "Kitchen deep clean before Thanksgiving", channel: "Google post", status: "Sent" },
        ],
      },
    ],
  },
  {
    day: "Thursday, Nov 5",
    groups: [
      {
        label: "Missed (2)",
        items: [
          { title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Missed", tone: "warning" },
          { title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Missed", tone: "warning" },
        ],
      },
      {
        label: "Scheduled (1)",
        items: [{ title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Scheduled" }],
      },
    ],
  },
  {
    day: "Friday, Nov 6",
    groups: [
      {
        label: "Needs review (3)",
        items: [
          { title: "Kitchen deep clean before Thanksgiving", channel: "Facebook post", status: "Needs review", tone: "review" },
          { title: "Project showcase: Hamilton property clean...", channel: "Google post", status: "Needs review", tone: "review", target: true },
          { title: "Kitchen deep clean before Thanksgiving", channel: "Email", status: "Needs review", tone: "review" },
        ],
      },
    ],
  },
  {
    day: "Saturday, Nov 7",
    groups: [{
      label: "Needs review (1)",
      items: [{
        title: "Seasonal property clean up in Hamilton",
        channels: ["Google post", "Facebook post", "Instagram post", "Email", "Website"],
        status: "Needs review",
        tone: "review",
        combinedTarget: true,
        showDate: false,
      }],
    }],
  },
];

const UPDATED_CALENDAR_COLUMNS: { day: string; groups: CalendarGroup[] }[] = [
  { day: "Sunday, Nov 1", groups: [] },
  {
    day: "Monday, Nov 2",
    groups: [{
      label: "Needs review (1)",
      items: [{
        title: "{Post title}",
        channels: ["Facebook post", "Google post", "Instagram post"],
        status: "Needs review",
        tone: "review",
        showDate: false,
      }],
    }],
  },
  {
    day: "Tuesday, Nov 3",
    groups: [{
      label: "Needs review (1)",
      items: [{
        title: "{Post title}",
        channels: ["Facebook post", "Google post", "Instagram post"],
        status: "Needs review",
        tone: "review",
        showDate: false,
      }],
    }],
  },
  {
    day: "Wednesday, Nov 4",
    groups: [
      {
        label: "Needs review (3)",
        items: [{
          title: "{Post title}",
          channels: ["Facebook post", "Google post", "Instagram post"],
          status: "Needs review",
          tone: "review",
          showDate: false,
        }],
      },
      {
        label: "Posted (2)",
        items: [
          { title: "{Post title}", channel: "Website", status: "Published" },
          { title: "{Post title}", channel: "Email", status: "Sent" },
        ],
      },
    ],
  },
  {
    day: "Thursday, Nov 5",
    groups: [{
      label: "Needs review (1)",
      items: [{
        title: "{Post title}",
        channels: ["Facebook post", "Google post", "Instagram post"],
        status: "Needs review",
        tone: "review",
        showDate: false,
      }],
    }],
  },
  {
    day: "Friday, Nov 6",
    groups: [{
      label: "Needs review (3)",
      items: [
        {
          title: "{Post title}",
          channels: ["Facebook post", "Google post", "Instagram post"],
          status: "Needs review",
          tone: "review",
          showDate: false,
        },
        {
          title: "Post title 1",
          channels: ["Facebook post", "Google post", "Instagram post"],
          status: "Needs review",
          tone: "review",
          target: true,
          showDate: false,
        },
        {
          title: "{Post title}",
          channels: ["Facebook post", "Google post", "Instagram post"],
          status: "Needs review",
          tone: "review",
          showDate: false,
        },
      ],
    }],
  },
  {
    day: "Saturday, Nov 7",
    groups: [{
      label: "Needs review (1)",
      items: [{
        title: "Seasonal property clean up in Hamilton",
        channels: ["Google post", "Facebook post", "Instagram post", "Email", "Website"],
        status: "Needs review",
        tone: "review",
        combinedTarget: true,
        showDate: false,
      }],
    }],
  },
];

type CalendarChannel = NonNullable<CalendarItem["channel"]>;
type CalendarChannelStatus = "scheduled" | "sent" | "missed" | "error";
type CalendarCardStatusKey = "friday-social" | "saturday-campaign" | "suggested";
type CalendarCardStatuses = Partial<
  Record<CalendarCardStatusKey, Partial<Record<CalendarChannel, CalendarChannelStatus>>>
>;
type CalendarStatusMap = Record<PrototypeVersion, CalendarCardStatuses>;
type V4CampaignSource = "original" | "generated";
type V4CampaignDeleteTarget =
  | { kind: "calendar"; source: V4CampaignSource }
  | { kind: "adhoc-created"; showcaseId: string };
type V4CampaignCalendarCard = {
  date: string;
  source: V4CampaignSource;
  channels: ContextualChannel[];
  item: CalendarItem;
};

const createInitialCalendarStatuses = (): CalendarStatusMap => ({
  v1: {},
  v2: {},
  v3: {},
  v4: {},
  v5: {},
});

const CONTEXTUAL_TO_CALENDAR_CHANNEL: Record<ContextualChannel, CalendarChannel> = {
  google: "Google post",
  facebook: "Facebook post",
  instagram: "Instagram post",
  email: "Email",
  website: "Website",
};

const V4_CALENDAR_CHANNEL_ORDER: CalendarChannel[] = [
  "Google post",
  "Instagram post",
  "Facebook post",
  "Email",
  "Website",
];

const V4_CALENDAR_CHANNEL_NAMES: Record<CalendarChannel, string> = {
  "Google post": "Google",
  "Instagram post": "Instagram",
  "Facebook post": "Facebook",
  Email: "Email",
  Website: "Website",
};

const V4_ADD_NEW_MENU_ITEMS = [
  { id: "email", label: "Email campaign" },
  { id: "website", label: "Website page" },
  { id: "google", label: "Google post" },
  { id: "facebook", label: "Facebook post" },
  { id: "instagram", label: "Instagram post" },
  { id: "multiple", label: "Create for Multiple Channels" },
] as const;

const STATUS_LABELS: Record<CalendarChannelStatus, string> = {
  scheduled: "Scheduled",
  sent: "Sent",
  missed: "Missed",
  error: "Error",
};

function calendarCardStatusKey(item: CalendarItem): CalendarCardStatusKey | undefined {
  if (item.generatedSuggestion) return "suggested";
  if (item.combinedTarget) return "saturday-campaign";
  if (item.target) return "friday-social";
  return undefined;
}

function ChannelStatusDot({ status }: { status: CalendarChannelStatus }) {
  const label = STATUS_LABELS[status];
  return (
    <span
      className={`channel-status-dot status-${status}`}
      role="img"
      aria-label={`Status: ${label}`}
      title={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

function WebsiteChannelIcon({
  width,
  height,
  label,
}: {
  width: number;
  height: number;
  label?: string;
}) {
  return (
    <img
      className="website-channel-icon"
      src="/assets/website-channel-icon.svg"
      width={width}
      height={height}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
    />
  );
}

function ChannelIcon({ channel }: { channel: CalendarChannel }) {
  if (channel === "Facebook post") return <strong className="brand-facebook">f</strong>;
  if (channel === "Instagram post") return <strong className="brand-instagram">◎</strong>;
  if (channel === "Google post") return <strong className="google-g">G</strong>;
  if (channel === "Email") return <Mail size={14} />;
  return <WebsiteChannelIcon width={14} height={14} />;
}

const V4_CALENDAR_CHANNEL_ICON_SRC: Record<CalendarChannel, string> = {
  "Google post": "/assets/v4-calendar-google.svg",
  "Instagram post": "/assets/v4-calendar-instagram.svg",
  "Facebook post": "/assets/v4-calendar-facebook.svg",
  Email: "/assets/v4-calendar-email.svg",
  Website: "/assets/v4-calendar-website.svg",
};

function V4CalendarChannelIcon({ channel }: { channel: CalendarChannel }) {
  return (
    <span
      className="calendar-channel-label v4-calendar-channel-icon"
      data-channel={V4_CALENDAR_CHANNEL_NAMES[channel].toLowerCase()}
      aria-hidden="true"
    >
      <img src={V4_CALENDAR_CHANNEL_ICON_SRC[channel]} width={18} height={18} alt="" />
    </span>
  );
}

function V4AddNewMenuIcon({
  item,
}: {
  item: (typeof V4_ADD_NEW_MENU_ITEMS)[number]["id"];
}) {
  if (item === "email") return <Mail size={24} strokeWidth={2} aria-hidden="true" />;
  if (item === "website") {
    return <WebsiteChannelIcon width={24} height={22} />;
  }
  if (item === "multiple") return <Sparkles size={24} strokeWidth={2} aria-hidden="true" />;

  return (
    <img
      className="v4-add-new-social-icon"
      src={`/assets/jobber-${item}-channel-icon.svg`}
      width={24}
      height={24}
      alt=""
      aria-hidden="true"
    />
  );
}

function calendarItemV4State(status: CalendarItem["status"]): V4CampaignCardInputState {
  if (status === "Failed") return "error";
  if (status === "Sent" || status === "Published") return "sent";
  if (status === "Missed") return "missed";
  if (status === "Scheduled") return "scheduled";
  return "suggested";
}

function v4AggregateCalendarItemStatus(
  states: readonly V4CampaignCardInputState[],
): CalendarItem["status"] {
  const aggregate = deriveV4CampaignCardState(states);
  if (aggregate.state === "failed") return "Failed";
  if (aggregate.state === "sent") return "Sent";
  if (aggregate.state === "missed") return "Missed";
  if (aggregate.state === "scheduled") return "Scheduled";
  return "Needs review";
}

function V4CampaignCalendarCard({
  title,
  channels,
  channelStates,
  dateLabel,
  className,
  interactive,
  onOpen,
}: {
  title: string;
  channels: CalendarChannel[];
  channelStates: V4CampaignCardInputState[];
  dateLabel: string;
  className: string;
  interactive: boolean;
  onOpen: () => void;
}) {
  const orderedChannels = V4_CALENDAR_CHANNEL_ORDER.filter((channel) => (
    channels.includes(channel)
  ));
  const stateByChannel = new Map(channels.map((channel, index) => (
    [channel, channelStates[index]] as const
  )));
  const visualState = deriveV4CampaignCardState(
    orderedChannels.map((channel) => stateByChannel.get(channel)),
  );
  const singleChannel = orderedChannels.length === 1 ? orderedChannels[0] : null;
  const accessibleName = singleChannel ? undefined : [
    title,
    `Channels: ${orderedChannels.map((channel) => V4_CALENDAR_CHANNEL_NAMES[channel]).join(", ")}`,
    `Date: ${dateLabel}`,
    `Status: ${visualState.label}`,
  ].join(". ");
  const content = (
    <>
      <span className="calendar-card-title">{title}</span>
      <span className="v4-calendar-card-supporting">
        <span
          className={`v4-calendar-card-channels${singleChannel ? " is-single-channel" : ""}`}
          aria-hidden={singleChannel ? undefined : true}
        >
          {orderedChannels.map((channel) => (
            <V4CalendarChannelIcon channel={channel} key={channel} />
          ))}
          {singleChannel && (
            <span className="v4-calendar-single-channel-label">
              {V4_CALENDAR_CHANNEL_NAMES[singleChannel]}
            </span>
          )}
        </span>
        <span className="calendar-card-details v4-calendar-card-details">
          <span className="v4-calendar-card-metadata-row">
            <img src="/assets/v4-calendar-date.svg" width={16} height={16} alt="" aria-hidden="true" />
            <span>{dateLabel}</span>
          </span>
          <span className="v4-calendar-card-metadata-row">
            <img src="/assets/v4-calendar-status.svg" width={16} height={16} alt="" aria-hidden="true" />
            <span>{visualState.label}</span>
          </span>
        </span>
      </span>
      {visualState.state === "sent" && (
        <CheckCircle2
          className="card-success v4-calendar-card-success"
          size={16}
          fill="#388523"
          color="white"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </>
  );
  const sharedProps = {
    className,
    "data-card-state": visualState.state,
    "data-failed-count": visualState.state === "failed"
      ? String(visualState.failedCount)
      : undefined,
    "aria-label": accessibleName,
  };

  return interactive ? (
    <button {...sharedProps} type="button" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div {...sharedProps}>{content}</div>
  );
}

function MarketingCalendarCard({
  item,
  onOpen,
  inert = false,
  combinedInteractive = false,
  updated = false,
  targetPublished = false,
  combinedPublished = false,
  targetChannels,
  combinedChannels,
  channelStatuses,
  v4CampaignDesign = false,
  calendarDateLabel = "Nov 9",
}: {
  item: CalendarItem;
  onOpen: () => void;
  inert?: boolean;
  combinedInteractive?: boolean;
  updated?: boolean;
  targetPublished?: boolean;
  combinedPublished?: boolean;
  targetChannels?: CalendarChannel[];
  combinedChannels?: CalendarChannel[];
  channelStatuses?: CalendarCardStatuses;
  v4CampaignDesign?: boolean;
  calendarDateLabel?: string;
}) {
  const channels = item.combinedTarget && combinedChannels
    ? combinedChannels
    : item.target && targetPublished && targetChannels
      ? targetChannels
      : item.channels ?? (item.channel ? [item.channel] : []);
  const status = (item.target && targetPublished) || (item.combinedTarget && combinedPublished)
    ? "Sent"
    : item.status;
  const isPublished = (item.target && targetPublished)
    || (item.combinedTarget && (combinedPublished || item.status === "Sent"))
    || Boolean(item.generatedDelivery && item.status !== "Needs review");
  const statusKey = calendarCardStatusKey(item);
  const cardStatuses = item.channelStatuses
    ?? (statusKey ? channelStatuses?.[statusKey] : undefined);
  const isInteractive = !inert && (
    item.target
      || (item.combinedTarget && combinedInteractive)
      || Boolean(item.generatedDelivery)
  );
  const sharedClasses = [
    "marketing-calendar-card",
    v4CampaignDesign ? "v4-campaign-calendar-card" : "",
    item.target || item.combinedTarget || item.generatedDelivery ? "target-card" : "",
    item.combinedTarget ? "combined-target-card" : "",
    updated ? "updated-card" : "",
    item.generatedSuggestion ? "generated-suggestion-card" : "",
    item.generatedDelivery ? "generated-delivery-card" : "",
  ].filter(Boolean).join(" ");

  if (v4CampaignDesign) {
    const channelStates = channels.map((channel) => (
      cardStatuses === undefined
        ? calendarItemV4State(status)
        : cardStatuses[channel] ?? "suggested"
    ));
    return (
      <V4CampaignCalendarCard
        title={item.title}
        channels={channels}
        channelStates={channelStates}
        dateLabel={calendarDateLabel}
        className={sharedClasses}
        interactive={isInteractive}
        onOpen={onOpen}
      />
    );
  }

  const content = (
    <>
      <span className="calendar-card-title">{item.title}</span>
      {channels.map((channel) => (
        <span className="calendar-card-meta channel" key={channel}>
          <span className="calendar-channel-label">
            <ChannelIcon channel={channel} />
            {channel}
          </span>
          {cardStatuses?.[channel] && <ChannelStatusDot status={cardStatuses[channel]} />}
        </span>
      ))}
      <span className="calendar-card-details">
        {item.showDate !== false && <span><Calendar size={13} /> Nov 9</span>}
        {item.automated && <span><Sparkles size={13} /> Automated campaign</span>}
        <span><FileText size={13} /> {status}</span>
      </span>
      {!item.generatedDelivery && (status === "Sent" || status === "Published") && (
        <CheckCircle2 className="card-success" size={15} fill="#388523" color="white" />
      )}
    </>
  );
  const interactiveClasses = [
    "marketing-calendar-card target-card",
    isPublished ? "" : "review",
    item.combinedTarget ? "combined-target-card" : "",
    updated ? "updated-card" : "",
    isPublished ? "published-card" : "",
    item.generatedSuggestion ? "generated-suggestion-card" : "",
    item.generatedDelivery ? "generated-delivery-card" : "",
  ].filter(Boolean).join(" ");

  return isInteractive ? (
    <button
      className={interactiveClasses}
      type="button"
      onClick={onOpen}
    >
      {content}
    </button>
  ) : inert ? (
    <div className={interactiveClasses}>
      {content}
    </div>
  ) : (
    <div className={[
      "marketing-calendar-card",
      item.tone ?? "",
      updated ? "updated-card" : "",
      item.generatedSuggestion ? "generated-suggestion-card" : "",
      item.generatedDelivery ? "generated-delivery-card" : "",
    ].filter(Boolean).join(" ")}>
      {content}
    </div>
  );
}

function CalendarScreen({
  onOpenPost,
  onOpenCombinedPost,
  onOpenTasks,
  taskButtonRef,
  taskReturnRef,
  taskCount = 0,
  showTaskCard = false,
  v4Prompt,
  v4Generating = false,
  onV4PromptChange,
  onV4PromptSubmit,
  combinedInteractive = false,
  updated = false,
  targetPublished = false,
  combinedPublished = false,
  targetChannels,
  combinedChannels,
  generatedSuggestionCard,
  channelStatuses,
  v4CampaignCards,
  inertPostTitleOne = false,
  v4CampaignDesign = false,
  v4AddNewMenu = false,
  hideHeaderCreateNew = false,
  hideCalendarPrompt = false,
  onCreateMultipleChannels,
}: {
  onOpenPost: () => void;
  onOpenCombinedPost: (
    campaignDate?: string,
    campaignSource?: V4CampaignSource,
    representedChannels?: CalendarChannel[],
  ) => void;
  onOpenTasks?: () => void;
  taskButtonRef?: Ref<HTMLButtonElement>;
  taskReturnRef?: Ref<HTMLHeadingElement>;
  taskCount?: number;
  showTaskCard?: boolean;
  v4Prompt?: string;
  v4Generating?: boolean;
  onV4PromptChange?: (value: string) => void;
  onV4PromptSubmit?: () => void;
  combinedInteractive?: boolean;
  updated?: boolean;
  targetPublished?: boolean;
  combinedPublished?: boolean;
  targetChannels?: CalendarChannel[];
  combinedChannels?: CalendarChannel[];
  generatedSuggestionCard?: CalendarItem;
  channelStatuses?: CalendarCardStatuses;
  v4CampaignCards?: V4CampaignCalendarCard[];
  inertPostTitleOne?: boolean;
  v4CampaignDesign?: boolean;
  v4AddNewMenu?: boolean;
  hideHeaderCreateNew?: boolean;
  hideCalendarPrompt?: boolean;
  onCreateMultipleChannels?: (prompt: string) => void;
}) {
  const [addNewMenuOpen, setAddNewMenuOpen] = useState(false);
  const [startIdeaOpen, setStartIdeaOpen] = useState(false);
  const addNewTriggerRef = useRef<HTMLButtonElement>(null);
  const addNewMenuRef = useRef<HTMLDivElement>(null);
  const addNewItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseColumns = v4CampaignCards
    ? [
        ...UPDATED_CALENDAR_COLUMNS
          .filter((column) => column.day !== "Sunday, Nov 1")
          .map((column) => ({
            ...column,
            groups: column.groups
              .map((group) => ({
                ...group,
                items: group.items.filter((item) => !item.combinedTarget),
              }))
              .filter((group) => group.items.length > 0),
          })),
        { day: "Sunday, Nov 8", groups: [] },
      ].map((column) => {
        const date = `2026-11-${column.day.match(/Nov (\d+)/)?.[1].padStart(2, "0")}`;
        const campaignGroups = v4CampaignCards
          .filter((card) => card.date === date)
          .map((card) => ({
            key: `${card.source}-${card.date}`,
            label: `${card.item.status} (1)`,
            items: [card.item],
          }));
        return { ...column, groups: [...campaignGroups, ...column.groups] };
      })
    : updated
      ? UPDATED_CALENDAR_COLUMNS
      : CALENDAR_COLUMNS;
  const columns = generatedSuggestionCard
    ? baseColumns.map((column) => (
        column.day === "Friday, Nov 6"
          ? {
              ...column,
              groups: [
                { label: "Sent (1)", items: [generatedSuggestionCard] },
                ...column.groups,
              ],
            }
          : column
      ))
    : baseColumns;

  const closeAddNewMenu = (returnFocus = false) => {
    setAddNewMenuOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => addNewTriggerRef.current?.focus());
    }
  };

  useLayoutEffect(() => {
    if (addNewMenuOpen) addNewItemRefs.current[0]?.focus();
  }, [addNewMenuOpen]);

  useEffect(() => {
    if (!v4AddNewMenu) {
      setAddNewMenuOpen(false);
      setStartIdeaOpen(false);
    }
  }, [v4AddNewMenu]);

  useEffect(() => {
    if (!addNewMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        addNewTriggerRef.current?.contains(target)
        || addNewMenuRef.current?.contains(target)
      ) return;
      setAddNewMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [addNewMenuOpen]);

  const handleAddNewMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = addNewItemRefs.current.findIndex(
      (item) => item === document.activeElement,
    );
    if (event.key === "Escape") {
      event.preventDefault();
      closeAddNewMenu(true);
      return;
    }
    if (event.key === "Tab") {
      window.setTimeout(() => setAddNewMenuOpen(false), 0);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : V4_ADD_NEW_MENU_ITEMS.length - 1;
      addNewItemRefs.current[nextIndex]?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (
        (currentIndex < 0 ? 0 : currentIndex)
        + direction
        + V4_ADD_NEW_MENU_ITEMS.length
      ) % V4_ADD_NEW_MENU_ITEMS.length;
      addNewItemRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <>
    <main className={`calendar-page ${updated ? "updated-calendar-page" : ""}`}>
      <section className="marketing-page-header">
        <div className="marketing-title-row">
          <h1>Marketing Plan</h1>
          <div className="static-header-actions">
            <span>Give Feedback</span>
            {!hideHeaderCreateNew && (
              <span className="create-new"><Plus size={18} /> Create New</span>
            )}
          </div>
        </div>
        <div className="marketing-quick-links">
          <span className="all-tools">All Marketing Tools <ChevronDown size={18} /></span>
          <strong>QUICK LINKS:</strong>
          <span>Marketing Plan <i>New</i></span>
          <span>Reviews</span>
          <span>Campaigns</span>
          <span>Job Showcase <i>New</i></span>
          <span>Social Posting <i>New</i></span>
        </div>
      </section>

      <section className="marketing-calendar">
        <header className="calendar-toolbar">
          <div className="calendar-month">
            <ChevronLeft size={24} />
            <ChevronRight size={24} />
            <strong>{v4Prompt === undefined ? "November" : "Nov"}</strong>
            <span>2026</span>
            {!hideCalendarPrompt
              && v4Prompt !== undefined
              && onV4PromptChange
              && onV4PromptSubmit && (
              <form
                className={`v4-calendar-prompt${v4Generating ? " generating" : ""}`}
                aria-busy={v4Generating}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (v4Generating) return;
                  onV4PromptSubmit();
                }}
              >
                <Sparkles size={21} aria-hidden="true" />
                <input
                  type="text"
                  value={v4Prompt}
                  disabled={v4Generating}
                  aria-label="Add to your marketing calendar"
                  placeholder="Add to your marketing calendar ..."
                  onChange={(event) => onV4PromptChange(event.target.value)}
                />
                {v4Generating ? (
                  <span className="v4-calendar-generating" role="status" aria-live="polite">
                    <i aria-hidden="true" />
                    Generating suggestions…
                  </span>
                ) : (
                  <button
                    type="submit"
                    aria-label="Generate suggested marketing content"
                    disabled={!v4Prompt.trim()}
                  >
                    <Send size={20} aria-hidden="true" />
                  </button>
                )}
              </form>
              )}
            <small><CalendarDays size={14} /> Today</small>
          </div>
          <div className="calendar-view-control">
            <span className="active">Week</span><span>Month</span><span>List</span>
          </div>
          <SlidersHorizontal size={21} />
          {v4AddNewMenu ? (
            <div className="v4-add-new-control">
              <button
                className="add-new"
                type="button"
                ref={addNewTriggerRef}
                aria-haspopup="menu"
                aria-expanded={addNewMenuOpen}
                aria-controls="v4-calendar-add-new-menu"
                onClick={() => setAddNewMenuOpen((open) => !open)}
              >
                <Plus size={20} aria-hidden="true" />
                Add New
              </button>
              {addNewMenuOpen && (
                <div
                  className="v4-add-new-menu"
                  id="v4-calendar-add-new-menu"
                  role="menu"
                  aria-label="Add new marketing content"
                  ref={addNewMenuRef}
                  onKeyDown={handleAddNewMenuKeyDown}
                >
                  {V4_ADD_NEW_MENU_ITEMS.map((item, index) => (
                    <span key={item.id}>
                      {index === 5 && (
                        <span className="v4-add-new-menu-divider" role="separator" />
                      )}
                      <button
                        className="v4-add-new-menu-item"
                        type="button"
                        role="menuitem"
                        data-menu-action={item.id}
                        ref={(node) => {
                          addNewItemRefs.current[index] = node;
                        }}
                        onClick={() => {
                          if (item.id === "multiple" && onCreateMultipleChannels) {
                            setAddNewMenuOpen(false);
                            setStartIdeaOpen(true);
                            return;
                          }
                          closeAddNewMenu(true);
                        }}
                      >
                        <span className="v4-add-new-menu-icon" aria-hidden="true">
                          <V4AddNewMenuIcon item={item.id} />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="add-new"><Plus size={20} /> Add New</span>
          )}
        </header>
        <div className="calendar-grid">
          {columns.map((column) => (
            <section
              className={`calendar-day${column.groups.some((group) => (
                group.items.some((item) => item.generatedSuggestion)
              ))
                ? " with-generated-suggestion"
                : ""}`}
              key={column.day}
            >
              <h2
                className={column.day.startsWith("Friday") ? "today" : ""}
                ref={column.day === "Friday, Nov 6" ? taskReturnRef : undefined}
                tabIndex={column.day === "Friday, Nov 6" && taskReturnRef ? -1 : undefined}
              >
                {column.day}
              </h2>
              {showTaskCard && taskCount > 0 && column.day === "Friday, Nov 6" && onOpenTasks && (
                <button
                  className="v4-pending-task-card"
                  type="button"
                  ref={taskButtonRef}
                  onClick={() => {
                    setAddNewMenuOpen(false);
                    onOpenTasks();
                  }}
                >
                  <span className="v4-pending-task-icon" aria-hidden="true">
                    <img
                      src="/assets/v4-task-icon.svg"
                      width={11}
                      height={14}
                      alt=""
                    />
                  </span>
                  <span>{taskCount} pending {taskCount === 1 ? "task" : "tasks"}</span>
                </button>
              )}
              {column.groups.map((group) => (
                <div className="calendar-group" key={group.key ?? group.label}>
                  {!group.label.startsWith("Needs review")
                    && !group.label.startsWith("Posted")
                    && !group.label.startsWith("Sent")
                    && !group.items.some((item) => item.generatedDelivery) && (
                    <h3>{group.label}</h3>
                  )}
                  {group.items.map((item, index) => (
                    <MarketingCalendarCard
                      key={`${item.title}-${index}`}
                      item={item}
                      inert={inertPostTitleOne && item.title === "Post title 1"}
                      onOpen={item.combinedTarget || item.generatedDelivery
                        ? () => {
                            setAddNewMenuOpen(false);
                            onOpenCombinedPost(
                              item.campaignDate,
                              item.campaignSource,
                              item.channels,
                            );
                          }
                        : () => {
                            setAddNewMenuOpen(false);
                            onOpenPost();
                          }}
                      combinedInteractive={combinedInteractive}
                      updated={updated}
                      targetPublished={targetPublished}
                      combinedPublished={combinedPublished}
                      targetChannels={targetChannels}
                      combinedChannels={combinedChannels}
                      channelStatuses={channelStatuses}
                      v4CampaignDesign={v4CampaignDesign}
                      calendarDateLabel={column.day.match(/([A-Z][a-z]{2}) (\d+)/)?.slice(1).join(" ")
                        ?? "Nov 9"}
                    />
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </section>
    </main>
    {startIdeaOpen && onCreateMultipleChannels && (
      <V4StartIdeaPromptModal
        onClose={() => {
          setStartIdeaOpen(false);
          window.requestAnimationFrame(() => addNewTriggerRef.current?.focus());
        }}
        onSubmit={(prompt) => {
          setStartIdeaOpen(false);
          setAddNewMenuOpen(false);
          onCreateMultipleChannels(prompt);
        }}
      />
    )}
    </>
  );
}

const V4_DASHBOARD_SUGGESTIONS = [
  {
    label: "15% promotion",
    prompt: "Create a 15% Christmas promotion for winter landscaping services across Google, Facebook, Instagram, and Email.",
  },
  {
    label: "Win back old clients",
    prompt: "Create a campaign to win back old landscaping clients across Google, Facebook, Instagram, and Email.",
  },
  {
    label: "Fill next week’s open slots",
    prompt: "Create a campaign to fill next week’s open landscaping appointments across Google, Facebook, Instagram, and Email.",
  },
  {
    label: "Ask happy customers for a review",
    prompt: "Create a campaign asking happy landscaping customers to leave a review across Google, Facebook, Instagram, and Email.",
  },
];

function V4StartIdeaPromptModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmedPrompt = prompt.trim();
  const generatedChannels: ContextualChannel[] = [
    "google",
    "facebook",
    "instagram",
    "email",
  ];
  const submit = () => {
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt);
  };

  useLayoutEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter"
      && (event.metaKey || event.ctrlKey)
      && event.target === textareaRef.current
    ) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
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
      className="calendar-modal-overlay v4-start-idea-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="v4-start-idea-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-start-idea-title"
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <h1 id="v4-start-idea-title">Start with your own idea</h1>
        <div className="v4-start-idea-prompt-card">
          <div className="v4-start-idea-prompt-area">
            <span className="v4-start-idea-ai-favicon" aria-hidden="true">
              <img src="/assets/v4-task-ai-sparkle.svg" width={16} height={16} alt="" />
            </span>
            <label className="sr-only" htmlFor="v4-start-idea-prompt">
              Describe your marketing idea
            </label>
            <textarea
              id="v4-start-idea-prompt"
              ref={textareaRef}
              value={prompt}
              placeholder="Describe your idea and we'll turn it into ready-to-send content for multiple channels"
              onChange={(event) => setPrompt(event.target.value)}
            />
          </div>
          <div className="v4-start-idea-divider" />
          <div className="v4-start-idea-action-row">
            <div
              className="v4-start-idea-channels"
              role="group"
              aria-label="Channels"
            >
              {generatedChannels.map((channel) => (
                <span key={channel}>
                  <span aria-hidden="true">
                    <ContextualChannelArtwork channel={channel} iconStyle="jobber" />
                  </span>
                  {CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)?.label}
                </span>
              ))}
            </div>
            <button
              className="primary-button v4-start-idea-generate"
              type="button"
              disabled={!trimmedPrompt}
              onClick={submit}
            >
              Generate Content
            </button>
          </div>
        </div>
        <section className="v4-start-idea-suggestions" aria-labelledby="v4-start-idea-suggestions">
          <strong id="v4-start-idea-suggestions">TRY ONE OF THESE</strong>
          <div>
            {V4_DASHBOARD_SUGGESTIONS.map(({ label, prompt: suggestion }) => (
              <button
                type="button"
                onClick={() => setPrompt(suggestion)}
                key={label}
              >
                <img
                  src="/assets/v4-task-ai-sparkle.svg"
                  width={20}
                  height={20}
                  alt=""
                  aria-hidden="true"
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
        <button
          className="v4-start-idea-close"
          type="button"
          aria-label="Close start with your own idea"
          onClick={onClose}
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

type DashboardGenerationState = "idle" | "loading" | "summary";

function DashboardPromptBar({
  prompt,
  loading,
  onPromptChange,
  onGenerate,
}: {
  prompt: string;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <form
      className="v4-dashboard-context-prompt"
      aria-busy={loading}
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
    >
      <label className="sr-only" htmlFor="v4-dashboard-context-prompt">
        Describe your marketing idea
      </label>
      <input
        id="v4-dashboard-context-prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Create a promotion post"
      />
      <button
        type="submit"
        aria-label={loading ? "Generating marketing content" : "Generate Content"}
        disabled={!prompt.trim() || loading}
      >
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

function DashboardGeneratedSummary({
  selectedChannels,
  onToggleChannel,
  onReviewDrafts,
}: {
  selectedChannels: ContextualChannel[];
  onToggleChannel: (channel: ContextualChannel) => void;
  onReviewDrafts: () => void;
}) {
  return (
    <section
      className="v4-dashboard-generated-summary"
      aria-label="Generated marketing summary"
    >
      <div className="v4-dashboard-generated-copy">
        <h1>{GENERATED_V4_CAMPAIGN_TITLE}</h1>
        <p>{GENERATED_V4_SUMMARY_COPY}</p>
        <hr />
        <p className="v4-dashboard-generated-schedule">
          <strong>Schedule date:</strong> Nov 7th, 2026 9:00am
        </p>
        <p className="v4-dashboard-generated-label"><strong>Create drafts for:</strong></p>
        <div className="v4-dashboard-generated-channels">
          {GENERATED_V4_CHANNELS.map((channel) => {
            const selected = selectedChannels.includes(channel);
            const label = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)?.label ?? channel;
            return (
              <div className="v4-dashboard-generated-channel" key={channel}>
                <span>
                  <ContextualChannelArtwork channel={channel} iconStyle="jobber" />
                  {label}
                </span>
                <button
                  className={`channel-visibility-toggle ${selected ? "on" : "off"}`}
                  type="button"
                  role="switch"
                  aria-checked={selected}
                  aria-label={`${selected ? "Disable" : "Enable"} ${label}`}
                  onClick={() => onToggleChannel(channel)}
                >
                  {selected ? <Check size={14} /> : <X size={14} />}
                  <span />
                </button>
              </div>
            );
          })}
        </div>
        <button
          className="primary-button v4-dashboard-review-drafts"
          type="button"
          disabled={selectedChannels.length === 0}
          onClick={onReviewDrafts}
        >
          Review Drafts
        </button>
      </div>
      <img
        className="v4-dashboard-generated-artwork"
        src={GENERATED_V4_PROMOTION_ARTWORK.src}
        alt={GENERATED_V4_PROMOTION_ARTWORK.alt}
        width={315}
        height={591}
      />
    </section>
  );
}

function VersionFourDashboard({
  prompt,
  generationState,
  loadingStage,
  selectedChannels,
  onPromptChange,
  onGenerate,
  onToggleChannel,
  onReviewDrafts,
}: {
  prompt: string;
  generationState: DashboardGenerationState;
  loadingStage: number;
  selectedChannels: ContextualChannel[];
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onToggleChannel: (channel: ContextualChannel) => void;
  onReviewDrafts: () => void;
}) {
  const toolGroups = [
    {
      label: "GET FOUND ONLINE",
      tone: "online",
      tools: [
        {
          label: "Google Business Profile",
          description: "A complete profile helps you rank in local searches nearby.",
          icon: "google",
        },
        {
          label: "Social Posts",
          description: "Regular posts keep your business top of mind between jobs.",
          icon: "/assets/v4-dashboard-social.svg",
        },
        {
          label: "Your Website",
          description: "A real site builds credibility when people look you up.",
          icon: "/assets/v4-dashboard-website.svg",
        },
      ],
    },
    {
      label: "BUILD TRUST & BRAND",
      tone: "trust",
      tools: [
        {
          label: "Job Showcase",
          description: "Photos of past work show new customers you can deliver.",
          icon: "/assets/v4-dashboard-job-showcase.svg",
        },
        {
          label: "Review Management",
          description: "Fresh reviews boost trust and your ranking in local search.",
          icon: "/assets/v4-dashboard-review.svg",
        },
      ],
    },
    {
      label: "WIN THE JOB",
      tone: "win-job",
      tools: [
        {
          label: "Email Campaigns",
          description: "Reaching past customers brings repeat work at little cost.",
          icon: "/assets/v4-dashboard-email.svg",
        },
        {
          label: "Referral Campaigns",
          description: "Referrals convert better than ads and cost you nothing.",
          icon: "/assets/v4-dashboard-referral.svg",
        },
      ],
    },
  ];
  const generatedChannels: ContextualChannel[] = [
    "google",
    "facebook",
    "instagram",
    "email",
    "website",
  ];

  return (
    <main className="v4-dashboard-page">
      <section className="marketing-page-header">
        <div className="marketing-title-row">
          <h1>Marketing Dashboard</h1>
          <div className="static-header-actions" aria-hidden="true">
            <span>Give Feedback</span>
            <span className="create-new"><Plus size={18} /> Create New</span>
          </div>
        </div>
        <div className="marketing-quick-links" aria-hidden="true">
          <span className="all-tools">All Marketing Tools <ChevronDown size={18} /></span>
          <strong>QUICK LINKS:</strong>
          <span>Marketing Plan <i>New</i></span>
          <span>Reviews</span>
          <span>Campaigns</span>
          <span>Job Showcase <i>New</i></span>
          <span>Social Posting <i>New</i></span>
        </div>
      </section>

      <div className="v4-dashboard-tabs" role="tablist" aria-label="Marketing plan view">
        <button type="button" role="tab" aria-selected="false">Recommendations</button>
        <button type="button" role="tab" aria-selected="true">Start with your own idea</button>
      </div>

      <div className="v4-dashboard-content">
        <section
          className={`v4-dashboard-idea-panel${generationState === "idle"
            ? ""
            : " v4-dashboard-idea-panel--contextual"}`}
          aria-label="Start with your own idea"
        >
          {generationState === "idle" ? (
            <>
              <div className="v4-dashboard-prompt-card">
                <div className="v4-dashboard-prompt-area">
                  <span className="v4-dashboard-ai-favicon" aria-hidden="true">
                    <Sparkles size={16} />
                  </span>
                  <label className="sr-only" htmlFor="v4-dashboard-prompt">
                    Describe your marketing idea
                  </label>
                  <textarea
                    id="v4-dashboard-prompt"
                    value={prompt}
                    placeholder="Describe your idea and we'll turn it into ready-to-send content for multiple channels"
                    onChange={(event) => onPromptChange(event.target.value)}
                  />
                </div>
                <div className="v4-dashboard-card-divider" />
                <div className="v4-dashboard-channel-row">
                  <div className="v4-dashboard-channels" aria-label="Generated channels">
                    {generatedChannels.map((channel) => (
                      <span key={channel}>
                        <ContextualChannelArtwork channel={channel} iconStyle="jobber" />
                        {CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)?.label}
                      </span>
                    ))}
                  </div>
                  <button
                    className="primary-button v4-dashboard-generate"
                    type="button"
                    disabled={!prompt.trim()}
                    onClick={onGenerate}
                  >
                    Generate Content
                  </button>
                </div>
              </div>

              <div className="v4-dashboard-suggestions">
                <strong>Try:</strong>
                {V4_DASHBOARD_SUGGESTIONS.map(({ label, prompt: suggestion }) => (
                  <button type="button" onClick={() => onPromptChange(suggestion)} key={label}>
                    <Sparkles size={24} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <DashboardPromptBar
                prompt={prompt}
                loading={generationState === "loading"}
                onPromptChange={onPromptChange}
                onGenerate={onGenerate}
              />
              {generationState === "loading" ? (
                <div className="v4-dashboard-context-loading">
                  <VersionFourLoadingContent stage={loadingStage} />
                </div>
              ) : (
                <DashboardGeneratedSummary
                  selectedChannels={selectedChannels}
                  onToggleChannel={onToggleChannel}
                  onReviewDrafts={onReviewDrafts}
                />
              )}
            </>
          )}
        </section>

        <aside className="v4-dashboard-tools" aria-label="Marketing tools">
          {toolGroups.map(({ label, tone, tools }) => (
            <section className={`v4-dashboard-tool-section v4-dashboard-tool-section--${tone}`} key={label}>
              <header>
                <h2>{label}</h2>
                <span aria-hidden="true" />
              </header>
              <div className="v4-dashboard-tool-list">
              {tools.map(({ label: toolLabel, description, icon: Icon }) => (
                <div className="v4-dashboard-tool" key={toolLabel}>
                  <span className="v4-dashboard-tool-icon" aria-hidden="true">
                    {Icon === "google" ? (
                      <strong>G</strong>
                    ) : (
                      <img src={Icon} width={24} height={24} alt="" />
                    )}
                  </span>
                  <span className="v4-dashboard-tool-copy">
                    <strong>{toolLabel}</strong>
                    <span>{description}</span>
                  </span>
                  <span className="v4-dashboard-tool-arrow" aria-hidden="true">
                    <img
                      src="/assets/v4-dashboard-arrow.svg"
                      width={7}
                      height={12}
                      alt=""
                    />
                  </span>
                </div>
              ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
}

function CalendarContextModal({
  previews,
  enabledChannels,
  onToggleChannel,
  onClose,
  onEdit,
}: {
  previews: Record<PreviewChannel, ChannelDraft>;
  enabledChannels: EnabledChannels;
  onToggleChannel: (channel: PreviewChannel) => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>("google");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    if (!enabledChannels[previewChannel]) {
      const nextChannel = (["google", "facebook", "instagram"] as PreviewChannel[])
        .find((channel) => enabledChannels[channel]);
      if (nextChannel) setPreviewChannel(nextChannel);
    }
  }, [enabledChannels, previewChannel]);

  return (
    <div className="calendar-modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="calendar-context-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
      >
        <button className="calendar-modal-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={28} />
        </button>
        <div className="calendar-modal-details">
          <div className="calendar-modal-copy">
            <h1 id="calendar-modal-title">Seasonal Property Clean<br />Up in Hamilton</h1>
            <section>
              <h2>About these social media posts</h2>
              <p>
                Showcase this Hamilton property’s seasonal clean up and fresh mulch to highlight the
                work completed, demonstrate the visible results, and help local homeowners understand
                when to book a similar landscaping service.
              </p>
            </section>
            <div className="calendar-modal-divider" />
            <div className="calendar-modal-schedule">
              <p><strong>Schedule date:</strong> Jan 7th, 2026 9:00am</p>
              <p><strong>Post to:</strong><br />Select the channels that you want to post it to</p>
              {(["google", "facebook", "instagram"] as PreviewChannel[]).map((channel) => (
                <div className="calendar-channel-row" key={channel}>
                  <span>
                    {channel === "google" && <b className="google-g">G</b>}
                    {channel === "facebook" && <b className="brand-facebook">f</b>}
                    {channel === "instagram" && <b className="brand-instagram">◎</b>}
                    {channel[0].toUpperCase() + channel.slice(1)}
                  </span>
                  <button
                    className={`channel-visibility-toggle ${enabledChannels[channel] ? "on" : "off"}`}
                    type="button"
                    role="switch"
                    aria-checked={enabledChannels[channel]}
                    aria-label={`${enabledChannels[channel] ? "Disable" : "Enable"} ${channel}`}
                    onClick={() => onToggleChannel(channel)}
                  >
                    {enabledChannels[channel] ? <Check size={14} /> : <X size={14} />}
                    <span />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <footer className="calendar-modal-actions">
            <button className="delete-post" type="button">Delete All</button>
            <div>
              <button className="secondary-button" type="button" onClick={onEdit}>Edit</button>
              <span className="schedule-split">
                <span>Schedule All</span><ChevronDown size={20} />
              </span>
            </div>
          </footer>
        </div>
        <section className="calendar-modal-preview">
          <header>
            <span><Sparkles size={24} /><strong>Content preview</strong></span>
            <label>
              <span className="sr-only">Preview channel</span>
              <select
                value={previewChannel}
                onChange={(event) => setPreviewChannel(event.target.value as PreviewChannel)}
              >
                {enabledChannels.google && <option value="google">Google</option>}
                {enabledChannels.facebook && <option value="facebook">Facebook</option>}
                {enabledChannels.instagram && <option value="instagram">Instagram</option>}
              </select>
            </label>
          </header>
          <div className="calendar-modal-preview-scroll">
            {enabledChannels[previewChannel] ? (
              <PlatformPreviewCard
                channel={previewChannel}
                message={previews[previewChannel].message}
                cta={previews[previewChannel].cta}
                hashtags={previews[previewChannel].hashtags}
                images={previews[previewChannel].images}
                externalLink={previews[previewChannel].externalLink}
                googleLinkDestination={previews[previewChannel].googleLinkDestination}
                googleButtonEnabled={previews[previewChannel].googleButtonEnabled}
                googleButtonAction={previews[previewChannel].googleButtonAction}
              />
            ) : (
              <div className="no-channel-preview">No channels selected for this post.</div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

type ContextualChannel = PreviewChannel | "email" | "website";
type V4ChannelState = "unscheduled" | "scheduled" | "sent";
type V4LifecycleAction = "schedule" | "send" | "cancel";
type GoogleContextDemoState = "suggested" | "scheduled" | "sent" | "missed" | "error";
type V4ChannelDelivery = {
  lifecycle: V4ChannelState;
  date: string;
  time: string;
  timezone: "America/Toronto";
  deleted: boolean;
  statusOverride: Extract<CalendarChannelStatus, "missed" | "error"> | null;
};
type V4ChannelDeliveries = Record<ContextualChannel, V4ChannelDelivery>;
type V4TopicCompletionAction = "schedule" | "send" | "delete";
type V4TopicCompletionState = {
  source: V4CampaignSource;
  confirmation: string;
};

const V4_TODAY_DATE = "2026-11-06";
function nextIsoDate(date: string) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
const V4_INITIAL_DATE = nextIsoDate(V4_TODAY_DATE);
const V4_INITIAL_TIME = "09:00";
const V4_TIMEZONE = "America/Toronto" as const;
const V4_WEEK_MIN = "2026-11-02";
const V4_WEEK_MAX = "2026-11-08";
const V4_PREVIEW_LOADING_MS = 3000;
const GENERATED_V4_CHANNELS: ContextualChannel[] = [
  "google",
  "facebook",
  "instagram",
  "email",
];

const createInitialV4ChannelDeliveries = (): V4ChannelDeliveries => Object.fromEntries(
  (["google", "facebook", "instagram", "email", "website"] as ContextualChannel[])
    .map((channel) => [channel, {
      lifecycle: "unscheduled",
      date: V4_INITIAL_DATE,
      time: V4_INITIAL_TIME,
      timezone: V4_TIMEZONE,
      deleted: false,
      statusOverride: null,
    }]),
) as V4ChannelDeliveries;

const createGeneratedV4ChannelDeliveries = (): V4ChannelDeliveries => Object.fromEntries(
  (["google", "facebook", "instagram", "email", "website"] as ContextualChannel[])
    .map((channel) => [channel, {
      lifecycle: "unscheduled",
      date: V4_INITIAL_DATE,
      time: "09:00",
      timezone: V4_TIMEZONE,
      deleted: channel === "website",
      statusOverride: null,
    }]),
) as V4ChannelDeliveries;

const markV4CampaignDeleted = (
  deliveries: V4ChannelDeliveries,
): V4ChannelDeliveries => Object.fromEntries(
  (Object.entries(deliveries) as [ContextualChannel, V4ChannelDelivery][])
    .map(([channel, delivery]) => [channel, {
      ...delivery,
      lifecycle: "unscheduled",
      deleted: true,
      statusOverride: null,
    }]),
) as V4ChannelDeliveries;

function formatV4DeliveryDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][month - 1];
  return `${monthName} ${day}, ${year}`;
}

function formatV4CompletionDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][month - 1];
  return `${monthName} ${day}`;
}

function formatV4DeliveryTime(time: string) {
  const [hourValue, minute] = time.split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatV4DeliveryDateTime(delivery: V4ChannelDelivery) {
  return `${formatV4DeliveryDate(delivery.date)} · ${formatV4DeliveryTime(delivery.time)}`;
}

function v4CampaignScheduleText(
  channels: ContextualChannel[],
  deliveries: V4ChannelDeliveries,
) {
  const effectiveDateTimes = new Set(
    channels.map((channel) => {
      const delivery = deliveries[channel];
      return `${delivery.date}T${delivery.time}`;
    }),
  );
  if (effectiveDateTimes.size > 1) return "Various dates";
  const firstDelivery = deliveries[channels[0]];
  return firstDelivery
    ? formatV4DeliveryDateTime(firstDelivery).replace(" · ", " ")
    : "";
}

function v4CalendarStatus(delivery: V4ChannelDelivery): CalendarChannelStatus | undefined {
  if (delivery.statusOverride) return delivery.statusOverride;
  if (delivery.lifecycle === "scheduled") return "scheduled";
  if (delivery.lifecycle === "sent") return "sent";
  return undefined;
}

function isV4DeliveredChannel(
  channel: ContextualChannel,
  delivery: V4ChannelDelivery,
  googleState: GoogleContextDemoState,
) {
  if (delivery.deleted || delivery.statusOverride) return false;
  if (channel === "google") {
    return googleState === "scheduled" || googleState === "sent";
  }
  return delivery.lifecycle === "scheduled" || delivery.lifecycle === "sent";
}

function isV4CampaignComplete(
  channels: ContextualChannel[],
  deliveries: V4ChannelDeliveries,
  googleState: GoogleContextDemoState,
) {
  const deliveredCount = channels.filter((channel) => (
    isV4DeliveredChannel(channel, deliveries[channel], googleState)
  )).length;
  return deliveredCount > 0 && channels.every((channel) => (
    deliveries[channel].deleted
    || isV4DeliveredChannel(channel, deliveries[channel], googleState)
  ));
}

function v4CompletionConfirmation(
  channel: ContextualChannel,
  action: V4TopicCompletionAction,
  delivery: V4ChannelDelivery,
) {
  if (action === "delete") return "Topic review complete";
  if (action === "send") {
    if (channel === "email") return "Email sent";
    if (channel === "website") return "Website published";
    return "Post sent";
  }
  const date = formatV4CompletionDate(delivery.date);
  if (channel === "email") return `Email Scheduled for ${date}`;
  if (channel === "website") return `Website Scheduled for ${date}`;
  return `Post Scheduled for ${date}`;
}

const V4_STATIC_CALENDAR_CHANNEL_COUNT = UPDATED_CALENDAR_COLUMNS.reduce(
  (total, column) => total + column.groups.reduce(
    (groupTotal, group) => groupTotal + group.items.reduce(
      (itemTotal, item) => itemTotal + (
        item.combinedTarget ? 0 : (item.channels?.length ?? (item.channel ? 1 : 0))
      ),
      0,
    ),
    0,
  ),
  0,
);

function googleDemoCalendarStatus(
  state: GoogleContextDemoState,
): CalendarChannelStatus | undefined {
  return state === "suggested" ? undefined : state;
}

const CONTEXTUAL_CHANNELS: Array<{
  id: ContextualChannel;
  label: string;
  about: string;
  rationale: string;
  destinationLabel: string;
  destination: string;
}> = [
  {
    id: "google",
    label: "Google",
    about: "About this Google post",
    rationale: "Keep your Google presence active and help nearby homeowners find you in local search. Showcasing a real Hamilton project builds trust and gives potential leads confidence to contact you.",
    destinationLabel: "Post to",
    destination: "Google Business Profile · Beegreen Landscaping",
  },
  {
    id: "facebook",
    label: "Facebook",
    about: "About this Facebook post",
    rationale: "Build trust by sharing real work with your local community. Facebook expands your reach through reactions and shares, helping more nearby homeowners discover your business and become potential leads.",
    destinationLabel: "Post to",
    destination: "Facebook · Beegreen Landscaping",
  },
  {
    id: "instagram",
    label: "Instagram",
    about: "About this Instagram post",
    rationale: "Build trust with a visual showcase of real work. Instagram helps your transformation reach a broader local audience, attract homeowners looking for inspiration, and turn that interest into potential leads.",
    destinationLabel: "Post to",
    destination: "Instagram · @beegreenlandscaping",
  },
  {
    id: "email",
    label: "Email",
    about: "About this email campaign",
    rationale: "Support relationships with existing customers and past leads by sharing timely, relevant work. This project reminds them what you offer and encourages repeat or seasonal bookings.",
    destinationLabel: "Recipients",
    destination: "Customers and leads in Hamilton",
  },
  {
    id: "website",
    label: "Website",
    about: "About this website page",
    rationale: "Keep your website current and help your business appear in local search with a detailed project update. Showing real work builds trust and helps visitors choose your service.",
    destinationLabel: "Publish to",
    destination: "Beegreen Landscaping website",
  },
];

const GENERATED_V4_RATIONALES: Partial<Record<ContextualChannel, string>> = {
  google: "Reach homeowners actively searching for landscaping services with a clear, time-limited offer. The 15% savings and booking link give nearby prospects a direct reason to act now.",
  facebook: "Share the limited-time 15% offer with your local community, where reactions and shares can extend its reach and encourage homeowners to book before it ends.",
  instagram: "Use bold promotional artwork and concise offer details to stop the scroll, build urgency, and turn local inspiration into landscaping bookings.",
  email: "Give customers and past leads a direct reminder that they can save 15% on landscaping services, with a clear deadline that encourages timely bookings.",
};
const GENERATED_V4_CONTEXTUAL_CHANNELS = CONTEXTUAL_CHANNELS
  .filter(({ id }) => GENERATED_V4_CHANNELS.includes(id))
  .map((channel) => ({
    ...channel,
    rationale: GENERATED_V4_RATIONALES[channel.id] ?? channel.rationale,
  }));

const SUGGESTED_DESTINATIONS: Record<ContextualChannel, { label: string; value: string }> = {
  google: { label: "Post to:", value: "Google profile: Beegreen Landscaping" },
  facebook: { label: "Post to:", value: "Facebook page: Beegreen Landscaping / Profile 1" },
  instagram: { label: "Post to:", value: "Instagram profile: @beegreenlandscaping" },
  email: {
    label: "Recipients:",
    value: "This email will send to the All clients segment, with 394 of 400 subscribed to email marketing.",
  },
  website: { label: "Publish to:", value: INITIAL_EXTERNAL_LINK },
};

function contextualSuccessMessage(
  channel: "social" | ContextualChannel,
  action: ContextualAction,
) {
  if (action === "schedule") {
    if (channel === "social") return "Your social posts have been successfully scheduled.";
    if (channel === "email") return "Your email campaign has been successfully scheduled.";
    if (channel === "website") return "Your website page has been successfully scheduled.";
    const label = channel[0].toUpperCase() + channel.slice(1);
    return `Your ${label} post has been successfully scheduled.`;
  }

  if (channel === "social") return "Your social posts have been successfully posted.";
  if (channel === "email") return "Your email campaign has been successfully sent.";
  if (channel === "website") return "Your website page has been successfully published.";
  const label = channel[0].toUpperCase() + channel.slice(1);
  return `Your ${label} post has been successfully posted.`;
}

function contextualDeletionMessage(channel: ContextualChannel) {
  const label = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)!.label;
  if (channel === "email") return "Email campaign is deleted";
  if (channel === "website") return "Website page is deleted";
  return `${label} post is deleted`;
}

function v4UnscheduledActionLabel(channel: ContextualChannel) {
  if (channel === "email") return "Schedule Email";
  if (channel === "website") return "Publish Website page";
  const label = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)!.label;
  return `Schedule ${label} post`;
}

function nextAvailableChannel(
  actedOn: ContextualChannel,
  availableChannels: ContextualChannel[],
  deliveries: V4ChannelDeliveries,
) {
  const otherChannels = availableChannels.filter((channel) => channel !== actedOn);
  if (otherChannels.length === 0) return null;
  const actedIndex = CONTEXTUAL_CHANNELS.findIndex(({ id }) => id === actedOn);
  const orderedAfter = Array.from(
    { length: CONTEXTUAL_CHANNELS.length },
    (_, offset) => CONTEXTUAL_CHANNELS[(actedIndex + offset + 1) % CONTEXTUAL_CHANNELS.length].id,
  ).filter((channel) => otherChannels.includes(channel));

  return orderedAfter.find((channel) => (
    deliveries[channel].lifecycle === "unscheduled"
  ))
    ?? orderedAfter[0]
    ?? otherChannels[0];
}

function nextScopedReviewChannel(
  actedOn: ContextualChannel,
  reviewScope: ContextualChannel[],
  deliveries: V4ChannelDeliveries,
  resultingScope = reviewScope,
) {
  const actedIndex = reviewScope.indexOf(actedOn);
  if (actedIndex < 0) return null;
  return reviewScope
    .slice(actedIndex + 1)
    .find((channel) => (
      resultingScope.includes(channel)
      && !deliveries[channel].deleted
    ))
    ?? null;
}

const V4_DELIVERY_HOLD_MS = 1400;
const V4_CHANNEL_PANEL_TRANSITION =
  "transform 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 460ms cubic-bezier(0.22, 1, 0.36, 1)";

function nextPendingV4Channel(
  actedOn: ContextualChannel,
  activeChannels: ContextualChannel[],
  deliveries: V4ChannelDeliveries,
  googleState: GoogleContextDemoState,
) {
  const canonicalChannels = CONTEXTUAL_CHANNELS
    .map(({ id }) => id)
    .filter((channel) => (
      activeChannels.includes(channel) && !deliveries[channel].deleted
    ));
  const actedIndex = canonicalChannels.indexOf(actedOn);
  if (actedIndex < 0) return null;

  for (let offset = 1; offset <= canonicalChannels.length; offset += 1) {
    const candidate = canonicalChannels[
      (actedIndex + offset) % canonicalChannels.length
    ];
    if (!isV4DeliveredChannel(candidate, deliveries[candidate], googleState)) {
      return candidate;
    }
  }
  return null;
}

function useV4DeliveryHold() {
  const holdTimeoutRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const [pending, setPending] = useState(false);

  const clearTimers = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const cancel = () => {
    pendingRef.current = false;
    clearTimers();
    if (!mountedRef.current) return;
    setPending(false);
  };

  const beginHold = (onElapsed: () => void) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    const deadline = performance.now() + V4_DELIVERY_HOLD_MS;
    const scheduleAtDeadline = (delay: number) => {
      const timeout = window.setTimeout(() => {
        if (!mountedRef.current || holdTimeoutRef.current !== timeout) return;
        const remaining = deadline - performance.now();
        if (remaining > 0) {
          scheduleAtDeadline(remaining);
          return;
        }
        holdTimeoutRef.current = null;
        pendingRef.current = false;
        setPending(false);
        onElapsed();
      }, delay);
      holdTimeoutRef.current = timeout;
    };
    scheduleAtDeadline(V4_DELIVERY_HOLD_MS);
    return true;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRef.current = false;
      clearTimers();
    };
  }, []);

  return {
    beginHold,
    cancel,
    pending,
    pendingRef,
  };
}

function V4SlidingPanel({
  activeIndex,
  children,
  index,
  layer,
}: {
  activeIndex: number;
  children: React.ReactNode;
  index: number;
  layer: "text" | "card";
}) {
  const active = index === activeIndex;
  return (
    <div
      className={`v4-sliding-panel v4-sliding-panel--${layer}${active ? " is-active" : ""}`}
      data-active={active ? "true" : "false"}
      data-index={index}
      aria-hidden={!active}
      inert={active ? undefined : true}
      style={{
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
        transform: `translateX(${(index - activeIndex) * 44}px)`,
        transition: V4_CHANNEL_PANEL_TRANSITION,
        zIndex: active ? (layer === "card" ? 20 : 5) : (layer === "card" ? 10 : 1),
      }}
    >
      {children}
    </div>
  );
}

function V4DeliveryProgress({
  channels,
  deliveries,
  googleState,
  statuses,
}: {
  channels: ContextualChannel[];
  deliveries?: V4ChannelDeliveries;
  googleState?: GoogleContextDemoState;
  statuses?: Partial<Record<ContextualChannel, ChannelContentStatus>>;
}) {
  const activeChannels = deliveries
    ? channels.filter((channel) => !deliveries[channel].deleted)
    : channels;
  const delivered = activeChannels.filter((channel) => {
    if (statuses) {
      return statuses[channel] === "scheduled" || statuses[channel] === "sent";
    }
    return deliveries && googleState
      ? isV4DeliveredChannel(channel, deliveries[channel], googleState)
      : false;
  }).length;
  const progressText = `${delivered}/${activeChannels.length} scheduled`;

  return (
    <div
      className="v4-delivery-progress"
      aria-live="polite"
      aria-atomic="true"
      data-delivered={delivered}
      data-active={activeChannels.length}
    >
      {delivered > 0 && (
        <span
          className="v4-delivery-progress-check"
          aria-hidden="true"
          key={`check-${delivered}`}
        >
          <Check size={14} />
        </span>
      )}
      <span className="v4-delivery-progress-text" key={progressText}>
        {progressText}
      </span>
    </div>
  );
}

function ContextualChannelIcon({ channel }: { channel: ContextualChannel }) {
  if (channel === "google") return <strong className="google-g">G</strong>;
  if (channel === "facebook") return <strong className="brand-facebook">f</strong>;
  if (channel === "instagram") return <strong className="brand-instagram">◎</strong>;
  if (channel === "email") return <Mail size={18} />;
  return <WebsiteChannelIcon width={18} height={18} />;
}

const BRAND_SOCIAL_ICON_SRC: Record<PreviewChannel, string> = {
  google: "/assets/google-channel-icon.svg",
  facebook: "/assets/facebook-channel-icon.png",
  instagram: "/assets/instagram-channel-icon.png",
};

const JOBBER_SOCIAL_ICON_SRC: Record<PreviewChannel, string> = {
  google: "/assets/jobber-google-channel-icon.svg",
  facebook: "/assets/jobber-facebook-channel-icon.svg",
  instagram: "/assets/jobber-instagram-channel-icon.svg",
};

function ContextualChannelArtwork({
  channel,
  iconStyle = "brand",
  previewTitle = false,
}: {
  channel: ContextualChannel;
  iconStyle?: SocialIconStyle;
  previewTitle?: boolean;
}) {
  const wrapperClassName = previewTitle
    ? "channel-icon channel-preview-title-icon"
    : "channel-icon";

  if (channel === "email") {
    return (
      <span
        className={wrapperClassName}
        data-channel={channel}
        data-icon-style={iconStyle}
      >
        <Mail size={24} aria-hidden="true" />
      </span>
    );
  }

  if (channel === "website") {
    return (
      <span
        className={wrapperClassName}
        data-channel={channel}
        data-icon-style={iconStyle}
      >
        <WebsiteChannelIcon width={24} height={24} />
      </span>
    );
  }

  return (
    <span
      className={wrapperClassName}
      data-channel={channel}
      data-icon-style={iconStyle}
    >
      <img
        className={iconStyle === "jobber" ? "jobber-social-icon" : "brand-social-icon"}
        src={(iconStyle === "jobber" ? JOBBER_SOCIAL_ICON_SRC : BRAND_SOCIAL_ICON_SRC)[channel]}
        width={24}
        height={24}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}

type ChannelContentStatus =
  | V4ChannelState
  | Extract<CalendarChannelStatus, "missed" | "error">
  | "suggested";

type VersionFourSummaryStatus = "suggested" | "scheduled" | "sent" | "missed" | "error";

type V4LoadingStage = {
  message: string;
  prefix: string;
  emphasis: string;
  suffix: string;
  decoration: string;
  decorationClass: string;
  decorationWidth: number;
  decorationHeight: number;
};

const V4_LOADING_STAGES: V4LoadingStage[] = [
  {
    message: "Understanding your marketing plan",
    prefix: "Understanding your ",
    emphasis: "marketing plan",
    suffix: "",
    decoration: "/assets/v4-loading-marketing-plan.svg",
    decorationClass: "underline",
    decorationWidth: 151.091,
    decorationHeight: 5.18819,
  },
  {
    message: "Pulling insights from your Jobber data",
    prefix: "Pulling insights from your ",
    emphasis: "Jobber data",
    suffix: "",
    decoration: "/assets/v4-loading-jobber-data.svg",
    decorationClass: "ellipse",
    decorationWidth: 149.011,
    decorationHeight: 50.2461,
  },
  {
    message: "Adapting the message for your audience",
    prefix: "Adapting the message for your ",
    emphasis: "audience",
    suffix: "",
    decoration: "/assets/v4-loading-audience.svg",
    decorationClass: "underline",
    decorationWidth: 104.05,
    decorationHeight: 10,
  },
  {
    message: "Optimizing for channel visibility",
    prefix: "Optimizing for ",
    emphasis: "channel visibility",
    suffix: "",
    decoration: "/assets/v4-loading-channel-visibility.svg",
    decorationClass: "checkmark",
    decorationWidth: 19.069,
    decorationHeight: 22.0702,
  },
  {
    message: "Adding the finishing touches",
    prefix: "Adding the ",
    emphasis: "finishing touches",
    suffix: "",
    decoration: "/assets/v4-loading-finishing-touches.svg",
    decorationClass: "rays",
    decorationWidth: 17.6085,
    decorationHeight: 17.6071,
  },
];

const V4_SUMMARY_COPY = "Your recent Hamilton clean up and mulching project (Job ID xxx) is a great one to showcase on all your platforms. It talks about transforming a property with a seasonal clean up and fresh mulch, highlighting the visual impact and value of a well-maintained landscape.";
const GENERATED_V4_CAMPAIGN_TITLE = "15% promotion";
const GENERATED_V4_SUMMARY_COPY = "Promotional content is a great one to showcase on all your platforms. It talks about a limited-time opportunity for homeowners to save on landscaping services, creating urgency while encouraging potential customers to book before the promotion ends.";
const INSTAGRAM_IMAGE_REQUIRED_MESSAGE = "Add at least 1 image before posting to Instagram";

const V4_SUMMARY_STATUS_PRESENTATION: Record<
  VersionFourSummaryStatus,
  { label: string; tone: "informative" | "success" | "warning" | "critical" }
> = {
  suggested: { label: "Suggested", tone: "informative" },
  scheduled: { label: "Scheduled", tone: "success" },
  sent: { label: "Sent", tone: "success" },
  missed: { label: "Missed", tone: "warning" },
  error: { label: "Error", tone: "critical" },
};

function versionFourSummaryStatus(status: ChannelContentStatus): VersionFourSummaryStatus {
  return status === "unscheduled" ? "suggested" : status;
}

function VersionFourContentStatusBadge({
  status,
  suggestedAsDraft = false,
}: {
  status: ChannelContentStatus;
  suggestedAsDraft?: boolean;
}) {
  const normalizedStatus = versionFourSummaryStatus(status);
  const presentation = V4_SUMMARY_STATUS_PRESENTATION[normalizedStatus];
  const showDraft = suggestedAsDraft && normalizedStatus === "suggested";
  const label = showDraft ? "Draft" : presentation.label;

  return (
    <span
      className={`v4-summary-status ${
        showDraft
          ? "adhoc-campaign-status--neutral"
          : `v4-summary-status--${presentation.tone}`
      } v4-content-status`}
      data-status={normalizedStatus}
      aria-label={`Content status: ${label}`}
    >
      <span className="v4-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function contextualContentStatus(
  channel: ContextualChannel,
  deliveries: V4ChannelDeliveries,
  googleDemoState: GoogleContextDemoState,
): ChannelContentStatus {
  if (channel === "google" && googleDemoState !== "suggested") return googleDemoState;
  return deliveries[channel].statusOverride ?? deliveries[channel].lifecycle;
}

function VersionFourLoadingContent({ stage }: { stage: number }) {
  const current = V4_LOADING_STAGES[stage] ?? V4_LOADING_STAGES[0];

  return (
    <section className="v4-generated-inner v4-loading-surface" aria-label="Our recommendation">
      <header className="v4-loading-header">
        <h2>OUR RECOMMENDATION</h2>
      </header>
      <div className="v4-loading-center">
        <img
          className="v4-loading-jobber-mark"
          src="/assets/v4-loading-jobber-mark.svg"
          width="52.78"
          height="52.7733"
          alt=""
          aria-hidden="true"
        />
        <p
          className="v4-loading-message"
          role="status"
          aria-live="polite"
          aria-label={current.message}
          key={current.message}
        >
          <span aria-hidden="true">
            {current.prefix}
            <strong className={`v4-loading-emphasis v4-loading-decoration--${current.decorationClass}`}>
              {current.emphasis}
              <img
                src={current.decoration}
                width={current.decorationWidth}
                height={current.decorationHeight}
                alt=""
                aria-hidden="true"
              />
            </strong>
            {current.suffix}
          </span>
        </p>
      </div>
    </section>
  );
}

function VersionFourSummaryModal({
  title,
  images,
  channels,
  statuses,
  selectedChannels,
  delivery,
  description = V4_SUMMARY_COPY,
  scheduleText,
  artwork,
  origin = "calendar",
  iconStyle = "jobber",
  suggestedAsDraft = false,
  recommendationOnly = false,
  primaryActionLabel = "Review Drafts",
  campaignIdentity,
  onDeleteAll,
  onToggleChannel,
  onStartReview,
  onClose,
}: {
  title: string;
  images: GalleryImage[];
  channels: ContextualChannel[];
  statuses: Partial<Record<ContextualChannel, ChannelContentStatus>>;
  selectedChannels?: ContextualChannel[];
  delivery: V4ChannelDelivery;
  description?: string;
  scheduleText?: string;
  artwork?: GalleryImage;
  origin?: "calendar" | "generated";
  iconStyle?: SocialIconStyle;
  suggestedAsDraft?: boolean;
  recommendationOnly?: boolean;
  primaryActionLabel?: string;
  campaignIdentity?: string;
  onDeleteAll?: () => void;
  onToggleChannel?: (channel: ContextualChannel) => void;
  onStartReview: () => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const orderedChannels = CONTEXTUAL_CHANNELS.filter(({ id }) => channels.includes(id));
  const channelSelectionEnabled = selectedChannels !== undefined && onToggleChannel !== undefined;
  const collageImages = images.length > 0
    ? Array.from({ length: 3 }, (_, index) => images[index % images.length])
    : [];

  useEffect(() => {
    if (origin === "calendar") closeButtonRef.current?.focus();
  }, [origin]);

  useEffect(() => {
    if (origin !== "calendar") return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteDialogOpen) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteDialogOpen, onClose, origin]);

  useEffect(() => {
    setDeleteDialogOpen(false);
  }, [campaignIdentity]);

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    window.requestAnimationFrame(() => deleteButtonRef.current?.focus());
  };

  const summary = (
    <section
      className={`v4-context-modal v4-summary-modal v4-summary-modal--${origin}`}
      {...(origin === "calendar"
        ? {
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": "v4-summary-header-title",
          }
        : { "aria-label": "Generated marketing summary" })}
    >
      <header className="v4-summary-header">
        <h2 id={origin === "calendar" ? "v4-summary-header-title" : undefined}>
          {origin === "generated" ? "OUR RECOMMENDATION" : "REVIEW MULTIPLE CHANNELS"}
        </h2>
        {origin === "calendar" && (
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close summary"
            onClick={onClose}
          >
            <X size={24} aria-hidden="true" />
          </button>
        )}
      </header>
      <div className={`v4-summary-body${origin === "generated" && !artwork
        ? " v4-summary-body--text-only"
        : ""}`}
      >
        <section className="v4-summary-details">
          <div className="v4-summary-copy">
            <h1>{title}</h1>
            <p>{description}</p>
            <hr />
            <div className="v4-summary-schedule">
              {!recommendationOnly && (
                <p>
                  <strong>Schedule date:</strong>{" "}
                  {scheduleText ?? formatV4DeliveryDateTime(delivery).replace(" · ", " ")}
                </p>
              )}
              <p>
                <strong>
                  {recommendationOnly
                    ? channelSelectionEnabled ? "Create drafts for:" : "Suggested channels:"
                    : "Post to:"}
                </strong>
              </p>
            </div>
            <ul
              className="v4-summary-status-list"
              aria-label={channelSelectionEnabled
                ? "Draft channels"
                : recommendationOnly ? "Suggested channels" : "Channel statuses"}
            >
              {orderedChannels.map(({ id, label }) => {
                const status = versionFourSummaryStatus(statuses[id] ?? "suggested");
                const selected = selectedChannels?.includes(id) ?? false;
                return (
                  <li key={id} data-channel={id}>
                    <span className="v4-summary-channel">
                      <ContextualChannelArtwork channel={id} iconStyle={iconStyle} />
                      <span>{label}</span>
                    </span>
                    {channelSelectionEnabled ? (
                      <button
                        className={`channel-visibility-toggle ${selected ? "on" : "off"}`}
                        type="button"
                        role="switch"
                        aria-checked={selected}
                        aria-label={`${selected ? "Disable" : "Enable"} ${label}`}
                        onClick={() => onToggleChannel(id)}
                      >
                        {selected ? <Check size={14} /> : <X size={14} />}
                        <span />
                      </button>
                    ) : (
                      <VersionFourContentStatusBadge
                        status={status}
                        suggestedAsDraft={suggestedAsDraft}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          {onDeleteAll ? (
            <footer className="v4-summary-actions">
              <button
                ref={deleteButtonRef}
                type="button"
                className="delete-post v4-summary-delete-all"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete All
              </button>
              <button
                type="button"
                className="primary-button v4-summary-start"
                disabled={channelSelectionEnabled && selectedChannels.length === 0}
                onClick={onStartReview}
              >
                {primaryActionLabel}
              </button>
            </footer>
          ) : (
            <button
              type="button"
              className="primary-button v4-summary-start"
              disabled={channelSelectionEnabled && selectedChannels.length === 0}
              onClick={onStartReview}
            >
              {primaryActionLabel}
            </button>
          )}
        </section>
        {artwork ? (
          <img
            className="v4-summary-artwork"
            src={artwork.src}
            alt={artwork.alt}
            width={430}
            height={577}
          />
        ) : origin === "calendar" ? (
          <section className="v4-summary-collage" aria-label="Campaign image collage">
            {[0, 1, 2].map((index) => {
              const image = collageImages[index];
              return image ? (
                <img src={image.src} alt={image.alt} key={`${image.id}-${index}`} />
              ) : (
                <div className="v4-summary-image-placeholder" key={index}>
                  <Image size={32} aria-hidden="true" />
                  <span className="sr-only">No campaign image available</span>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </section>
  );

  if (origin === "generated") return summary;

  return (
    <div
      className="calendar-modal-overlay v4-context-overlay v4-summary-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {summary}
      {deleteDialogOpen && onDeleteAll && (
        <DeletionFeedbackDialog
          scope="campaign"
          onCancel={closeDeleteDialog}
          onConfirm={onDeleteAll}
        />
      )}
    </div>
  );
}

function V4TopicCompletionModal({
  confirmation,
  delivered,
  total,
  nextTopic,
  onBackToCalendar,
  onReviewNext,
}: {
  confirmation: string;
  delivered: number;
  total: number;
  nextTopic: { channelLabel: string; title: string } | null;
  onBackToCalendar: () => void;
  onReviewNext: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const segmentSpan = total > 0 ? circumference / total : circumference;
  const gap = Math.min(8, Math.max(3, segmentSpan * 0.14));
  const segmentLength = Math.max(1, segmentSpan - gap);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBackToCalendar();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onBackToCalendar]);

  return (
    <div
      className="calendar-modal-overlay v4-completion-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBackToCalendar();
      }}
    >
      <section
        className="v4-topic-completion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-topic-completion-title"
      >
        <button
          ref={closeButtonRef}
          className="v4-topic-completion-close"
          type="button"
          aria-label="Close success message"
          onClick={onBackToCalendar}
        >
          <X size={24} aria-hidden="true" />
        </button>

        <div className="v4-topic-completion-content">
          <div className="v4-topic-completion-confirmation">
            <img
              src="/assets/v4-topic-completion-check.svg"
              width={32}
              height={32}
              alt=""
              aria-hidden="true"
            />
            <strong>{confirmation}</strong>
          </div>

          <h1 id="v4-topic-completion-title">
            Nice. You&apos;re making <span>real progress</span>
          </h1>

          <div
            className="v4-topic-progress-ring"
            role="img"
            aria-label={`${delivered} of ${total} channel posts scheduled or published`}
          >
            <svg viewBox="0 0 184 184" aria-hidden="true">
              {Array.from({ length: total }, (_, index) => (
                <circle
                  key={index}
                  className={index < delivered ? "is-delivered" : "is-pending"}
                  cx="92"
                  cy="92"
                  r={radius}
                  pathLength={circumference}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-(index * segmentSpan)}
                />
              ))}
            </svg>
            <strong>{delivered}/{total}</strong>
          </div>

          <p className="v4-topic-completion-week">Week: Nov 2–8</p>
          <p className="v4-topic-completion-support">
            The more you have queued, the more often customers see your business.
          </p>
          {nextTopic && (
            <p className="v4-topic-completion-next">
              <span>Next up:</span>{" "}
              <strong>{nextTopic.channelLabel} · {nextTopic.title}</strong>
            </p>
          )}
        </div>

        <footer className="v4-topic-completion-actions">
          <button type="button" onClick={onBackToCalendar}>Back to Calendar</button>
          {nextTopic && (
            <button type="button" className="primary-button" onClick={onReviewNext}>
              Review Next
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function ChannelIconSwitcher({
  channels,
  activeChannel,
  onSelect,
  className = "",
}: {
  channels: ContextualChannel[];
  activeChannel: ContextualChannel;
  onSelect: (channel: ContextualChannel) => void;
  className?: string;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const orderedChannels = CONTEXTUAL_CHANNELS
    .map(({ id }) => id)
    .filter((channel) => channels.includes(channel));
  const activeIndex = Math.max(0, orderedChannels.indexOf(activeChannel));
  const selectAndFocus = (index: number) => {
    const nextIndex = Math.max(0, Math.min(orderedChannels.length - 1, index));
    const nextChannel = orderedChannels[nextIndex];
    if (!nextChannel) return;
    onSelect(nextChannel);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  };

  return (
    <div
      className={`channel-icon-switcher ${className}`.trim()}
      role="radiogroup"
      aria-label="Channel view"
      style={{
        "--channel-count": orderedChannels.length,
        "--channel-switcher-width": `${orderedChannels.length * 79.6}px`,
      } as React.CSSProperties}
    >
      {orderedChannels.map((channel, index) => {
        const config = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)!;
        const active = channel === activeChannel;
        return (
          <button
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-label={config.label}
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={config.label}
            onClick={() => onSelect(channel)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              event.stopPropagation();
              if (event.key === "Home") selectAndFocus(0);
              else if (event.key === "End") selectAndFocus(orderedChannels.length - 1);
              else if (event.key === "ArrowLeft") {
                selectAndFocus((activeIndex - 1 + orderedChannels.length) % orderedChannels.length);
              } else {
                selectAndFocus((activeIndex + 1) % orderedChannels.length);
              }
            }}
          >
            <ContextualChannelArtwork channel={channel} iconStyle="jobber" />
          </button>
        );
      })}
    </div>
  );
}

function V4ArrowNavigator({
  channels,
  activeChannel,
  onSelect,
}: {
  channels: ContextualChannel[];
  activeChannel: ContextualChannel;
  onSelect: (channel: ContextualChannel) => void;
}) {
  const currentIndex = Math.max(0, channels.indexOf(activeChannel));
  const previousChannel = channels[currentIndex - 1];
  const nextChannel = channels[currentIndex + 1];

  return (
    <div className="v4-arrow-navigator">
      <h2>Review multiple channels</h2>
      <nav className="v4-arrow-controls" aria-label="Channel navigation">
        <button
          type="button"
          aria-label="Previous channel"
          disabled={!previousChannel}
          onClick={() => previousChannel && onSelect(previousChannel)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <span aria-live="polite">{currentIndex + 1} of {channels.length}</span>
        <button
          type="button"
          aria-label="Next channel"
          disabled={!nextChannel}
          onClick={() => nextChannel && onSelect(nextChannel)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

function EmailCampaignPreview({
  images,
  message,
  subject = INITIAL_EMAIL_SUBJECT,
  campaignTitle = INITIAL_WEBSITE_TITLE,
}: {
  images: GalleryImage[];
  message: string;
  subject?: string;
  campaignTitle?: string;
}) {
  const isPromotion = campaignTitle === GENERATED_V4_CAMPAIGN_TITLE;
  return (
    <article className="context-email-preview">
      <header className="email-envelope">
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>From:</strong> Beegreen Landscaping &lt;hello@beegreenlandscaping.ca&gt;</p>
      </header>
      <div className="email-brand">
        <img src="/assets/avatar.png" alt="" />
        <strong>Beegreen Landscaping</strong>
      </div>
      {images[0] && <img className="email-hero" src={images[0].src} alt={images[0].alt} />}
      <div className="email-content">
        <p className="email-eyebrow">
          {isPromotion ? "LIMITED-TIME OFFER" : "PROJECT SHOWCASE · HAMILTON"}
        </p>
        <h2>{campaignTitle}</h2>
        <p className="propagated-body">{message}</p>
        <span className="fake-cta">
          {isPromotion ? "Book and save 15%" : "Plan your property clean up"}
        </span>
      </div>
      <footer>
        Beegreen Landscaping · Hamilton, Ontario<br />
        You’re receiving this project update because you asked to hear from us.
      </footer>
    </article>
  );
}

function WebsitePagePreview({
  images,
  message,
  title = INITIAL_WEBSITE_TITLE,
}: {
  images: GalleryImage[];
  message: string;
  title?: string;
}) {
  return (
    <article className="context-website-preview">
      <header className="website-nav">
        <span><img src="/assets/avatar.png" alt="" /><strong>Beegreen</strong></span>
        <span>Services&nbsp;&nbsp; Projects&nbsp;&nbsp; Contact</span>
      </header>
      <section className="website-hero">
        {images[0] && <img src={images[0].src} alt={images[0].alt} />}
        <div>
          <p>HAMILTON PROJECT SHOWCASE</p>
          <h2>{title}</h2>
        </div>
      </section>
      <section className="website-copy">
        <h3>A cleaner landscape, ready for the season</h3>
        <p className="propagated-body">{message}</p>
        <div className="website-overview">
          <span><strong>Project</strong>Seasonal clean up</span>
          <span><strong>Location</strong>Hamilton, Ontario</span>
          <span><strong>Services</strong>Clean up + mulching</span>
        </div>
        <h3>Project gallery</h3>
        <div className="website-gallery">
          {images.map((image) => <img src={image.src} alt={image.alt} key={image.id} />)}
        </div>
        <h3>Planning a seasonal refresh?</h3>
        <p>Talk with our team about your Hamilton property and the right timing for your project.</p>
        <span className="fake-cta">Request a quote</span>
      </section>
    </article>
  );
}

type ContextModalContentProps = {
  drafts: V2Drafts;
  emailMessage: string;
  emailSubject: string;
  websiteMessage: string;
  websiteTitle: string;
};

function ContextualPreviewContent({
  channel,
  drafts,
  emailMessage,
  emailSubject,
  websiteMessage,
  websiteTitle,
  campaignTitle,
  collapseEmptyMedia = false,
}: ContextModalContentProps & {
  channel: ContextualChannel;
  campaignTitle?: string;
  collapseEmptyMedia?: boolean;
}) {
  if (channel === "email") {
    return (
      <EmailCampaignPreview
        images={drafts.all.images}
        message={emailMessage}
        subject={emailSubject}
        campaignTitle={campaignTitle}
      />
    );
  }
  if (channel === "website") {
    return (
      <WebsitePagePreview
        images={drafts.all.images}
        message={websiteMessage}
        title={websiteTitle}
      />
    );
  }
  return (
    <PlatformPreviewCard
      channel={channel}
      message={drafts[channel].message}
      cta={drafts[channel].cta}
      hashtags={drafts[channel].hashtags}
      images={drafts[channel].images}
      externalLink={drafts[channel].externalLink}
      googleLinkDestination={drafts[channel].googleLinkDestination}
      googleButtonEnabled={drafts[channel].googleButtonEnabled}
      googleButtonAction={drafts[channel].googleButtonAction}
      collapseEmptyMedia={collapseEmptyMedia}
    />
  );
}

type ContextPresentationState = GoogleContextDemoState | V4ChannelState;

function contextPresentation(
  channel: ContextualChannel,
  delivery: V4ChannelDelivery,
  googleDemoState: GoogleContextDemoState,
): {
  state: ContextPresentationState;
  status: { label: string; tone: "scheduled" | "sent" | "missed" | "failed" } | null;
  originalScheduleDate: boolean;
} {
  const state: ContextPresentationState = channel === "google"
    ? googleDemoState
    : delivery.statusOverride ?? delivery.lifecycle;
  const status = state === "suggested" || state === "unscheduled"
    ? null
    : {
        label: state === "error"
          ? "Failed"
          : state[0].toUpperCase() + state.slice(1),
        tone: state === "error" ? "failed" : state,
      } as const;
  return {
    state,
    status,
    originalScheduleDate: state === "missed" || state === "error",
  };
}

type SuggestedDialogVariant = "horizontal" | "vertical";
type SuggestedDialogAction = "schedule" | "post";

type SuggestedMarketingContentDialogProps = ContextModalContentProps & {
  variant: SuggestedDialogVariant;
  prompt: string;
  activeIndex: number;
  channelDeliveries: V4ChannelDeliveries;
  onPromptChange: (value: string) => void;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onEdit: (channel: ContextualChannel) => void;
  onAction: (
    channel: ContextualChannel,
    action: SuggestedDialogAction,
    final: boolean,
  ) => void;
};

function useSuggestedDialogController(props: SuggestedMarketingContentDialogProps) {
  const {
    activeIndex,
    channelDeliveries,
    drafts,
    emailMessage,
    emailSubject,
    websiteMessage,
    websiteTitle,
    onActiveIndexChange,
    onClose,
    onEdit,
    onAction,
  } = props;
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const active = CONTEXTUAL_CHANNELS[activeIndex];
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === CONTEXTUAL_CHANNELS.length - 1;
  const delivery = channelDeliveries[active.id];
  const destination = SUGGESTED_DESTINATIONS[active.id];
  const channelLabel = active.id === "email"
    ? "Email campaign"
    : active.id === "website"
      ? "Website page"
      : `${active.label} post`;
  const preview = (
    <ContextualPreviewContent
      channel={active.id}
      drafts={drafts}
      emailMessage={emailMessage}
      emailSubject={emailSubject}
      websiteMessage={websiteMessage}
      websiteTitle={websiteTitle}
    />
  );
  const goPrevious = () => {
    setSplitMenuOpen(false);
    onActiveIndexChange(Math.max(0, activeIndex - 1));
  };
  const goNext = () => {
    setSplitMenuOpen(false);
    onActiveIndexChange(Math.min(CONTEXTUAL_CHANNELS.length - 1, activeIndex + 1));
  };
  const act = (action: SuggestedDialogAction) => {
    setSplitMenuOpen(false);
    onAction(active.id, action, atEnd);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && splitMenuOpen) {
        event.stopImmediatePropagation();
        setSplitMenuOpen(false);
        splitToggleRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, onClose, splitMenuOpen]);

  useEffect(() => {
    if (!splitMenuOpen) return;
    splitOptionRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!splitMenuRef.current?.contains(event.target as Node)) setSplitMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [splitMenuOpen]);

  return {
    active,
    activeIndex,
    atStart,
    atEnd,
    channelLabel,
    delivery,
    destination,
    preview,
    splitMenuOpen,
    splitMenuRef,
    splitToggleRef,
    splitOptionRef,
    setSplitMenuOpen,
    goPrevious,
    goNext,
    edit: () => onEdit(active.id),
    schedule: () => act("schedule"),
    post: () => act("post"),
  };
}

type SuggestedDialogModel = ReturnType<typeof useSuggestedDialogController>;

function SuggestedPromptSection({
  title,
  titleId,
  prompt,
  onPromptChange,
  onSubmit,
  onClose,
  loading = false,
}: {
  title: string;
  titleId: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit?: (prompt: string) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <div className="suggested-prompt-section">
      <header className="suggested-content-header">
        <h1 id={titleId}>{title}</h1>
        <button type="button" aria-label="Close suggested marketing content" onClick={onClose}>
          <X size={26} aria-hidden="true" />
        </button>
      </header>
      <form
        className="suggested-prompt-form"
        onSubmit={(event) => {
          event.preventDefault();
          const nextPrompt = prompt.trim();
          if (!nextPrompt || loading) return;
          if (onSubmit) onSubmit(nextPrompt);
          else onPromptChange(nextPrompt);
        }}
        aria-busy={loading}
      >
        <input
          value={prompt}
          aria-label="Edit marketing content prompt"
          onChange={(event) => onPromptChange(event.target.value)}
          readOnly={loading}
          autoFocus={!loading}
        />
        <button
          type="submit"
          aria-label="Regenerate suggestions"
          disabled={loading || !prompt.trim()}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
      <p className="suggested-prompt-helper">
        Edit your prompt and regenerate to get a fresh set of suggestions.
      </p>
    </div>
  );
}

function SuggestedCarouselControls({
  model,
  className,
}: {
  model: SuggestedDialogModel;
  className: string;
}) {
  return (
    <nav className={className} aria-label="Suggested content channels">
      <span aria-live="polite">
        {model.activeIndex + 1} of {CONTEXTUAL_CHANNELS.length}
      </span>
      <button
        type="button"
        onClick={model.goPrevious}
        disabled={model.atStart}
        aria-label="Previous channel"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={model.goNext}
        disabled={model.atEnd}
        aria-label="Next channel"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </nav>
  );
}

function SuggestedDialogActions({
  model,
  className,
}: {
  model: SuggestedDialogModel;
  className: string;
}) {
  const visualOnlyAction = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <footer className={`${className} suggested-content-footer`}>
      <button type="button" className="delete-post" aria-disabled="true" onClick={visualOnlyAction}>
        Delete
      </button>
      <div>
        <button type="button" className="secondary-button" onClick={model.edit}>
          Edit
        </button>
        <div className="v4-split-action" ref={model.splitMenuRef}>
          {model.splitMenuOpen && (
            <div className="v4-split-menu" role="menu" aria-label="Publishing options">
              <button
                ref={model.splitOptionRef}
                type="button"
                role="menuitem"
                onClick={model.post}
              >
                Post now and view next
              </button>
            </div>
          )}
          <span className="v4-split-button v4-schedule-next-button">
            <button type="button" onClick={model.schedule}>Schedule and view next</button>
            <button
              ref={model.splitToggleRef}
              type="button"
              aria-label="Show publishing options"
              aria-haspopup="menu"
              aria-expanded={model.splitMenuOpen}
              onClick={() => model.setSplitMenuOpen((open) => !open)}
            >
              <ChevronDown size={20} aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
}

function SuggestedHorizontalLayout({ model }: { model: SuggestedDialogModel }) {
  return (
    <section
      className="suggested-preview-section suggested-horizontal-composition"
      aria-label={`${model.channelLabel} preview`}
    >
      <header className="v4-context-navigation">
        <h2>REVIEW MULTIPLE CHANNELS</h2>
        <SuggestedCarouselControls model={model} className="v4-context-navigation-controls" />
      </header>
      <div className="v4-context-body">
        <section className="v4-context-details">
          <div>
            <h1>Seasonal property cleanup in Hamilton</h1>
            <section className="v4-about-copy">
              <div className="v4-about-heading"><h2>{model.active.about}</h2></div>
              <p>{model.active.rationale}</p>
            </section>
            <dl className="v4-context-facts">
              <div>
                <dt>Schedule date</dt>
                <dd>{formatV4DeliveryDateTime(model.delivery)}</dd>
              </div>
              <div><dt>{model.destination.label}</dt><dd>{model.destination.value}</dd></div>
            </dl>
          </div>
          <SuggestedDialogActions model={model} className="v4-context-footer" />
        </section>
        <section className="v4-context-preview" aria-label={`${model.active.label} content preview`}>
          <header><Sparkles size={20} aria-hidden="true" /><strong>{model.active.label} preview</strong></header>
          <div className="v4-context-preview-scroll">{model.preview}</div>
        </section>
      </div>
    </section>
  );
}

function SuggestedVerticalLayout({ model }: { model: SuggestedDialogModel }) {
  return (
    <>
      <section
        className="suggested-preview-section v5-context-content"
        aria-label={`${model.channelLabel} preview`}
      >
        <div className="v5-context-metadata">
          <div className="v5-preview-top-row">
            <div className="v5-preview-channel">
              <span className="v5-preview-eyebrow">PREVIEW</span>
              <ContextualChannelIcon channel={model.active.id} />
              <strong>{model.active.label}</strong>
            </div>
            <SuggestedCarouselControls model={model} className="v5-context-navigation" />
          </div>
          <hr />
          <div className="suggested-v5-campaign-copy">
            <h2>Seasonal property cleanup in Hamilton</h2>
            <h3>{model.active.about}</h3>
            <p>{model.active.rationale}</p>
          </div>
          <dl className="v5-context-facts">
            <div>
              <dt>Schedule date:</dt>
              <dd>{formatV4DeliveryDateTime(model.delivery)}</dd>
            </div>
            <div><dt>{model.destination.label}</dt><dd>{model.destination.value}</dd></div>
          </dl>
        </div>
        <div className="v5-context-preview-scroll" data-testid="suggested-v5-preview-scroll-region">
          <div className="v5-context-preview-surface">{model.preview}</div>
        </div>
      </section>
      <SuggestedDialogActions model={model} className="v5-context-footer" />
    </>
  );
}

function SuggestedMarketingContentDialog(props: SuggestedMarketingContentDialogProps) {
  const model = useSuggestedDialogController(props);
  const isHorizontal = props.variant === "horizontal";
  const title = isHorizontal ? "Suggested Marketing Content" : "Start from your own idea";
  const titleId = `suggested-content-title-${props.variant}`;

  return (
    <div
      className={`calendar-modal-overlay suggested-content-overlay suggested-${props.variant}-overlay`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <section
        className={`suggested-content-dialog suggested-${props.variant}-dialog`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <SuggestedPromptSection
          title={title}
          titleId={titleId}
          prompt={props.prompt}
          onPromptChange={props.onPromptChange}
          onClose={props.onClose}
        />
        {isHorizontal
          ? <SuggestedHorizontalLayout model={model} />
          : <SuggestedVerticalLayout model={model} />}
      </section>
    </div>
  );
}

function VersionThreeCombinedContextModal({
  drafts,
  enabledChannels,
  initialPreviewChannel,
  onToggleChannel,
  onPreviewChannelChange,
  onClose,
  onEdit,
  onAction,
}: {
  drafts: V2Drafts;
  enabledChannels: EnabledChannels;
  initialPreviewChannel: PreviewChannel;
  onToggleChannel: (channel: PreviewChannel) => void;
  onPreviewChannelChange: (channel: PreviewChannel) => void;
  onClose: () => void;
  onEdit: (channel: PreviewChannel) => void;
  onAction: (page: "social" | "email" | "website", action: ContextualAction, final: boolean) => void;
}) {
  const [activePage, setActivePage] = useState(0);
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>(initialPreviewChannel);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const pages = [
    {
      label: "Social",
      about: "About these social media posts",
      destinationLabel: "Post to",
      destination: "Select the channels that you want to post it to",
    },
    {
      label: "Email",
      about: "About this email campaign",
      destinationLabel: "Recipients",
      destination: "Customers and leads in Hamilton",
    },
    {
      label: "Website",
      about: "About this website page",
      destinationLabel: "Publish to",
      destination: "Beegreen Landscaping website",
    },
  ] as const;
  const active = pages[activePage];
  const socialChannels = (["google", "facebook", "instagram"] as PreviewChannel[])
    .filter((channel) => enabledChannels[channel]);
  const sharedBody = splitPostMessage(drafts.all.message).body;
  const safeVisualAction = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const selectPreviewChannel = (channel: PreviewChannel) => {
    setPreviewChannel(channel);
    onPreviewChannelChange(channel);
  };
  const handlePreviewTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    channel: PreviewChannel,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = socialChannels.indexOf(channel);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + socialChannels.length) % socialChannels.length;
    selectPreviewChannel(socialChannels[nextIndex]);
  };
  const performAction = (action: ContextualAction) => {
    setSplitMenuOpen(false);
    const page = activePage === 0 ? "social" : activePage === 1 ? "email" : "website";
    const final = activePage === pages.length - 1;
    onAction(page, action, final);
    if (!final) setActivePage((current) => current + 1);
  };

  useEffect(() => {
    if (!enabledChannels[previewChannel]) {
      const nextChannel = (["google", "facebook", "instagram"] as PreviewChannel[])
        .find((channel) => enabledChannels[channel]);
      if (nextChannel) selectPreviewChannel(nextChannel);
    }
  }, [enabledChannels, previewChannel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && splitMenuOpen) {
        event.stopImmediatePropagation();
        setSplitMenuOpen(false);
        splitToggleRef.current?.focus();
        return;
      }
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setSplitMenuOpen(false);
        setActivePage((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        setSplitMenuOpen(false);
        setActivePage((current) => Math.min(2, current + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, splitMenuOpen]);

  useEffect(() => {
    if (!splitMenuOpen) return;
    splitOptionRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!splitMenuRef.current?.contains(event.target as Node)) setSplitMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [splitMenuOpen]);

  return (
    <div className="calendar-modal-overlay v4-context-overlay" role="presentation">
      <section
        className="v4-context-modal v3-combined-context-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v3-combined-context-title"
      >
        <nav className="v4-context-navigation" aria-label="Combined content preview">
          <button
            type="button"
            onClick={() => {
              setSplitMenuOpen(false);
              setActivePage((current) => Math.max(0, current - 1));
            }}
            disabled={activePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={22} />
          </button>
          <span aria-live="polite">{activePage + 1} of 3</span>
          <button
            type="button"
            onClick={() => {
              setSplitMenuOpen(false);
              setActivePage((current) => Math.min(2, current + 1));
            }}
            disabled={activePage === 2}
            aria-label="Next page"
          >
            <ChevronRight size={22} />
          </button>
        </nav>
        <button className="calendar-modal-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={28} />
        </button>

        <div className="v4-context-body">
          <section className="v4-context-details">
            <div>
              <h1 id="v3-combined-context-title">Seasonal property clean up in Hamilton</h1>
              <section className="v4-about-copy">
                <h2>{active.about}</h2>
                <p>
                  Showcase this Hamilton property’s seasonal clean up and fresh mulch to highlight
                  the work completed, demonstrate the visible results, and help local homeowners
                  understand when to book a similar landscaping service.
                </p>
              </section>
              {activePage === 0 ? (
                <div className="v3-combined-social-facts">
                  <p><strong>Schedule date:</strong> Nov 7, 2026 · 9:00 AM</p>
                  <p><strong>{active.destinationLabel}:</strong><br />{active.destination}</p>
                  {(["google", "facebook", "instagram"] as PreviewChannel[]).map((channel) => (
                    <div className="calendar-channel-row" key={channel}>
                      <span>
                        <ContextualChannelIcon channel={channel} />
                        {channel[0].toUpperCase() + channel.slice(1)}
                      </span>
                      <button
                        className={`channel-visibility-toggle ${enabledChannels[channel] ? "on" : "off"}`}
                        type="button"
                        role="switch"
                        aria-checked={enabledChannels[channel]}
                        aria-label={`${enabledChannels[channel] ? "Disable" : "Enable"} ${channel}`}
                        onClick={() => onToggleChannel(channel)}
                      >
                        {enabledChannels[channel] ? <Check size={14} /> : <X size={14} />}
                        <span />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <dl className="v4-context-facts">
                  <div><dt>Scheduled for</dt><dd>Nov 7, 2026 · 9:00 AM</dd></div>
                  <div><dt>{active.destinationLabel}</dt><dd>{active.destination}</dd></div>
                </dl>
              )}
            </div>
            <footer className="v4-context-footer">
              <button type="button" className="delete-post" aria-disabled="true" onClick={safeVisualAction}>
                Delete
              </button>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  aria-disabled={activePage === 0 ? undefined : "true"}
                  onClick={activePage === 0 ? () => onEdit(previewChannel) : safeVisualAction}
                >
                  Edit
                </button>
                <div className="v4-split-action" ref={splitMenuRef}>
                  {splitMenuOpen && (
                    <div className="v4-split-menu" role="menu" aria-label="Publishing options">
                      <button
                        ref={splitOptionRef}
                        type="button"
                        role="menuitem"
                        onClick={() => performAction("post")}
                      >
                        Post now and next
                      </button>
                    </div>
                  )}
                  <span className="v4-split-button">
                    <button type="button" onClick={() => performAction("schedule")}>Schedule and next</button>
                    <button
                      ref={splitToggleRef}
                      type="button"
                      aria-label="Show publishing options"
                      aria-haspopup="menu"
                      aria-expanded={splitMenuOpen}
                      onClick={() => setSplitMenuOpen((open) => !open)}
                    >
                      <ChevronDown size={20} />
                    </button>
                  </span>
                </div>
              </div>
            </footer>
          </section>

          <section className="v4-context-preview v3-context-preview" aria-label={`${active.label} content preview`}>
            {activePage === 0 ? (
              <header className="v3-social-preview-tabs" role="tablist" aria-label="Social preview channel">
                {socialChannels.map((channel) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewChannel === channel}
                    tabIndex={previewChannel === channel ? 0 : -1}
                    className={previewChannel === channel ? "active" : ""}
                    onClick={() => selectPreviewChannel(channel)}
                    onKeyDown={(event) => handlePreviewTabKeyDown(event, channel)}
                    key={channel}
                  >
                    {channel[0].toUpperCase() + channel.slice(1)}
                  </button>
                ))}
              </header>
            ) : (
              <header><Sparkles size={20} /><strong>{active.label} preview</strong></header>
            )}
            <div className="v4-context-preview-scroll">
              {activePage === 0 ? (
                enabledChannels[previewChannel] ? (
                  <PlatformPreviewCard
                    channel={previewChannel}
                    message={drafts[previewChannel].message}
                    cta={drafts[previewChannel].cta}
                    hashtags={drafts[previewChannel].hashtags}
                    images={drafts[previewChannel].images}
                    externalLink={drafts[previewChannel].externalLink}
                    googleLinkDestination={drafts[previewChannel].googleLinkDestination}
                  googleButtonEnabled={drafts[previewChannel].googleButtonEnabled}
                  googleButtonAction={drafts[previewChannel].googleButtonAction}
                  />
                ) : (
                  <div className="no-channel-preview">No channels selected for this post.</div>
                )
              ) : activePage === 1 ? (
                <EmailCampaignPreview images={drafts.all.images} message={sharedBody} />
              ) : (
                <WebsitePagePreview images={drafts.all.images} message={sharedBody} />
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function DeletionFeedbackDialog({
  channel,
  scope = "channel",
  onCancel,
  onConfirm,
}: {
  channel?: ContextualChannel;
  scope?: "channel" | "campaign";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");
  const isCampaign = scope === "campaign";
  const isEmail = !isCampaign && channel === "email";
  const isWebsite = !isCampaign && channel === "website";
  const contentNoun = isEmail ? "campaign" : isWebsite ? "page" : "post";
  const buttonNoun = isEmail ? "Campaign" : isWebsite ? "Page" : "Post";
  const dialogIdentity = isCampaign ? "campaign" : channel;
  const titleId = `v4-delete-title-${dialogIdentity}`;
  const feedbackId = `v4-delete-feedback-${dialogIdentity}`;
  const campaignReasons = [
    "The content isn’t relevant",
    "I don’t like the recommendation",
    "The timing isn’t right",
    "Other",
  ];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return (
    <div
      className="google-delete-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="google-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" className="google-delete-close" aria-label="Close deletion feedback" onClick={onCancel}>
          <X size={24} />
        </button>
        <h2 id={titleId}>Improve future recommendations</h2>
        {isCampaign ? (
          <>
            <p>
              Tell us why this campaign wasn’t right for your business. Deleting it will remove the
              entire campaign and all of its cross-channel content from your calendar and Job Showcase.
            </p>
            <fieldset className="campaign-delete-reasons">
              <legend>Why are you deleting this campaign?</legend>
              {campaignReasons.map((option, index) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="campaign-delete-reason"
                    value={option}
                    checked={reason === option}
                    onChange={(event) => setReason(event.target.value)}
                    autoFocus={index === 0}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            {reason === "Other" && (
              <>
                <label htmlFor={feedbackId}>Feedback <span>(optional)</span></label>
                <input
                  id={feedbackId}
                  value={feedback}
                  placeholder="What should we know for next time?"
                  onChange={(event) => setFeedback(event.target.value)}
                />
              </>
            )}
          </>
        ) : (
          <>
            <p>
              Tell us why this {contentNoun} wasn’t right for your business. Your feedback helps us make
              future recommendations more useful.
            </p>
            <label htmlFor={feedbackId}>Feedback <span>(optional)</span></label>
            <input
              id={feedbackId}
              value={feedback}
              placeholder="What should we know for next time?"
              onChange={(event) => setFeedback(event.target.value)}
              autoFocus
            />
          </>
        )}
        <footer>
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary-button"
            disabled={isCampaign && !reason}
            onClick={onConfirm}
          >
            {isCampaign ? "Delete Campaign" : `Delete ${buttonNoun}`}
          </button>
        </footer>
      </section>
    </div>
  );
}

function GeneratedV4ExitDialog({
  onCancel,
  onSaveAndExit,
  onDiscardAndExit,
}: {
  onCancel: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const actionStartedRef = useRef(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    saveButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
        window.requestAnimationFrame(() => previouslyFocused?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const runOnce = (action: () => void) => {
    if (actionStartedRef.current) return;
    actionStartedRef.current = true;
    action();
  };

  return (
    <div
      className="google-delete-overlay generated-v4-exit-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !actionStartedRef.current) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="google-delete-dialog generated-v4-exit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generated-v4-exit-title"
        aria-describedby="generated-v4-exit-description"
      >
        <h2 id="generated-v4-exit-title">Save or discard draft</h2>
        <p id="generated-v4-exit-description">
          Select whether you want to save this draft to your calendar or discard it. By discarding, you will remove it from your calendar.
        </p>
        <footer>
          <button
            type="button"
            className="secondary-button"
            onClick={() => runOnce(onDiscardAndExit)}
          >
            Discard Draft
          </button>
          <button
            ref={saveButtonRef}
            type="button"
            className="primary-button"
            onClick={() => runOnce(onSaveAndExit)}
          >
            Save Draft
          </button>
        </footer>
      </section>
    </div>
  );
}

function VersionFourContextModal({
  drafts,
  emailMessage,
  emailSubject,
  websiteMessage,
  websiteTitle,
  campaignTitle,
  channelDefinitions = CONTEXTUAL_CHANNELS,
  initialIndex = 0,
  availableChannels,
  channelDeliveries,
  onClose,
  onEdit,
  onDelete,
  onLifecycleAction,
  googleDemoState,
  onActiveChannelChange,
  navigationStyle,
  iconStyle = "jobber",
  embedded = false,
  embeddedExitControls = false,
  enforceInstagramImageRequirement = false,
  previewLoadingDuration = 0,
  loadedPreviewChannels = [],
  onPreviewLoaded,
  onComplete,
}: {
  drafts: V2Drafts;
  emailMessage: string;
  emailSubject: string;
  websiteMessage: string;
  websiteTitle: string;
  campaignTitle?: string;
  channelDefinitions?: typeof CONTEXTUAL_CHANNELS;
  initialIndex?: number;
  availableChannels: ContextualChannel[];
  channelDeliveries: V4ChannelDeliveries;
  onClose: () => void;
  onEdit: (channel: ContextualChannel) => void;
  onDelete: (channel: ContextualChannel) => void;
  onLifecycleAction: (
    channel: ContextualChannel,
    action: V4LifecycleAction,
    advance?: boolean,
    deferCompletion?: boolean,
  ) => unknown;
  googleDemoState: GoogleContextDemoState;
  onActiveChannelChange: (channel: ContextualChannel | null) => void;
  navigationStyle: V4NavigationStyle;
  iconStyle?: SocialIconStyle;
  embedded?: boolean;
  embeddedExitControls?: boolean;
  enforceInstagramImageRequirement?: boolean;
  scopeDate?: string;
  previewLoadingDuration?: number;
  loadedPreviewChannels?: ContextualChannel[];
  onPreviewLoaded?: (channel: ContextualChannel) => void;
  onComplete?: (
    channel: ContextualChannel,
    action: Extract<V4LifecycleAction, "schedule" | "send">,
    deliveries: V4ChannelDeliveries,
  ) => void;
}) {
  const channels = channelDefinitions.filter(({ id }) => availableChannels.includes(id));
  const initialChannel = channels[Math.min(initialIndex, channels.length - 1)]?.id;
  const shouldLoadPreview = (channel: ContextualChannel | undefined) => (
    previewLoadingDuration > 0
    && channel !== undefined
    && !loadedPreviewChannels.includes(channel)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(() => shouldLoadPreview(initialChannel));
  const deliveryHold = useV4DeliveryHold();
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const onPreviewLoadedRef = useRef(onPreviewLoaded);
  const safeIndex = Math.min(activeIndex, channels.length - 1);
  const active = channels[safeIndex];
  const activePreviewLoaded = loadedPreviewChannels.includes(active.id);
  const instagramPublishingBlocked = enforceInstagramImageRequirement
    && active.id === "instagram"
    && drafts.instagram.images.length === 0;
  const channelStatuses = Object.fromEntries(channels.map(({ id }) => [
    id,
    contextualContentStatus(id, channelDeliveries, googleDemoState),
  ])) as Partial<Record<ContextualChannel, ChannelContentStatus>>;
  const showChannel = (index: number) => {
    const nextIndex = Math.max(0, Math.min(channels.length - 1, index));
    setPreviewLoading(shouldLoadPreview(channels[nextIndex]?.id));
    setActiveIndex(nextIndex);
  };
  const transitionToIndex = (index: number) => {
    deliveryHold.cancel();
    setSplitMenuOpen(false);
    const nextIndex = Math.max(0, Math.min(channels.length - 1, index));
    if (nextIndex === safeIndex) return;
    showChannel(nextIndex);
  };
  const selectChannel = (channel: ContextualChannel) => {
    transitionToIndex(channels.findIndex(({ id }) => id === channel));
  };
  const goPrevious = () => {
    transitionToIndex(safeIndex - 1);
  };
  const goNext = () => {
    transitionToIndex(safeIndex + 1);
  };
  const deliverCurrent = (
    action: Extract<V4LifecycleAction, "schedule" | "send">,
  ) => {
    if (
      previewLoading
      || instagramPublishingBlocked
      || deliveryHold.pendingRef.current
    ) return;
    setSplitMenuOpen(false);
    const nextDeliveries = onLifecycleAction(active.id, action, false, true);
    if (nextDeliveries === false) return;
    const deliveries = nextDeliveries as V4ChannelDeliveries;
    const nextGoogleState = active.id === "google"
      ? action === "schedule" ? "scheduled" : "sent"
      : googleDemoState;
    deliveryHold.beginHold(() => {
      const nextChannel = nextPendingV4Channel(
        active.id,
        channels.map(({ id }) => id),
        deliveries,
        nextGoogleState,
      );
      if (nextChannel) {
        showChannel(channels.findIndex(({ id }) => id === nextChannel));
        return;
      }
      onComplete?.(active.id, action, deliveries);
    });
  };
  const scheduleCurrent = () => {
    deliverCurrent("schedule");
  };
  const sendCurrentNow = () => {
    deliverCurrent("send");
  };
  const editCurrent = () => {
    if (previewLoading) return;
    deliveryHold.cancel();
    setSplitMenuOpen(false);
    onEdit(active.id);
  };
  const closeModal = () => {
    deliveryHold.cancel();
    onClose();
  };
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  useEffect(() => {
    onActiveChannelChange(active.id);
    return () => onActiveChannelChange(null);
  }, [active.id, onActiveChannelChange]);

  useEffect(() => {
    onPreviewLoadedRef.current = onPreviewLoaded;
  }, [onPreviewLoaded]);

  useEffect(() => {
    if (previewLoadingDuration <= 0 || activePreviewLoaded) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    const timeout = window.setTimeout(() => {
      setPreviewLoading(false);
      onPreviewLoadedRef.current?.(active.id);
    }, previewLoadingDuration);
    return () => window.clearTimeout(timeout);
  }, [active.id, activePreviewLoaded, previewLoadingDuration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deleteDialogOpen) {
        event.stopImmediatePropagation();
        closeDeleteDialog();
        return;
      }
      if (event.key === "Escape" && splitMenuOpen) {
        event.stopImmediatePropagation();
        setSplitMenuOpen(false);
        splitToggleRef.current?.focus();
        return;
      }
      if (previewLoading) return;
      if (event.key === "Escape" && (!embedded || embeddedExitControls)) closeModal();
      if (deleteDialogOpen) return;
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteDialogOpen,
    embedded,
    embeddedExitControls,
    onClose,
    previewLoading,
    splitMenuOpen,
  ]);

  useEffect(() => {
    if (!splitMenuOpen) return;
    splitOptionRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!splitMenuRef.current?.contains(event.target as Node)) setSplitMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [splitMenuOpen]);

  const renderTextPanel = (channel: (typeof channels)[number], index: number) => {
    const panelIsActive = index === safeIndex;
    const panelDelivery = channelDeliveries[channel.id];
    const panelState = panelDelivery.lifecycle;
    const panelIsGoogle = channel.id === "google";
    const panelPresentationState = panelIsGoogle ? googleDemoState : panelState;
    const panelInstagramBlocked = enforceInstagramImageRequirement
      && channel.id === "instagram"
      && drafts.instagram.images.length === 0;
    const panelHasOriginalScheduleDate = panelIsGoogle
      && (googleDemoState === "missed" || googleDemoState === "error");

    return (
      <V4SlidingPanel
        activeIndex={safeIndex}
        index={index}
        key={`text-${channel.id}`}
        layer="text"
      >
        <section className="v4-context-details">
          <div>
            <div className="v4-content-title-row">
              <h1 id={panelIsActive ? "v4-context-title" : `v4-context-title-${channel.id}`}>
                {campaignTitle ?? (embedded
                  ? GENERATED_V4_CAMPAIGN_TITLE
                  : "Seasonal property clean up in Hamilton")}
              </h1>
            </div>
            <section className="v4-about-copy">
              <div className="v4-about-heading v4-status-heading-row">
                <h2>{channel.about}</h2>
                <VersionFourContentStatusBadge
                  status={channelStatuses[channel.id] ?? "suggested"}
                />
              </div>
              <p>{channel.rationale}</p>
            </section>
            <dl className="v4-context-facts">
              <div>
                <dt>{panelHasOriginalScheduleDate ? "Original schedule date" : "Schedule date"}</dt>
                <dd className={panelHasOriginalScheduleDate ? "v4-warning-fact" : undefined}>
                  {panelHasOriginalScheduleDate && <TriangleAlert size={16} aria-hidden="true" />}
                  {formatV4DeliveryDateTime(panelDelivery)}
                </dd>
              </div>
              <div><dt>{channel.destinationLabel}</dt><dd>{channel.destination}</dd></div>
            </dl>
          </div>
          <div className="v4-context-actions">
            {panelInstagramBlocked && (
              <div className="v4-context-info-banner" role="status">
                <Info size={22} aria-hidden="true" />
                <span>{INSTAGRAM_IMAGE_REQUIRED_MESSAGE}</span>
              </div>
            )}
            {panelIsGoogle && googleDemoState === "error" && (
              <div className="v4-context-error-banner" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>Posting failed due to a connection issue.</span>
              </div>
            )}
            <footer
              className={`v4-context-footer${panelIsGoogle && googleDemoState === "sent"
                ? " v4-context-footer--sent-google"
                : ""}${panelIsActive && previewLoading ? " is-loading" : ""}`}
              aria-busy={panelIsActive && previewLoading}
              inert={deleteDialogOpen || (panelIsActive && previewLoading) ? true : undefined}
            >
              {!(panelIsGoogle && googleDemoState === "sent") && (
                <button
                  type="button"
                  className="delete-post"
                  onClick={() => {
                    deliveryHold.cancel();
                    setSplitMenuOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </button>
              )}
              <div>
                {panelIsGoogle && googleDemoState === "sent" ? (
                  <button type="button" className="primary-button v4-view-performance">
                    View post
                    <ExternalLink size={17} aria-hidden="true" />
                  </button>
                ) : panelIsGoogle
                  && (googleDemoState === "missed" || googleDemoState === "error") ? (
                  <>
                    <button type="button" className="secondary-button" onClick={editCurrent}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="primary-button v4-send-now"
                      disabled={deliveryHold.pending}
                      onClick={sendCurrentNow}
                    >
                      {googleDemoState === "missed" ? "Send Now" : "Post Now"}
                    </button>
                  </>
                ) : panelPresentationState === "unscheduled" || panelPresentationState === "suggested" ? (
                  <>
                    <button type="button" className="secondary-button" onClick={editCurrent}>
                      Edit
                    </button>
                    <div
                      className="v4-split-action"
                      ref={panelIsActive ? splitMenuRef : undefined}
                    >
                      {panelIsActive && splitMenuOpen && !panelInstagramBlocked && (
                        <div className="v4-split-menu" role="menu" aria-label="Publishing options">
                          <button
                            ref={splitOptionRef}
                            type="button"
                            role="menuitem"
                            disabled={deliveryHold.pending}
                            onClick={sendCurrentNow}
                          >
                            Post now and view next
                          </button>
                        </div>
                      )}
                      <span className={`v4-split-button v4-schedule-next-button${panelInstagramBlocked ? " is-disabled" : ""}`}>
                        <button
                          type="button"
                          disabled={panelInstagramBlocked || deliveryHold.pending}
                          onClick={scheduleCurrent}
                        >
                          {v4UnscheduledActionLabel(channel.id)}
                        </button>
                        <button
                          ref={panelIsActive ? splitToggleRef : undefined}
                          type="button"
                          aria-label="Show publishing options"
                          aria-haspopup="menu"
                          aria-expanded={panelIsActive && splitMenuOpen}
                          disabled={panelInstagramBlocked || deliveryHold.pending}
                          onClick={() => {
                            if (panelInstagramBlocked) return;
                            setSplitMenuOpen((open) => !open);
                          }}
                        >
                          <ChevronDown size={20} />
                        </button>
                      </span>
                    </div>
                  </>
                ) : panelPresentationState === "scheduled" ? (
                  <div
                    className="v4-split-action"
                    ref={panelIsActive ? splitMenuRef : undefined}
                  >
                    {panelIsActive && splitMenuOpen && (
                      <div className="v4-split-menu" role="menu" aria-label="Scheduled post options">
                        <button
                          ref={splitOptionRef}
                          type="button"
                          role="menuitem"
                          disabled={deliveryHold.pending}
                          onClick={sendCurrentNow}
                        >
                          Send now
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            deliveryHold.cancel();
                            setSplitMenuOpen(false);
                            onLifecycleAction(active.id, "cancel");
                          }}
                        >
                          Cancel schedule
                        </button>
                      </div>
                    )}
                    <span className="v4-split-button">
                      <button type="button" onClick={editCurrent}>Edit</button>
                      <button
                        ref={panelIsActive ? splitToggleRef : undefined}
                        type="button"
                        aria-label="Show scheduled post options"
                        aria-haspopup="menu"
                        aria-expanded={panelIsActive && splitMenuOpen}
                        disabled={deliveryHold.pending}
                        onClick={() => setSplitMenuOpen((open) => !open)}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="primary-button v4-sent-edit-button"
                    onClick={editCurrent}
                  >
                    Edit
                  </button>
                )}
              </div>
            </footer>
          </div>
        </section>
      </V4SlidingPanel>
    );
  };

  const renderCardPanel = (channel: (typeof channels)[number], index: number) => {
    const panelIsActive = index === safeIndex;
    const panelPreviewTitle = channel.id === "email"
      ? "Email Campaign Preview"
      : channel.id === "website"
        ? "Website Page Preview"
        : `${channel.label} Post Preview`;

    return (
      <V4SlidingPanel
        activeIndex={safeIndex}
        index={index}
        key={`card-${channel.id}`}
        layer="card"
      >
        <section
          className="v4-context-preview"
          aria-label={`${channel.label} content preview`}
          aria-busy={panelIsActive && previewLoading}
        >
          <header>
            <ContextualChannelArtwork channel={channel.id} iconStyle={iconStyle} previewTitle />
            <strong>{panelPreviewTitle}</strong>
          </header>
          <div className="v4-context-preview-scroll">
            {panelIsActive && previewLoading ? (
              <div
                className="v4-preview-glimmer"
                role="status"
                aria-live="polite"
                aria-label={`Loading ${channel.label} preview`}
              >
                <span className="sr-only">Loading {channel.label} preview</span>
                <span className="v4-preview-glimmer-block" aria-hidden="true" />
                <span className="v4-preview-glimmer-block" aria-hidden="true" />
              </div>
            ) : (
              <ContextualPreviewContent
                channel={channel.id}
                drafts={drafts}
                emailMessage={emailMessage}
                emailSubject={emailSubject}
                websiteMessage={websiteMessage}
                websiteTitle={websiteTitle}
                campaignTitle={campaignTitle}
                collapseEmptyMedia={enforceInstagramImageRequirement}
              />
            )}
          </div>
        </section>
      </V4SlidingPanel>
    );
  };

  const modal = (
    <section
      className={`v4-context-modal v4-five-channel-modal${embedded ? " v4-generated-review" : ""}${deleteDialogOpen ? " delete-dialog-open" : ""}${previewLoading ? " preview-loading" : ""}`}
      {...(!embedded || embeddedExitControls
        ? {
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": "v4-context-title",
          }
        : { "aria-label": "Generated channel review" })}
    >
        <header
          className={`context-navigation-header v4-context-navigation v4-navigation--${navigationStyle}`}
          inert={deleteDialogOpen || previewLoading ? true : undefined}
        >
          {navigationStyle === "arrows" ? (
            <V4ArrowNavigator
              channels={channels.map(({ id }) => id)}
              activeChannel={active.id}
              onSelect={selectChannel}
            />
          ) : (
            <ChannelIconSwitcher
              channels={channels.map(({ id }) => id)}
              activeChannel={active.id}
              onSelect={selectChannel}
              className="channel-icon-switcher--modal-v4"
            />
          )}
          <V4DeliveryProgress
            channels={channels.map(({ id }) => id)}
            deliveries={channelDeliveries}
            googleState={googleDemoState}
          />
          {(!embedded || embeddedExitControls) && (
            <button
              className="context-navigation-close"
              type="button"
              aria-label="Close"
              onClick={closeModal}
            >
              <X size={24} aria-hidden="true" />
            </button>
          )}
        </header>

        <div
          className="v4-context-body"
          data-active-channel={active.id}
          data-channel={active.id}
          inert={deleteDialogOpen ? true : undefined}
        >
          <div className="v4-sliding-layer v4-sliding-layer--text">
            {channels.map(renderTextPanel)}
          </div>
          <div className="v4-sliding-layer v4-sliding-layer--card">
            {channels.map(renderCardPanel)}
          </div>
        </div>

        {deleteDialogOpen && (
          <DeletionFeedbackDialog
            channel={active.id}
            onCancel={closeDeleteDialog}
            onConfirm={() => {
              deliveryHold.cancel();
              setDeleteDialogOpen(false);
              onDelete(active.id);
            }}
          />
        )}
    </section>
  );

  if (embedded) return modal;

  return (
    <div
      className="calendar-modal-overlay v4-context-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      {modal}
    </div>
  );
}

function VersionFourGeneratedFlowShell({
  prompt,
  loading,
  origin,
  onPromptChange,
  onSubmit,
  onClose,
  children,
}: {
  prompt: string;
  loading: boolean;
  origin: V4GeneratedFlowOrigin;
  onPromptChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="calendar-modal-overlay suggested-content-overlay v4-generated-flow-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`suggested-content-dialog v4-generated-flow-shell origin-${origin}`}
        data-generated-flow-origin={origin}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-generated-flow-title"
      >
        <SuggestedPromptSection
          title="Start with your own idea"
          titleId="v4-generated-flow-title"
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSubmit={onSubmit}
          onClose={onClose}
          loading={loading}
        />
        <div className="v4-generated-flow-content">{children}</div>
      </section>
    </div>
  );
}

function GooglePrototypeStatusControls({
  state,
  onChange,
}: {
  state: GoogleContextDemoState;
  onChange: (state: GoogleContextDemoState) => void;
}) {
  const controls: Array<{
    state: GoogleContextDemoState;
    label: string;
    dotStatus?: CalendarChannelStatus;
  }> = [
    { state: "suggested", label: "Suggested" },
    { state: "scheduled", label: "Scheduled", dotStatus: "scheduled" },
    { state: "sent", label: "Sent", dotStatus: "sent" },
    { state: "missed", label: "Missed", dotStatus: "missed" },
    { state: "error", label: "Error", dotStatus: "error" },
  ];

  return (
    <fieldset className="prototype-status-controls">
      <legend>Prototype status controls — not part of final UI</legend>
      <div role="group" aria-label="Google contextual modal demo status">
        {controls.map((control) => (
          <button
            type="button"
            className={`${state === control.state ? "active " : ""}status-${control.state}`.trim()}
            aria-pressed={state === control.state}
            onClick={() => onChange(control.state)}
            key={control.state}
          >
            {control.dotStatus ? (
              <span
                className={`channel-status-dot status-${control.dotStatus}`}
                aria-hidden="true"
              />
            ) : (
              <span className="prototype-neutral-dot" aria-hidden="true" />
            )}
            {control.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function VersionFiveContextModal({
  drafts,
  emailMessage,
  emailSubject,
  websiteMessage,
  websiteTitle,
  initialIndex = 0,
  availableChannels,
  channelDeliveries,
  onClose,
  onEdit,
  onDelete,
  onLifecycleAction,
  googleDemoState,
  onActiveChannelChange,
}: ContextModalContentProps & {
  initialIndex?: number;
  availableChannels: ContextualChannel[];
  channelDeliveries: V4ChannelDeliveries;
  onClose: () => void;
  onEdit: (channel: ContextualChannel) => void;
  onDelete: (channel: ContextualChannel) => void;
  onLifecycleAction: (
    channel: ContextualChannel,
    action: V4LifecycleAction,
    advance?: boolean,
  ) => void;
  googleDemoState: GoogleContextDemoState;
  onActiveChannelChange: (channel: ContextualChannel | null) => void;
  iconStyle?: SocialIconStyle;
  navigationStyle?: V4NavigationStyle;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const channels = CONTEXTUAL_CHANNELS.filter(({ id }) => availableChannels.includes(id));
  const safeIndex = Math.min(activeIndex, channels.length - 1);
  const active = channels[safeIndex];
  const activeDelivery = channelDeliveries[active.id];
  const presentation = contextPresentation(active.id, activeDelivery, googleDemoState);
  const isGoogleDemo = active.id === "google";
  const atEnd = safeIndex === channels.length - 1;
  const selectChannel = (channel: ContextualChannel) => {
    setSplitMenuOpen(false);
    setActiveIndex(channels.findIndex(({ id }) => id === channel));
  };

  const goPrevious = () => {
    setSplitMenuOpen(false);
    setActiveIndex((current) => Math.max(0, current - 1));
  };
  const goNext = () => {
    setSplitMenuOpen(false);
    setActiveIndex((current) => Math.min(channels.length - 1, current + 1));
  };
  const scheduleCurrent = () => {
    setSplitMenuOpen(false);
    if (!atEnd) setActiveIndex((current) => current + 1);
    onLifecycleAction(active.id, "schedule", true);
  };
  const sendCurrentNow = () => {
    setSplitMenuOpen(false);
    if (!atEnd) setActiveIndex((current) => current + 1);
    onLifecycleAction(active.id, "send", true);
  };
  const editCurrent = () => {
    setSplitMenuOpen(false);
    onEdit(active.id);
  };

  useEffect(() => {
    onActiveChannelChange(active.id);
    return () => onActiveChannelChange(null);
  }, [active.id, onActiveChannelChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deleteDialogOpen) {
        event.stopImmediatePropagation();
        setDeleteDialogOpen(false);
        return;
      }
      if (event.key === "Escape" && splitMenuOpen) {
        event.stopImmediatePropagation();
        setSplitMenuOpen(false);
        splitToggleRef.current?.focus();
        return;
      }
      if (event.key === "Escape") onClose();
      if (deleteDialogOpen) return;
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialogOpen, onClose, splitMenuOpen]);

  useEffect(() => {
    if (!splitMenuOpen) return;
    splitOptionRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!splitMenuRef.current?.contains(event.target as Node)) setSplitMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [splitMenuOpen]);

  return (
    <div className="calendar-modal-overlay v4-context-overlay v5-context-overlay" role="presentation">
      <section
        className={`v5-context-modal${deleteDialogOpen ? " delete-dialog-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v5-context-title"
      >
        <header
          className="context-navigation-header v5-context-header"
          inert={deleteDialogOpen ? true : undefined}
        >
          <ChannelIconSwitcher
            channels={channels.map(({ id }) => id)}
            activeChannel={active.id}
            onSelect={selectChannel}
            className="channel-icon-switcher--modal-v5"
          />
          <button className="context-navigation-close" type="button" aria-label="Close" onClick={onClose}>
            <X size={24} aria-hidden="true" />
          </button>
        </header>

        <section className="v5-context-content" inert={deleteDialogOpen ? true : undefined}>
          <div className="v5-context-campaign-intro">
            <h1 id="v5-context-title">Seasonal property cleanup in Hamilton</h1>
            <p>{active.rationale}</p>
          </div>
          <div className="v5-context-metadata">
            <div className="v5-preview-top-row">
              <div className="v5-preview-channel">
                <span className="v5-preview-eyebrow">PREVIEW</span>
                <ContextualChannelIcon channel={active.id} />
                <strong>{active.label}</strong>
                {presentation.status && (
                  <span className={`v4-context-status status-${presentation.status.tone}`}>
                    <span
                      className={`channel-status-dot status-${
                        presentation.status.tone === "failed" ? "error" : presentation.status.tone
                      }`}
                      aria-hidden="true"
                    />
                    {presentation.status.label}
                  </span>
                )}
              </div>
            </div>
            <dl className="v5-context-facts">
              <div>
                <dt>{presentation.originalScheduleDate ? "Original schedule date:" : "Schedule date:"}</dt>
                <dd className={presentation.originalScheduleDate ? "v4-warning-fact" : undefined}>
                  {presentation.originalScheduleDate && <TriangleAlert size={16} aria-hidden="true" />}
                  {formatV4DeliveryDateTime(activeDelivery)}
                </dd>
              </div>
              <div><dt>{active.destinationLabel}:</dt><dd>{active.destination}</dd></div>
            </dl>
            {presentation.state === "error" && (
              <div className="v4-context-error-banner" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>Posting failed due to a connection issue.</span>
              </div>
            )}
            <hr />
          </div>
          <div className="v5-context-preview-scroll" data-testid="v5-preview-scroll-region">
            <div className="v5-context-preview-surface">
              <ContextualPreviewContent
                channel={active.id}
                drafts={drafts}
                emailMessage={emailMessage}
                emailSubject={emailSubject}
                websiteMessage={websiteMessage}
                websiteTitle={websiteTitle}
              />
            </div>
          </div>
        </section>

        <footer className="v5-context-footer" inert={deleteDialogOpen ? true : undefined}>
          {isGoogleDemo && presentation.state === "sent" ? (
            <button type="button" className="v4-duplicate-campaign">Duplicate Campaign</button>
          ) : (
            <button
              type="button"
              className="delete-post"
              onClick={() => {
                setSplitMenuOpen(false);
                setDeleteDialogOpen(true);
              }}
            >
              {presentation.state === "scheduled" || presentation.state === "sent"
                ? "Delete Post"
                : "Delete"}
            </button>
          )}
          <div>
            {isGoogleDemo && presentation.state === "sent" ? (
              <button type="button" className="primary-button v4-view-performance">
                View Performance
                <ExternalLink size={17} aria-hidden="true" />
              </button>
            ) : presentation.state === "missed" || presentation.state === "error" ? (
              <>
                <button type="button" className="secondary-button" onClick={editCurrent}>Edit</button>
                <button type="button" className="primary-button v4-send-now" onClick={sendCurrentNow}>
                  {presentation.state === "missed" ? "Send Now" : "Post Now"}
                </button>
              </>
            ) : presentation.state === "unscheduled" || presentation.state === "suggested" ? (
              <>
                <button type="button" className="secondary-button" onClick={editCurrent}>Edit</button>
                <div className="v4-split-action" ref={splitMenuRef}>
                  {splitMenuOpen && (
                    <div className="v4-split-menu" role="menu" aria-label="Publishing options">
                      <button
                        ref={splitOptionRef}
                        type="button"
                        role="menuitem"
                        onClick={sendCurrentNow}
                      >
                        Post now and view next
                      </button>
                    </div>
                  )}
                  <span className="v4-split-button v4-schedule-next-button">
                    <button type="button" onClick={scheduleCurrent}>Schedule and view next</button>
                    <button
                      ref={splitToggleRef}
                      type="button"
                      aria-label="Show publishing options"
                      aria-haspopup="menu"
                      aria-expanded={splitMenuOpen}
                      onClick={() => setSplitMenuOpen((open) => !open)}
                    >
                      <ChevronDown size={20} />
                    </button>
                  </span>
                </div>
              </>
            ) : presentation.state === "scheduled" ? (
              <div className="v4-split-action" ref={splitMenuRef}>
                {splitMenuOpen && (
                  <div className="v4-split-menu" role="menu" aria-label="Scheduled post options">
                    <button
                      ref={splitOptionRef}
                      type="button"
                      role="menuitem"
                      onClick={sendCurrentNow}
                    >
                      Send now
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSplitMenuOpen(false);
                        onLifecycleAction(active.id, "cancel");
                      }}
                    >
                      Cancel schedule
                    </button>
                  </div>
                )}
                <span className="v4-split-button">
                  <button type="button" onClick={editCurrent}>Edit</button>
                  <button
                    ref={splitToggleRef}
                    type="button"
                    aria-label="Show scheduled post options"
                    aria-haspopup="menu"
                    aria-expanded={splitMenuOpen}
                    onClick={() => setSplitMenuOpen((open) => !open)}
                  >
                    <ChevronDown size={20} />
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" className="primary-button v4-sent-edit-button" onClick={editCurrent}>
                Edit
              </button>
            )}
          </div>
        </footer>

        {deleteDialogOpen && (
          <DeletionFeedbackDialog
            channel={active.id}
            onCancel={() => setDeleteDialogOpen(false)}
            onConfirm={() => {
              setDeleteDialogOpen(false);
              onDelete(active.id);
            }}
          />
        )}
      </section>
    </div>
  );
}

function ScheduleDateDialog({
  channel,
  delivery,
  onCancel,
  onSave,
}: {
  channel: ContextualChannel;
  delivery: V4ChannelDelivery;
  onCancel: () => void;
  onSave: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState(delivery.date);
  const [time, setTime] = useState(delivery.time);
  const channelLabel = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)!.label;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [onCancel]);

  return (
    <div
      className="calendar-modal-overlay schedule-date-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="schedule-date-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-date-title"
      >
        <header>
          <h2 id="schedule-date-title">Schedule Date</h2>
          <button type="button" aria-label="Close Schedule Date" onClick={onCancel}>
            <X size={24} />
          </button>
        </header>
        <div className="schedule-date-body">
          <p>
            We recommend that all communications occur between 9 AM – 5 PM. This post can be
            scheduled to be sent on:
          </p>
          <div className="schedule-date-inputs">
            <label>
              Date
              <input
                type="date"
                aria-label={`Schedule date for ${channelLabel}`}
                min={V4_WEEK_MIN}
                max={V4_WEEK_MAX}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                aria-label={`Schedule time for ${channelLabel}`}
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
          <p className="schedule-timezone">Time zone: (GMT-05:00) America/Toronto (EST)</p>
        </div>
        <footer>
          <button
            type="button"
            className="primary-button"
            disabled={!date || !time}
            onClick={() => onSave(date, time)}
          >
            Save Edits
          </button>
        </footer>
      </section>
    </div>
  );
}

function VersionFourChannelReview({
  channel,
  socialDraft,
  emailMessage,
  emailSubject,
  websiteMessage,
  websiteTitle,
  campaignTitle,
  images,
  onBack,
  onEdit,
  onDelete,
  onSchedule,
  onSendNow,
  onEditSchedule,
  delivery,
  availableChannels,
  channelStatuses,
  onChannelChange,
  navigationStyle = "icons",
  lifecycleEnabled = false,
  compactPreview = false,
  inactive = false,
  iconStyle = "brand",
  publishingDisabled = false,
  collapseEmptyMedia = false,
  versionFourActionLabels = false,
  showContentStatus = false,
}: {
  channel: ContextualChannel;
  socialDraft?: ChannelDraft;
  emailMessage: string;
  emailSubject: string;
  websiteMessage: string;
  websiteTitle: string;
  campaignTitle?: string;
  images: GalleryImage[];
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onSchedule?: () => void;
  onSendNow?: () => void;
  onEditSchedule?: () => void;
  delivery?: V4ChannelDelivery;
  availableChannels: ContextualChannel[];
  channelStatuses: Partial<Record<ContextualChannel, ChannelContentStatus>>;
  onChannelChange: (channel: ContextualChannel) => void;
  navigationStyle?: V4NavigationStyle;
  lifecycleEnabled?: boolean;
  compactPreview?: boolean;
  inactive?: boolean;
  iconStyle?: SocialIconStyle;
  publishingDisabled?: boolean;
  collapseEmptyMedia?: boolean;
  versionFourActionLabels?: boolean;
  showContentStatus?: boolean;
}) {
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const visualOnly = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const channelConfig = CONTEXTUAL_CHANNELS.find(({ id }) => id === channel)!;
  const isEmail = channel === "email";
  const isWebsite = channel === "website";
  const socialSummary = socialDraft
    ? [socialDraft.message, socialDraft.cta, socialDraft.hashtags]
      .filter(Boolean)
      .join(" ")
      .replace(/\n+/g, " ")
    : "";
  const summary = isEmail
    ? `${emailSubject} — ${emailMessage}`.replace(/\n+/g, " ")
    : isWebsite
      ? `${websiteTitle} — ${websiteMessage}`.replace(/\n+/g, " ")
      : socialSummary;
  const reviewTitle = isEmail
    ? "Review Email Campaign"
    : isWebsite
      ? "Review Website Page"
      : `Review ${channelConfig.label} Post`;
  const contentLabel = isWebsite ? "Page" : "Content";
  const scheduleLabel = isEmail
    ? "Schedule Campaign"
    : isWebsite
      ? "Publish Page"
      : "Schedule Post";
  const destinationLabel = isEmail
    ? "Send to"
    : isWebsite
      ? "Publish to"
      : "Post to";
  const destination = channel === "google"
    ? "Google Business Profile · Beegreen Landscaping"
    : channel === "facebook"
      ? "Beegreen Landscaping / Profile 1"
      : channel === "instagram"
        ? "@beegreenlandscaping"
        : channel === "email"
          ? "All clients · 394 of 400 subscribed to email marketing"
          : INITIAL_EXTERNAL_LINK;
  const deleteLabel = versionFourActionLabels
    ? "Delete"
    : isEmail
      ? "Delete Campaign"
      : isWebsite
        ? "Delete Page"
        : "Delete Post";
  const scheduleActionLabel = versionFourActionLabels
    ? v4UnscheduledActionLabel(channel)
    : "Schedule and view next";
  const immediateActionLabel = isEmail ? "Send now" : isWebsite ? "Publish now" : "Post now";
  const deleteEnabled = lifecycleEnabled && Boolean(onDelete);
  const scheduleCurrent = () => {
    if (publishingDisabled) return;
    onSchedule?.();
  };
  const sendCurrentNow = () => {
    if (publishingDisabled) return;
    onSendNow?.();
  };

  useEffect(() => {
    if (!splitMenuOpen) return;
    splitOptionRef.current?.focus();
    const closeMenu = (event: MouseEvent) => {
      if (!splitMenuRef.current?.contains(event.target as Node)) setSplitMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setSplitMenuOpen(false);
      splitToggleRef.current?.focus();
    };
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [splitMenuOpen]);

  return (
    <main
      className={`app-content v4-facebook-workflow v4-channel-review${compactPreview ? " v4-suggested-review" : ""}`}
      aria-labelledby="v4-channel-review-title"
      inert={inactive ? true : undefined}
    >
      <section className="review-panel">
        <header className={`review-navigation-header v4-navigation--${navigationStyle}`}>
          {navigationStyle === "arrows" ? (
            <V4ArrowNavigator
              channels={availableChannels}
              activeChannel={channel}
              onSelect={onChannelChange}
            />
          ) : (
            <ChannelIconSwitcher
              channels={availableChannels}
              activeChannel={channel}
              onSelect={onChannelChange}
              className="channel-icon-switcher--review"
            />
          )}
          <V4DeliveryProgress
            channels={availableChannels}
            statuses={channelStatuses}
          />
        </header>
        <div className="review-scroll">
          <div className="v4-content-title-row">
            <h1 id="v4-channel-review-title">{reviewTitle}</h1>
            {showContentStatus && (
              <VersionFourContentStatusBadge
                status={channelStatuses[channel] ?? "suggested"}
              />
            )}
          </div>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>{channelConfig.about}</strong>
            <ChevronDown size={19} />
          </div>
          <div className="review-fields">
            <section className="review-field">
              <header><h2>{contentLabel}</h2><button type="button" onClick={onEdit}>Edit</button></header>
              <p className="review-summary">{summary}</p>
              <small>AI-generated content may contain errors. Please verify important information.</small>
            </section>
            <section className="review-field">
              <header>
                <h2>{scheduleLabel}</h2>
                <button
                  type="button"
                  aria-disabled={onEditSchedule ? undefined : "true"}
                  onClick={onEditSchedule ?? visualOnly}
                >
                  Edit
                </button>
              </header>
              <p>{delivery
                ? formatV4DeliveryDateTime(delivery).replace(" · ", " ")
                : "Nov 7, 2026 9:00 AM"}</p>
            </section>
            <section className="review-field v4-facebook-post-to">
              <header>
                <span className="v4-connected-title">
                  <h2>{destinationLabel}</h2>
                  {!isEmail && !isWebsite && <small>Connected</small>}
                </span>
              </header>
              <p>
                <ContextualChannelIcon channel={channel} /> {destination}
              </p>
            </section>
          </div>
        </div>
        <footer className="review-footer">
          <div>
            <button className="secondary-button" type="button" onClick={onBack}>Back</button>
            <button
              className="delete-post"
              type="button"
              aria-disabled={deleteEnabled ? undefined : "true"}
              onClick={deleteEnabled ? onDelete : visualOnly}
            >
              {deleteEnabled ? deleteLabel : "Delete Post"}
            </button>
          </div>
          {lifecycleEnabled ? (
            <div className="v4-split-action v4-review-split-action" ref={splitMenuRef}>
              {splitMenuOpen && !publishingDisabled && (
                <div className="v4-split-menu" role="menu" aria-label="Publishing options">
                  <button
                    ref={splitOptionRef}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (publishingDisabled) return;
                      setSplitMenuOpen(false);
                      sendCurrentNow();
                    }}
                  >
                    {immediateActionLabel}
                  </button>
                </div>
              )}
              <span className={`v4-split-button${publishingDisabled ? " is-disabled" : ""}`}>
                <button type="button" disabled={publishingDisabled} onClick={scheduleCurrent}>
                  {scheduleActionLabel}
                </button>
                <button
                  ref={splitToggleRef}
                  type="button"
                  aria-label="Show publishing options"
                  aria-haspopup="menu"
                  aria-expanded={splitMenuOpen}
                  disabled={publishingDisabled}
                  onClick={() => {
                    if (publishingDisabled) return;
                    setSplitMenuOpen((open) => !open);
                  }}
                >
                  <ChevronDown size={20} />
                </button>
              </span>
            </div>
          ) : (
            <button className="schedule-split" type="button" aria-disabled="true" onClick={visualOnly}>
              <span>{scheduleActionLabel}</span><ChevronDown size={20} />
            </button>
          )}
        </footer>
      </section>
      {isEmail ? (
        <section className="preview-panel suggested-review-preview">
          <div className="preview-content">
            <EmailCampaignPreview
              images={images}
              message={emailMessage}
              subject={emailSubject}
              campaignTitle={campaignTitle}
            />
          </div>
        </section>
      ) : isWebsite ? (
        <section className="preview-panel suggested-review-preview">
          <div className="preview-content">
            <WebsitePagePreview images={images} message={websiteMessage} title={websiteTitle} />
          </div>
        </section>
      ) : (
        <SocialDraftPreview
          channel={channel}
          draft={socialDraft!}
          collapseEmptyMedia={collapseEmptyMedia}
        />
      )}
    </main>
  );
}

function SocialDraftPreview({
  channel,
  draft,
  collapseEmptyMedia = false,
}: {
  channel: PreviewChannel;
  draft: ChannelDraft;
  collapseEmptyMedia?: boolean;
}) {
  return (
    <section className="preview-panel social-only-preview v4-facebook-preview">
      <div className="preview-content">
        <PlatformPreviewCard
          channel={channel}
          message={draft.message}
          cta={draft.cta}
          hashtags={draft.hashtags}
          images={draft.images}
          externalLink={draft.externalLink}
          googleLinkDestination={draft.googleLinkDestination}
          googleButtonEnabled={draft.googleButtonEnabled}
          googleButtonAction={draft.googleButtonAction}
          collapseEmptyMedia={collapseEmptyMedia}
        />
        <p className="preview-disclaimer">
          Social networks regularly make updates to formatting so your post may appear slightly
          different when published
        </p>
      </div>
    </section>
  );
}

function VersionFourSocialEditor({
  channel,
  draft,
  setDraft,
  onCancel,
  onSave,
  allowPrototypeImageSelection = false,
  flattenedMessage = false,
}: {
  channel: PreviewChannel;
  draft: ChannelDraft;
  setDraft: (draft: ChannelDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  allowPrototypeImageSelection?: boolean;
  flattenedMessage?: boolean;
}) {
  const channelLabel = channel === "facebook" ? "Facebook" : "Instagram";

  return (
    <main className="app-content v4-facebook-workflow" aria-labelledby="v4-social-editor-title">
      <section className="editor-panel v4-social-editor">
        <div className="editor-scroll">
          <h1 id="v4-social-editor-title">Edit {channelLabel} Post</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {channelLabel} post</strong>
            <ChevronDown size={19} />
          </div>
          <div className="field-block v4-social-message">
            <label htmlFor="v4-social-message">Message body</label>
            <AutoSizeTextarea
              id="v4-social-message"
              maxLength={1500}
              value={draft.message}
              onChange={(message) => setDraft({ ...draft, message })}
            />
            <span className="character-count">{draft.message.length}/1500 characters</span>
          </div>
          {!flattenedMessage && (
            <>
              <div className="field-block v4-cta-field v4-inset-field">
                <label htmlFor="v4-social-cta">Contact info</label>
                <AutoSizeTextarea
                  id="v4-social-cta"
                  maxLength={500}
                  value={draft.cta ?? ""}
                  onChange={(cta) => setDraft({ ...draft, cta })}
                />
              </div>
              <div className="field-block v4-hashtag-field v4-inset-field">
                <label htmlFor="v4-social-hashtags">Hashtag</label>
                <input
                  id="v4-social-hashtags"
                  value={draft.hashtags ?? ""}
                  onChange={(event) => setDraft({ ...draft, hashtags: event.target.value })}
                />
              </div>
            </>
          )}
          <div className="image-section v4-social-images">
            <div>
              <label>
                Image{" "}
                <span className="optional">
                  ({allowPrototypeImageSelection && channel === "instagram" ? "required" : "optional"})
                </span>
              </label>
              <p className="helper image-helper">
                Max 10 images. Landscape image works best.<br />
                To show before-and-after work, combine two images into one with the <u>collage tool</u>.
              </p>
            </div>
            <InteractiveGallery
              images={draft.images}
              setImages={(images) => setDraft({ ...draft, images })}
            />
            <div className="v4-social-dropzone">
              <button
                type="button"
                disabled={!allowPrototypeImageSelection || draft.images.length >= 10}
                onClick={() => {
                  if (!allowPrototypeImageSelection || draft.images.length >= 10) return;
                  const nextImage = INITIAL_IMAGES.find((image) => (
                    !draft.images.some(({ id }) => id === image.id)
                  ));
                  if (nextImage) setDraft({ ...draft, images: [...draft.images, nextImage] });
                }}
              >
                Choose image
              </button>
              <span>Select or drag files here to upload</span>
              <small>Maximum size 5MB per file</small>
            </div>
          </div>
        </div>
        <footer className="editor-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" onClick={onSave}>Save Edit</button>
        </footer>
      </section>
      <SocialDraftPreview
        channel={channel}
        draft={draft}
        collapseEmptyMedia={allowPrototypeImageSelection}
      />
    </main>
  );
}

const GOOGLE_BUTTON_OPTIONS: Array<{ value: GoogleButtonAction; label: string }> = [
  { value: "learn-more", label: "Learn More" },
  { value: "book", label: "Book" },
  { value: "call-now", label: "Call now" },
];

const GOOGLE_LINK_OPTIONS: Array<{ value: GoogleLinkDestination; label: string; requestForm?: boolean }> = [
  { value: "external", label: "External link" },
  { value: "booking", label: "Online booking page" },
  { value: "default-form", label: "Untitled Form (Default)", requestForm: true },
  { value: "other-form", label: "My other form", requestForm: true },
];

function googleButtonLabel(action: GoogleButtonAction | undefined) {
  return GOOGLE_BUTTON_OPTIONS.find((option) => option.value === action)?.label ?? "Learn More";
}

function googleLinkLabel(destination: GoogleLinkDestination | undefined) {
  return GOOGLE_LINK_OPTIONS.find((option) => option.value === destination)?.label ?? "External link";
}

function VersionFourGoogleButtonEditor({
  draft,
  onChange,
}: {
  draft: ChannelDraft;
  onChange: (draft: ChannelDraft) => void;
}) {
  const enabled = draft.googleButtonEnabled ?? true;
  const action = draft.googleButtonAction ?? "learn-more";
  const destination = draft.googleLinkDestination ?? "external";
  const [openMenu, setOpenMenu] = useState<"text" | "link" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textTriggerRef = useRef<HTMLButtonElement>(null);
  const linkTriggerRef = useRef<HTMLButtonElement>(null);
  const textOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const linkOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeMenu = (restoreFocus = false, menu = openMenu) => {
    setOpenMenu(null);
    if (restoreFocus) {
      (menu === "link" ? linkTriggerRef : textTriggerRef).current?.focus();
    }
  };
  const showMenu = (menu: "text" | "link", focusIndex: number) => {
    setOpenMenu(menu);
    const refs = menu === "text" ? textOptionRefs : linkOptionRefs;
    window.requestAnimationFrame(() => refs.current[Math.max(focusIndex, 0)]?.focus());
  };
  const selectAction = (nextAction: GoogleButtonAction) => {
    onChange({ ...draft, googleButtonAction: nextAction });
    closeMenu(true, "text");
  };
  const selectDestination = (nextDestination: GoogleLinkDestination) => {
    onChange({ ...draft, googleLinkDestination: nextDestination });
    closeMenu(true, "link");
  };
  const moveOptionFocus = (
    refs: { current: Array<HTMLButtonElement | null> },
    direction: 1 | -1,
  ) => {
    const currentIndex = refs.current.findIndex((option) => option === document.activeElement);
    const nextIndex = (currentIndex + direction + refs.current.length) % refs.current.length;
    refs.current[nextIndex]?.focus();
  };

  useEffect(() => {
    if (!openMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      const target = event.target as HTMLElement;
      const targetReceivesFocus = Boolean(
        target.closest("button, a, input, select, textarea, [tabindex]"),
      );
      closeMenu(!targetReceivesFocus);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  return (
    <div className="button-section v2-google-button v4-google-button" ref={containerRef}>
      <div className="section-heading">
        <label id="v4-google-button-heading">Button</label>
        <button
          className={`toggle ${enabled ? "on" : "off"}`}
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="v4-google-button-heading"
          onClick={() => {
            setOpenMenu(null);
            onChange({ ...draft, googleButtonEnabled: !enabled });
          }}
        >
          <span />
        </button>
      </div>
      {enabled && (
        <>
          <div className="v4-google-input-group">
            <button
              ref={textTriggerRef}
              className={`select-row${action === "call-now" ? " single" : ""}`}
              type="button"
              aria-label={`Button text, ${googleButtonLabel(action)}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === "text"}
              aria-controls="v4-google-button-menu"
              onClick={() => {
                if (openMenu === "text") closeMenu();
                else showMenu("text", GOOGLE_BUTTON_OPTIONS.findIndex((option) => option.value === action));
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                event.preventDefault();
                showMenu("text", event.key === "ArrowDown" ? 0 : GOOGLE_BUTTON_OPTIONS.length - 1);
              }}
            >
              <span><small>Text</small>{googleButtonLabel(action)}</span>
              <ChevronDown size={20} aria-hidden="true" />
            </button>
            {openMenu === "text" && (
              <div
                className="v4-google-button-menu"
                id="v4-google-button-menu"
                role="menu"
                aria-label="Button text options"
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    moveOptionFocus(textOptionRefs, event.key === "ArrowDown" ? 1 : -1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    textOptionRefs.current[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    textOptionRefs.current[GOOGLE_BUTTON_OPTIONS.length - 1]?.focus();
                  }
                }}
              >
                {GOOGLE_BUTTON_OPTIONS.map((option, index) => (
                  <button
                    ref={(element) => { textOptionRefs.current[index] = element; }}
                    type="button"
                    role="menuitemradio"
                    aria-checked={action === option.value}
                    onClick={() => selectAction(option.value)}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {action !== "call-now" && (
              <button
                ref={linkTriggerRef}
                className="select-row joined"
                type="button"
                aria-label={`Link destination, ${googleLinkLabel(destination)}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === "link"}
                aria-controls="v4-google-link-menu"
                onClick={() => {
                  if (openMenu === "link") closeMenu();
                  else showMenu("link", GOOGLE_LINK_OPTIONS.findIndex((option) => option.value === destination));
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  event.preventDefault();
                  showMenu("link", event.key === "ArrowDown" ? 0 : GOOGLE_LINK_OPTIONS.length - 1);
                }}
              >
                <span><small>Link</small>{googleLinkLabel(destination)}</span>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            )}
            {openMenu === "link" && action !== "call-now" && (
              <div
                className="v4-google-button-menu v4-google-link-menu"
                id="v4-google-link-menu"
                role="menu"
                aria-label="Link destination options"
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    moveOptionFocus(linkOptionRefs, event.key === "ArrowDown" ? 1 : -1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    linkOptionRefs.current[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    linkOptionRefs.current[GOOGLE_LINK_OPTIONS.length - 1]?.focus();
                  }
                }}
              >
                {GOOGLE_LINK_OPTIONS.map((option, index) => (
                  <div key={option.value}>
                    {index === 2 && (
                      <div className="v4-google-menu-label" role="presentation">Request Forms</div>
                    )}
                    <button
                      ref={(element) => { linkOptionRefs.current[index] = element; }}
                      className={option.requestForm ? "request-form-option" : ""}
                      type="button"
                      role="menuitemradio"
                      aria-checked={destination === option.value}
                      onClick={() => selectDestination(option.value)}
                    >
                      <span>{option.label}</span>
                      {destination === option.value && <Check size={17} aria-hidden="true" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {action === "call-now" ? (
            <p className="helper muted v4-google-phone-helper">
              Customer will call the phone number registered with your Google Business Profile (778-8888-8888)
              <br />
              Contact info can be modified in Google setting.
            </p>
          ) : destination === "external" ? (
            <>
              <div className="link-input v4-google-link-input">
                <Link2 size={19} aria-hidden="true" />
                <input
                  id="v4-google-button-url"
                  aria-label="Button URL"
                  type="url"
                  value={draft.externalLink ?? INITIAL_EXTERNAL_LINK}
                  onChange={(event) => onChange({ ...draft, externalLink: event.target.value })}
                />
              </div>
              <p className="helper muted">
                Make sure your link doesn’t lead to illegal, harmful, or otherwise prohibited content.
              </p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function EditorPanel({
  message,
  setMessage,
  images,
  setImages,
  onCancel,
}: {
  message: string;
  setMessage: (value: string) => void;
  images: GalleryImage[];
  setImages: (images: GalleryImage[]) => void;
  onCancel: () => void;
}) {
  return (
    <section className="editor-panel">
      <div className="editor-scroll">
        <h1>Edit Social Posts</h1>

        <div className="field-block">
          <label htmlFor="message-body">Message body</label>
          <AutoSizeTextarea
            id="message-body"
            maxLength={1500}
            value={message}
            onChange={setMessage}
          />
          <span className="character-count">{message.length}/1500 characters</span>
        </div>

        <div className="image-section">
          <div>
            <label>Image <span className="optional">(optional)</span></label>
            <p className="helper image-helper">
              Max 10 images. To show before-and-after work, you can combine two images into
              one with the <u>collage tool</u>.
            </p>
          </div>
          <InteractiveGallery images={images} setImages={setImages} />
          <p className="helper">Google will only show the first image</p>
          <div className="upload-dropzone">
            <div className="split-upload">
              <button className="choose-image" type="button">Choose Image</button>
              <button className="upload-new" type="button">
                <Upload size={18} /> Upload New
              </button>
            </div>
            <span>1 image per post</span>
          </div>
        </div>

        <div className="button-section">
          <div className="section-heading">
            <div>
              <label>Button</label>
              <p className="helper">
                Only supported on selected{" "}
                <button className="inline-tooltip" type="button" data-tooltip="Google">
                  channels
                </button>
              </p>
            </div>
            <button className="toggle on" type="button" aria-label="Disable button">
              <span />
            </button>
          </div>
          <button className="select-row" type="button">
            <span><small>Text</small>Learn more</span>
            <ChevronDown size={20} />
          </button>
          <button className="select-row joined" type="button">
            <span><small>Link</small>Other | External Link</span>
            <ChevronDown size={20} />
          </button>
          <div className="link-input">
            <Link2 size={19} />
            <input
              aria-label="Button URL"
              defaultValue="http://yourwebsite.com"
              type="url"
            />
          </div>
          <p className="helper muted">
            Make sure your link doesn’t lead to illegal, harmful, or otherwise prohibited content.
          </p>
        </div>
      </div>
      <footer className="editor-footer">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="button" onClick={onCancel}>Save Edit</button>
      </footer>
    </section>
  );
}

function VersionTwoEditorPanel({
  activeTab,
  setActiveTab,
  drafts,
  setDrafts,
  enabledChannels,
  onCancel,
  onSave,
  separateHashtags = false,
  separateCta = false,
  versionFourGoogleButton = false,
  showAllTab = true,
  focusedChannel,
  flattenedSocialMessage = false,
}: {
  activeTab: V2Tab;
  setActiveTab: (tab: V2Tab) => void;
  drafts: V2Drafts;
  setDrafts: (drafts: V2Drafts) => void;
  enabledChannels: EnabledChannels;
  onCancel: () => void;
  onSave?: (activeTab: V2Tab) => void;
  separateHashtags?: boolean;
  separateCta?: boolean;
  versionFourGoogleButton?: boolean;
  showAllTab?: boolean;
  focusedChannel?: PreviewChannel;
  flattenedSocialMessage?: boolean;
}) {
  const activeDraft = drafts[activeTab];
  const visibleImages =
    activeTab === "google" ? activeDraft.images.slice(0, 1) : activeDraft.images;
  const titleChannel = focusedChannel
    ?? (separateCta && activeTab !== "all" ? activeTab : undefined);

  const updateMessage = (message: string) => {
    if (activeTab === "all") {
      setDrafts({
        all: { ...drafts.all, message },
        google: { ...drafts.google, message },
        facebook: { ...drafts.facebook, message },
        instagram: { ...drafts.instagram, message },
      });
      return;
    }
    setDrafts({ ...drafts, [activeTab]: { ...activeDraft, message } });
  };

  const updateImages = (images: GalleryImage[]) => {
    if (activeTab === "all") {
      setDrafts({
        all: { ...drafts.all, images: [...images] },
        google: { ...drafts.google, images: [...images] },
        facebook: { ...drafts.facebook, images: [...images] },
        instagram: { ...drafts.instagram, images: [...images] },
      });
      return;
    }

    const nextImages =
      activeTab === "google"
        ? [
            ...images,
            ...activeDraft.images.filter(({ id }) => !visibleImages.some((item) => item.id === id)),
          ]
        : images;
    setDrafts({ ...drafts, [activeTab]: { ...activeDraft, images: nextImages } });
  };

  const imageHelper =
    activeTab === "google"
      ? "Max 1 images. Landscape image works best."
      : "Max 10 images.";

  return (
    <section className="editor-panel version-two-editor">
      <div className="editor-scroll">
        <h1>
          {titleChannel
            ? `Edit ${titleChannel[0].toUpperCase() + titleChannel.slice(1)} Post`
            : "Edit Social Post"}
        </h1>
        {!focusedChannel && <div className="channel-editor-tabs" role="tablist" aria-label="Post channel">
          {([
            ["all", "Your post"],
            ["google", "Google"],
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
          ] as [V2Tab, string][])
            .filter(([tab]) => tab === "all" ? showAllTab : enabledChannels[tab])
            .map(([tab, label]) => (
            <button
              className={activeTab === tab ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              key={tab}
            >
              {label}
            </button>
          ))}
        </div>}

        {showAllTab && activeTab === "all" && (
          <p className="channel-customize-note">
            Customize channel-specific content in each channel tab
          </p>
        )}

        <div className="field-block combined-message-field">
          <label htmlFor={`v2-message-${activeTab}`}>Message body</label>
          <AutoSizeTextarea
            id={`v2-message-${activeTab}`}
            maxLength={1500}
            value={activeDraft.message}
            onChange={updateMessage}
          />
          <span className="character-count">{activeDraft.message.length}/1500 characters</span>
        </div>

        {separateCta && !flattenedSocialMessage
          && (activeTab === "facebook" || activeTab === "instagram") && (
          <div className="field-block v4-cta-field v4-inset-field">
            <label htmlFor={`v4-cta-${activeTab}`}>Contact info</label>
            <AutoSizeTextarea
              id={`v4-cta-${activeTab}`}
              maxLength={500}
              value={activeDraft.cta ?? ""}
              onChange={(cta) => {
                setDrafts({
                  ...drafts,
                  [activeTab]: { ...activeDraft, cta },
                });
              }}
            />
          </div>
        )}

        {separateHashtags && !flattenedSocialMessage
          && (activeTab === "facebook" || activeTab === "instagram") && (
          <div className="field-block v4-hashtag-field v4-inset-field">
            <label htmlFor={`v4-hashtags-${activeTab}`}>Hashtag</label>
            <input
              id={`v4-hashtags-${activeTab}`}
              value={activeDraft.hashtags ?? ""}
              onChange={(event) => {
                setDrafts({
                  ...drafts,
                  [activeTab]: { ...activeDraft, hashtags: event.target.value },
                });
              }}
            />
          </div>
        )}

        <div className="image-section v2-image-section">
          <div>
            <label>Image <span className="optional">(optional)</span></label>
            <p className="helper image-helper">
              {imageHelper}<br />
              {activeTab !== "google" && <>To show before-and-after work, you can combine two images into one with the <u>collage tool</u>.</>}
            </p>
          </div>
          <InteractiveGallery
            key={activeTab}
            images={visibleImages}
            setImages={updateImages}
          />
          {activeTab === "all" && <p className="helper">Google will only show the first image</p>}
          <div className="upload-dropzone">
            <div className="split-upload">
              <button className="choose-image" type="button">Choose Image</button>
              <button className="upload-new" type="button">
                <Upload size={18} /> Upload New
              </button>
            </div>
            <span>1 image per post</span>
          </div>
        </div>

        {activeTab === "google" && versionFourGoogleButton && (
          <VersionFourGoogleButtonEditor
            draft={activeDraft}
            onChange={(google) => setDrafts({ ...drafts, google })}
          />
        )}

        {activeTab === "google" && !versionFourGoogleButton && (
          <div className="button-section v2-google-button">
            <div className="section-heading">
              <label>Button</label>
              <button className="toggle on" type="button" aria-label="Disable button"><span /></button>
            </div>
            <button className="select-row" type="button">
              <span><small>Text</small>Learn more</span>
            </button>
            <button className="select-row joined" type="button">
              <span><small>Link</small>Other | External Link</span>
            </button>
            <div className="link-input">
              <Link2 size={19} />
              <input
                aria-label="Button URL"
                type="url"
                value={activeDraft.externalLink ?? ""}
                onChange={(event) => {
                  setDrafts({
                    ...drafts,
                    google: { ...drafts.google, externalLink: event.target.value },
                  });
                }}
              />
            </div>
            <p className="helper muted">
              Make sure your link doesn’t lead to illegal, harmful, or otherwise prohibited content.
            </p>
          </div>
        )}
      </div>
      <footer className="editor-footer">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button
          className="primary-button"
          type="button"
          onClick={() => onSave ? onSave(activeTab) : onCancel()}
        >
          Save Edit
        </button>
      </footer>
    </section>
  );
}

function PreviewChannelControl({
  channel,
  setChannel,
  enabledChannels,
}: {
  channel: PreviewChannel;
  setChannel: (channel: PreviewChannel) => void;
  enabledChannels: EnabledChannels;
}) {
  const channelOptions: Array<{ channel: PreviewChannel; label: string; icon: string }> = [
    { channel: "google", label: "Google", icon: "G" },
    { channel: "facebook", label: "Facebook", icon: "f" },
    { channel: "instagram", label: "Instagram", icon: "◎" },
  ];

  return (
    <div className="channel-tabs" aria-label="Preview channel">
      {channelOptions
        .filter(({ channel: option }) => enabledChannels[option])
        .map(({ channel: option, label, icon }) => (
          <span
            className="preview-channel-option"
            key={option}
          >
            <button
              className={channel === option ? "active" : ""}
              type="button"
              aria-label={`${label} preview`}
              onClick={() => setChannel(option)}
            >
              {icon}
            </button>
          </span>
        ))}
    </div>
  );
}

function PlatformPreviewCard({
  channel,
  message,
  cta,
  hashtags: explicitHashtags = "",
  images,
  externalLink,
  googleLinkDestination,
  googleButtonEnabled,
  googleButtonAction,
  collapseEmptyMedia = false,
}: {
  channel: PreviewChannel;
  message: string;
  cta?: string;
  hashtags?: string;
  images: GalleryImage[];
  externalLink?: string;
  googleLinkDestination?: GoogleLinkDestination;
  googleButtonEnabled?: boolean;
  googleButtonAction?: GoogleButtonAction;
  collapseEmptyMedia?: boolean;
}) {
  const [instagramImage, setInstagramImage] = useState(0);
  const usesExplicitSocialFields = cta !== undefined;
  const parsed = usesExplicitSocialFields
    ? { body: message, hashtags: "" }
    : splitPostMessage(message);
  const body = parsed.body || "Your post preview will appear here.";
  const hashtags = usesExplicitSocialFields
    ? explicitHashtags
    : explicitHashtags || parsed.hashtags;

  useEffect(() => {
    if (instagramImage >= images.length) setInstagramImage(Math.max(images.length - 1, 0));
  }, [images.length, instagramImage]);

  if (channel === "google") {
    const usesV4GoogleButton = googleButtonEnabled !== undefined || googleButtonAction !== undefined;
    const showGoogleButton = usesV4GoogleButton ? googleButtonEnabled !== false : true;
    const googleAction = googleButtonAction ?? "learn-more";
    const isExternalAction = googleAction !== "call-now";
    const usesExternalLink = isExternalAction && (googleLinkDestination ?? "external") === "external";
    return (
      <article className="social-card">
        <header className="post-header">
          <img src="/assets/avatar.png" alt="" />
          <div>
            <strong>Beegreen Landscaping</strong>
            <span>Just now <Clock3 size={13} /></span>
          </div>
        </header>
        {images[0] ? (
          <img className="post-image" src={images[0].src} alt={images[0].alt} />
        ) : !collapseEmptyMedia ? (
          <div className="empty-post-image"><Image size={32} /><span>No image added</span></div>
        ) : null}
        <div className="post-copy">
          <p>{body}{hashtags ? `\n\n${hashtags}` : ""}</p>
          {showGoogleButton && (
            <div className="google-post-link">
              {usesV4GoogleButton && usesExternalLink && externalLink ? (
                <a href={externalLink} target="_blank" rel="noreferrer">
                  {googleButtonLabel(googleAction)}
                </a>
              ) : (
                <button type="button">{googleButtonLabel(googleAction)}</button>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  if (channel === "facebook") {
    return (
      <article className="social-card channel-post-card facebook">
        <header className="channel-post-header">
          <img src="/assets/avatar.png" alt="" />
          <div><strong>Landscape Service</strong><span>Just now · ◉</span></div>
        </header>
        <div className="channel-post-copy">
          <p>{body}</p>
          {cta && <p className="post-cta">{cta}</p>}
          {hashtags && <p className="post-hashtags">{hashtags}</p>}
        </div>
        {(images.length > 0 || !collapseEmptyMedia) && (
          <div className={`channel-image-grid count-${Math.min(images.length, 3)}`}>
            {images.slice(0, 3).map((image) => (
              <img src={image.src} alt={image.alt} key={image.id} />
            ))}
            {images.length === 0 && (
              <div className="empty-post-image"><Image size={32} /><span>No image added</span></div>
            )}
          </div>
        )}
        <footer className="channel-post-actions">
          <Heart size={24} /><MessageCircle size={24} /><Send size={24} />
        </footer>
      </article>
    );
  }

  const selectedImage = images[instagramImage];
  const instagramCopy = (
    <div className="instagram-post-copy">
      <p>{body}</p>
      {cta && <p className="post-cta">{cta}</p>}
      {hashtags && <p className="post-hashtags">{hashtags}</p>}
    </div>
  );
  return (
    <article className="social-card instagram-post-card">
      <header className="channel-post-header">
        <img src="/assets/avatar.png" alt="" />
        <div><strong>Landscape Service</strong><span>Just now · ◉</span></div>
      </header>
      {selectedImage ? (
        <img className="instagram-post-image" src={selectedImage.src} alt={selectedImage.alt} />
      ) : !collapseEmptyMedia ? (
        <div className="empty-post-image instagram-post-image">
          <Image size={32} />
          <span>No image added</span>
        </div>
      ) : null}
      {(selectedImage || !collapseEmptyMedia) && (
        <div className="instagram-controls">
          <div className="instagram-dots">
            {images.map((image, index) => (
              <button
                className={index === instagramImage ? "active" : ""}
                type="button"
                aria-label={`Show image ${index + 1}`}
                onClick={() => setInstagramImage(index)}
                key={image.id}
              />
            ))}
          </div>
          <div className="instagram-actions">
            <span><Heart size={24} /><MessageCircle size={24} /><Send size={24} /></span>
            <Bookmark size={24} />
          </div>
        </div>
      )}
      {instagramCopy}
    </article>
  );
}

const PREVIEW_CHANNEL_ORDER: PreviewChannel[] = ["google", "facebook", "instagram"];

function PreviewChannelName({ channel }: { channel: PreviewChannel }) {
  return (
    <span className="carousel-channel-name">
      {channel === "google" && <strong className="google-g">G</strong>}
      {channel === "facebook" && <strong className="brand-facebook">f</strong>}
      {channel === "instagram" && <strong className="brand-instagram">◎</strong>}
      {channel[0].toUpperCase() + channel.slice(1)}
    </span>
  );
}

function MultiChannelPreviewCarousel({
  drafts,
  enabledChannels,
}: {
  drafts: Record<PreviewChannel, ChannelDraft>;
  enabledChannels: EnabledChannels;
}) {
  const channels = PREVIEW_CHANNEL_ORDER.filter((channel) => enabledChannels[channel]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSlideHeight, setActiveSlideHeight] = useState<number>();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex >= channels.length) setActiveIndex(Math.max(channels.length - 1, 0));
  }, [activeIndex, channels.length]);

  useLayoutEffect(() => {
    const activeSlide = trackRef.current?.querySelector<HTMLElement>(".carousel-slide.active");
    if (!activeSlide) return;

    const updateHeight = () => setActiveSlideHeight(activeSlide.offsetHeight + 4);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activeSlide);
    return () => resizeObserver.disconnect();
  }, [activeIndex, channels.length, drafts]);

  if (channels.length === 0) {
    return <div className="no-channel-preview">No channels selected for this post.</div>;
  }

  const activeChannel = channels[activeIndex];
  const goPrevious = () => setActiveIndex((current) => (
    current === 0 ? channels.length - 1 : current - 1
  ));
  const goNext = () => setActiveIndex((current) => (
    current === channels.length - 1 ? 0 : current + 1
  ));

  return (
    <div className="multi-channel-carousel">
      <header className="carousel-header">
        <PreviewChannelName channel={activeChannel} />
        <span className="carousel-progress">
          Preview {activeIndex + 1} of {channels.length}
          <button type="button" aria-label="Previous preview" onClick={goPrevious}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next preview" onClick={goNext}>
            <ChevronRight size={18} />
          </button>
        </span>
      </header>
      <div
        className="carousel-viewport"
        style={{ height: activeSlideHeight }}
      >
        <div
          className="carousel-track"
          ref={trackRef}
          style={{ transform: `translateX(calc(-210px - ${activeIndex * 468}px))` }}
        >
          {channels.map((channel, index) => (
            <div
              className={`carousel-slide ${index === activeIndex ? "active" : ""}`}
              aria-hidden={index !== activeIndex}
              key={channel}
            >
              <PlatformPreviewCard
                channel={channel}
                message={drafts[channel].message}
                cta={drafts[channel].cta}
                hashtags={drafts[channel].hashtags}
                images={drafts[channel].images}
                externalLink={drafts[channel].externalLink}
                googleLinkDestination={drafts[channel].googleLinkDestination}
                googleButtonEnabled={drafts[channel].googleButtonEnabled}
                googleButtonAction={drafts[channel].googleButtonAction}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="preview-disclaimer carousel-disclaimer">
        Social networks regularly make updates to formatting so your post may appear slightly
        different when published
      </p>
    </div>
  );
}

function PreviewPanel({
  message,
  hashtags = "",
  images,
  enabledChannels,
}: {
  message: string;
  hashtags?: string;
  images: GalleryImage[];
  enabledChannels: EnabledChannels;
}) {
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>("google");

  useEffect(() => {
    if (!enabledChannels[previewChannel]) {
      const nextChannel = (["google", "facebook", "instagram"] as PreviewChannel[])
        .find((option) => enabledChannels[option]);
      if (nextChannel) setPreviewChannel(nextChannel);
    }
  }, [enabledChannels, previewChannel]);

  return (
    <section className="preview-panel">
      <PreviewChannelControl
        channel={previewChannel}
        setChannel={setPreviewChannel}
        enabledChannels={enabledChannels}
      />
      <div className="preview-content">
        {enabledChannels[previewChannel] ? (
          <PlatformPreviewCard
            channel={previewChannel}
            message={message}
            hashtags={hashtags}
            images={images}
          />
        ) : (
          <div className="no-channel-preview">No channels selected for this post.</div>
        )}
        <p className="preview-disclaimer">
          Social networks regularly make updates to formatting so your post may appear slightly
          different when published
        </p>
      </div>
    </section>
  );
}

function VersionTwoPreview({
  drafts,
  enabledChannels,
  activeTab,
}: {
  drafts: V2Drafts;
  enabledChannels: EnabledChannels;
  activeTab: V2Tab;
}) {
  if (activeTab === "all") {
    return (
      <section className="preview-panel version-two-preview carousel-preview-panel">
        <MultiChannelPreviewCarousel drafts={drafts} enabledChannels={enabledChannels} />
      </section>
    );
  }

  const previewChannel = activeTab;
  const draft = drafts[previewChannel];
  const channelName = previewChannel[0].toUpperCase() + previewChannel.slice(1);

  return (
    <section className="preview-panel version-two-preview dedicated-channel-preview">
      <div className="editing-channel-tag"><span>Editing {channelName}</span></div>
      <div className="preview-content">
        {enabledChannels[previewChannel] ? (
          <PlatformPreviewCard
            channel={previewChannel}
            message={draft.message}
            cta={draft.cta}
            hashtags={draft.hashtags}
            images={draft.images}
            externalLink={draft.externalLink}
            googleLinkDestination={draft.googleLinkDestination}
            googleButtonEnabled={draft.googleButtonEnabled}
            googleButtonAction={draft.googleButtonAction}
          />
        ) : (
          <div className="no-channel-preview">No channels selected for this post.</div>
        )}
        <p className="preview-disclaimer">
          Social networks regularly make updates to formatting so your post may appear slightly
          different when published
        </p>
      </div>
    </section>
  );
}

function VersionTwoEditScreen({
  drafts,
  setDrafts,
  enabledChannels,
  onCancel,
  onSave,
  separateHashtags,
  separateCta,
  channelSpecificOnly = false,
  flattenedSocialMessage = false,
}: {
  drafts: V2Drafts;
  setDrafts: (drafts: V2Drafts) => void;
  enabledChannels: EnabledChannels;
  onCancel: () => void;
  onSave?: (activeTab: V2Tab) => void;
  separateHashtags?: boolean;
  separateCta?: boolean;
  channelSpecificOnly?: boolean;
  flattenedSocialMessage?: boolean;
}) {
  const firstEnabledChannel = PREVIEW_CHANNEL_ORDER.find((channel) => enabledChannels[channel]) ?? "google";
  const [activeTab, setActiveTab] = useState<V2Tab>(
    channelSpecificOnly ? firstEnabledChannel : "all",
  );

  useEffect(() => {
    if (channelSpecificOnly && activeTab === "all") {
      setActiveTab(firstEnabledChannel);
      return;
    }
    if (activeTab !== "all" && !enabledChannels[activeTab]) {
      setActiveTab(channelSpecificOnly ? firstEnabledChannel : "all");
    }
  }, [activeTab, channelSpecificOnly, enabledChannels, firstEnabledChannel]);

  const selectEditorTab = (tab: V2Tab) => {
    setActiveTab(tab);
  };

  return (
    <main className={`app-content${separateCta ? " v4-social-edit-screen" : ""}`}>
      <VersionTwoEditorPanel
        activeTab={activeTab}
        setActiveTab={selectEditorTab}
        drafts={drafts}
        setDrafts={setDrafts}
        enabledChannels={enabledChannels}
        onCancel={onCancel}
        onSave={onSave}
        separateHashtags={separateHashtags}
        separateCta={separateCta}
        versionFourGoogleButton={separateCta}
        showAllTab={!channelSpecificOnly}
        flattenedSocialMessage={flattenedSocialMessage}
      />
      <VersionTwoPreview
        drafts={drafts}
        enabledChannels={enabledChannels}
        activeTab={activeTab}
      />
    </main>
  );
}

function ReviewScreen({
  message,
  images,
  enabledChannels,
  onToggleChannel,
  onEdit,
  onBack,
  onSchedule,
  carouselDrafts,
}: {
  message: string;
  images: GalleryImage[];
  enabledChannels: EnabledChannels;
  onToggleChannel: (channel: PreviewChannel) => void;
  onEdit: () => void;
  onBack: () => void;
  onSchedule: () => void;
  carouselDrafts?: V2Drafts;
}) {
  return (
    <main className="app-content review-layout">
      <section className="review-panel">
        <div className="review-scroll">
          <h1>Review Social Posts</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {"{content type}"}</strong>
            <ChevronDown size={19} />
          </div>

          <div className="review-fields">
            <section className="review-field">
              <header>
                <h2>Content</h2>
                <button type="button" onClick={onEdit}>Edit</button>
              </header>
              <p className="review-summary">{message.replace(/\n+/g, " ")}</p>
              <small>AI-generated content may contain errors. Please verify important information.</small>
            </section>

            <section className="review-field">
              <header>
                <h2>Schedule Post</h2>
                <button type="button">Edit</button>
              </header>
              <p>Jan 01, 2026 9:00AM</p>
            </section>

            <section className="review-field post-to-field">
              <header><h2>Post to</h2></header>
              <div className="social-connection">
                <span><strong className="google-g">G</strong> Google: Beegreen Landscaping</span>
                <button
                  className={`connection-toggle ${enabledChannels.google ? "on" : "off"}`}
                  type="button"
                  role="switch"
                  aria-checked={enabledChannels.google}
                  aria-label={`${enabledChannels.google ? "Disable" : "Enable"} Google`}
                  onClick={() => onToggleChannel("google")}
                >
                  {enabledChannels.google ? <Check size={14} /> : <X size={14} />}<i />
                </button>
              </div>
              <div className="social-connection">
                <span><strong className="brand-facebook">f</strong> Facebook: Beegreen Landscaping (profile 1)</span>
                <button
                  className={`connection-toggle ${enabledChannels.facebook ? "on" : "off"}`}
                  type="button"
                  role="switch"
                  aria-checked={enabledChannels.facebook}
                  aria-label={`${enabledChannels.facebook ? "Disable" : "Enable"} Facebook`}
                  onClick={() => onToggleChannel("facebook")}
                >
                  {enabledChannels.facebook ? <Check size={14} /> : <X size={14} />}<i />
                </button>
              </div>
              <div className="social-connection">
                <span><strong className="brand-instagram">◎</strong> Instagram: Beegreen Landscaping</span>
                <button
                  className={`connection-toggle ${enabledChannels.instagram ? "on" : "off"}`}
                  type="button"
                  role="switch"
                  aria-checked={enabledChannels.instagram}
                  aria-label={`${enabledChannels.instagram ? "Disable" : "Enable"} Instagram`}
                  onClick={() => onToggleChannel("instagram")}
                >
                  {enabledChannels.instagram ? <Check size={14} /> : <X size={14} />}<i />
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer className="review-footer">
          <div>
            <button className="secondary-button" type="button" onClick={onBack}>Back</button>
            <button className="delete-post" type="button">Delete Post</button>
          </div>
          <button className="schedule-split" type="button" onClick={onSchedule}>
            <span>Schedule {"{date}"}</span>
            <ChevronDown size={20} />
          </button>
        </footer>
      </section>
      {carouselDrafts ? (
        <section className="preview-panel carousel-preview-panel review-carousel-preview">
          <MultiChannelPreviewCarousel
            drafts={carouselDrafts}
            enabledChannels={enabledChannels}
          />
        </section>
      ) : (
        <PreviewPanel
          message={message}
          images={images}
          enabledChannels={enabledChannels}
        />
      )}
    </main>
  );
}

function SuggestedGoogleEditor({
  drafts,
  setDrafts,
  onCancel,
  onSave,
}: {
  drafts: V2Drafts;
  setDrafts: (drafts: V2Drafts) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const allChannelsEnabled: EnabledChannels = {
    google: true,
    facebook: true,
    instagram: true,
  };

  return (
    <main className="app-content suggested-google-editor">
      <VersionTwoEditorPanel
        activeTab="google"
        setActiveTab={() => undefined}
        drafts={drafts}
        setDrafts={setDrafts}
        enabledChannels={allChannelsEnabled}
        onCancel={onCancel}
        onSave={onSave}
        focusedChannel="google"
        separateHashtags
        versionFourGoogleButton
      />
      <VersionTwoPreview
        drafts={drafts}
        enabledChannels={allChannelsEnabled}
        activeTab="google"
      />
    </main>
  );
}

function SuggestedTextEditor({
  channel,
  draft,
  images,
  campaignTitle,
  setDraft,
  onCancel,
  onSave,
}: {
  channel: "email" | "website";
  draft: SuggestedTextDraft;
  images: GalleryImage[];
  campaignTitle?: string;
  setDraft: (draft: SuggestedTextDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isEmail = channel === "email";
  const channelLabel = isEmail ? "Email Campaign" : "Website Page";

  return (
    <main className="app-content suggested-text-editor">
      <section className="editor-panel">
        <div className="editor-scroll">
          <h1>Edit {channelLabel}</h1>
          <div className="about-content-row">
            {isEmail ? <Mail size={21} /> : <WebsiteChannelIcon width={21} height={21} />}
            <strong>{isEmail ? "Email campaign details" : "Website page details"}</strong>
          </div>
          <div className="suggested-editor-context">
            {isEmail ? (
              <>
                <p><strong>From:</strong> Beegreen Landscaping &lt;hello@beegreenlandscaping.ca&gt;</p>
                <p><strong>Recipients:</strong> All clients · 394 subscribed</p>
              </>
            ) : (
              <p><strong>Publish to:</strong> {INITIAL_EXTERNAL_LINK}</p>
            )}
          </div>
          <div className="field-block">
            <label htmlFor={`suggested-${channel}-title`}>
              {isEmail ? "Email subject" : "Page title"}
            </label>
            <input
              id={`suggested-${channel}-title`}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className="field-block">
            <label htmlFor={`suggested-${channel}-body`}>
              {isEmail ? "Message body" : "Project summary"}
            </label>
            <AutoSizeTextarea
              id={`suggested-${channel}-body`}
              maxLength={1500}
              value={draft.message}
              onChange={(message) => setDraft({ ...draft, message })}
            />
            <span className="character-count">{draft.message.length}/1500 characters</span>
          </div>
        </div>
        <footer className="editor-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" onClick={onSave}>Save Edit</button>
        </footer>
      </section>
      <section className="preview-panel suggested-text-preview">
        <div className="preview-content">
          {isEmail ? (
            <EmailCampaignPreview
              images={images}
              message={draft.message}
              subject={draft.title}
              campaignTitle={campaignTitle}
            />
          ) : (
            <WebsitePagePreview images={images} message={draft.message} title={draft.title} />
          )}
        </div>
      </section>
    </main>
  );
}

type DaisyVersionState = {
  drafts: V2Drafts;
  fridayEditDrafts: V2Drafts | null;
  emailMessage: string;
  emailSubject: string;
  websiteMessage: string;
  websiteTitle: string;
  channelDeliveries: V4ChannelDeliveries;
  calendarDeliveries: V4ChannelDeliveries;
  googleDemoState: GoogleContextDemoState;
  suggestedCompletion: SuggestedCompletion | null;
};

const createInitialDaisyVersionState = (): DaisyVersionState => ({
  drafts: createInitialV4Drafts(),
  fridayEditDrafts: null,
  emailMessage: INITIAL_EMAIL_MESSAGE,
  emailSubject: INITIAL_EMAIL_SUBJECT,
  websiteMessage: INITIAL_WEBSITE_MESSAGE,
  websiteTitle: INITIAL_WEBSITE_TITLE,
  channelDeliveries: createInitialV4ChannelDeliveries(),
  calendarDeliveries: createInitialV4ChannelDeliveries(),
  googleDemoState: "suggested",
  suggestedCompletion: null,
});

const createInitialDaisyVersionStates = (): Record<DaisyPrototypeVersion, DaisyVersionState> => ({
  v4: createInitialDaisyVersionState(),
  v5: createInitialDaisyVersionState(),
});

type GeneratedV4State = {
  campaignId: number | null;
  drafts: V2Drafts;
  emailMessage: string;
  emailSubject: string;
  channelDeliveries: V4ChannelDeliveries;
  googleDemoState: GoogleContextDemoState;
  loadedPreviewChannels: ContextualChannel[];
};

type GeneratedV4CalendarDeliveries =
  Partial<Record<ContextualChannel, V4ChannelDelivery>>;

type AdHocShowcaseState = {
  id: string;
  jobId: AdHocJobId;
  title: string;
  channels: ContextualChannel[];
  drafts: V2Drafts;
  emailMessage: string;
  emailSubject: string;
  websiteMessage: string;
  websiteTitle: string;
  deliveries: V4ChannelDeliveries;
  googleDemoState: GoogleContextDemoState;
};

type PendingAdHocShowcase = {
  id: string;
  jobId: AdHocJobId;
  channels: ContextualChannel[];
};

type AdHocContextState = {
  showcaseId: string;
  startIndex: number;
  returnToSummary: boolean;
};

const createAdHocShowcase = ({
  id,
  jobId,
  channels,
}: PendingAdHocShowcase): AdHocShowcaseState => {
  const selected = new Set(channels);
  const deliveries = createInitialV4ChannelDeliveries();
  CONTEXTUAL_CHANNELS.forEach(({ id: channel }) => {
    deliveries[channel] = {
      ...deliveries[channel],
      deleted: !selected.has(channel),
    };
  });
  return {
    id,
    jobId,
    title: "Seasonal Property Clean Up in Hamilton",
    channels: [...channels],
    drafts: createInitialV4Drafts(),
    emailMessage: INITIAL_EMAIL_MESSAGE,
    emailSubject: INITIAL_EMAIL_SUBJECT,
    websiteMessage: INITIAL_WEBSITE_MESSAGE,
    websiteTitle: INITIAL_WEBSITE_TITLE,
    deliveries,
    googleDemoState: "suggested",
  };
};

const createInitialGeneratedV4State = (): GeneratedV4State => ({
  campaignId: null,
  drafts: createGeneratedV4Drafts(),
  emailMessage: GENERATED_V4_EMAIL_MESSAGE,
  emailSubject: GENERATED_V4_EMAIL_SUBJECT,
  channelDeliveries: createGeneratedV4ChannelDeliveries(),
  googleDemoState: "suggested",
  loadedPreviewChannels: [],
});

export default function App() {
  const [message, setMessage] = useState(INITIAL_V1_MESSAGE);
  const [images, setImages] = useState(INITIAL_IMAGES);
  const [version, setVersion] = useState<PrototypeVersion>(LOCKED_PROTOTYPE_VERSION ?? "v1");
  const [v4NavigationStyle, setV4NavigationStyle] =
    useState<V4NavigationStyle>(prototypeEnv.navigationStyle);
  const [v4EntrySurface, setV4EntrySurface] =
    useState<V4EntrySurface>(prototypeEnv.entrySurface);
  const [v4GeneratedFlowOrigin, setV4GeneratedFlowOrigin] =
    useState<V4GeneratedFlowOrigin>(prototypeEnv.entrySurface);
  const [v4DashboardPrompt, setV4DashboardPrompt] = useState("");
  const [v4DashboardDraftChannels, setV4DashboardDraftChannels] =
    useState<ContextualChannel[]>(() => [...GENERATED_V4_CHANNELS]);
  const [v4CalendarDraftChannels, setV4CalendarDraftChannels] =
    useState<ContextualChannel[]>(() => [...GENERATED_V4_CHANNELS]);
  const [v2Drafts, setV2Drafts] = useState<V2Drafts>(createInitialV2Drafts);
  const [v3Drafts, setV3Drafts] = useState<V2Drafts>(createInitialV2Drafts);
  const [daisyVersionStates, setDaisyVersionStates] = useState(createInitialDaisyVersionStates);
  const [generatedV4State, setGeneratedV4State] = useState(createInitialGeneratedV4State);
  const [generatedV4CalendarDeliveries, setGeneratedV4CalendarDeliveries] =
    useState<GeneratedV4CalendarDeliveries>({});
  const [generatedV4Phase, setGeneratedV4Phase] = useState<GeneratedV4Phase>("idle");
  const [generatedV4ExitTarget, setGeneratedV4ExitTarget] =
    useState<V4EntrySurface | null>(null);
  const [generatedV4ExitVersionTarget, setGeneratedV4ExitVersionTarget] =
    useState<PrototypeVersion | null>(null);
  const generatedV4CampaignSequenceRef = useRef(0);
  const generatedV4ExitPendingRef = useRef(false);
  const generatedV4ExitActionRef = useRef(false);
  const [adHocShowcases, setAdHocShowcases] = useState<AdHocShowcaseState[]>([]);
  const [adHocCreationStep, setAdHocCreationStep] =
    useState<AdHocCreationStep | null>(null);
  const [adHocSelectedJob, setAdHocSelectedJob] =
    useState<AdHocJobId>("property-cleanup");
  const [adHocSelectedChannels, setAdHocSelectedChannels] =
    useState<ContextualChannel[]>([]);
  const [pendingAdHocShowcase, setPendingAdHocShowcase] =
    useState<PendingAdHocShowcase | null>(null);
  const [adHocGenerating, setAdHocGenerating] = useState(false);
  const [adHocLoadingStage, setAdHocLoadingStage] = useState(0);
  const [adHocSummaryId, setAdHocSummaryId] = useState<string | null>(null);
  const [adHocContext, setAdHocContext] = useState<AdHocContextState | null>(null);
  const [adHocActiveContextChannel, setAdHocActiveContextChannel] =
    useState<ContextualChannel | null>(null);
  const adHocTimerRef = useRef<number | null>(null);
  const adHocIdRef = useRef(0);
  const activeDaisyVersion: DaisyPrototypeVersion = version === "v5" ? "v5" : "v4";
  const activeDaisyState = daisyVersionStates[activeDaisyVersion];
  const updateActiveDaisyState = (update: Partial<DaisyVersionState>) => {
    setDaisyVersionStates((current) => ({
      ...current,
      [activeDaisyVersion]: { ...current[activeDaisyVersion], ...update },
    }));
  };
  const v4Drafts = activeDaisyState.drafts;
  const setV4Drafts = (next: V2Drafts | ((current: V2Drafts) => V2Drafts)) => {
    const current = daisyVersionStates[activeDaisyVersion].drafts;
    updateActiveDaisyState({ drafts: typeof next === "function" ? next(current) : next });
  };
  const v4FridayEditDrafts = activeDaisyState.fridayEditDrafts;
  const setV4FridayEditDrafts = (next: V2Drafts | null) => {
    updateActiveDaisyState({ fridayEditDrafts: next });
  };
  const [enabledChannels, setEnabledChannels] = useState<EnabledChannels>({
    google: true,
    facebook: true,
    instagram: true,
  });
  const [scheduledChannels, setScheduledChannels] = useState<Record<SchedulableVersion, EnabledChannels | null>>({
    v1: null,
    v2: null,
    v3: null,
    v4: null,
    v5: null,
  });
  const [calendarStatuses, setCalendarStatuses] = useState<CalendarStatusMap>(
    createInitialCalendarStatuses,
  );
  const [screen, setScreen] = useState<"calendar" | "review" | "edit">("calendar");
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [v4TaskModalOpen, setV4TaskModalOpen] = useState(false);
  const [v4RemainingTaskIds, setV4RemainingTaskIds] = useState<V4CalendarTaskId[]>(
    () => [...V4_CALENDAR_TASK_IDS],
  );
  const v4TaskButtonRef = useRef<HTMLButtonElement>(null);
  const v4TaskCalendarRef = useRef<HTMLHeadingElement>(null);
  const [v3CombinedModalOpen, setV3CombinedModalOpen] = useState(false);
  const [v3ContextPreviewChannel, setV3ContextPreviewChannel] = useState<PreviewChannel>("google");
  const [v3ReviewOrigin, setV3ReviewOrigin] = useState<"friday" | "saturday" | null>(null);
  const [combinedWorkflow, setCombinedWorkflow] = useState<"modal" | "review" | "edit" | null>(null);
  const [combinedModalStartIndex, setCombinedModalStartIndex] = useState(0);
  const [v4ReviewOrigin, setV4ReviewOrigin] =
    useState<"saturday" | "suggested-content" | "generated-calendar" | null>(null);
  const [v4CardSummaryOpen, setV4CardSummaryOpen] = useState(false);
  const [v4SuggestedSummaryOpen, setV4SuggestedSummaryOpen] = useState(false);
  const [calendarPrompt, setCalendarPrompt] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const [suggestedDialogOpen, setSuggestedDialogOpen] = useState(false);
  const [suggestedPreviewIndex, setSuggestedPreviewIndex] = useState(0);
  const [v4Generating, setV4Generating] = useState(false);
  const [v4LoadingStage, setV4LoadingStage] = useState(0);
  const suggestionTimerRef = useRef<number | null>(null);
  const preserveCalendarPromptRef = useRef(false);
  const [suggestedReviewChannel, setSuggestedReviewChannel] = useState<ContextualChannel | null>(null);
  const [suggestedEditor, setSuggestedEditor] = useState<ContextualChannel | null>(null);
  const [suggestedGoogleDrafts, setSuggestedGoogleDrafts] = useState<V2Drafts | null>(null);
  const [suggestedTextDraft, setSuggestedTextDraft] = useState<SuggestedTextDraft | null>(null);
  const suggestedCompletion = activeDaisyState.suggestedCompletion;
  const setSuggestedCompletion = (next: SuggestedCompletion | null) => {
    updateActiveDaisyState({ suggestedCompletion: next });
  };
  const [socialWorkflowChannel, setSocialWorkflowChannel] = useState<ContextualChannel>("facebook");
  const [socialEditDraft, setSocialEditDraft] = useState<ChannelDraft | null>(null);
  const v4EmailMessage = activeDaisyState.emailMessage;
  const setV4EmailMessage = (emailMessage: string) => updateActiveDaisyState({ emailMessage });
  const v4EmailSubject = activeDaisyState.emailSubject;
  const setV4EmailSubject = (emailSubject: string) => updateActiveDaisyState({ emailSubject });
  const v4WebsiteMessage = activeDaisyState.websiteMessage;
  const setV4WebsiteMessage = (websiteMessage: string) => updateActiveDaisyState({ websiteMessage });
  const v4WebsiteTitle = activeDaisyState.websiteTitle;
  const setV4WebsiteTitle = (websiteTitle: string) => updateActiveDaisyState({ websiteTitle });
  const v4ChannelDeliveries = activeDaisyState.channelDeliveries;
  const setV4ChannelDeliveries = (channelDeliveries: V4ChannelDeliveries) => {
    updateActiveDaisyState({ channelDeliveries });
  };
  const v4CalendarDeliveries = version === "v4"
    ? activeDaisyState.calendarDeliveries
    : v4ChannelDeliveries;
  const setV4CalendarDeliveries = (calendarDeliveries: V4ChannelDeliveries) => {
    updateActiveDaisyState({ calendarDeliveries });
  };
  const googleContextDemoState = activeDaisyState.googleDemoState;
  const setGoogleContextDemoState = (googleDemoState: GoogleContextDemoState) => {
    updateActiveDaisyState({ googleDemoState });
  };
  const setGeneratedV4Drafts = (next: V2Drafts | ((current: V2Drafts) => V2Drafts)) => {
    setGeneratedV4State((current) => ({
      ...current,
      drafts: typeof next === "function" ? next(current.drafts) : next,
    }));
  };
  const setGeneratedV4EmailMessage = (emailMessage: string) => {
    setGeneratedV4State((current) => ({ ...current, emailMessage }));
  };
  const setGeneratedV4EmailSubject = (emailSubject: string) => {
    setGeneratedV4State((current) => ({ ...current, emailSubject }));
  };
  const [activeV4ContextChannel, setActiveV4ContextChannel] =
    useState<ContextualChannel | null>(null);
  const [activeV4GroupDate, setActiveV4GroupDate] = useState<string | null>(null);
  const [activeV4CampaignSource, setActiveV4CampaignSource] =
    useState<V4CampaignSource | null>(null);
  const [preferredV4EntryChannel, setPreferredV4EntryChannel] =
    useState<ContextualChannel | null>(null);
  const [v4ReviewScopedChannels, setV4ReviewScopedChannels] =
    useState<ContextualChannel[] | null>(null);
  const [scheduleEditorChannel, setScheduleEditorChannel] = useState<ContextualChannel | null>(null);
  const [reviewDeleteChannel, setReviewDeleteChannel] = useState<ContextualChannel | null>(null);
  const [scheduleToastVisible, setScheduleToastVisible] = useState(false);
  const [contextualToast, setContextualToast] = useState<ContextualToast | null>(null);
  const contextualToastIdRef = useRef(0);
  const contextualToastFadeTimerRef = useRef<number | null>(null);
  const contextualToastRemoveTimerRef = useRef<number | null>(null);
  const [v4TopicCompletion, setV4TopicCompletion] =
    useState<V4TopicCompletionState | null>(null);
  const [saturdayCompletion, setSaturdayCompletion] = useState<
    Record<"v3" | "v4" | "v5", CalendarChannel[] | null>
  >({ v3: null, v4: null, v5: null });
  const [scale, setScale] = useState(1);
  const frameHeight = 1024;
  const totalHeight = frameHeight + (prototypeEnv.researchMode ? 0 : 60);
  const isDaisyVersion = version === "v4" || version === "v5";
  const v4SidebarFree = isDaisyVersion && (
    suggestedEditor !== null
    || suggestedReviewChannel !== null
    ||
    combinedWorkflow === "review"
    || combinedWorkflow === "edit"
    || (combinedWorkflow === null && screen !== "calendar")
  );
  const multiChannelDrafts = version === "v2"
    ? v2Drafts
    : version === "v3"
      ? v3Drafts
      : v4Drafts;
  const calendarPreviews: Record<PreviewChannel, ChannelDraft> = version === "v1"
    ? {
        google: { message, images },
        facebook: { message, images },
        instagram: { message, images },
      }
    : {
        google: multiChannelDrafts.google,
        facebook: multiChannelDrafts.facebook,
        instagram: multiChannelDrafts.instagram,
      };
  const currentSaturdayCompletion = version === "v3" ? saturdayCompletion.v3 : null;
  const availableV4Channels = CONTEXTUAL_CHANNELS
    .filter(({ id }) => !v4ChannelDeliveries[id].deleted)
    .map(({ id }) => id);
  const availableGeneratedV4Channels = GENERATED_V4_CHANNELS
    .filter((channel) => !generatedV4State.channelDeliveries[channel].deleted);
  const scopedV4Channels = activeV4GroupDate
    ? availableV4Channels.filter(
        (channel) => v4CalendarDeliveries[channel].date === activeV4GroupDate,
      )
    : availableV4Channels;
  const reviewScopedV4Channels = (
    version === "v4"
      ? availableV4Channels
      : (v4ReviewScopedChannels ?? scopedV4Channels)
  ).filter((channel) => !v4ChannelDeliveries[channel].deleted);
  const v4ContentStatuses = Object.fromEntries(CONTEXTUAL_CHANNELS.map(({ id }) => [
    id,
    contextualContentStatus(id, v4ChannelDeliveries, googleContextDemoState),
  ])) as Partial<Record<ContextualChannel, ChannelContentStatus>>;
  const v4AdHocCampaignChannels: AdHocCampaignChannel[] = CONTEXTUAL_CHANNELS
    .filter(({ id }) => availableV4Channels.includes(id))
    .map(({ id, label }) => {
      const status = versionFourSummaryStatus(v4ContentStatuses[id] ?? "suggested");
      const presentation = V4_SUMMARY_STATUS_PRESENTATION[status];
      const adHocPresentation = status === "suggested"
        ? { label: "Draft", tone: "neutral" as const }
        : presentation;
      return {
        id,
        label,
        status: {
          value: status,
          label: adHocPresentation.label,
          tone: adHocPresentation.tone,
        },
      };
    });
  const adHocCreatedCampaigns: AdHocCreatedCampaign[] = adHocShowcases.flatMap(
    (showcase) => {
      const channels = CONTEXTUAL_CHANNELS
        .filter(({ id }) => (
          showcase.channels.includes(id) && !showcase.deliveries[id].deleted
        ))
        .map(({ id, label }) => {
          const status = versionFourSummaryStatus(contextualContentStatus(
            id,
            showcase.deliveries,
            showcase.googleDemoState,
          ));
          const presentation = V4_SUMMARY_STATUS_PRESENTATION[status];
          const adHocPresentation = status === "suggested"
            ? { label: "Draft", tone: "neutral" as const }
            : presentation;
          return {
            id,
            label,
            status: {
              value: status,
              label: adHocPresentation.label,
              tone: adHocPresentation.tone,
            },
          };
        });
      return channels.length > 0
        ? [{ id: showcase.id, title: showcase.title, channels }]
        : [];
    },
  );
  const activeAdHocSummary = adHocSummaryId
    ? adHocShowcases.find(({ id }) => id === adHocSummaryId) ?? null
    : null;
  const activeAdHocContext = adHocContext
    ? adHocShowcases.find(({ id }) => id === adHocContext.showcaseId) ?? null
    : null;
  const activeAdHocSummaryChannels = activeAdHocSummary
    ? activeAdHocSummary.channels.filter(
        (channel) => !activeAdHocSummary.deliveries[channel].deleted,
      )
    : [];
  const activeAdHocContextChannels = activeAdHocContext
    ? activeAdHocContext.channels.filter(
        (channel) => !activeAdHocContext.deliveries[channel].deleted,
      )
    : [];
  const activeAdHocSummaryStatuses = activeAdHocSummary
    ? Object.fromEntries(activeAdHocSummaryChannels.map((channel) => [
        channel,
        contextualContentStatus(
          channel,
          activeAdHocSummary.deliveries,
          activeAdHocSummary.googleDemoState,
        ),
      ])) as Partial<Record<ContextualChannel, ChannelContentStatus>>
    : {};
  const suggestedContentStatuses = Object.fromEntries(CONTEXTUAL_CHANNELS.map(({ id }) => [
    id,
    calendarStatuses[activeDaisyVersion].suggested?.[CONTEXTUAL_TO_CALENDAR_CHANNEL[id]]
      ?? "suggested",
  ])) as Partial<Record<ContextualChannel, ChannelContentStatus>>;
  const generatedV4ContentStatuses = Object.fromEntries(
    availableGeneratedV4Channels.map((channel) => [
      channel,
      contextualContentStatus(
        channel,
        generatedV4State.channelDeliveries,
        generatedV4State.googleDemoState,
      ),
    ]),
  ) as Partial<Record<ContextualChannel, ChannelContentStatus>>;
  const generatedCalendarV4Deliveries: V4ChannelDeliveries = {
    ...generatedV4State.channelDeliveries,
    ...generatedV4CalendarDeliveries,
  };
  const generatedV4CampaignCards: V4CampaignCalendarCard[] = Array.from(
    new Set(Object.values(generatedV4CalendarDeliveries).map((delivery) => delivery.date)),
  ).sort().map((date) => {
    const channels = GENERATED_V4_CHANNELS.filter((channel) => (
      generatedV4CalendarDeliveries[channel]?.date === date
      && !generatedV4State.channelDeliveries[channel].deleted
    ));
    const channelStates = channels.map((channel) => (
      v4CalendarStatus(generatedV4CalendarDeliveries[channel]!)
    ));
    const status = v4AggregateCalendarItemStatus(channelStates);
    return {
      date,
      source: "generated",
      channels,
      item: {
        title: GENERATED_V4_CAMPAIGN_TITLE,
        channels: channels.map((channel) => CONTEXTUAL_TO_CALENDAR_CHANNEL[channel]),
        status,
        tone: status === "Needs review" ? "review" : undefined,
        generatedSuggestion: true,
        generatedDelivery: true,
        showDate: false,
        campaignDate: date,
        campaignSource: "generated",
        channelStatuses: Object.fromEntries(channels.flatMap((channel) => {
          const calendarStatus = v4CalendarStatus(generatedV4CalendarDeliveries[channel]!);
          return calendarStatus
            ? [[CONTEXTUAL_TO_CALENDAR_CHANNEL[channel], calendarStatus]]
            : [];
        })),
      },
    };
  });
  const v4CampaignCards: V4CampaignCalendarCard[] = Array.from(
    new Set(availableV4Channels.map((channel) => v4CalendarDeliveries[channel].date)),
  ).sort().map((date) => {
    const channels = CONTEXTUAL_CHANNELS
      .map(({ id }) => id)
      .filter((channel) => (
        !v4ChannelDeliveries[channel].deleted
        && v4CalendarDeliveries[channel].date === date
      ));
    const channelStates = channels.map((channel) => (
      channel === "google"
        ? googleDemoCalendarStatus(googleContextDemoState)
        : v4CalendarStatus(v4ChannelDeliveries[channel])
    ));
    const status = v4AggregateCalendarItemStatus(channelStates);
    return {
      date,
      source: "original",
      channels,
      item: {
        title: "Seasonal property cleanup in Hamilton",
        channels: channels.map((channel) => CONTEXTUAL_TO_CALENDAR_CHANNEL[channel]),
        status,
        tone: status === "Needs review" ? "review" : undefined,
        combinedTarget: true,
        campaignDate: date,
        campaignSource: "original",
        showDate: false,
        channelStatuses: Object.fromEntries(channels.flatMap((channel) => {
          const calendarStatus = channel === "google"
            ? googleDemoCalendarStatus(googleContextDemoState)
            : v4CalendarStatus(v4ChannelDeliveries[channel]);
          return calendarStatus
            ? [[CONTEXTUAL_TO_CALENDAR_CHANNEL[channel], calendarStatus]]
            : [];
        })),
      },
    };
  });
  const activeCalendarV4Channels = version === "v4"
    ? activeV4CampaignSource === "generated"
      ? availableGeneratedV4Channels
      : availableV4Channels
    : scopedV4Channels;
  const activeCalendarV4ContentStatuses = activeV4CampaignSource === "generated"
    ? generatedV4ContentStatuses
    : v4ContentStatuses;
  const activeV4CampaignDeliveries = activeV4CampaignSource === "generated"
    ? generatedV4State.channelDeliveries
    : v4ChannelDeliveries;
  const activeV4CampaignScheduleText = v4CampaignScheduleText(
    activeCalendarV4Channels,
    activeV4CampaignDeliveries,
  );
  const activeV4CampaignTitle = activeV4CampaignSource === "generated"
    ? GENERATED_V4_CAMPAIGN_TITLE
    : "Seasonal property cleanup in Hamilton";
  const hasPersistedGeneratedV4Campaign =
    Object.keys(generatedV4CalendarDeliveries).length > 0;
  const originalV4CompletionChannels = CONTEXTUAL_CHANNELS.map(({ id }) => id);
  const generatedV4CompletionChannels = GENERATED_V4_CHANNELS;
  const v4CompletionProgress = {
    delivered: availableV4Channels.filter((channel) => (
      isV4DeliveredChannel(
        channel,
        v4ChannelDeliveries[channel],
        googleContextDemoState,
      )
    )).length + (hasPersistedGeneratedV4Campaign
      ? availableGeneratedV4Channels.filter((channel) => (
          isV4DeliveredChannel(
            channel,
            generatedV4State.channelDeliveries[channel],
            generatedV4State.googleDemoState,
          )
        )).length
      : 0),
    total: V4_STATIC_CALENDAR_CHANNEL_COUNT
      + availableV4Channels.length
      + (hasPersistedGeneratedV4Campaign ? availableGeneratedV4Channels.length : 0),
  };
  const v4ReviewableTopics = [
    {
      source: "original" as const,
      title: "Seasonal property cleanup in Hamilton",
      channels: originalV4CompletionChannels,
      deliveries: v4ChannelDeliveries,
      googleState: googleContextDemoState,
      date: availableV4Channels
        .map((channel) => v4CalendarDeliveries[channel].date)
        .sort()[0] ?? V4_INITIAL_DATE,
    },
    ...(hasPersistedGeneratedV4Campaign
      ? [{
          source: "generated" as const,
          title: GENERATED_V4_CAMPAIGN_TITLE,
          channels: generatedV4CompletionChannels,
          deliveries: generatedV4State.channelDeliveries,
          googleState: generatedV4State.googleDemoState,
          date: availableGeneratedV4Channels
            .map((channel) => (
              generatedV4CalendarDeliveries[channel]?.date
              ?? generatedV4State.channelDeliveries[channel].date
            ))
            .sort()[0] ?? V4_INITIAL_DATE,
        }]
      : []),
  ];
  const nextV4IncompleteTopic = v4TopicCompletion
    ? v4ReviewableTopics
      .filter((topic) => (
        topic.source !== v4TopicCompletion.source
        && topic.channels.some((channel) => !topic.deliveries[channel].deleted)
        && !isV4CampaignComplete(
          topic.channels,
          topic.deliveries,
          topic.googleState,
        )
      ))
      .sort((left, right) => left.date.localeCompare(right.date))[0] ?? null
    : null;
  const nextV4IncompleteChannel = nextV4IncompleteTopic?.channels.find((channel) => (
    !nextV4IncompleteTopic.deliveries[channel].deleted
    && !isV4DeliveredChannel(
      channel,
      nextV4IncompleteTopic.deliveries[channel],
      nextV4IncompleteTopic.googleState,
    )
  )) ?? null;
  const isV4GeneratedEditor = version === "v4"
    && (v4ReviewOrigin === "suggested-content" || v4ReviewOrigin === "generated-calendar");
  const isReopenedGeneratedV4Editor = v4ReviewOrigin === "generated-calendar";
  const suggestedFlowDrafts = isV4GeneratedEditor ? generatedV4State.drafts : v4Drafts;
  const suggestedFlowEmailMessage = isV4GeneratedEditor
    ? generatedV4State.emailMessage
    : v4EmailMessage;
  const suggestedFlowEmailSubject = isV4GeneratedEditor
    ? generatedV4State.emailSubject
    : v4EmailSubject;
  const suggestedFlowChannels = isV4GeneratedEditor
    ? availableGeneratedV4Channels
    : CONTEXTUAL_CHANNELS.map(({ id }) => id);
  const suggestedFlowContentStatuses = isV4GeneratedEditor
    ? generatedV4ContentStatuses
    : suggestedContentStatuses;
  const showContextualToast = (
    message: string,
    dark = false,
    deliveryMotion = false,
  ) => {
    if (contextualToastFadeTimerRef.current !== null) {
      window.clearTimeout(contextualToastFadeTimerRef.current);
    }
    if (contextualToastRemoveTimerRef.current !== null) {
      window.clearTimeout(contextualToastRemoveTimerRef.current);
    }
    contextualToastIdRef.current += 1;
    const id = contextualToastIdRef.current;
    setScheduleToastVisible(false);
    setContextualToast({
      message,
      dark,
      deliveryMotion,
      id,
    });
    if (deliveryMotion) {
      contextualToastFadeTimerRef.current = window.setTimeout(() => {
        setContextualToast((current) => (
          current?.id === id ? { ...current, fading: true } : current
        ));
      }, 1960);
      contextualToastRemoveTimerRef.current = window.setTimeout(() => {
        setContextualToast((current) => current?.id === id ? null : current);
      }, 2200);
      return;
    }
    contextualToastRemoveTimerRef.current = window.setTimeout(() => {
      setContextualToast((current) => current?.id === id ? null : current);
    }, 4000);
  };
  const openV4TopicCompletionIfNeeded = (_context: {
    source: V4CampaignSource;
    channel: ContextualChannel;
    action: V4TopicCompletionAction;
    previousDeliveries: V4ChannelDeliveries;
    nextDeliveries: V4ChannelDeliveries;
    previousGoogleState: GoogleContextDemoState;
    nextGoogleState: GoogleContextDemoState;
  }) => false;
  const deleteV4Campaign = (target: V4CampaignDeleteTarget) => {
    if (target.kind === "calendar" && target.source === "original") {
      const deletedDeliveries = markV4CampaignDeleted(v4ChannelDeliveries);
      setV4ChannelDeliveries(deletedDeliveries);
      setV4CalendarDeliveries(deletedDeliveries);
      setGoogleContextDemoState("suggested");
      setCalendarStatuses((current) => ({
        ...current,
        v4: {
          ...current.v4,
          "saturday-campaign": {},
        },
      }));
    } else if (target.kind === "calendar" && target.source === "generated") {
      setGeneratedV4State((current) => ({
        ...current,
        channelDeliveries: markV4CampaignDeleted(current.channelDeliveries),
        googleDemoState: "suggested",
        loadedPreviewChannels: [],
      }));
      setGeneratedV4CalendarDeliveries({});
      setCalendarStatuses((current) => ({
        ...current,
        v4: {
          ...current.v4,
          suggested: {},
        },
      }));
    } else if (target.kind === "adhoc-created") {
      setAdHocShowcases((current) => current.filter(
        ({ id }) => id !== target.showcaseId,
      ));
    }

    setV4CardSummaryOpen(false);
    setAdHocSummaryId(null);
    setAdHocContext(null);
    setAdHocActiveContextChannel(null);
    setCombinedWorkflow(null);
    setCombinedModalStartIndex(0);
    setV4ReviewOrigin(null);
    setActiveV4ContextChannel(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setScheduleEditorChannel(null);
    setReviewDeleteChannel(null);
    setSuggestedReviewChannel(null);
    setSuggestedEditor(null);
    setSuggestedGoogleDrafts(null);
    setSuggestedTextDraft(null);
    setSocialEditDraft(null);
    setV4TaskModalOpen(false);
    setV4TopicCompletion(null);
    setScreen("calendar");
    setV4EntrySurface("calendar");
    showContextualToast("Your campaign has been successfully deleted.", true);
  };
  const setCalendarChannelStatus = (
    targetVersion: PrototypeVersion,
    card: CalendarCardStatusKey,
    channel: CalendarChannel,
    status: CalendarChannelStatus | null,
  ) => {
    setCalendarStatuses((current) => {
      const nextCard = { ...current[targetVersion][card] };
      if (status === null) delete nextCard[channel];
      else nextCard[channel] = status;
      return {
        ...current,
        [targetVersion]: {
          ...current[targetVersion],
          [card]: nextCard,
        },
      };
    });
  };
  const setCalendarChannelStatuses = (
    targetVersion: PrototypeVersion,
    card: CalendarCardStatusKey,
    channels: CalendarChannel[],
    status: CalendarChannelStatus,
  ) => {
    setCalendarStatuses((current) => ({
      ...current,
      [targetVersion]: {
        ...current[targetVersion],
        [card]: {
          ...current[targetVersion][card],
          ...Object.fromEntries(channels.map((channel) => [channel, status])),
        },
      },
    }));
  };
  const returnToV4ContextAfter = (
    channel: ContextualChannel,
    originDate: string,
    deliveries: V4ChannelDeliveries,
  ) => {
    if (version === "v4") {
      const campaignOrder = CONTEXTUAL_CHANNELS.map(({ id }) => id);
      const campaignChannels = campaignOrder.filter(
        (candidate) => !deliveries[candidate].deleted,
      );
      const nextChannel = nextScopedReviewChannel(
        channel,
        campaignOrder,
        deliveries,
        campaignChannels,
      );
      if (!nextChannel) {
        setCombinedWorkflow(null);
        setV4ReviewOrigin(null);
        setActiveV4GroupDate(null);
        setActiveV4CampaignSource(null);
        setV4ReviewScopedChannels(null);
        setCombinedModalStartIndex(0);
        return;
      }
      setCombinedModalStartIndex(campaignChannels.indexOf(nextChannel));
      setSocialWorkflowChannel(nextChannel);
      setCombinedWorkflow("modal");
      setV4ReviewOrigin("saturday");
      return;
    }
    const availableChannels = CONTEXTUAL_CHANNELS
      .map(({ id }) => id)
      .filter((candidate) => (
        !deliveries[candidate].deleted
        && deliveries[candidate].date === originDate
      ));
    const nextChannel = nextAvailableChannel(channel, availableChannels, deliveries);
    if (!nextChannel) {
      setCombinedWorkflow(null);
      setV4ReviewOrigin(null);
      setActiveV4GroupDate(null);
      setActiveV4CampaignSource(null);
      return;
    }
    setActiveV4GroupDate(originDate);
    setActiveV4CampaignSource("original");
    setCombinedModalStartIndex(availableChannels.indexOf(nextChannel));
    setSocialWorkflowChannel(nextChannel);
    setCombinedWorkflow("modal");
    setV4ReviewOrigin("saturday");
  };
  const performV4LifecycleAction = (
    channel: ContextualChannel,
    action: V4LifecycleAction,
    returnToContext = false,
    deferCompletion = false,
  ) => {
    const previousGoogleState = googleContextDemoState;
    const nextGoogleState = channel === "google"
      ? action === "schedule"
        ? "scheduled"
        : action === "send"
          ? "sent"
          : "suggested"
      : previousGoogleState;
    if (channel === "google") {
      setGoogleContextDemoState(nextGoogleState);
    }
    const originDate = activeV4GroupDate ?? v4ChannelDeliveries[channel].date;
    const nextState: V4ChannelState = action === "schedule"
      ? "scheduled"
      : action === "send"
        ? "sent"
        : "unscheduled";
    const nextDelivery: V4ChannelDelivery = {
      ...v4ChannelDeliveries[channel],
      lifecycle: nextState,
      date: action === "send" ? V4_TODAY_DATE : v4ChannelDeliveries[channel].date,
      statusOverride: null,
    };
    const nextDeliveries: V4ChannelDeliveries = {
      ...v4ChannelDeliveries,
      [channel]: nextDelivery,
    };
    setV4ChannelDeliveries(nextDeliveries);
    if (version === "v4") {
      setV4CalendarDeliveries({
        ...v4CalendarDeliveries,
        [channel]: nextDelivery,
      });
    }
    const completionOpened = !deferCompletion
      && action !== "cancel"
      && openV4TopicCompletionIfNeeded({
      source: "original",
      channel,
      action,
      previousDeliveries: v4ChannelDeliveries,
      nextDeliveries,
      previousGoogleState,
      nextGoogleState,
      });
    if (action === "schedule" && !completionOpened) {
      showContextualToast(
        version === "v4"
          ? contextualSuccessMessage(channel, "schedule")
          : "Your post is scheduled",
        true,
        deferCompletion,
      );
    }
    if (action === "send" && !completionOpened) {
      showContextualToast(
        contextualSuccessMessage(channel, "post"),
        true,
        deferCompletion,
      );
    }
    if (returnToContext && !completionOpened) {
      returnToV4ContextAfter(channel, originDate, nextDeliveries);
    }
    return nextDeliveries;
  };
  const advanceV4Review = (
    channel: ContextualChannel,
    nextDeliveries: V4ChannelDeliveries,
    _regroupAfterDelivery = false,
  ) => {
    const reviewScope = CONTEXTUAL_CHANNELS.map(({ id }) => id);
    const resultingScope = reviewScope.filter(
      (candidate) => !nextDeliveries[candidate].deleted,
    );
    const nextChannel = nextScopedReviewChannel(
      channel,
      reviewScope,
      nextDeliveries,
      resultingScope,
    );

    if (nextChannel) {
      setSocialWorkflowChannel(nextChannel);
      setCombinedWorkflow("review");
      return;
    }

    setCombinedWorkflow(null);
    setV4ReviewOrigin(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setCombinedModalStartIndex(0);
  };
  const performReviewDeliveryAction = (
    channel: ContextualChannel,
    action: Extract<V4LifecycleAction, "schedule" | "send">,
  ) => {
    if (version === "v5") {
      performV4LifecycleAction(channel, action, true);
      return;
    }

    const nextDeliveries = performV4LifecycleAction(channel, action);
    advanceV4Review(channel, nextDeliveries, true);
  };
  const deleteV4Channel = (channel: ContextualChannel, returnToContext = true) => {
    const previousGoogleState = googleContextDemoState;
    const nextGoogleState = channel === "google" ? "suggested" : previousGoogleState;
    if (channel === "google") setGoogleContextDemoState(nextGoogleState);
    setPreferredV4EntryChannel((preferred) => preferred === channel ? null : preferred);
    const originDate = activeV4GroupDate ?? v4ChannelDeliveries[channel].date;
    const nextDeliveries: V4ChannelDeliveries = {
      ...v4ChannelDeliveries,
      [channel]: {
        ...v4ChannelDeliveries[channel],
        lifecycle: "unscheduled",
        deleted: true,
        statusOverride: null,
      },
    };
    setV4ChannelDeliveries(nextDeliveries);
    if (version === "v4") {
      setV4CalendarDeliveries({
        ...v4CalendarDeliveries,
        [channel]: nextDeliveries[channel],
      });
    }
    setReviewDeleteChannel(null);
    const completionOpened = openV4TopicCompletionIfNeeded({
      source: "original",
      channel,
      action: "delete",
      previousDeliveries: v4ChannelDeliveries,
      nextDeliveries,
      previousGoogleState,
      nextGoogleState,
    });
    if (!completionOpened) showContextualToast(contextualDeletionMessage(channel), true);
    if (returnToContext && !completionOpened) {
      setV4ReviewScopedChannels(null);
      returnToV4ContextAfter(channel, originDate, nextDeliveries);
    }
    return nextDeliveries;
  };
  const deleteV4ReviewChannel = (channel: ContextualChannel) => {
    const nextDeliveries = deleteV4Channel(channel, false);
    advanceV4Review(channel, nextDeliveries, true);
  };
  const acceptGeneratedV4Campaign = (
    requestedChannels: ContextualChannel[] = GENERATED_V4_CHANNELS,
  ) => {
    const fresh = createInitialGeneratedV4State();
    generatedV4CampaignSequenceRef.current += 1;
    const requested = new Set(requestedChannels);
    const protectedChannels = GENERATED_V4_CHANNELS.filter((channel) => {
      const delivery = generatedV4CalendarDeliveries[channel];
      return delivery
        && !generatedV4State.channelDeliveries[channel].deleted
        && (delivery.lifecycle === "scheduled" || delivery.lifecycle === "sent");
    });
    const channelDeliveries = { ...fresh.channelDeliveries };
    protectedChannels.forEach((channel) => {
      channelDeliveries[channel] = { ...generatedV4CalendarDeliveries[channel]! };
      if (channel === "google" || channel === "facebook" || channel === "instagram") {
        fresh.drafts[channel] = {
          ...generatedV4State.drafts[channel],
          images: [...generatedV4State.drafts[channel].images],
        };
      } else if (channel === "email") {
        fresh.emailMessage = generatedV4State.emailMessage;
        fresh.emailSubject = generatedV4State.emailSubject;
      }
    });
    GENERATED_V4_CHANNELS.forEach((channel) => {
      if (!requested.has(channel) && !protectedChannels.includes(channel)) {
        channelDeliveries[channel] = {
          ...channelDeliveries[channel],
          deleted: true,
        };
      }
    });
    const nextState: GeneratedV4State = {
      ...fresh,
      campaignId: generatedV4CampaignSequenceRef.current,
      channelDeliveries,
      googleDemoState: channelDeliveries.google.lifecycle === "scheduled"
        ? "scheduled"
        : channelDeliveries.google.lifecycle === "sent"
          ? "sent"
          : "suggested",
    };
    const acceptedChannels = GENERATED_V4_CHANNELS.filter(
      (channel) => requested.has(channel) || protectedChannels.includes(channel),
    );
    const acceptedDeliveries = Object.fromEntries(
      acceptedChannels.map((channel) => [
        channel,
        { ...nextState.channelDeliveries[channel] },
      ]),
    ) as GeneratedV4CalendarDeliveries;
    setGeneratedV4State(nextState);
    setGeneratedV4CalendarDeliveries(acceptedDeliveries);
    setGeneratedV4Phase("draft-review");
    return acceptedDeliveries;
  };
  const markGeneratedV4PreviewLoaded = (channel: ContextualChannel) => {
    setGeneratedV4State((current) => current.loadedPreviewChannels.includes(channel)
      ? current
      : {
          ...current,
          loadedPreviewChannels: [...current.loadedPreviewChannels, channel],
        });
  };
  const performGeneratedV4LifecycleAction = (
    channel: ContextualChannel,
    action: V4LifecycleAction,
    returnToContext = false,
    deferCompletion = false,
  ) => {
    if (channel === "instagram" && generatedV4State.drafts.instagram.images.length === 0) {
      return false;
    }
    const previousGoogleState = generatedV4State.googleDemoState;
    const nextGoogleState = channel === "google"
      ? action === "schedule"
        ? "scheduled"
        : action === "send"
          ? "sent"
          : "suggested"
      : previousGoogleState;
    const lifecycle: V4ChannelState = action === "schedule"
      ? "scheduled"
      : action === "send"
        ? "sent"
        : "unscheduled";
    const nextDelivery: V4ChannelDelivery = {
      ...generatedV4State.channelDeliveries[channel],
      lifecycle,
      date: action === "send"
        ? V4_TODAY_DATE
        : generatedV4State.channelDeliveries[channel].date,
      statusOverride: null,
    };
    const nextDeliveries: V4ChannelDeliveries = {
      ...generatedV4State.channelDeliveries,
      [channel]: nextDelivery,
    };
    setGeneratedV4State((current) => ({
      ...current,
      googleDemoState: nextGoogleState,
      channelDeliveries: nextDeliveries,
    }));
    const nextCalendarDeliveries = { ...generatedV4CalendarDeliveries };
    nextCalendarDeliveries[channel] = nextDelivery;
    setGeneratedV4CalendarDeliveries(nextCalendarDeliveries);
    const completionOpened = !deferCompletion
      && action !== "cancel"
      && openV4TopicCompletionIfNeeded({
      source: "generated",
      channel,
      action,
      previousDeliveries: generatedV4State.channelDeliveries,
      nextDeliveries,
      previousGoogleState,
      nextGoogleState,
      });
    if (action !== "cancel" && !completionOpened) {
      showContextualToast(contextualSuccessMessage(
        channel,
        action === "schedule" ? "schedule" : "post",
      ), true, deferCompletion);
    }
    if (
      activeV4CampaignSource === "generated"
      && combinedWorkflow === "modal"
      && (returnToContext || action === "cancel")
      && !completionOpened
    ) {
      const remainingChannels = GENERATED_V4_CHANNELS.filter(
        (candidate) => !nextDeliveries[candidate].deleted,
      );
      const nextChannel = nextScopedReviewChannel(
        channel,
        GENERATED_V4_CHANNELS,
        nextDeliveries,
        remainingChannels,
      );
      if (nextChannel) {
        setCombinedModalStartIndex(remainingChannels.indexOf(nextChannel));
        setSocialWorkflowChannel(nextChannel);
      } else {
        setCombinedWorkflow(null);
        setV4ReviewOrigin(null);
        setActiveV4GroupDate(null);
        setActiveV4CampaignSource(null);
        setV4ReviewScopedChannels(null);
        setCombinedModalStartIndex(0);
        setGeneratedV4Phase("idle");
        setGeneratedV4ExitTarget(null);
        setGeneratedV4ExitVersionTarget(null);
        generatedV4ExitPendingRef.current = false;
        generatedV4ExitActionRef.current = false;
      }
    }
    return nextDeliveries;
  };
  const deleteGeneratedV4Channel = (channel: ContextualChannel) => {
    const previousGoogleState = generatedV4State.googleDemoState;
    const nextGoogleState = channel === "google" ? "suggested" : previousGoogleState;
    setPreferredV4EntryChannel((preferred) => preferred === channel ? null : preferred);
    const nextDeliveries: V4ChannelDeliveries = {
      ...generatedV4State.channelDeliveries,
      [channel]: {
        ...generatedV4State.channelDeliveries[channel],
        lifecycle: "unscheduled",
        deleted: true,
        statusOverride: null,
      },
    };
    setGeneratedV4State((current) => ({
      ...current,
      googleDemoState: nextGoogleState,
      channelDeliveries: nextDeliveries,
      loadedPreviewChannels: current.loadedPreviewChannels.filter(
        (loadedChannel) => loadedChannel !== channel,
      ),
    }));
    const nextCalendarDeliveries = { ...generatedV4CalendarDeliveries };
    delete nextCalendarDeliveries[channel];
    setGeneratedV4CalendarDeliveries(nextCalendarDeliveries);
    setCalendarChannelStatus(
      "v4",
      "suggested",
      CONTEXTUAL_TO_CALENDAR_CHANNEL[channel],
      null,
    );
    setReviewDeleteChannel(null);
    const completionOpened = openV4TopicCompletionIfNeeded({
      source: "generated",
      channel,
      action: "delete",
      previousDeliveries: generatedV4State.channelDeliveries,
      nextDeliveries,
      previousGoogleState,
      nextGoogleState,
    });
    if (!completionOpened) showContextualToast(contextualDeletionMessage(channel), true);
    const hasRemainingChannels = GENERATED_V4_CHANNELS.some(
      (candidate) => !nextDeliveries[candidate].deleted,
    );
    if (!hasRemainingChannels) {
      closeGeneratedV4Session();
      return nextDeliveries;
    }
    if (
      activeV4CampaignSource === "generated"
      && combinedWorkflow === "modal"
      && !completionOpened
    ) {
      const remainingChannels = GENERATED_V4_CHANNELS.filter(
        (candidate) => !nextDeliveries[candidate].deleted,
      );
      const nextChannel = nextScopedReviewChannel(
        channel,
        GENERATED_V4_CHANNELS,
        nextDeliveries,
        remainingChannels,
      );
      if (nextChannel) {
        setCombinedModalStartIndex(remainingChannels.indexOf(nextChannel));
        setSocialWorkflowChannel(nextChannel);
      } else {
        setCombinedWorkflow(null);
        setV4ReviewOrigin(null);
        setActiveV4GroupDate(null);
        setActiveV4CampaignSource(null);
        setV4ReviewScopedChannels(null);
        setCombinedModalStartIndex(0);
      }
    }
    return nextDeliveries;
  };
  const cancelSuggestionGeneration = () => {
    if (suggestionTimerRef.current !== null) {
      window.clearInterval(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
    preserveCalendarPromptRef.current = false;
    setV4Generating(false);
    setV4LoadingStage(0);
  };
  const closeGeneratedV4WorkflowUi = (target: V4EntrySurface) => {
    cancelSuggestionGeneration();
    setV4SuggestedSummaryOpen(false);
    setSuggestedDialogOpen(false);
    setSuggestedPreviewIndex(0);
    setSuggestedReviewChannel(null);
    setSuggestedEditor(null);
    setSuggestedGoogleDrafts(null);
    setSuggestedTextDraft(null);
    setSocialEditDraft(null);
    setActiveV4ContextChannel(null);
    setV4ReviewOrigin(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setCombinedWorkflow(null);
    setCombinedModalStartIndex(0);
    setScheduleEditorChannel(null);
    setReviewDeleteChannel(null);
    setSuggestedPrompt("");
    setCalendarPrompt("");
    setV4DashboardPrompt("");
    setV4DashboardDraftChannels([...GENERATED_V4_CHANNELS]);
    setV4CalendarDraftChannels([...GENERATED_V4_CHANNELS]);
    setGeneratedV4Phase("idle");
    setGeneratedV4ExitTarget(null);
    setGeneratedV4ExitVersionTarget(null);
    generatedV4ExitPendingRef.current = false;
    generatedV4ExitActionRef.current = false;
    setV4CardSummaryOpen(false);
    setScreen("calendar");
    setV4EntrySurface(target);
  };
  const closeGeneratedV4Session = () => {
    closeGeneratedV4WorkflowUi(v4GeneratedFlowOrigin);
  };
  const completeV4ModalDelivery = (
    source: V4CampaignSource,
    channel: ContextualChannel,
    action: Extract<V4LifecycleAction, "schedule" | "send">,
    nextDeliveries: V4ChannelDeliveries,
  ) => {
    const nextGoogleState: GoogleContextDemoState = channel === "google"
      ? action === "schedule" ? "scheduled" : "sent"
      : source === "generated"
        ? generatedV4State.googleDemoState
        : googleContextDemoState;
    const previousDeliveries: V4ChannelDeliveries = {
      ...nextDeliveries,
      [channel]: {
        ...nextDeliveries[channel],
        lifecycle: "unscheduled",
      },
    };
    const completionOpened = openV4TopicCompletionIfNeeded({
      source,
      channel,
      action,
      previousDeliveries,
      nextDeliveries,
      previousGoogleState: channel === "google" ? "suggested" : nextGoogleState,
      nextGoogleState,
    });
    if (completionOpened) return;

    if (source === "generated") {
      closeGeneratedV4Session();
      return;
    }
    setActiveV4ContextChannel(null);
    setCombinedModalStartIndex(0);
    setV4ReviewOrigin(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setCombinedWorkflow(null);
  };
  const requestGeneratedV4Exit = (
    target: V4EntrySurface = v4GeneratedFlowOrigin,
  ) => {
    if (generatedV4Phase !== "draft-review") {
      closeGeneratedV4WorkflowUi(target);
      return;
    }
    if (generatedV4ExitPendingRef.current || generatedV4ExitActionRef.current) return;
    generatedV4ExitPendingRef.current = true;
    setGeneratedV4ExitVersionTarget(null);
    setGeneratedV4ExitTarget(target);
  };
  const requestGeneratedV4VersionExit = (target: PrototypeVersion) => {
    if (generatedV4ExitPendingRef.current || generatedV4ExitActionRef.current) return;
    generatedV4ExitPendingRef.current = true;
    setGeneratedV4ExitTarget(null);
    setGeneratedV4ExitVersionTarget(target);
  };
  const cancelGeneratedV4Exit = () => {
    if (generatedV4ExitActionRef.current) return;
    generatedV4ExitPendingRef.current = false;
    setGeneratedV4ExitTarget(null);
    setGeneratedV4ExitVersionTarget(null);
  };
  const saveAndExitGeneratedV4 = () => {
    if (generatedV4ExitActionRef.current) return;
    generatedV4ExitActionRef.current = true;
    const versionTarget = generatedV4ExitVersionTarget;
    closeGeneratedV4WorkflowUi(generatedV4ExitTarget ?? v4GeneratedFlowOrigin);
    if (versionTarget) switchVersion(versionTarget, true);
  };
  const discardAndExitGeneratedV4 = () => {
    if (generatedV4ExitActionRef.current) return;
    generatedV4ExitActionRef.current = true;
    const protectedEntries = GENERATED_V4_CHANNELS.flatMap((channel) => {
      const delivery = generatedV4CalendarDeliveries[channel];
      return delivery
        && !generatedV4State.channelDeliveries[channel].deleted
        && (delivery.lifecycle === "scheduled" || delivery.lifecycle === "sent")
        ? [[channel, { ...delivery }] as const]
        : [];
    });
    const protectedDeliveries = Object.fromEntries(
      protectedEntries,
    ) as GeneratedV4CalendarDeliveries;
    if (protectedEntries.length === 0) {
      setGeneratedV4State(createInitialGeneratedV4State());
      setGeneratedV4CalendarDeliveries({});
    } else {
      const protectedChannels = new Set(protectedEntries.map(([channel]) => channel));
      setGeneratedV4State((current) => {
        const channelDeliveries = { ...current.channelDeliveries };
        GENERATED_V4_CHANNELS.forEach((channel) => {
          channelDeliveries[channel] = protectedChannels.has(channel)
            ? { ...protectedDeliveries[channel]! }
            : {
                ...channelDeliveries[channel],
                lifecycle: "unscheduled",
                deleted: true,
                statusOverride: null,
              };
        });
        return {
          ...current,
          channelDeliveries,
          googleDemoState: protectedDeliveries.google?.lifecycle === "scheduled"
            ? "scheduled"
            : protectedDeliveries.google?.lifecycle === "sent"
              ? "sent"
              : "suggested",
          loadedPreviewChannels: current.loadedPreviewChannels.filter(
            (channel) => protectedChannels.has(channel),
          ),
        };
      });
      setGeneratedV4CalendarDeliveries(protectedDeliveries);
    }
    const versionTarget = generatedV4ExitVersionTarget;
    closeGeneratedV4WorkflowUi(generatedV4ExitTarget ?? v4GeneratedFlowOrigin);
    if (versionTarget) switchVersion(versionTarget, true);
  };
  const advanceGeneratedV4Review = (
    channel: ContextualChannel,
    nextDeliveries: V4ChannelDeliveries,
    _regroupAfterDelivery = false,
  ) => {
    const reviewScope = GENERATED_V4_CHANNELS;
    const resultingScope = GENERATED_V4_CHANNELS.filter(
      (candidate) => !nextDeliveries[candidate].deleted,
    );
    const nextChannel = nextScopedReviewChannel(
      channel,
      reviewScope,
      nextDeliveries,
      resultingScope,
    );
    if (nextChannel) {
      setSuggestedReviewChannel(nextChannel);
      return;
    }
    if (v4ReviewOrigin === "generated-calendar") {
      setSuggestedReviewChannel(null);
      setSuggestedEditor(null);
      setV4ReviewOrigin(null);
      setActiveV4GroupDate(null);
      setActiveV4CampaignSource(null);
      setPreferredV4EntryChannel(null);
      setV4ReviewScopedChannels(null);
      setCombinedModalStartIndex(0);
      setGeneratedV4Phase("idle");
      setGeneratedV4ExitTarget(null);
      setGeneratedV4ExitVersionTarget(null);
      generatedV4ExitPendingRef.current = false;
      generatedV4ExitActionRef.current = false;
      return;
    }
    closeGeneratedV4Session();
  };
  const performGeneratedReviewDeliveryAction = (
    channel: ContextualChannel,
    action: Extract<V4LifecycleAction, "schedule" | "send">,
  ) => {
    const nextDeliveries = performGeneratedV4LifecycleAction(channel, action);
    if (nextDeliveries === false) return;
    advanceGeneratedV4Review(channel, nextDeliveries, true);
  };
  const deleteGeneratedV4ReviewChannel = (channel: ContextualChannel) => {
    const nextDeliveries = deleteGeneratedV4Channel(channel);
    if (GENERATED_V4_CHANNELS.every((candidate) => nextDeliveries[candidate].deleted)) return;
    advanceGeneratedV4Review(channel, nextDeliveries, true);
  };
  const saveScheduleEdits = (
    channel: ContextualChannel,
    date: string,
    time: string,
  ) => {
    if (version === "v4" && isV4GeneratedEditor) {
      const currentDelivery = generatedV4CalendarDeliveries[channel]
        ?? generatedV4State.channelDeliveries[channel];
      const nextDelivery: V4ChannelDelivery = {
        ...currentDelivery,
        date,
        time,
      };
      const nextDeliveries: V4ChannelDeliveries = {
        ...generatedV4State.channelDeliveries,
        [channel]: nextDelivery,
      };
      setGeneratedV4State((current) => ({
        ...current,
        channelDeliveries: nextDeliveries,
      }));
      if (generatedV4CalendarDeliveries[channel]) {
        setGeneratedV4CalendarDeliveries((current) => ({
          ...current,
          [channel]: nextDelivery,
        }));
      }
      setScheduleEditorChannel(null);
      return;
    }

    const currentDelivery = v4ChannelDeliveries[channel];
    const nextDelivery: V4ChannelDelivery = {
      ...currentDelivery,
      date,
      time,
    };
    const nextDeliveries: V4ChannelDeliveries = {
      ...v4ChannelDeliveries,
      [channel]: nextDelivery,
    };
    setV4ChannelDeliveries(nextDeliveries);
    setScheduleEditorChannel(null);

    if (version === "v4") {
      // Draft date edits do not place unscheduled content on a new calendar date.
      // Delivered content is already persisted, so rescheduling it updates its card immediately.
      if (currentDelivery.lifecycle !== "unscheduled") {
        setV4CalendarDeliveries({
          ...v4CalendarDeliveries,
          [channel]: nextDelivery,
        });
      }
      return;
    }

    const destinationChannels = CONTEXTUAL_CHANNELS
      .map(({ id }) => id)
      .filter((candidate) => (
        !nextDeliveries[candidate].deleted
        && nextDeliveries[candidate].date === date
      ));
    setActiveV4GroupDate(date);
    setV4ReviewScopedChannels(destinationChannels);
    setCombinedModalStartIndex(destinationChannels.indexOf(channel));
  };
  const beginV4SuggestionGeneration = (
    value: string,
    origin: V4GeneratedFlowOrigin = v4GeneratedFlowOrigin,
    preserveCalendarPrompt = false,
  ) => {
    const prompt = value.trim();
    if (!prompt || v4Generating) return;
    if (suggestionTimerRef.current !== null) {
      window.clearInterval(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
    preserveCalendarPromptRef.current = preserveCalendarPrompt;
    setV4GeneratedFlowOrigin(origin);
    setSuggestedPrompt(prompt);
    if (origin === "dashboard") {
      setV4DashboardDraftChannels([...GENERATED_V4_CHANNELS]);
    } else {
      setV4CalendarDraftChannels([...GENERATED_V4_CHANNELS]);
    }
    setV4SuggestedSummaryOpen(false);
    setSuggestedDialogOpen(false);
    setSuggestedPreviewIndex(0);
    setV4ReviewOrigin(null);
    setPreferredV4EntryChannel(null);
    setGeneratedV4State((current) => ({
      ...current,
      loadedPreviewChannels: [],
    }));
    setV4LoadingStage(0);
    setV4Generating(true);
    setGeneratedV4Phase("idea-loading");
  };
  const toggleV4DashboardDraftChannel = (channel: ContextualChannel) => {
    setV4DashboardDraftChannels((current) => current.includes(channel)
      ? current.filter((candidate) => candidate !== channel)
      : GENERATED_V4_CHANNELS.filter(
          (candidate) => candidate === channel || current.includes(candidate),
        ));
  };
  const toggleV4CalendarDraftChannel = (channel: ContextualChannel) => {
    setV4CalendarDraftChannels((current) => current.includes(channel)
      ? current.filter((candidate) => candidate !== channel)
      : GENERATED_V4_CHANNELS.filter(
          (candidate) => candidate === channel || current.includes(candidate),
        ));
  };
  const reviewV4DashboardDrafts = () => {
    if (v4DashboardDraftChannels.length === 0) return;
    acceptGeneratedV4Campaign(v4DashboardDraftChannels);
    setActiveV4GroupDate(V4_INITIAL_DATE);
    setActiveV4CampaignSource("generated");
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels([...v4DashboardDraftChannels]);
    setV4SuggestedSummaryOpen(false);
    setSuggestedPreviewIndex(0);
    setSuggestedDialogOpen(true);
  };
  const reviewV4CalendarDrafts = () => {
    if (v4CalendarDraftChannels.length === 0) return;
    acceptGeneratedV4Campaign(v4CalendarDraftChannels);
    setActiveV4GroupDate(V4_INITIAL_DATE);
    setActiveV4CampaignSource("generated");
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels([...v4CalendarDraftChannels]);
    setV4SuggestedSummaryOpen(false);
    setSuggestedPreviewIndex(0);
    setSuggestedDialogOpen(true);
  };
  const closeAdHocTransient = () => {
    if (adHocTimerRef.current !== null) {
      window.clearInterval(adHocTimerRef.current);
      adHocTimerRef.current = null;
    }
    setAdHocCreationStep(null);
    setAdHocSelectedJob("property-cleanup");
    setAdHocSelectedChannels([]);
    setPendingAdHocShowcase(null);
    setAdHocGenerating(false);
    setAdHocLoadingStage(0);
    setAdHocSummaryId(null);
    setAdHocContext(null);
    setAdHocActiveContextChannel(null);
  };
  const startAdHocCreation = () => {
    closeAdHocTransient();
    setAdHocCreationStep("job");
  };
  const startAdHocGeneration = () => {
    if (adHocSelectedChannels.length === 0) return;
    adHocIdRef.current += 1;
    setPendingAdHocShowcase({
      id: `adhoc-showcase-${adHocIdRef.current}`,
      jobId: adHocSelectedJob,
      channels: CONTEXTUAL_CHANNELS
        .map(({ id }) => id)
        .filter((channel) => adHocSelectedChannels.includes(channel)),
    });
    setAdHocCreationStep(null);
    setAdHocLoadingStage(0);
    setAdHocGenerating(true);
  };
  const switchV4EntrySurface = (nextSurface: V4EntrySurface) => {
    if (nextSurface === v4EntrySurface) return;
    if (version === "v4" && generatedV4Phase === "draft-review") {
      requestGeneratedV4Exit(nextSurface);
      return;
    }
    if (version === "v4" && generatedV4Phase !== "idle") {
      closeGeneratedV4WorkflowUi(nextSurface);
    }
    setV4CardSummaryOpen(false);
    setCombinedWorkflow(null);
    setCombinedModalStartIndex(0);
    setV4ReviewOrigin(null);
    setActiveV4ContextChannel(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setV4TaskModalOpen(false);
    setV4TopicCompletion(null);
    closeAdHocTransient();
    setScreen("calendar");
    setV4EntrySurface(nextSurface);
  };
  const closeV4TopicCompletion = () => {
    setV4TopicCompletion(null);
    setV4CardSummaryOpen(false);
    setCombinedWorkflow(null);
    setV4ReviewOrigin(null);
    setActiveV4ContextChannel(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setSuggestedDialogOpen(false);
    setSuggestedReviewChannel(null);
    setSuggestedEditor(null);
    setScreen("calendar");
    setV4EntrySurface("calendar");
  };
  const reviewNextV4Topic = () => {
    if (!nextV4IncompleteTopic || !nextV4IncompleteChannel) return;
    setV4TopicCompletion(null);
    setScreen("calendar");
    setV4EntrySurface("calendar");
    setActiveV4CampaignSource(nextV4IncompleteTopic.source);
    setActiveV4GroupDate(nextV4IncompleteTopic.date);
    setPreferredV4EntryChannel(nextV4IncompleteChannel);
    setV4ReviewScopedChannels(null);
    setCombinedModalStartIndex(0);
    setSocialWorkflowChannel(nextV4IncompleteChannel);
    setV4ReviewOrigin(nextV4IncompleteTopic.source === "generated"
      ? "generated-calendar"
      : "saturday");
    setCombinedWorkflow(null);
    setV4CardSummaryOpen(true);
  };
  const openV4AdHocCampaignSummary = () => {
    const entryChannel = availableV4Channels[0];
    if (!entryChannel) return;
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource("original");
    setPreferredV4EntryChannel(entryChannel);
    setV4ReviewScopedChannels(null);
    setCombinedModalStartIndex(0);
    setSocialWorkflowChannel(entryChannel);
    setV4ReviewOrigin("saturday");
    setCombinedWorkflow(null);
    setV4CardSummaryOpen(true);
  };
  const openV4AdHocChannel = (channel: ContextualChannel) => {
    const channelIndex = availableV4Channels.indexOf(channel);
    if (channelIndex < 0) return;
    setV4CardSummaryOpen(false);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource("original");
    setPreferredV4EntryChannel(channel);
    setV4ReviewScopedChannels(null);
    setCombinedModalStartIndex(channelIndex);
    setSocialWorkflowChannel(channel);
    setV4ReviewOrigin("saturday");
    setCombinedWorkflow("modal");
  };
  const openCreatedAdHocSummary = (showcaseId: string) => {
    const showcase = adHocShowcases.find(({ id }) => id === showcaseId);
    if (!showcase) return;
    const channels = showcase.channels.filter(
      (channel) => !showcase.deliveries[channel].deleted,
    );
    if (channels.length === 0) return;
    setAdHocContext(null);
    setAdHocSummaryId(showcaseId);
  };
  const openCreatedAdHocChannel = (
    showcaseId: string,
    channel: ContextualChannel,
    returnToSummary = false,
  ) => {
    const showcase = adHocShowcases.find(({ id }) => id === showcaseId);
    if (!showcase) return;
    const channels = showcase.channels.filter(
      (candidate) => !showcase.deliveries[candidate].deleted,
    );
    const startIndex = channels.indexOf(channel);
    if (startIndex < 0) return;
    setAdHocSummaryId(null);
    setAdHocContext({ showcaseId, startIndex, returnToSummary });
  };
  const closeCreatedAdHocContext = () => {
    if (adHocContext?.returnToSummary) {
      setAdHocSummaryId(adHocContext.showcaseId);
    }
    setAdHocContext(null);
    setAdHocActiveContextChannel(null);
  };
  const performCreatedAdHocLifecycleAction = (
    showcaseId: string,
    channel: ContextualChannel,
    action: V4LifecycleAction,
    advance = false,
    fromContextModal = false,
  ) => {
    const showcase = adHocShowcases.find(({ id }) => id === showcaseId);
    if (!showcase) return false;
    const lifecycle: V4ChannelState = action === "schedule"
      ? "scheduled"
      : action === "send"
        ? "sent"
        : "unscheduled";
    const nextDelivery: V4ChannelDelivery = {
      ...showcase.deliveries[channel],
      lifecycle,
      date: action === "send" ? V4_TODAY_DATE : showcase.deliveries[channel].date,
      statusOverride: null,
    };
    const nextDeliveries = {
      ...showcase.deliveries,
      [channel]: nextDelivery,
    };
    setAdHocShowcases((current) => current.map((candidate) => (
      candidate.id === showcaseId
        ? {
            ...candidate,
            deliveries: nextDeliveries,
            googleDemoState: channel === "google"
              ? action === "schedule"
                ? "scheduled"
                : action === "send"
                  ? "sent"
                  : "suggested"
              : candidate.googleDemoState,
          }
        : candidate
    )));
    if (action === "schedule") {
      showContextualToast(
        contextualSuccessMessage(channel, "schedule"),
        true,
        fromContextModal,
      );
    } else if (action === "send") {
      showContextualToast(
        contextualSuccessMessage(channel, "post"),
        true,
        fromContextModal,
      );
    }
    if (advance) {
      const available = showcase.channels.filter(
        (candidate) => !nextDeliveries[candidate].deleted,
      );
      const nextChannel = nextScopedReviewChannel(
        channel,
        showcase.channels,
        nextDeliveries,
        available,
      );
      if (nextChannel) {
        setAdHocContext((current) => current && current.showcaseId === showcaseId
          ? { ...current, startIndex: available.indexOf(nextChannel) }
          : current);
      } else {
        closeCreatedAdHocContext();
      }
    }
    return nextDeliveries;
  };
  const deleteCreatedAdHocChannel = (
    showcaseId: string,
    channel: ContextualChannel,
  ) => {
    const showcase = adHocShowcases.find(({ id }) => id === showcaseId);
    if (!showcase) return;
    const nextDeliveries = {
      ...showcase.deliveries,
      [channel]: {
        ...showcase.deliveries[channel],
        lifecycle: "unscheduled" as const,
        deleted: true,
        statusOverride: null,
      },
    };
    const remaining = showcase.channels.filter(
      (candidate) => !nextDeliveries[candidate].deleted,
    );
    setAdHocShowcases((current) => remaining.length === 0
      ? current.filter(({ id }) => id !== showcaseId)
      : current.map((candidate) => candidate.id === showcaseId
        ? {
            ...candidate,
            deliveries: nextDeliveries,
            googleDemoState: channel === "google"
              ? "suggested"
              : candidate.googleDemoState,
          }
        : candidate));
    showContextualToast(contextualDeletionMessage(channel), true);
    if (remaining.length === 0) {
      setAdHocContext(null);
      setAdHocSummaryId(null);
      setAdHocActiveContextChannel(null);
      return;
    }
    const nextChannel = nextAvailableChannel(channel, remaining, nextDeliveries)
      ?? remaining[0];
    setAdHocContext((current) => current && current.showcaseId === showcaseId
      ? { ...current, startIndex: remaining.indexOf(nextChannel) }
      : current);
  };
  const setCreatedAdHocGoogleState = (
    showcaseId: string,
    state: GoogleContextDemoState,
  ) => {
    setAdHocShowcases((current) => current.map((showcase) => (
      showcase.id === showcaseId
        ? { ...showcase, googleDemoState: state }
        : showcase
    )));
  };
  const switchVersion = (
    nextVersion: PrototypeVersion,
    bypassGeneratedExitGuard = false,
  ) => {
    if (
      nextVersion === version
      || (LOCKED_PROTOTYPE_VERSION && nextVersion !== LOCKED_PROTOTYPE_VERSION)
    ) return;
    if (
      !bypassGeneratedExitGuard
      && version === "v4"
      && generatedV4Phase === "draft-review"
    ) {
      requestGeneratedV4VersionExit(nextVersion);
      return;
    }

    cancelSuggestionGeneration();
    setMessage(INITIAL_V1_MESSAGE);
    setImages([...INITIAL_IMAGES]);
    setV2Drafts(createInitialV2Drafts());
    setV3Drafts(createInitialV2Drafts());
    setDaisyVersionStates(createInitialDaisyVersionStates());
    setGeneratedV4State(createInitialGeneratedV4State());
    setGeneratedV4CalendarDeliveries({});
    setGeneratedV4Phase("idle");
    setGeneratedV4ExitTarget(null);
    setGeneratedV4ExitVersionTarget(null);
    generatedV4CampaignSequenceRef.current = 0;
    generatedV4ExitPendingRef.current = false;
    generatedV4ExitActionRef.current = false;
    closeAdHocTransient();
    setAdHocShowcases([]);
    setEnabledChannels({
      google: true,
      facebook: true,
      instagram: true,
    });
    setScheduledChannels({ v1: null, v2: null, v3: null, v4: null, v5: null });
    setCalendarStatuses(createInitialCalendarStatuses());
    setV4NavigationStyle(prototypeEnv.navigationStyle);
    setV4EntrySurface("calendar");
    setV4GeneratedFlowOrigin("calendar");
    setV4DashboardPrompt("");
    setV4DashboardDraftChannels([...GENERATED_V4_CHANNELS]);
    setV4CalendarDraftChannels([...GENERATED_V4_CHANNELS]);
    setVersion(nextVersion);
    setScreen("calendar");
    setCalendarModalOpen(false);
    setV4TaskModalOpen(false);
    setV4RemainingTaskIds([...V4_CALENDAR_TASK_IDS]);
    setV3CombinedModalOpen(false);
    setV3ContextPreviewChannel("google");
    setV3ReviewOrigin(null);
    setCombinedWorkflow(null);
    setCombinedModalStartIndex(0);
    setV4ReviewOrigin(null);
    setV4CardSummaryOpen(false);
    setV4SuggestedSummaryOpen(false);
    setCalendarPrompt("");
    setSuggestedPrompt("");
    setSuggestedDialogOpen(false);
    setSuggestedPreviewIndex(0);
    setV4Generating(false);
    setV4LoadingStage(0);
    setSuggestedReviewChannel(null);
    setSuggestedEditor(null);
    setSuggestedGoogleDrafts(null);
    setSuggestedTextDraft(null);
    setSocialWorkflowChannel("facebook");
    setSocialEditDraft(null);
    setActiveV4ContextChannel(null);
    setActiveV4GroupDate(null);
    setActiveV4CampaignSource(null);
    setPreferredV4EntryChannel(null);
    setV4ReviewScopedChannels(null);
    setScheduleEditorChannel(null);
    setReviewDeleteChannel(null);
    setScheduleToastVisible(false);
    setContextualToast(null);
    setV4TopicCompletion(null);
    setSaturdayCompletion({ v3: null, v4: null, v5: null });
  };
  const toggleChannel = (channel: PreviewChannel) => {
    if (enabledChannels[channel]) {
      const calendarChannel = CALENDAR_CHANNEL_BY_PREVIEW[channel];
      (["friday-social", "saturday-campaign", "suggested"] as CalendarCardStatusKey[])
        .forEach((card) => setCalendarChannelStatus(version, card, calendarChannel, null));
    }
    setEnabledChannels((current) => ({ ...current, [channel]: !current[channel] }));
  };
  const returnToSuggestedReview = () => {
    setSuggestedEditor(null);
    setSuggestedGoogleDrafts(null);
    setSuggestedTextDraft(null);
    setSocialEditDraft(null);
  };
  const returnFromSuggestedReview = () => {
    if (!suggestedReviewChannel) return;
    setSuggestedEditor(null);
    setSuggestedGoogleDrafts(null);
    setSuggestedTextDraft(null);
    setSocialEditDraft(null);
    if (v4ReviewOrigin === "generated-calendar") {
      setCombinedModalStartIndex(
        availableGeneratedV4Channels.indexOf(suggestedReviewChannel),
      );
      setSuggestedReviewChannel(null);
      setV4ReviewScopedChannels(null);
      setCombinedWorkflow("modal");
      return;
    }
    setSuggestedPreviewIndex(v4ReviewOrigin === "suggested-content" && version === "v4"
      ? (v4ReviewScopedChannels ?? availableGeneratedV4Channels).indexOf(suggestedReviewChannel)
      : CONTEXTUAL_CHANNELS.findIndex(({ id }) => id === suggestedReviewChannel));
    setSuggestedReviewChannel(null);
    setV4ReviewOrigin(null);
    setSuggestedDialogOpen(true);
  };

  useEffect(() => {
    if (version !== "v4" || !v4Generating) return;

    let elapsedStages = 0;
    const interval = window.setInterval(() => {
      elapsedStages += 1;
      if (elapsedStages < V4_LOADING_STAGES.length) {
        setV4LoadingStage(elapsedStages);
        return;
      }

      window.clearInterval(interval);
      if (suggestionTimerRef.current === interval) suggestionTimerRef.current = null;
      setV4Generating(false);
      setV4LoadingStage(0);
      if (!preserveCalendarPromptRef.current) setCalendarPrompt("");
      preserveCalendarPromptRef.current = false;
      if (v4GeneratedFlowOrigin !== "dashboard") setV4DashboardPrompt("");
      setSuggestedPreviewIndex(0);
      setV4ReviewOrigin(null);
      setV4SuggestedSummaryOpen(true);
      setGeneratedV4Phase("idea-summary");
    }, 1000);
    suggestionTimerRef.current = interval;

    return () => {
      window.clearInterval(interval);
      if (suggestionTimerRef.current === interval) suggestionTimerRef.current = null;
    };
  }, [v4GeneratedFlowOrigin, version, v4Generating]);

  useEffect(() => {
    if (version !== "v4" || generatedV4Phase !== "draft-review") return;
    const guardGeneratedExit = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || generatedV4ExitPendingRef.current) return;
      if (document.querySelector(
        ".google-delete-overlay:not(.generated-v4-exit-overlay), .schedule-date-overlay, [role='menu']",
      )) return;
      event.preventDefault();
      requestGeneratedV4Exit();
    };
    window.addEventListener("keydown", guardGeneratedExit);
    return () => window.removeEventListener("keydown", guardGeneratedExit);
  }, [generatedV4Phase, version]);

  useEffect(() => {
    if (version !== "v4" || !adHocGenerating || !pendingAdHocShowcase) return;
    let elapsedStages = 0;
    const interval = window.setInterval(() => {
      elapsedStages += 1;
      if (elapsedStages < V4_LOADING_STAGES.length) {
        setAdHocLoadingStage(elapsedStages);
        return;
      }
      window.clearInterval(interval);
      if (adHocTimerRef.current === interval) adHocTimerRef.current = null;
      const completed = createAdHocShowcase(pendingAdHocShowcase);
      setAdHocShowcases((current) => current.some(({ id }) => id === completed.id)
        ? current
        : [...current, completed]);
      setAdHocGenerating(false);
      setAdHocLoadingStage(0);
      setPendingAdHocShowcase(null);
      setAdHocContext(null);
      setAdHocSummaryId(completed.id);
    }, 1000);
    adHocTimerRef.current = interval;
    return () => {
      window.clearInterval(interval);
      if (adHocTimerRef.current === interval) adHocTimerRef.current = null;
    };
  }, [adHocGenerating, pendingAdHocShowcase, version]);

  useEffect(() => () => {
    if (suggestionTimerRef.current !== null) {
      window.clearInterval(suggestionTimerRef.current);
    }
    if (adHocTimerRef.current !== null) {
      window.clearInterval(adHocTimerRef.current);
    }
    if (contextualToastFadeTimerRef.current !== null) {
      window.clearTimeout(contextualToastFadeTimerRef.current);
    }
    if (contextualToastRemoveTimerRef.current !== null) {
      window.clearTimeout(contextualToastRemoveTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!scheduleToastVisible) return;

    const timeout = window.setTimeout(() => setScheduleToastVisible(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [scheduleToastVisible]);

  useEffect(() => {
    const fitPrototypeToViewport = () => {
      const widthScale = window.innerWidth / 1440;
      const heightScale = window.innerHeight / totalHeight;
      setScale(Math.min(widthScale, heightScale, 1));
    };

    fitPrototypeToViewport();
    window.addEventListener("resize", fitPrototypeToViewport);
    return () => window.removeEventListener("resize", fitPrototypeToViewport);
  }, [totalHeight]);

  const DaisyContextModal = version === "v5"
    ? VersionFiveContextModal
    : VersionFourContextModal;
  const versionLockedOut = (candidate: PrototypeVersion) => (
    Boolean(LOCKED_PROTOTYPE_VERSION && candidate !== LOCKED_PROTOTYPE_VERSION)
  );

  return (
    <div className="viewport-stage">
      <div
        className="prototype-page"
        style={{ "--prototype-scale": scale, height: totalHeight } as React.CSSProperties}
      >
        {!prototypeEnv.researchMode && (
          <div className="ab-toolbar">
            {!LOCKED_PROTOTYPE_VERSION && (
              <>
            <span>
              {version === "v3"
                ? "Daisy chain social, email and website"
                : version === "v4"
                  ? "Daisy chain all 5 channels"
                  : version === "v5"
                    ? "Daisy chain all 5 channels — vertical modal"
                    : "A/B test prototype"}
            </span>
            <div className="version-switcher" aria-label="Prototype version">
            <button
              className={version === "v1" ? "selected" : ""}
              type="button"
              disabled={versionLockedOut("v1")}
              onClick={() => switchVersion("v1")}
            >
              Version 1
            </button>
            <button
              className={version === "v2" ? "selected" : ""}
              type="button"
              disabled={versionLockedOut("v2")}
              onClick={() => switchVersion("v2")}
            >
              Version 2
            </button>
            <button
              className={version === "v3" ? "selected" : ""}
              type="button"
              disabled={versionLockedOut("v3")}
              onClick={() => switchVersion("v3")}
            >
              Version 3
            </button>
            <button
              className={version === "v4" ? "selected" : ""}
              type="button"
              disabled={versionLockedOut("v4")}
              onClick={() => switchVersion("v4")}
            >
              Version 4
            </button>
            <button
              className={version === "v5" ? "selected" : ""}
              type="button"
              disabled={versionLockedOut("v5")}
              onClick={() => switchVersion("v5")}
            >
              Version 5
            </button>
            </div>
              </>
            )}
            {version === "v4" && (
              <div className="v4-experiment-controls">
              <fieldset
                className="v4-prototype-switcher v4-entry-surface-switcher"
                aria-label="Version 4 entry surface"
              >
                <legend className="sr-only">Version 4 entry surface</legend>
                <button
                  className={v4EntrySurface === "calendar" ? "selected" : ""}
                  type="button"
                  aria-pressed={v4EntrySurface === "calendar"}
                  onClick={() => switchV4EntrySurface("calendar")}
                >
                  Calendar
                </button>
                <button
                  className={v4EntrySurface === "dashboard" ? "selected" : ""}
                  type="button"
                  aria-pressed={v4EntrySurface === "dashboard"}
                  onClick={() => switchV4EntrySurface("dashboard")}
                >
                  Dashboard
                </button>
                <button
                  className={v4EntrySurface === "adhoc" ? "selected" : ""}
                  type="button"
                  aria-pressed={v4EntrySurface === "adhoc"}
                  onClick={() => switchV4EntrySurface("adhoc")}
                >
                  Ad-hoc
                </button>
              </fieldset>
              <fieldset
                className="v4-prototype-switcher v4-navigation-style-switcher"
                aria-label="Version 4 navigation style"
              >
                <legend className="sr-only">Version 4 navigation style</legend>
                <button
                  className={v4NavigationStyle === "icons" ? "selected" : ""}
                  type="button"
                  aria-pressed={v4NavigationStyle === "icons"}
                  onClick={() => setV4NavigationStyle("icons")}
                >
                  Icon button
                </button>
                <button
                  className={v4NavigationStyle === "arrows" ? "selected" : ""}
                  type="button"
                  aria-pressed={v4NavigationStyle === "arrows"}
                  onClick={() => setV4NavigationStyle("arrows")}
                >
                  Arrow button
                </button>
              </fieldset>
              </div>
            )}
          </div>
        )}
        <div
          className={`prototype-frame${v4SidebarFree ? " sidebar-free" : ""}`}
          style={{ height: frameHeight }}
        >
          {suggestedEditor === "google" && suggestedGoogleDrafts ? (
            <SuggestedGoogleEditor
              drafts={suggestedGoogleDrafts}
              setDrafts={setSuggestedGoogleDrafts}
              onCancel={returnToSuggestedReview}
              onSave={() => {
                if (isV4GeneratedEditor) {
                  setGeneratedV4Drafts(cloneDrafts(suggestedGoogleDrafts));
                } else {
                  setV4Drafts(cloneDrafts(suggestedGoogleDrafts));
                }
                returnToSuggestedReview();
              }}
            />
          ) : (suggestedEditor === "facebook" || suggestedEditor === "instagram") && socialEditDraft ? (
            <VersionFourSocialEditor
              channel={suggestedEditor}
              draft={socialEditDraft}
              setDraft={setSocialEditDraft}
              allowPrototypeImageSelection={isV4GeneratedEditor}
              flattenedMessage={version === "v4"}
              onCancel={returnToSuggestedReview}
              onSave={() => {
                const updateDraft = (current: V2Drafts) => ({
                  ...current,
                  [suggestedEditor]: {
                    ...socialEditDraft,
                    images: [...socialEditDraft.images],
                  },
                });
                if (isV4GeneratedEditor) setGeneratedV4Drafts(updateDraft);
                else setV4Drafts(updateDraft);
                returnToSuggestedReview();
              }}
            />
          ) : (suggestedEditor === "email" || suggestedEditor === "website") && suggestedTextDraft ? (
            <SuggestedTextEditor
              channel={suggestedEditor}
              draft={suggestedTextDraft}
              images={suggestedFlowDrafts.all.images}
              campaignTitle={isV4GeneratedEditor ? GENERATED_V4_CAMPAIGN_TITLE : undefined}
              setDraft={setSuggestedTextDraft}
              onCancel={returnToSuggestedReview}
              onSave={() => {
                if (suggestedEditor === "email") {
                  if (isV4GeneratedEditor) {
                    setGeneratedV4EmailSubject(suggestedTextDraft.title);
                    setGeneratedV4EmailMessage(suggestedTextDraft.message);
                  } else {
                    setV4EmailSubject(suggestedTextDraft.title);
                    setV4EmailMessage(suggestedTextDraft.message);
                  }
                } else {
                  setV4WebsiteTitle(suggestedTextDraft.title);
                  setV4WebsiteMessage(suggestedTextDraft.message);
                }
                returnToSuggestedReview();
              }}
            />
          ) : suggestedReviewChannel ? (
            <>
              <VersionFourChannelReview
                channel={suggestedReviewChannel}
                socialDraft={
                  suggestedReviewChannel === "google"
                  || suggestedReviewChannel === "facebook"
                  || suggestedReviewChannel === "instagram"
                    ? suggestedFlowDrafts[suggestedReviewChannel]
                    : undefined
                }
                emailMessage={suggestedFlowEmailMessage}
                emailSubject={suggestedFlowEmailSubject}
                websiteMessage={v4WebsiteMessage}
                websiteTitle={v4WebsiteTitle}
                campaignTitle={isV4GeneratedEditor ? GENERATED_V4_CAMPAIGN_TITLE : undefined}
                images={suggestedFlowDrafts.all.images}
                compactPreview
                collapseEmptyMedia={isV4GeneratedEditor}
                lifecycleEnabled={isV4GeneratedEditor}
                inactive={reviewDeleteChannel !== null}
                versionFourActionLabels={isV4GeneratedEditor}
                delivery={isV4GeneratedEditor
                  ? (isReopenedGeneratedV4Editor
                      ? generatedCalendarV4Deliveries
                      : generatedV4State.channelDeliveries)[suggestedReviewChannel]
                  : undefined}
                publishingDisabled={isV4GeneratedEditor
                  && suggestedReviewChannel === "instagram"
                  && suggestedFlowDrafts.instagram.images.length === 0}
                availableChannels={suggestedFlowChannels}
                channelStatuses={suggestedFlowContentStatuses}
                onChannelChange={setSuggestedReviewChannel}
                navigationStyle={version === "v4" ? v4NavigationStyle : "icons"}
                showContentStatus={version === "v4"}
                onBack={returnFromSuggestedReview}
                onEditSchedule={isV4GeneratedEditor
                  ? () => setScheduleEditorChannel(suggestedReviewChannel)
                  : undefined}
                onSchedule={isV4GeneratedEditor
                  ? () => performGeneratedReviewDeliveryAction(
                      suggestedReviewChannel,
                      "schedule",
                    )
                  : undefined}
                onSendNow={isV4GeneratedEditor
                  ? () => performGeneratedReviewDeliveryAction(
                      suggestedReviewChannel,
                      "send",
                    )
                  : undefined}
                onDelete={isV4GeneratedEditor
                  ? () => setReviewDeleteChannel(suggestedReviewChannel)
                  : undefined}
                onEdit={() => {
                  setSuggestedEditor(suggestedReviewChannel);
                  if (suggestedReviewChannel === "google") {
                    setSuggestedGoogleDrafts(cloneDrafts(suggestedFlowDrafts));
                  } else if (
                    suggestedReviewChannel === "facebook"
                    || suggestedReviewChannel === "instagram"
                  ) {
                    const draft = suggestedFlowDrafts[suggestedReviewChannel];
                    setSocialEditDraft(version === "v4"
                      ? flattenV4SocialDraft(draft)
                      : { ...draft, images: [...draft.images] });
                  } else {
                    setSuggestedTextDraft({
                      title: suggestedReviewChannel === "email"
                        ? suggestedFlowEmailSubject
                        : v4WebsiteTitle,
                      message: suggestedReviewChannel === "email"
                        ? suggestedFlowEmailMessage
                        : v4WebsiteMessage,
                    });
                  }
                }}
              />
              {reviewDeleteChannel && isV4GeneratedEditor && (
                <DeletionFeedbackDialog
                  channel={reviewDeleteChannel}
                  onCancel={() => setReviewDeleteChannel(null)}
                  onConfirm={() => deleteGeneratedV4ReviewChannel(reviewDeleteChannel)}
                />
              )}
            </>
          ) : combinedWorkflow === "review" ? (
            <>
              <VersionFourChannelReview
                channel={socialWorkflowChannel}
                socialDraft={
                  socialWorkflowChannel === "google"
                  || socialWorkflowChannel === "facebook"
                  || socialWorkflowChannel === "instagram"
                    ? v4Drafts[socialWorkflowChannel]
                    : undefined
                }
                emailMessage={v4EmailMessage}
                emailSubject={v4EmailSubject}
                websiteMessage={v4WebsiteMessage}
                websiteTitle={v4WebsiteTitle}
                images={v4Drafts.all.images}
                inactive={reviewDeleteChannel !== null}
                lifecycleEnabled={v4ReviewOrigin === "saturday"}
                delivery={v4ChannelDeliveries[socialWorkflowChannel]}
                availableChannels={reviewScopedV4Channels}
                channelStatuses={v4ContentStatuses}
                onChannelChange={setSocialWorkflowChannel}
                navigationStyle={version === "v4" ? v4NavigationStyle : "icons"}
                iconStyle={version === "v4" ? "jobber" : "brand"}
                versionFourActionLabels={version === "v4"}
                showContentStatus={version === "v4"}
                onEditSchedule={() => setScheduleEditorChannel(socialWorkflowChannel)}
                onDelete={() => setReviewDeleteChannel(socialWorkflowChannel)}
                onSchedule={() => performReviewDeliveryAction(
                  socialWorkflowChannel,
                  "schedule",
                )}
                onSendNow={() => performReviewDeliveryAction(
                  socialWorkflowChannel,
                  "send",
                )}
                onBack={() => {
                  if (v4ReviewOrigin === "suggested-content") {
                    setSuggestedPreviewIndex(
                      CONTEXTUAL_CHANNELS.findIndex(({ id }) => id === socialWorkflowChannel),
                    );
                    setSuggestedDialogOpen(true);
                    setCombinedWorkflow(null);
                    return;
                  }
                  if (version === "v4") {
                    setCombinedModalStartIndex(
                      availableV4Channels.indexOf(socialWorkflowChannel),
                    );
                    setV4ReviewScopedChannels(null);
                    setCombinedWorkflow("modal");
                    return;
                  }
                  setCombinedModalStartIndex(scopedV4Channels.indexOf(socialWorkflowChannel));
                  setV4ReviewScopedChannels(null);
                  setCombinedWorkflow("modal");
                }}
                onEdit={() => {
                  setSuggestedEditor(socialWorkflowChannel);
                  if (socialWorkflowChannel === "google") {
                    setSuggestedGoogleDrafts(cloneDrafts(v4Drafts));
                  } else if (
                    socialWorkflowChannel === "facebook"
                    || socialWorkflowChannel === "instagram"
                  ) {
                    const draft = v4Drafts[socialWorkflowChannel];
                    setSocialEditDraft(version === "v4"
                      ? flattenV4SocialDraft(draft)
                      : { ...draft, images: [...draft.images] });
                  } else {
                    setSuggestedTextDraft({
                      title: socialWorkflowChannel === "email" ? v4EmailSubject : v4WebsiteTitle,
                      message: socialWorkflowChannel === "email" ? v4EmailMessage : v4WebsiteMessage,
                    });
                  }
                }}
              />
              {reviewDeleteChannel && v4ReviewOrigin === "saturday" && (
                <DeletionFeedbackDialog
                  channel={reviewDeleteChannel}
                  onCancel={() => setReviewDeleteChannel(null)}
                  onConfirm={() => {
                    if (version === "v4") deleteV4ReviewChannel(reviewDeleteChannel);
                    else deleteV4Channel(reviewDeleteChannel);
                  }}
                />
              )}
            </>
          ) : screen === "calendar" ? (
            <>
              {version === "v4" && v4EntrySurface === "adhoc"
                ? <SideNavigation />
                : <CompactSideNavigation />}
              <TopBar
                compact={version !== "v4" || v4EntrySurface !== "adhoc"}
                staticControls
                marketingEssentials
              />
              {version === "v4" && v4EntrySurface === "adhoc" ? (
                <VersionFourAdHoc
                  campaignChannels={v4AdHocCampaignChannels}
                  createdCampaigns={adHocCreatedCampaigns}
                  onNewShowcase={startAdHocCreation}
                  onOpenCampaign={openV4AdHocCampaignSummary}
                  onOpenChannel={openV4AdHocChannel}
                  onOpenCreatedCampaign={openCreatedAdHocSummary}
                  onOpenCreatedChannel={openCreatedAdHocChannel}
                />
              ) : version === "v4" && v4EntrySurface === "dashboard" ? (
                <VersionFourDashboard
                  prompt={v4DashboardPrompt}
                  generationState={v4GeneratedFlowOrigin === "dashboard" && v4Generating
                    ? "loading"
                    : v4GeneratedFlowOrigin === "dashboard"
                        && (v4SuggestedSummaryOpen || generatedV4Phase === "draft-review")
                      ? "summary"
                      : "idle"}
                  loadingStage={v4LoadingStage}
                  selectedChannels={v4DashboardDraftChannels}
                  onPromptChange={setV4DashboardPrompt}
                  onGenerate={() => beginV4SuggestionGeneration(
                    v4DashboardPrompt,
                    "dashboard",
                  )}
                  onToggleChannel={toggleV4DashboardDraftChannel}
                  onReviewDrafts={reviewV4DashboardDrafts}
                />
              ) : (
                <CalendarScreen
                updated
                showTaskCard={version === "v4" && v4RemainingTaskIds.length > 0}
                taskCount={version === "v4" ? v4RemainingTaskIds.length : 0}
                taskButtonRef={v4TaskButtonRef}
                taskReturnRef={version === "v4" ? v4TaskCalendarRef : undefined}
                onOpenTasks={version === "v4" && v4RemainingTaskIds.length > 0
                  ? () => {
                      setCalendarModalOpen(false);
                      setV4CardSummaryOpen(false);
                      setCombinedWorkflow(null);
                      setV4TaskModalOpen(true);
                    }
                  : undefined}
                targetPublished={scheduledChannels[version] !== null}
                combinedPublished={currentSaturdayCompletion !== null}
                targetChannels={PREVIEW_CHANNEL_ORDER
                  .filter((channel) => scheduledChannels[version]?.[channel])
                  .map((channel) => CALENDAR_CHANNEL_BY_PREVIEW[channel])}
                v4Prompt={isDaisyVersion ? calendarPrompt : undefined}
                v4Generating={isDaisyVersion && v4Generating}
                onV4PromptChange={isDaisyVersion ? setCalendarPrompt : undefined}
                onV4PromptSubmit={isDaisyVersion
                  ? () => {
                      const prompt = calendarPrompt.trim();
                      if (!prompt || v4Generating || suggestionTimerRef.current !== null) return;
                      if (version === "v4") {
                        beginV4SuggestionGeneration(prompt, "calendar");
                        return;
                      }
                      setSuggestedPrompt(prompt);
                      setV4Generating(true);
                      suggestionTimerRef.current = window.setTimeout(() => {
                        suggestionTimerRef.current = null;
                        setV4Generating(false);
                        setCalendarPrompt("");
                        setSuggestedPreviewIndex(0);
                        setV4ReviewOrigin(null);
                        setSuggestedDialogOpen(true);
                      }, 1200);
                    }
                  : undefined}
                onOpenPost={() => {
                  setV4TaskModalOpen(false);
                  setV3ReviewOrigin(null);
                  setCalendarModalOpen(true);
                }}
                onOpenCombinedPost={(
                  campaignDate,
                  campaignSource = "original",
                  representedCalendarChannels = [],
                ) => {
                  setV4TaskModalOpen(false);
                  if (version === "v3") {
                    setV3ContextPreviewChannel("google");
                    setV3ReviewOrigin(null);
                    setV3CombinedModalOpen(true);
                  } else if (isDaisyVersion) {
                    if (!campaignDate) return;
                    const dateGroupChannels = campaignSource === "generated"
                      ? GENERATED_V4_CHANNELS.filter((channel) => (
                          generatedV4CalendarDeliveries[channel]?.date === campaignDate
                        ))
                      : availableV4Channels.filter(
                          (channel) => v4CalendarDeliveries[channel].date === campaignDate,
                        );
                    if (dateGroupChannels.length === 0) return;
                    const campaignChannels = version === "v4"
                      ? campaignSource === "generated"
                        ? availableGeneratedV4Channels
                        : availableV4Channels
                      : dateGroupChannels;
                    const representedChannels = CONTEXTUAL_CHANNELS
                      .map(({ id }) => id)
                      .filter((channel) => representedCalendarChannels.includes(
                        CONTEXTUAL_TO_CALENDAR_CHANNEL[channel],
                      ));
                    setActiveV4GroupDate(campaignDate);
                    setActiveV4CampaignSource(campaignSource);
                    setPreferredV4EntryChannel(
                      representedChannels.find((channel) => campaignChannels.includes(channel))
                        ?? dateGroupChannels.find((channel) => campaignChannels.includes(channel))
                        ?? campaignChannels[0]
                        ?? null,
                    );
                    setV4ReviewScopedChannels(null);
                    setCombinedModalStartIndex(0);
                    setSocialWorkflowChannel(campaignChannels[0]);
                    setV4ReviewOrigin(campaignSource === "generated"
                      ? "generated-calendar"
                      : "saturday");
                    if (version === "v4") {
                      setCombinedWorkflow(null);
                      setV4CardSummaryOpen(true);
                    } else {
                      setCombinedWorkflow("modal");
                    }
                  }
                }}
                combinedInteractive={version === "v3" || isDaisyVersion}
                inertPostTitleOne={version === "v4"}
                v4CampaignDesign={version === "v4"}
                v4AddNewMenu={version === "v4"}
                hideHeaderCreateNew={version === "v4"}
                hideCalendarPrompt={version === "v4"}
                onCreateMultipleChannels={version === "v4"
                  ? (prompt) => beginV4SuggestionGeneration(prompt, "calendar", true)
                  : undefined}
                combinedChannels={currentSaturdayCompletion ?? undefined}
                generatedSuggestionCard={version === "v5" ? suggestedCompletion?.card : undefined}
                channelStatuses={calendarStatuses[version]}
                v4CampaignCards={isDaisyVersion
                  ? [
                      ...v4CampaignCards,
                      ...(version === "v4" ? generatedV4CampaignCards : []),
                    ]
                  : undefined}
                />
              )}
              {v4TaskModalOpen && version === "v4" && v4EntrySurface === "calendar" && (
                <V4CalendarTaskModal
                  remainingTaskIds={v4RemainingTaskIds}
                  onComplete={(taskId, finalTask) => {
                    setV4RemainingTaskIds((current) => (
                      current.includes(taskId)
                        ? current.filter((candidate) => candidate !== taskId)
                        : current
                    ));
                    showContextualToast(V4_CALENDAR_TASK_SUCCESS_COPY[taskId]);
                    if (!finalTask) return;
                    setV4TaskModalOpen(false);
                    setScreen("calendar");
                    setV4EntrySurface("calendar");
                    window.requestAnimationFrame(() => v4TaskCalendarRef.current?.focus());
                  }}
                  onClose={() => {
                    setV4TaskModalOpen(false);
                    window.requestAnimationFrame(() => v4TaskButtonRef.current?.focus());
                  }}
                />
              )}
              {version === "v4" && v4EntrySurface === "adhoc" && adHocCreationStep && (
                <AdHocCreationDialog
                  step={adHocCreationStep}
                  selectedJob={adHocSelectedJob}
                  selectedChannels={adHocSelectedChannels}
                  onSelectJob={setAdHocSelectedJob}
                  onToggleChannel={(channel) => {
                    setAdHocSelectedChannels((current) => {
                      const next = current.includes(channel)
                        ? current.filter((candidate) => candidate !== channel)
                        : [...current, channel];
                      return CONTEXTUAL_CHANNELS
                        .map(({ id }) => id)
                        .filter((candidate) => next.includes(candidate));
                    });
                  }}
                  onNext={() => setAdHocCreationStep("channels")}
                  onBack={() => setAdHocCreationStep("job")}
                  onCreate={startAdHocGeneration}
                  onCancel={closeAdHocTransient}
                />
              )}
              {version === "v4" && v4EntrySurface === "adhoc" && adHocGenerating && (
                <AdHocGenerationOverlay onClose={closeAdHocTransient}>
                  <VersionFourLoadingContent stage={adHocLoadingStage} />
                </AdHocGenerationOverlay>
              )}
              {version === "v4"
                && v4EntrySurface === "adhoc"
                && activeAdHocSummary
                && activeAdHocSummaryChannels.length > 0 && (
                <VersionFourSummaryModal
                  title={activeAdHocSummary.title}
                  images={activeAdHocSummary.drafts.all.images}
                  channels={activeAdHocSummaryChannels}
                  statuses={activeAdHocSummaryStatuses}
                  delivery={
                    activeAdHocSummary.deliveries[activeAdHocSummaryChannels[0]]
                  }
                  scheduleText={v4CampaignScheduleText(
                    activeAdHocSummaryChannels,
                    activeAdHocSummary.deliveries,
                  )}
                  description={V4_SUMMARY_COPY}
                  iconStyle="jobber"
                  suggestedAsDraft
                  primaryActionLabel="Start Review"
                  campaignIdentity={`adhoc-created:${activeAdHocSummary.id}`}
                  onDeleteAll={() => deleteV4Campaign({
                    kind: "adhoc-created",
                    showcaseId: activeAdHocSummary.id,
                  })}
                  onStartReview={() => openCreatedAdHocChannel(
                    activeAdHocSummary.id,
                    activeAdHocSummaryChannels[0],
                    true,
                  )}
                  onClose={() => setAdHocSummaryId(null)}
                />
              )}
              {version === "v4"
                && v4EntrySurface === "adhoc"
                && activeAdHocContext
                && adHocContext
                && activeAdHocContextChannels.length > 0 && (
                <VersionFourContextModal
                  key={`adhoc-${activeAdHocContext.id}-${adHocContext.startIndex}-${activeAdHocContextChannels.join("-")}`}
                  drafts={activeAdHocContext.drafts}
                  emailMessage={activeAdHocContext.emailMessage}
                  emailSubject={activeAdHocContext.emailSubject}
                  websiteMessage={activeAdHocContext.websiteMessage}
                  websiteTitle={activeAdHocContext.websiteTitle}
                  campaignTitle={activeAdHocContext.title}
                  initialIndex={adHocContext.startIndex}
                  availableChannels={activeAdHocContextChannels}
                  channelDeliveries={activeAdHocContext.deliveries}
                  googleDemoState={activeAdHocContext.googleDemoState}
                  navigationStyle={v4NavigationStyle}
                  iconStyle="jobber"
                  onActiveChannelChange={setAdHocActiveContextChannel}
                  onClose={closeCreatedAdHocContext}
                  onEdit={() => undefined}
                  onDelete={(channel) => deleteCreatedAdHocChannel(
                    activeAdHocContext.id,
                    channel,
                  )}
                  onLifecycleAction={(channel, action, advance) => (
                    performCreatedAdHocLifecycleAction(
                      activeAdHocContext.id,
                      channel,
                      action,
                      advance,
                      true,
                    )
                  )}
                  onComplete={() => closeCreatedAdHocContext()}
                />
              )}
              {v4CardSummaryOpen
                && version === "v4"
                && activeCalendarV4Channels.length > 0 && (
                <VersionFourSummaryModal
                  title={activeV4CampaignTitle}
                  images={activeV4CampaignSource === "generated"
                    ? generatedV4State.drafts.all.images
                    : v4Drafts.all.images}
                  channels={activeCalendarV4Channels}
                  statuses={activeCalendarV4ContentStatuses}
                  delivery={activeV4CampaignDeliveries[activeCalendarV4Channels[0] ?? "google"]}
                  scheduleText={activeV4CampaignScheduleText}
                  description={activeV4CampaignSource === "generated"
                    ? GENERATED_V4_SUMMARY_COPY
                    : undefined}
                  artwork={activeV4CampaignSource === "generated"
                    ? GENERATED_V4_PROMOTION_ARTWORK
                    : undefined}
                  iconStyle="jobber"
                  campaignIdentity={activeV4CampaignSource === "generated"
                    ? `calendar:generated:${generatedV4State.campaignId ?? "none"}`
                    : "calendar:original"}
                  onDeleteAll={() => deleteV4Campaign({
                    kind: "calendar",
                    source: activeV4CampaignSource ?? "original",
                  })}
                  onStartReview={() => {
                    const entryChannel = preferredV4EntryChannel
                      && activeCalendarV4Channels.includes(preferredV4EntryChannel)
                      ? preferredV4EntryChannel
                      : activeCalendarV4Channels[0];
                    setV4CardSummaryOpen(false);
                    setCombinedModalStartIndex(Math.max(
                      0,
                      activeCalendarV4Channels.indexOf(entryChannel),
                    ));
                    setSocialWorkflowChannel(entryChannel);
                    setPreferredV4EntryChannel(null);
                    if (activeV4CampaignSource === "generated") {
                      setV4GeneratedFlowOrigin(
                        v4EntrySurface === "dashboard" ? "dashboard" : "calendar",
                      );
                      setGeneratedV4Phase("draft-review");
                    }
                    setCombinedWorkflow("modal");
                  }}
                  onClose={() => {
                    setV4CardSummaryOpen(false);
                    setV4ReviewOrigin(null);
                    setActiveV4GroupDate(null);
                    setActiveV4CampaignSource(null);
                    setPreferredV4EntryChannel(null);
                    setV4ReviewScopedChannels(null);
                    setCombinedModalStartIndex(0);
                  }}
                />
              )}
              {version === "v4"
                && v4GeneratedFlowOrigin !== "dashboard"
                && (v4Generating || v4SuggestedSummaryOpen) && (
                <VersionFourGeneratedFlowShell
                  prompt={suggestedPrompt}
                  loading={v4Generating}
                  origin={v4GeneratedFlowOrigin}
                  onPromptChange={setSuggestedPrompt}
                  onSubmit={beginV4SuggestionGeneration}
                  onClose={() => {
                    closeGeneratedV4Session();
                  }}
                >
                  {v4Generating ? (
                    <VersionFourLoadingContent stage={v4LoadingStage} />
                  ) : v4SuggestedSummaryOpen ? (
                    <VersionFourSummaryModal
                      title={GENERATED_V4_CAMPAIGN_TITLE}
                      images={[]}
                      channels={GENERATED_V4_CHANNELS}
                      statuses={Object.fromEntries(GENERATED_V4_CHANNELS.map((channel) => [
                        channel,
                        "suggested",
                      ]))}
                      selectedChannels={v4CalendarDraftChannels}
                      delivery={createGeneratedV4ChannelDeliveries().google}
                      description={GENERATED_V4_SUMMARY_COPY}
                      artwork={GENERATED_V4_PROMOTION_ARTWORK}
                      origin="generated"
                      iconStyle="jobber"
                      recommendationOnly
                      campaignIdentity={`idea:${suggestedPrompt}`}
                      onToggleChannel={toggleV4CalendarDraftChannel}
                      onStartReview={reviewV4CalendarDrafts}
                      onClose={() => undefined}
                    />
                  ) : null}
                </VersionFourGeneratedFlowShell>
              )}
              {version === "v4" && suggestedDialogOpen && (
                <div
                  className="calendar-modal-overlay suggested-content-overlay v4-generated-flow-overlay"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) requestGeneratedV4Exit();
                  }}
                >
                    <VersionFourContextModal
                      key={`generated-${generatedV4State.campaignId}-${availableGeneratedV4Channels.join("-")}`}
                      drafts={generatedV4State.drafts}
                      emailMessage={generatedV4State.emailMessage}
                      emailSubject={generatedV4State.emailSubject}
                      websiteMessage={v4WebsiteMessage}
                      websiteTitle={v4WebsiteTitle}
                      campaignTitle={GENERATED_V4_CAMPAIGN_TITLE}
                      channelDefinitions={GENERATED_V4_CONTEXTUAL_CHANNELS}
                      initialIndex={suggestedPreviewIndex}
                      availableChannels={availableGeneratedV4Channels}
                      channelDeliveries={generatedV4State.channelDeliveries}
                      googleDemoState={generatedV4State.googleDemoState}
                      navigationStyle={v4NavigationStyle}
                      iconStyle="jobber"
                      embedded
                      embeddedExitControls
                      enforceInstagramImageRequirement
                      previewLoadingDuration={V4_PREVIEW_LOADING_MS}
                      loadedPreviewChannels={generatedV4State.loadedPreviewChannels}
                      onPreviewLoaded={markGeneratedV4PreviewLoaded}
                      onActiveChannelChange={setActiveV4ContextChannel}
                      onClose={() => requestGeneratedV4Exit()}
                      onEdit={(channel) => {
                        setSuggestedPreviewIndex(
                          availableGeneratedV4Channels.indexOf(channel),
                        );
                        setSuggestedDialogOpen(false);
                        setSuggestedReviewChannel(channel);
                        setV4ReviewOrigin("suggested-content");
                      }}
                      onDelete={deleteGeneratedV4Channel}
                      onLifecycleAction={(channel, action, advance, deferCompletion) => {
                        return performGeneratedV4LifecycleAction(
                          channel,
                          action,
                          advance,
                          deferCompletion,
                        );
                      }}
                      onComplete={(channel, action, deliveries) => {
                        completeV4ModalDelivery("generated", channel, action, deliveries);
                      }}
                    />
                </div>
              )}
              {suggestedDialogOpen && version === "v5" && (
                <SuggestedMarketingContentDialog
                  variant="vertical"
                  prompt={suggestedPrompt}
                  drafts={v4Drafts}
                  emailMessage={v4EmailMessage}
                  emailSubject={v4EmailSubject}
                  websiteMessage={v4WebsiteMessage}
                  websiteTitle={v4WebsiteTitle}
                  activeIndex={suggestedPreviewIndex}
                  channelDeliveries={v4ChannelDeliveries}
                  onPromptChange={setSuggestedPrompt}
                  onActiveIndexChange={setSuggestedPreviewIndex}
                  onClose={() => {
                    setSuggestedDialogOpen(false);
                    setSuggestedPreviewIndex(0);
                    setV4ReviewOrigin(null);
                  }}
                  onEdit={(channel) => {
                    setSuggestedDialogOpen(false);
                    setSuggestedReviewChannel(channel);
                    setV4ReviewOrigin("suggested-content");
                  }}
                  onAction={(channel, action, final) => {
                    setCalendarChannelStatus(
                      activeDaisyVersion,
                      "suggested",
                      CONTEXTUAL_TO_CALENDAR_CHANNEL[channel],
                      action === "schedule" ? "scheduled" : "sent",
                    );
                    showContextualToast(contextualSuccessMessage(
                      channel,
                      action === "schedule" ? "schedule" : "post",
                    ));
                    if (!final) {
                      setSuggestedPreviewIndex((current) => Math.min(4, current + 1));
                      return;
                    }
                    setSuggestedCompletion({
                      card: {
                        title: suggestionCardTitle(suggestedPrompt),
                        channels: ["Google post", "Facebook post", "Instagram post", "Email", "Website"],
                        status: "Sent",
                        generatedSuggestion: true,
                        showDate: false,
                      },
                      destinations: { ...SUGGESTED_DESTINATIONS },
                    });
                    setSuggestedDialogOpen(false);
                    setSuggestedPreviewIndex(0);
                    setSuggestedPrompt("");
                    setV4ReviewOrigin(null);
                  }}
                />
              )}
              {calendarModalOpen && (
                <CalendarContextModal
                  previews={calendarPreviews}
                  enabledChannels={enabledChannels}
                  onToggleChannel={toggleChannel}
                  onClose={() => setCalendarModalOpen(false)}
                  onEdit={() => {
                    setCalendarModalOpen(false);
                    if (version === "v3") setV3ReviewOrigin("friday");
                    setScreen("review");
                  }}
                />
              )}
              {v3CombinedModalOpen && version === "v3" && (
                <VersionThreeCombinedContextModal
                  drafts={v3Drafts}
                  enabledChannels={enabledChannels}
                  initialPreviewChannel={v3ContextPreviewChannel}
                  onToggleChannel={toggleChannel}
                  onPreviewChannelChange={setV3ContextPreviewChannel}
                  onClose={() => {
                    setV3ContextPreviewChannel("google");
                    setV3CombinedModalOpen(false);
                  }}
                  onEdit={(channel) => {
                    setV3ContextPreviewChannel(channel);
                    setV3ReviewOrigin("saturday");
                    setV3CombinedModalOpen(false);
                    setScreen("review");
                  }}
                  onAction={(page, action, final) => {
                    const affectedChannels = page === "social"
                      ? PREVIEW_CHANNEL_ORDER
                        .filter((channel) => enabledChannels[channel])
                        .map((channel) => CALENDAR_CHANNEL_BY_PREVIEW[channel])
                      : [page === "email" ? "Email" : "Website"] as CalendarChannel[];
                    setCalendarChannelStatuses(
                      "v3",
                      "saturday-campaign",
                      affectedChannels,
                      action === "schedule" ? "scheduled" : "sent",
                    );
                    showContextualToast(contextualSuccessMessage(page, action));
                    if (!final) return;
                    const completedChannels = PREVIEW_CHANNEL_ORDER
                      .filter((channel) => enabledChannels[channel])
                      .map((channel) => CALENDAR_CHANNEL_BY_PREVIEW[channel]);
                    setSaturdayCompletion((current) => ({
                      ...current,
                      v3: [...completedChannels, "Email", "Website"],
                    }));
                    setV3ContextPreviewChannel("google");
                    setV3ReviewOrigin(null);
                    setV3CombinedModalOpen(false);
                  }}
                />
              )}
              {combinedWorkflow === "modal" && isDaisyVersion && (
                <DaisyContextModal
                  key={`${version}-${activeV4CampaignSource}-${activeV4GroupDate}-${activeCalendarV4Channels.join("-")}-${combinedModalStartIndex}`}
                  drafts={activeV4CampaignSource === "generated"
                    ? generatedV4State.drafts
                    : v4Drafts}
                  emailMessage={activeV4CampaignSource === "generated"
                    ? generatedV4State.emailMessage
                    : v4EmailMessage}
                  emailSubject={activeV4CampaignSource === "generated"
                    ? generatedV4State.emailSubject
                    : v4EmailSubject}
                  websiteMessage={v4WebsiteMessage}
                  websiteTitle={v4WebsiteTitle}
                  campaignTitle={activeV4CampaignSource === "generated"
                    ? GENERATED_V4_CAMPAIGN_TITLE
                    : undefined}
                  channelDefinitions={activeV4CampaignSource === "generated"
                    ? GENERATED_V4_CONTEXTUAL_CHANNELS
                    : CONTEXTUAL_CHANNELS}
                  initialIndex={combinedModalStartIndex}
                  availableChannels={activeCalendarV4Channels}
                  channelDeliveries={activeV4CampaignSource === "generated"
                    ? generatedCalendarV4Deliveries
                    : v4ChannelDeliveries}
                  googleDemoState={activeV4CampaignSource === "generated"
                    ? generatedV4State.googleDemoState
                    : googleContextDemoState}
                  navigationStyle={version === "v4" ? v4NavigationStyle : "icons"}
                  iconStyle={version === "v4" ? "jobber" : "brand"}
                  scopeDate={version === "v5" ? activeV4GroupDate ?? undefined : undefined}
                  previewLoadingDuration={version === "v4" && activeV4CampaignSource === "generated"
                    ? V4_PREVIEW_LOADING_MS
                    : 0}
                  loadedPreviewChannels={activeV4CampaignSource === "generated"
                    ? generatedV4State.loadedPreviewChannels
                    : []}
                  onPreviewLoaded={activeV4CampaignSource === "generated"
                    ? markGeneratedV4PreviewLoaded
                    : undefined}
                  enforceInstagramImageRequirement={
                    version === "v4" && activeV4CampaignSource === "generated"
                  }
                  onActiveChannelChange={setActiveV4ContextChannel}
                  onClose={() => {
                    if (
                      version === "v4"
                      && activeV4CampaignSource === "generated"
                      && generatedV4Phase === "draft-review"
                    ) {
                      requestGeneratedV4Exit();
                      return;
                    }
                    setActiveV4ContextChannel(null);
                    setCombinedModalStartIndex(0);
                    setV4ReviewOrigin(null);
                    setActiveV4GroupDate(null);
                    setActiveV4CampaignSource(null);
                    setPreferredV4EntryChannel(null);
                    setV4ReviewScopedChannels(null);
                    setCombinedWorkflow(null);
                  }}
                  onEdit={(channel) => {
                    setCombinedModalStartIndex(activeCalendarV4Channels.indexOf(channel));
                    setV4ReviewScopedChannels(
                      version === "v4" ? null : activeCalendarV4Channels,
                    );
                    if (activeV4CampaignSource === "generated") {
                      setSuggestedReviewChannel(channel);
                      setV4ReviewOrigin("generated-calendar");
                      setCombinedWorkflow(null);
                    } else {
                      setSocialWorkflowChannel(channel);
                      setV4ReviewOrigin("saturday");
                      setCombinedWorkflow("review");
                    }
                  }}
                  onDelete={activeV4CampaignSource === "generated"
                    ? deleteGeneratedV4Channel
                    : deleteV4Channel}
                  onLifecycleAction={activeV4CampaignSource === "generated"
                    ? performGeneratedV4LifecycleAction
                    : performV4LifecycleAction}
                  {...(version === "v4"
                    ? {
                        onComplete: (
                          channel: ContextualChannel,
                          action: Extract<V4LifecycleAction, "schedule" | "send">,
                          deliveries: V4ChannelDeliveries,
                        ) => completeV4ModalDelivery(
                          activeV4CampaignSource === "generated" ? "generated" : "original",
                          channel,
                          action,
                          deliveries,
                        ),
                      }
                    : {})}
                />
              )}
              {combinedWorkflow === "modal"
                && isDaisyVersion
                && activeV4ContextChannel === "google"
                && !prototypeEnv.researchMode && (
                <GooglePrototypeStatusControls
                  state={googleContextDemoState}
                  onChange={setGoogleContextDemoState}
                />
              )}
              {activeAdHocContext
                && adHocContext
                && adHocActiveContextChannel === "google"
                && !prototypeEnv.researchMode && (
                <GooglePrototypeStatusControls
                  state={activeAdHocContext.googleDemoState}
                  onChange={(state) => setCreatedAdHocGoogleState(
                    activeAdHocContext.id,
                    state,
                  )}
                />
              )}
            </>
          ) : (
            <>
              {!isDaisyVersion && <SideNavigation />}
              {!isDaisyVersion && <TopBar />}
              {screen === "review" ? (
                <ReviewScreen
                  message={
                    version === "v1"
                      ? message
                      : multiChannelDrafts.google.message
                  }
                  images={
                    version === "v1"
                      ? images
                      : multiChannelDrafts.google.images
                  }
                  enabledChannels={enabledChannels}
                  carouselDrafts={version === "v1" ? undefined : multiChannelDrafts}
                  onToggleChannel={toggleChannel}
                  onEdit={() => {
                    if (isDaisyVersion) {
                      setV4FridayEditDrafts(version === "v4"
                        ? flattenV4SocialDrafts(v4Drafts)
                        : cloneDrafts(v4Drafts));
                    }
                    setScreen("edit");
                  }}
                  onBack={() => {
                    setScreen("calendar");
                    if (version === "v3" && v3ReviewOrigin === "saturday") {
                      setV3CombinedModalOpen(true);
                    }
                    setV3ReviewOrigin(null);
                  }}
                  onSchedule={() => {
                    const scheduledCalendarChannels = PREVIEW_CHANNEL_ORDER
                      .filter((channel) => enabledChannels[channel])
                      .map((channel) => CALENDAR_CHANNEL_BY_PREVIEW[channel]);
                    setCalendarChannelStatuses(
                      version,
                      "friday-social",
                      scheduledCalendarChannels,
                      "scheduled",
                    );
                    setScheduledChannels((current) => ({
                      ...current,
                      [version]: { ...enabledChannels },
                    }));
                    setV3ReviewOrigin(null);
                    setScreen("calendar");
                    setContextualToast(null);
                    setScheduleToastVisible(true);
                  }}
                />
              ) : version === "v2" || version === "v3" || isDaisyVersion ? (
                <VersionTwoEditScreen
                  drafts={isDaisyVersion ? v4FridayEditDrafts ?? v4Drafts : multiChannelDrafts}
                  setDrafts={
                    version === "v2"
                      ? setV2Drafts
                      : version === "v3"
                        ? setV3Drafts
                        : setV4FridayEditDrafts
                  }
                  enabledChannels={enabledChannels}
                  onCancel={() => {
                    if (isDaisyVersion) setV4FridayEditDrafts(null);
                    setScreen("review");
                  }}
                  onSave={isDaisyVersion
                    ? (savedTab) => {
                        if (v4FridayEditDrafts && savedTab !== "all") {
                          setV4Drafts((current) => ({
                            ...current,
                            [savedTab]: {
                              ...v4FridayEditDrafts[savedTab],
                              images: [...v4FridayEditDrafts[savedTab].images],
                            },
                          }));
                        }
                        setV4FridayEditDrafts(null);
                        setScreen("review");
                      }
                    : undefined}
                  separateHashtags={isDaisyVersion}
                  separateCta={isDaisyVersion}
                  channelSpecificOnly={isDaisyVersion}
                  flattenedSocialMessage={version === "v4"}
                />
              ) : (
                <main className="app-content">
                  <EditorPanel
                    message={message}
                    setMessage={setMessage}
                    images={images}
                    setImages={setImages}
                    onCancel={() => setScreen("review")}
                  />
                  <PreviewPanel
                    message={message}
                    images={images}
                    enabledChannels={enabledChannels}
                  />
                </main>
              )}
            </>
          )}
          {scheduleEditorChannel && isDaisyVersion && (
            <ScheduleDateDialog
              key={scheduleEditorChannel}
              channel={scheduleEditorChannel}
              delivery={version === "v4" && isV4GeneratedEditor
                ? generatedV4CalendarDeliveries[scheduleEditorChannel]
                  ?? generatedV4State.channelDeliveries[scheduleEditorChannel]
                : v4ChannelDeliveries[scheduleEditorChannel]}
              onCancel={() => setScheduleEditorChannel(null)}
              onSave={(date, time) => {
                saveScheduleEdits(scheduleEditorChannel, date, time);
              }}
            />
          )}
          {version === "v4"
            && (generatedV4ExitTarget !== null || generatedV4ExitVersionTarget !== null) && (
            <GeneratedV4ExitDialog
              onCancel={cancelGeneratedV4Exit}
              onSaveAndExit={saveAndExitGeneratedV4}
              onDiscardAndExit={discardAndExitGeneratedV4}
            />
          )}
          {scheduleToastVisible && (
            <div className="schedule-success-toast" role="status" aria-live="polite">
              <CheckCircle2 size={22} />
              <span>Your social posts have been successfully scheduled.</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setScheduleToastVisible(false)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {contextualToast && (
            <div
              className={`${contextualToast.dark
                ? "google-delete-toast"
                : "schedule-success-toast"}${contextualToast.deliveryMotion
                ? " v4-delivery-toast"
                : ""}${contextualToast.fading ? " is-fading" : ""}`}
              role="status"
              aria-live="polite"
              key={contextualToast.id}
            >
              {contextualToast.dark ? <Check size={22} /> : <CheckCircle2 size={22} />}
              <span>{contextualToast.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setContextualToast(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
