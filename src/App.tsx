import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Globe2,
  GripVertical,
  Heart,
  Home,
  Image,
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
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const INITIAL_MESSAGE = `This Hamilton property needed a seasonal refresh, starting with a clean up and mulching to bring the landscape back to a maintained state. 🌿

Our work included a general property clean up to remove debris and tidy landscaped areas, followed by fresh mulch applied to existing garden beds to help define and protect them.

The result was a cleaner, more orderly outdoor space, with garden beds refreshed and ready for the season.

If you’re planning a clean up and mulching project in Hamilton, feel free to reach out to discuss your property and timing.`;
const INITIAL_EMAIL_MESSAGE = INITIAL_MESSAGE;
const INITIAL_WEBSITE_MESSAGE = INITIAL_MESSAGE;

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

const INITIAL_V2_MESSAGE = `${INITIAL_MESSAGE}

#HamiltonLandscaping #OutdoorLiving #HomeUpgrade`;
const INITIAL_HASHTAGS = "#HamiltonLandscaping #OutdoorLiving #HomeUpgrade";
const INITIAL_EXTERNAL_LINK = "http://yourwebsite.com";

const INITIAL_V3_MESSAGE = `Landscaping isn’t just about appearances—it can completely change how you use and enjoy your yard.

We worked with a homeowner in Hamilton who wanted better use of their outdoor space. Our team reshaped the layout, added fresh features, and improved the overall flow of the yard. Now, the space not only looks inviting but also makes life outdoors easier and more enjoyable.

Have ideas for your own yard? Let’s talk!

📞 416-624-3188

#HamiltonLandscaping #OutdoorLiving #HomeUpgrade`;

type PrototypeVersion = "v1" | "v2" | "v3" | "v4";
type V2Tab = "all" | "google" | "facebook" | "instagram";
type PreviewChannel = Exclude<V2Tab, "all">;
type EnabledChannels = Record<PreviewChannel, boolean>;
const LOCKED_VERSION: PrototypeVersion = "v4";
type SchedulableVersion = Exclude<PrototypeVersion, "v3">;
type ContextualAction = "schedule" | "post";
type ContextualToast = { message: string; id: number };

type ChannelDraft = {
  message: string;
  images: GalleryImage[];
  hashtags?: string;
  externalLink?: string;
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
  },
  facebook: {
    message: INITIAL_MESSAGE,
    images: [...INITIAL_IMAGES],
    hashtags: INITIAL_HASHTAGS,
  },
  instagram: {
    message: INITIAL_MESSAGE,
    images: [...INITIAL_IMAGES],
    hashtags: INITIAL_HASHTAGS,
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
  showDate?: boolean;
};

type CalendarGroup = {
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
          title: "Seasonal property clean up in Hamilton",
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

function ChannelIcon({ channel }: { channel: CalendarChannel }) {
  if (channel === "Facebook post") return <strong className="brand-facebook">f</strong>;
  if (channel === "Instagram post") return <strong className="brand-instagram">◎</strong>;
  if (channel === "Google post") return <strong className="google-g">G</strong>;
  if (channel === "Email") return <Mail size={14} />;
  return <Globe2 size={14} />;
}

function MarketingCalendarCard({
  item,
  onOpen,
  combinedInteractive = false,
  updated = false,
  targetPublished = false,
  combinedPublished = false,
  targetChannels,
  combinedChannels,
}: {
  item: CalendarItem;
  onOpen: () => void;
  combinedInteractive?: boolean;
  updated?: boolean;
  targetPublished?: boolean;
  combinedPublished?: boolean;
  targetChannels?: CalendarChannel[];
  combinedChannels?: CalendarChannel[];
}) {
  const channels = item.combinedTarget && combinedChannels
    ? combinedChannels
    : item.target && targetPublished && targetChannels
      ? targetChannels
      : item.channels ?? (item.channel ? [item.channel] : []);
  const status = (item.target && targetPublished) || (item.combinedTarget && combinedPublished)
    ? "Sent"
    : item.status;
  const isPublished = (item.target && targetPublished) || (item.combinedTarget && combinedPublished);
  const content = (
    <>
      <span className="calendar-card-title">{item.title}</span>
      {channels.map((channel) => (
        <span className="calendar-card-meta channel" key={channel}>
          <ChannelIcon channel={channel} />
          {channel}
        </span>
      ))}
      <span className="calendar-card-details">
        {item.showDate !== false && <span><Calendar size={13} /> Nov 9</span>}
        {item.automated && <span><Sparkles size={13} /> Automated campaign</span>}
        <span><FileText size={13} /> {status}</span>
      </span>
      {(status === "Sent" || status === "Published") && (
        <CheckCircle2 className="card-success" size={15} fill="#388523" color="white" />
      )}
    </>
  );

  const isInteractive = item.target || (item.combinedTarget && combinedInteractive);

  return isInteractive ? (
    <button
      className={[
        "marketing-calendar-card target-card",
        isPublished ? "" : "review",
        item.combinedTarget ? "combined-target-card" : "",
        updated ? "updated-card" : "",
        isPublished ? "published-card" : "",
      ].filter(Boolean).join(" ")}
      type="button"
      onClick={onOpen}
    >
      {content}
    </button>
  ) : (
    <div className={`marketing-calendar-card ${item.tone ?? ""} ${updated ? "updated-card" : ""}`}>
      {content}
    </div>
  );
}

function CalendarScreen({
  onOpenPost,
  onOpenCombinedPost,
  combinedInteractive = false,
  updated = false,
  targetPublished = false,
  combinedPublished = false,
  targetChannels,
  combinedChannels,
}: {
  onOpenPost: () => void;
  onOpenCombinedPost: () => void;
  combinedInteractive?: boolean;
  updated?: boolean;
  targetPublished?: boolean;
  combinedPublished?: boolean;
  targetChannels?: CalendarChannel[];
  combinedChannels?: CalendarChannel[];
}) {
  const columns = updated ? UPDATED_CALENDAR_COLUMNS : CALENDAR_COLUMNS;

  return (
    <main className={`calendar-page ${updated ? "updated-calendar-page" : ""}`}>
      <section className="marketing-page-header">
        <div className="marketing-title-row">
          <h1>Marketing Plan</h1>
          <div className="static-header-actions">
            <span>Give Feedback</span>
            <span className="create-new"><Plus size={18} /> Create New</span>
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
            <strong>November</strong>
            <span>2026</span>
            <small><CalendarDays size={14} /> Today</small>
          </div>
          <div className="calendar-view-control">
            <span className="active">Week</span><span>Month</span><span>List</span>
          </div>
          <SlidersHorizontal size={21} />
          <span className="add-new"><Plus size={20} /> Add New</span>
        </header>
        <div className="calendar-grid">
          {columns.map((column) => (
            <section className="calendar-day" key={column.day}>
              <h2 className={column.day.startsWith("Friday") ? "today" : ""}>{column.day}</h2>
              {column.groups.map((group) => (
                <div className="calendar-group" key={group.label}>
                  <h3>{group.label}</h3>
                  {group.items.map((item, index) => (
                    <MarketingCalendarCard
                      key={`${item.title}-${index}`}
                      item={item}
                      onOpen={item.combinedTarget ? onOpenCombinedPost : onOpenPost}
                      combinedInteractive={combinedInteractive}
                      updated={updated}
                      targetPublished={targetPublished}
                      combinedPublished={combinedPublished}
                      targetChannels={targetChannels}
                      combinedChannels={combinedChannels}
                    />
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </section>
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
                hashtags={previews[previewChannel].hashtags}
                images={previews[previewChannel].images}
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

const CONTEXTUAL_CHANNELS: Array<{
  id: ContextualChannel;
  label: string;
  about: string;
  destinationLabel: string;
  destination: string;
}> = [
  {
    id: "google",
    label: "Google",
    about: "About this Google post",
    destinationLabel: "Post to",
    destination: "Google Business Profile · Beegreen Landscaping",
  },
  {
    id: "facebook",
    label: "Facebook",
    about: "About this Facebook post",
    destinationLabel: "Post to",
    destination: "Facebook · Beegreen Landscaping",
  },
  {
    id: "instagram",
    label: "Instagram",
    about: "About this Instagram post",
    destinationLabel: "Post to",
    destination: "Instagram · @beegreenlandscaping",
  },
  {
    id: "email",
    label: "Email",
    about: "About this email campaign",
    destinationLabel: "Recipients",
    destination: "Customers and leads in Hamilton",
  },
  {
    id: "website",
    label: "Website",
    about: "About this website page",
    destinationLabel: "Publish to",
    destination: "Beegreen Landscaping website",
  },
];

function contextualSuccessMessage(channel: ContextualChannel, action: ContextualAction) {
  if (action === "schedule") {
    if (channel === "email") return "Your email campaign has been successfully scheduled.";
    if (channel === "website") return "Your website page has been successfully scheduled.";
    const label = channel[0].toUpperCase() + channel.slice(1);
    return `Your ${label} post has been successfully scheduled.`;
  }

  if (channel === "email") return "Your email campaign has been successfully sent.";
  if (channel === "website") return "Your website page has been successfully published.";
  const label = channel[0].toUpperCase() + channel.slice(1);
  return `Your ${label} post has been successfully posted.`;
}

function ContextualChannelIcon({ channel }: { channel: ContextualChannel }) {
  if (channel === "google") return <strong className="google-g">G</strong>;
  if (channel === "facebook") return <strong className="brand-facebook">f</strong>;
  if (channel === "instagram") return <strong className="brand-instagram">◎</strong>;
  if (channel === "email") return <Mail size={18} />;
  return <Globe2 size={18} />;
}

function EmailCampaignPreview({ images, message }: { images: GalleryImage[]; message: string }) {
  return (
    <article className="context-email-preview">
      <header className="email-envelope">
        <p><strong>Subject:</strong> A seasonal refresh for this Hamilton property</p>
        <p><strong>From:</strong> Beegreen Landscaping &lt;hello@beegreenlandscaping.ca&gt;</p>
      </header>
      <div className="email-brand">
        <img src="/assets/avatar.png" alt="" />
        <strong>Beegreen Landscaping</strong>
      </div>
      {images[0] && <img className="email-hero" src={images[0].src} alt={images[0].alt} />}
      <div className="email-content">
        <p className="email-eyebrow">PROJECT SHOWCASE · HAMILTON</p>
        <h2>Seasonal property clean up in Hamilton</h2>
        <p className="propagated-body">{message}</p>
        <span className="fake-cta">Plan your property clean up</span>
      </div>
      <footer>
        Beegreen Landscaping · Hamilton, Ontario<br />
        You’re receiving this project update because you asked to hear from us.
      </footer>
    </article>
  );
}

function WebsitePagePreview({ images, message }: { images: GalleryImage[]; message: string }) {
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
          <h2>Seasonal property clean up in Hamilton</h2>
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

function VersionFourContextModal({
  drafts,
  emailMessage,
  websiteMessage,
  initialIndex = 0,
  googleAvailable,
  onClose,
  onSocialEdit,
  onDeleteGoogle,
  onAction,
}: {
  drafts: V2Drafts;
  emailMessage: string;
  websiteMessage: string;
  initialIndex?: number;
  googleAvailable: boolean;
  onClose: () => void;
  onSocialEdit: (channel: PreviewChannel) => void;
  onDeleteGoogle: () => void;
  onAction: (channel: ContextualChannel, action: ContextualAction, final: boolean) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const splitToggleRef = useRef<HTMLButtonElement>(null);
  const splitOptionRef = useRef<HTMLButtonElement>(null);
  const channels = googleAvailable
    ? CONTEXTUAL_CHANNELS
    : CONTEXTUAL_CHANNELS.filter(({ id }) => id !== "google");
  const active = channels[Math.min(activeIndex, channels.length - 1)];
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === channels.length - 1;
  const goPrevious = () => {
    setSplitMenuOpen(false);
    setActiveIndex((current) => Math.max(0, current - 1));
  };
  const goNext = () => {
    setSplitMenuOpen(false);
    setActiveIndex((current) => Math.min(channels.length - 1, current + 1));
  };
  const performAction = (action: ContextualAction) => {
    setSplitMenuOpen(false);
    onAction(active.id, action, atEnd);
    if (!atEnd) setActiveIndex((current) => current + 1);
  };
  const safeVisualAction = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteFeedback("");
  };

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
    <div className="calendar-modal-overlay v4-context-overlay" role="presentation">
      <section
        className={`v4-context-modal ${deleteDialogOpen ? "delete-dialog-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-context-title"
      >
        <nav
          className="v4-context-navigation"
          aria-label="Channel preview"
          inert={deleteDialogOpen ? true : undefined}
        >
          <button type="button" onClick={goPrevious} disabled={atStart} aria-label="Previous channel">
            <ChevronLeft size={22} />
          </button>
          <span aria-live="polite">{activeIndex + 1} of {channels.length}</span>
          <button type="button" onClick={goNext} disabled={atEnd} aria-label="Next channel">
            <ChevronRight size={22} />
          </button>
        </nav>
        <button
          className="calendar-modal-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
          inert={deleteDialogOpen ? true : undefined}
        >
          <X size={28} />
        </button>

        <div className="v4-context-body" inert={deleteDialogOpen ? true : undefined}>
          <section className="v4-context-details">
            <div>
              <h1 id="v4-context-title">Seasonal property clean up in Hamilton</h1>
              <section className="v4-about-copy">
                <h2>{active.about}</h2>
                <p>
                  Showcase this Hamilton property’s seasonal clean up and fresh mulch to highlight
                  the work completed, demonstrate the visible results, and help local homeowners
                  understand when to book a similar landscaping service.
                </p>
              </section>
              <dl className="v4-context-facts">
                <div><dt>Scheduled for</dt><dd>Nov 7, 2026 · 9:00 AM</dd></div>
                <div><dt>{active.destinationLabel}</dt><dd>{active.destination}</dd></div>
              </dl>
            </div>
            <footer className="v4-context-footer" inert={deleteDialogOpen ? true : undefined}>
              <button
                type="button"
                className="delete-post"
                aria-disabled={active.id === "google" ? undefined : "true"}
                onClick={active.id === "google"
                  ? () => {
                      setSplitMenuOpen(false);
                      setDeleteDialogOpen(true);
                    }
                  : safeVisualAction}
              >
                Delete
              </button>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  aria-disabled={active.id === "facebook" || active.id === "instagram" ? undefined : "true"}
                  onClick={active.id === "facebook" || active.id === "instagram"
                    ? () => {
                        setSplitMenuOpen(false);
                        if (active.id === "facebook" || active.id === "instagram") onSocialEdit(active.id);
                      }
                    : safeVisualAction}
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

          <section className="v4-context-preview" aria-label={`${active.label} content preview`}>
            <header><Sparkles size={20} /><strong>{active.label} preview</strong></header>
            <div className="v4-context-preview-scroll">
              {active.id === "email" ? (
                <EmailCampaignPreview images={drafts.all.images} message={emailMessage} />
              ) : active.id === "website" ? (
                <WebsitePagePreview images={drafts.all.images} message={websiteMessage} />
              ) : (
                <PlatformPreviewCard
                  channel={active.id}
                  message={drafts[active.id].message}
                  hashtags={drafts[active.id].hashtags}
                  images={drafts[active.id].images}
                />
              )}
            </div>
          </section>
        </div>

        {deleteDialogOpen && (
          <div className="google-delete-overlay" role="presentation">
            <section
              className="google-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="google-delete-title"
            >
              <button type="button" className="google-delete-close" aria-label="Close deletion feedback" onClick={closeDeleteDialog}>
                <X size={24} />
              </button>
              <h2 id="google-delete-title">Improve future recommendations</h2>
              <p>
                Tell us why this post wasn’t right for your business. Your feedback helps us make
                future recommendations more useful.
              </p>
              <label htmlFor="google-delete-feedback">Feedback <span>(optional)</span></label>
              <input
                id="google-delete-feedback"
                value={deleteFeedback}
                placeholder="What should we know for next time?"
                onChange={(event) => setDeleteFeedback(event.target.value)}
                autoFocus
              />
              <footer>
                <button type="button" className="secondary-button" onClick={closeDeleteDialog}>Cancel</button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteFeedback("");
                    setActiveIndex(0);
                    onDeleteGoogle();
                  }}
                >
                  Delete Post
                </button>
              </footer>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function VersionFourSocialReview({
  channel,
  draft,
  onBack,
  onEdit,
  inactive = false,
}: {
  channel: PreviewChannel;
  draft: ChannelDraft;
  onBack: () => void;
  onEdit: () => void;
  inactive?: boolean;
}) {
  const visualOnly = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const summary = [draft.message, draft.hashtags].filter(Boolean).join(" ").replace(/\n+/g, " ");
  const channelLabel = channel === "facebook" ? "Facebook" : "Instagram";
  const profile = channel === "facebook"
    ? "Beegreen Landscaping / Profile 1"
    : "@beegreenlandscaping";

  return (
    <main
      className="app-content v4-facebook-workflow"
      aria-labelledby="v4-social-review-title"
      inert={inactive ? true : undefined}
    >
      <section className="review-panel">
        <div className="review-scroll">
          <h1 id="v4-social-review-title">Review {channelLabel} Post</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {channelLabel} post</strong>
            <ChevronDown size={19} />
          </div>
          <div className="review-fields">
            <section className="review-field">
              <header><h2>Content</h2><button type="button" onClick={onEdit}>Edit</button></header>
              <p className="review-summary">{summary}</p>
              <small>AI-generated content may contain errors. Please verify important information.</small>
            </section>
            <section className="review-field">
              <header>
                <h2>Schedule Post</h2>
                <button type="button" aria-disabled="true" onClick={visualOnly}>Edit</button>
              </header>
              <p>Nov 7, 2026 9:00 AM</p>
            </section>
            <section className="review-field v4-facebook-post-to">
              <header>
                <span className="v4-connected-title"><h2>Post to</h2><small>Connected</small></span>
              </header>
              <p>
                <ContextualChannelIcon channel={channel} /> {profile}
              </p>
            </section>
          </div>
        </div>
        <footer className="review-footer">
          <div>
            <button className="secondary-button" type="button" onClick={onBack}>Back</button>
            <button className="delete-post" type="button" aria-disabled="true" onClick={visualOnly}>Delete Post</button>
          </div>
          <button className="schedule-split" type="button" aria-disabled="true" onClick={visualOnly}>
            <span>Schedule Nov 7</span><ChevronDown size={20} />
          </button>
        </footer>
      </section>
      <SocialDraftPreview channel={channel} draft={draft} />
    </main>
  );
}

function SocialDraftPreview({ channel, draft }: { channel: PreviewChannel; draft: ChannelDraft }) {
  return (
    <section className="preview-panel facebook-only-preview v4-facebook-preview">
      <div className="preview-content">
        <PlatformPreviewCard
          channel={channel}
          message={draft.message}
          hashtags={draft.hashtags}
          images={draft.images}
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
}: {
  channel: PreviewChannel;
  draft: ChannelDraft;
  setDraft: (draft: ChannelDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const combinedMessage = [draft.message, draft.hashtags].filter(Boolean).join("\n\n");
  const channelLabel = channel === "facebook" ? "Facebook" : "Instagram";
  const updateCombinedMessage = (value: string) => {
    const parsed = splitPostMessage(value);
    setDraft({ ...draft, message: parsed.body, hashtags: parsed.hashtags });
  };

  return (
    <main className="app-content v4-facebook-workflow" aria-labelledby="v4-social-editor-title">
      <section className="editor-panel version-three-editor">
        <div className="editor-scroll">
          <h1 id="v4-social-editor-title">Edit {channelLabel} Post</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {channelLabel} post</strong>
            <ChevronDown size={19} />
          </div>
          <div className="field-block version-three-message">
            <label htmlFor="v4-social-message">Message body</label>
            <AutoSizeTextarea
              id="v4-social-message"
              maxLength={1500}
              value={combinedMessage}
              onChange={updateCombinedMessage}
            />
            <span className="character-count">{combinedMessage.length}/1500 characters</span>
          </div>
          <div className="image-section version-three-images">
            <div>
              <label>Image <span className="optional">(optional)</span></label>
              <p className="helper image-helper">
                Max 10 images. Landscape image works best.<br />
                To show before-and-after work, combine two images into one with the <u>collage tool</u>.
              </p>
            </div>
            <InteractiveGallery
              images={draft.images}
              setImages={(images) => setDraft({ ...draft, images })}
            />
            <div className="version-three-dropzone">
              <button type="button" aria-disabled="true">Choose image</button>
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
      <SocialDraftPreview channel={channel} draft={draft} />
    </main>
  );
}

function ApplyChangesDialog({
  source,
  googleAvailable,
  onClose,
  onApply,
}: {
  source: PreviewChannel;
  googleAvailable: boolean;
  onClose: () => void;
  onApply: (channels: ContextualChannel[]) => void;
}) {
  const [selected, setSelected] = useState<ContextualChannel[]>([]);
  const options = CONTEXTUAL_CHANNELS.filter(({ id }) => (
    id !== source && (googleAvailable || id !== "google")
  ));

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="apply-changes-overlay" role="presentation">
      <section
        className="apply-changes-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-changes-title"
      >
        <button className="google-delete-close" type="button" aria-label="Close apply changes dialog" onClick={onClose}>
          <X size={24} />
        </button>
        <h2 id="apply-changes-title">Apply changes to other channels?</h2>
        <p>
          We noticed that you made a change. Do you want to apply the same change to your other channels?
        </p>
        <fieldset>
          <legend>Select channels</legend>
          <div className="apply-channel-options">
            {options.map(({ id, label }) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  onChange={(event) => {
                    setSelected((current) => event.target.checked
                      ? [...current, id]
                      : current.filter((channel) => channel !== id));
                  }}
                />
                <span><ContextualChannelIcon channel={id} /> {label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>No, keep separate</button>
          <button
            type="button"
            className="primary-button"
            disabled={selected.length === 0}
            onClick={() => onApply(selected)}
          >
            Yes, apply changes
          </button>
        </footer>
      </section>
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
  allTabLabel = "Your post",
  separateHashtags = false,
}: {
  activeTab: V2Tab;
  setActiveTab: (tab: V2Tab) => void;
  drafts: V2Drafts;
  setDrafts: (drafts: V2Drafts) => void;
  enabledChannels: EnabledChannels;
  onCancel: () => void;
  allTabLabel?: string;
  separateHashtags?: boolean;
}) {
  const activeDraft = drafts[activeTab];
  const visibleImages =
    activeTab === "google" ? activeDraft.images.slice(0, 1) : activeDraft.images;

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
        <h1>Edit Social Post</h1>
        <div className="channel-editor-tabs" role="tablist" aria-label="Post channel">
          {([
            ["all", "Your post"],
            ["google", "Google"],
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
          ] as [V2Tab, string][])
            .map(([tab, label]) => [tab, tab === "all" ? allTabLabel : label] as [V2Tab, string])
            .filter(([tab]) => tab === "all" || enabledChannels[tab])
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
        </div>

        {activeTab === "all" && (
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

        {separateHashtags && (activeTab === "facebook" || activeTab === "instagram") && (
          <div className="field-block v4-hashtag-field">
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

        {activeTab === "google" && (
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
        <button className="primary-button" type="button" onClick={onCancel}>Save Edit</button>
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
  hashtags: explicitHashtags = "",
  images,
}: {
  channel: PreviewChannel;
  message: string;
  hashtags?: string;
  images: GalleryImage[];
}) {
  const [instagramImage, setInstagramImage] = useState(0);
  const parsed = splitPostMessage(message);
  const body = parsed.body || "Your post preview will appear here.";
  const hashtags = explicitHashtags || parsed.hashtags;

  useEffect(() => {
    if (instagramImage >= images.length) setInstagramImage(Math.max(images.length - 1, 0));
  }, [images.length, instagramImage]);

  if (channel === "google") {
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
        ) : (
          <div className="empty-post-image"><Image size={32} /></div>
        )}
        <div className="post-copy">
          <p>{body}{hashtags ? `\n\n${hashtags}` : ""}</p>
          <button type="button">Learn more</button>
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
          {hashtags && <p className="post-hashtags">{hashtags}</p>}
        </div>
        <div className={`channel-image-grid count-${Math.min(images.length, 3)}`}>
          {images.slice(0, 3).map((image) => (
            <img src={image.src} alt={image.alt} key={image.id} />
          ))}
          {images.length === 0 && <div className="empty-post-image"><Image size={32} /></div>}
        </div>
        <footer className="channel-post-actions">
          <Heart size={24} /><MessageCircle size={24} /><Send size={24} />
        </footer>
      </article>
    );
  }

  const selectedImage = images[instagramImage];
  return (
    <article className="social-card instagram-post-card">
      <header className="channel-post-header">
        <img src="/assets/avatar.png" alt="" />
        <div><strong>Landscape Service</strong><span>Just now · ◉</span></div>
      </header>
      {selectedImage ? (
        <img className="instagram-post-image" src={selectedImage.src} alt={selectedImage.alt} />
      ) : (
        <div className="empty-post-image instagram-post-image"><Image size={32} /></div>
      )}
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
      <div className="instagram-post-copy">
        <p>{body}</p>
        {hashtags && <p className="post-hashtags">{hashtags}</p>}
      </div>
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
                hashtags={drafts[channel].hashtags}
                images={drafts[channel].images}
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
            hashtags={draft.hashtags}
            images={draft.images}
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
  allTabLabel,
  separateHashtags,
}: {
  drafts: V2Drafts;
  setDrafts: (drafts: V2Drafts) => void;
  enabledChannels: EnabledChannels;
  onCancel: () => void;
  allTabLabel?: string;
  separateHashtags?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<V2Tab>("all");

  useEffect(() => {
    if (activeTab !== "all" && !enabledChannels[activeTab]) setActiveTab("all");
  }, [activeTab, enabledChannels]);

  const selectEditorTab = (tab: V2Tab) => {
    setActiveTab(tab);
  };

  return (
    <main className="app-content">
      <VersionTwoEditorPanel
        activeTab={activeTab}
        setActiveTab={selectEditorTab}
        drafts={drafts}
        setDrafts={setDrafts}
        enabledChannels={enabledChannels}
        onCancel={onCancel}
        allTabLabel={allTabLabel}
        separateHashtags={separateHashtags}
      />
      <VersionTwoPreview
        drafts={drafts}
        enabledChannels={enabledChannels}
        activeTab={activeTab}
      />
    </main>
  );
}

function FacebookOnlyPreview({
  message,
  images,
}: {
  message: string;
  images: GalleryImage[];
}) {
  return (
    <section className="preview-panel facebook-only-preview">
      <div className="preview-content">
        <PlatformPreviewCard channel="facebook" message={message} images={images} />
        <p className="preview-disclaimer">
          Social networks regularly make updates to formatting so your post may appear slightly
          different when published
        </p>
      </div>
    </section>
  );
}

function VersionThreeReviewScreen({
  message,
  images,
  onEdit,
  onBack,
}: {
  message: string;
  images: GalleryImage[];
  onEdit: () => void;
  onBack: () => void;
}) {
  return (
    <main className="app-content">
      <section className="review-panel version-three-review">
        <div className="review-scroll">
          <h1>Review Facebook Post</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {"{content type}"}</strong>
            <ChevronDown size={19} />
          </div>
          <div className="review-fields">
            <section className="review-field">
              <header><h2>Content</h2><button type="button" onClick={onEdit}>Edit</button></header>
              <p className="review-summary">{message.replace(/\n+/g, " ")}</p>
              <small>AI-generated content may contain errors. Please verify important information.</small>
            </section>
            <section className="review-field">
              <header><h2>Schedule Post</h2><button type="button">Edit</button></header>
              <p>Jan 01, 2026 9:00AM</p>
            </section>
            <section className="review-field version-three-post-to">
              <header>
                <span className="not-connected-title">
                  <h2>Post to</h2><small>Not Connected</small>
                </span>
                <button type="button">Connect</button>
              </header>
              <p>
                We’ll help you connect or create a Facebook Business Page in the next step.
                You’ll need full admin permissions for the business profile to connect.
              </p>
            </section>
          </div>
        </div>
        <footer className="review-footer">
          <div>
            <button className="secondary-button" type="button" onClick={onBack}>Back</button>
            <button className="delete-post" type="button">Delete Post</button>
          </div>
          <div className="schedule-split">
            <span>Schedule {"{date}"}</span><ChevronDown size={20} />
          </div>
        </footer>
      </section>
      <FacebookOnlyPreview message={message} images={images} />
    </main>
  );
}

function VersionThreeEditScreen({
  message,
  setMessage,
  images,
  setImages,
  onCancel,
}: {
  message: string;
  setMessage: (message: string) => void;
  images: GalleryImage[];
  setImages: (images: GalleryImage[]) => void;
  onCancel: () => void;
}) {
  return (
    <main className="app-content">
      <section className="editor-panel version-three-editor">
        <div className="editor-scroll">
          <h1>Edit Facebook Post</h1>
          <div className="about-content-row">
            <Sparkles size={21} />
            <strong>About this {"{content type}"}</strong>
            <ChevronDown size={19} />
          </div>
          <div className="field-block version-three-message">
            <label htmlFor="v3-message">Message body</label>
            <AutoSizeTextarea
              id="v3-message"
              maxLength={1500}
              value={message}
              onChange={setMessage}
            />
          </div>
          <div className="image-section version-three-images">
            <div>
              <label>Image <span className="optional">(optional)</span></label>
              <p className="helper image-helper">
                Max 10 images. Landscape image works best.<br />
                To show before-and-after work, you can combine two images into one with the <u>collage tool</u>.
              </p>
            </div>
            <InteractiveGallery images={images} setImages={setImages} />
            <div className="version-three-dropzone">
              <button type="button">Choose image</button>
              <span>Select or drag files here to upload</span>
              <small>Maximum size 5MB per file</small>
            </div>
          </div>
        </div>
        <footer className="editor-footer">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" onClick={onCancel}>Save Edit</button>
        </footer>
      </section>
      <FacebookOnlyPreview message={message} images={images} />
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

export default function App() {
  const [message, setMessage] = useState(INITIAL_V1_MESSAGE);
  const [images, setImages] = useState(INITIAL_IMAGES);
  const [version, setVersion] = useState<PrototypeVersion>(LOCKED_VERSION);
  const [v2Drafts, setV2Drafts] = useState<V2Drafts>(createInitialV2Drafts);
  const [v4Drafts, setV4Drafts] = useState<V2Drafts>(createInitialV4Drafts);
  const [v3Message, setV3Message] = useState(INITIAL_V3_MESSAGE);
  const [v3Images, setV3Images] = useState(INITIAL_IMAGES);
  const [enabledChannels, setEnabledChannels] = useState<EnabledChannels>({
    google: true,
    facebook: true,
    instagram: true,
  });
  const [scheduledChannels, setScheduledChannels] = useState<Record<SchedulableVersion, EnabledChannels | null>>({
    v1: null,
    v2: null,
    v4: null,
  });
  const [screen, setScreen] = useState<"calendar" | "review" | "edit">("calendar");
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [combinedWorkflow, setCombinedWorkflow] = useState<"modal" | "review" | "edit" | null>(null);
  const [combinedModalStartIndex, setCombinedModalStartIndex] = useState(0);
  const [socialWorkflowChannel, setSocialWorkflowChannel] = useState<PreviewChannel>("facebook");
  const [socialEditDraft, setSocialEditDraft] = useState<ChannelDraft | null>(null);
  const [applyChanges, setApplyChanges] = useState<{ source: PreviewChannel; message: string } | null>(null);
  const [v4EmailMessage, setV4EmailMessage] = useState(INITIAL_EMAIL_MESSAGE);
  const [v4WebsiteMessage, setV4WebsiteMessage] = useState(INITIAL_WEBSITE_MESSAGE);
  const [v4GoogleDeleted, setV4GoogleDeleted] = useState(false);
  const [deleteToastVisible, setDeleteToastVisible] = useState(false);
  const [scheduleToastVisible, setScheduleToastVisible] = useState(false);
  const [contextualToast, setContextualToast] = useState<ContextualToast | null>(null);
  const [saturdayCompletion, setSaturdayCompletion] = useState<CalendarChannel[] | null>(null);
  const [scale, setScale] = useState(1);
  const frameHeight = 1024;
  const totalHeight = frameHeight + 60;
  const v4SidebarFree = version === "v4" && (
    combinedWorkflow === "review"
    || combinedWorkflow === "edit"
    || (combinedWorkflow === null && screen !== "calendar")
  );
  const sharedCalendarDraft = version === "v1"
    ? { message, images }
    : { message: v3Message, images: v3Images };
  const calendarPreviews: Record<PreviewChannel, ChannelDraft> =
    version === "v2" || version === "v4"
    ? {
        google: (version === "v4" ? v4Drafts : v2Drafts).google,
        facebook: (version === "v4" ? v4Drafts : v2Drafts).facebook,
        instagram: (version === "v4" ? v4Drafts : v2Drafts).instagram,
      }
    : {
        google: sharedCalendarDraft,
        facebook: sharedCalendarDraft,
        instagram: sharedCalendarDraft,
      };
  const showContextualToast = (message: string) => {
    setDeleteToastVisible(false);
    setScheduleToastVisible(false);
    setContextualToast((current) => ({ message, id: (current?.id ?? 0) + 1 }));
  };
  const switchVersion = (nextVersion: PrototypeVersion) => {
    if (LOCKED_VERSION) return;
    if (nextVersion === version) return;

    setMessage(INITIAL_V1_MESSAGE);
    setImages([...INITIAL_IMAGES]);
    setV2Drafts(createInitialV2Drafts());
    setV4Drafts(createInitialV4Drafts());
    setV3Message(INITIAL_V3_MESSAGE);
    setV3Images([...INITIAL_IMAGES]);
    setEnabledChannels({
      google: true,
      facebook: true,
      instagram: true,
    });
    setScheduledChannels({ v1: null, v2: null, v4: null });
    setVersion(nextVersion);
    setScreen("calendar");
    setCalendarModalOpen(false);
    setCombinedWorkflow(null);
    setCombinedModalStartIndex(0);
    setSocialWorkflowChannel("facebook");
    setSocialEditDraft(null);
    setApplyChanges(null);
    setV4EmailMessage(INITIAL_EMAIL_MESSAGE);
    setV4WebsiteMessage(INITIAL_WEBSITE_MESSAGE);
    setV4GoogleDeleted(false);
    setDeleteToastVisible(false);
    setScheduleToastVisible(false);
    setContextualToast(null);
    setSaturdayCompletion(null);
  };
  const toggleChannel = (channel: PreviewChannel) => {
    setEnabledChannels((current) => ({ ...current, [channel]: !current[channel] }));
  };

  useEffect(() => {
    if (!scheduleToastVisible) return;

    const timeout = window.setTimeout(() => setScheduleToastVisible(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [scheduleToastVisible]);

  useEffect(() => {
    if (!deleteToastVisible) return;
    const timeout = window.setTimeout(() => setDeleteToastVisible(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [deleteToastVisible]);

  useEffect(() => {
    if (!contextualToast) return;
    const timeout = window.setTimeout(() => setContextualToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [contextualToast]);

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

  return (
    <div className="viewport-stage">
      <div
        className="prototype-page"
        style={{ "--prototype-scale": scale, height: totalHeight } as React.CSSProperties}
      >
        <div className="ab-toolbar">
          <span>Daisy chain all 5 channels</span>
          {!LOCKED_VERSION && <div className="version-switcher" aria-label="Prototype version">
            <button
              className={version === "v1" ? "selected" : ""}
              type="button"
              onClick={() => switchVersion("v1")}
            >
              Version 1
            </button>
            <button
              className={version === "v2" ? "selected" : ""}
              type="button"
              onClick={() => switchVersion("v2")}
            >
              Version 2
            </button>
            <button
              className={version === "v3" ? "selected" : ""}
              type="button"
              onClick={() => switchVersion("v3")}
            >
              Version 3
            </button>
            <button
              className={version === "v4" ? "selected" : ""}
              type="button"
              onClick={() => switchVersion("v4")}
            >
              Version 4
            </button>
          </div>}
        </div>
        <div
          className={`prototype-frame${v4SidebarFree ? " sidebar-free" : ""}`}
          style={{ height: frameHeight }}
        >
          {combinedWorkflow === "review" ? (
            <>
              <VersionFourSocialReview
                channel={socialWorkflowChannel}
                draft={v4Drafts[socialWorkflowChannel]}
                inactive={applyChanges !== null}
                onBack={() => {
                  setApplyChanges(null);
                  setCombinedModalStartIndex(
                    socialWorkflowChannel === "facebook"
                      ? (v4GoogleDeleted ? 0 : 1)
                      : (v4GoogleDeleted ? 1 : 2),
                  );
                  setCombinedWorkflow("modal");
                }}
                onEdit={() => {
                  setApplyChanges(null);
                  setSocialEditDraft({
                    ...v4Drafts[socialWorkflowChannel],
                    images: [...v4Drafts[socialWorkflowChannel].images],
                  });
                  setCombinedWorkflow("edit");
                }}
              />
              {applyChanges && (
                <ApplyChangesDialog
                  source={applyChanges.source}
                  googleAvailable={!v4GoogleDeleted}
                  onClose={() => setApplyChanges(null)}
                  onApply={(channels) => {
                    const socialChannels = channels.filter((
                      channel,
                    ): channel is PreviewChannel => (
                      channel === "google" || channel === "facebook" || channel === "instagram"
                    ));
                    setV4Drafts((current) => {
                      const next = { ...current };
                      socialChannels.forEach((channel) => {
                        next[channel] = { ...next[channel], message: applyChanges.message };
                      });
                      return next;
                    });
                    if (channels.includes("email")) setV4EmailMessage(applyChanges.message);
                    if (channels.includes("website")) setV4WebsiteMessage(applyChanges.message);
                    setApplyChanges(null);
                  }}
                />
              )}
            </>
          ) : combinedWorkflow === "edit" && socialEditDraft ? (
            <>
              <VersionFourSocialEditor
                channel={socialWorkflowChannel}
                draft={socialEditDraft}
                setDraft={setSocialEditDraft}
                onCancel={() => {
                  setSocialEditDraft(null);
                  setCombinedWorkflow("review");
                }}
                onSave={() => {
                  setV4Drafts((current) => ({
                    ...current,
                    [socialWorkflowChannel]: {
                      ...socialEditDraft,
                      images: [...socialEditDraft.images],
                    },
                  }));
                  setApplyChanges({
                    source: socialWorkflowChannel,
                    message: socialEditDraft.message,
                  });
                  setSocialEditDraft(null);
                  setCombinedWorkflow("review");
                }}
              />
            </>
          ) : screen === "calendar" ? (
            <>
              <CompactSideNavigation />
              <TopBar compact staticControls marketingEssentials={version !== "v3"} />
              <CalendarScreen
                updated={version !== "v3"}
                targetPublished={version !== "v3" && scheduledChannels[version] !== null}
                combinedPublished={saturdayCompletion !== null}
                targetChannels={version !== "v3"
                  ? PREVIEW_CHANNEL_ORDER
                    .filter((channel) => scheduledChannels[version]?.[channel])
                    .map((channel) => CALENDAR_CHANNEL_BY_PREVIEW[channel])
                  : undefined}
                onOpenPost={() => setCalendarModalOpen(true)}
                onOpenCombinedPost={() => {
                  if (version === "v4") {
                    setCombinedModalStartIndex(0);
                    setCombinedWorkflow("modal");
                  }
                }}
                combinedInteractive={version === "v4"}
                combinedChannels={saturdayCompletion
                  ?? (version === "v4" && v4GoogleDeleted
                    ? ["Facebook post", "Instagram post", "Email", "Website"]
                    : undefined)}
              />
              {calendarModalOpen && (
                <CalendarContextModal
                  previews={calendarPreviews}
                  enabledChannels={enabledChannels}
                  onToggleChannel={toggleChannel}
                  onClose={() => setCalendarModalOpen(false)}
                  onEdit={() => {
                    setCalendarModalOpen(false);
                    setScreen("review");
                  }}
                />
              )}
              {combinedWorkflow === "modal" && version === "v4" && (
                <VersionFourContextModal
                  drafts={v4Drafts}
                  emailMessage={v4EmailMessage}
                  websiteMessage={v4WebsiteMessage}
                  initialIndex={combinedModalStartIndex}
                  googleAvailable={!v4GoogleDeleted}
                  onClose={() => {
                    setCombinedModalStartIndex(0);
                    setCombinedWorkflow(null);
                  }}
                  onSocialEdit={(channel) => {
                    setSocialWorkflowChannel(channel);
                    setApplyChanges(null);
                    setCombinedWorkflow("review");
                  }}
                  onDeleteGoogle={() => {
                    setV4GoogleDeleted(true);
                    setCombinedModalStartIndex(0);
                    setContextualToast(null);
                    setDeleteToastVisible(true);
                  }}
                  onAction={(channel, action, final) => {
                    showContextualToast(contextualSuccessMessage(channel, action));
                    if (!final) return;
                    setSaturdayCompletion(CONTEXTUAL_CHANNELS
                      .filter(({ id }) => id !== "google" || !v4GoogleDeleted)
                      .map(({ id }) => (
                        id === "google"
                          ? "Google post"
                          : id === "facebook"
                            ? "Facebook post"
                            : id === "instagram"
                              ? "Instagram post"
                              : id === "email"
                                ? "Email"
                                : "Website"
                      )));
                    setCombinedModalStartIndex(0);
                    setCombinedWorkflow(null);
                  }}
                />
              )}
            </>
          ) : (
            <>
              {version !== "v4" && <SideNavigation />}
              {version !== "v4" && <TopBar />}
              {screen === "review" && version === "v3" ? (
                <VersionThreeReviewScreen
                  message={v3Message}
                  images={v3Images}
                  onEdit={() => setScreen("edit")}
                  onBack={() => setScreen("calendar")}
                />
              ) : screen === "review" ? (
                <ReviewScreen
                  message={
                    version === "v1"
                      ? message
                      : (version === "v4" ? v4Drafts : v2Drafts).google.message
                  }
                  images={
                    version === "v1"
                      ? images
                      : (version === "v4" ? v4Drafts : v2Drafts).google.images
                  }
                  enabledChannels={enabledChannels}
                  carouselDrafts={
                    version === "v2" ? v2Drafts : version === "v4" ? v4Drafts : undefined
                  }
                  onToggleChannel={toggleChannel}
                  onEdit={() => setScreen("edit")}
                  onBack={() => setScreen("calendar")}
                  onSchedule={() => {
                    if (version === "v1" || version === "v2" || version === "v4") {
                      setScheduledChannels((current) => ({
                        ...current,
                        [version]: { ...enabledChannels },
                      }));
                    }
                    setScreen("calendar");
                    setContextualToast(null);
                    setScheduleToastVisible(true);
                  }}
                />
              ) : version === "v3" ? (
                <VersionThreeEditScreen
                  message={v3Message}
                  setMessage={setV3Message}
                  images={v3Images}
                  setImages={setV3Images}
                  onCancel={() => setScreen("review")}
                />
              ) : version === "v2" || version === "v4" ? (
                <VersionTwoEditScreen
                  drafts={version === "v4" ? v4Drafts : v2Drafts}
                  setDrafts={version === "v4" ? setV4Drafts : setV2Drafts}
                  enabledChannels={enabledChannels}
                  onCancel={() => setScreen("review")}
                  allTabLabel={version === "v4" ? "Your posts" : undefined}
                  separateHashtags={version === "v4"}
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
            <div className="schedule-success-toast" role="status" aria-live="polite" key={contextualToast.id}>
              <CheckCircle2 size={22} />
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
          {deleteToastVisible && (
            <div className="google-delete-toast" role="status" aria-live="polite">
              <Check size={22} />
              <span>Google post is deleted</span>
              <button type="button" aria-label="Dismiss notification" onClick={() => setDeleteToastVisible(false)}>
                <X size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
