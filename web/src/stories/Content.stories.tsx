import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs } from "@/components/Tabs";
import { Accordion, AccordionItem } from "@/components/Accordion";
import { ImageGallery } from "@/components/ImageGallery";
import { AnnouncementBar, HeroBanner } from "@/components/Banner";
import { Toast, ToastProvider, useToast } from "@/components/Toast";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StoreHours } from "@/components/StoreHours";
import { MapEmbed } from "@/components/MapEmbed";
import { store, directionsUrl } from "@/config/store";
import { CLOSED_TIME, OPEN_TIME, storeHours } from "./fixtures";
import { FOCUS, HOVER } from "./states";

const meta: Meta = { title: "Components/Content" };
export default meta;

const tabItems = [
  { id: "details", label: "Details", content: <p>Specs appear here when the store's data includes them.</p> },
  { id: "description", label: "Description", content: <p>Product description from the store's data.</p> },
  { id: "related", label: "Related", content: <p>Related products.</p> },
  { id: "reviews", label: "Reviews", content: null, disabled: true },
];
export const TabsDefault: StoryObj = { name: "Tabs", render: () => <Tabs items={tabItems} /> };
export const TabsHover: StoryObj = { name: "Tabs (hover)", render: () => <Tabs items={tabItems} />, parameters: HOVER };
export const TabsFocus: StoryObj = { name: "Tabs (focus-visible)", render: () => <Tabs items={tabItems} />, parameters: FOCUS };

const acc = (disabled?: boolean) => () => (
  <div className="max-w-md"><Accordion>
    <AccordionItem title="Parking" defaultOpen>Parking details will come from the store.</AccordionItem>
    <AccordionItem title="Holiday hours">Holiday hours will come from the store.</AccordionItem>
    <AccordionItem title="More details" disabled={disabled}>Example panel content.</AccordionItem>
  </Accordion></div>
);
export const AccordionDefault: StoryObj = { name: "Accordion", render: acc() };
export const AccordionHover: StoryObj = { name: "Accordion (hover)", render: acc(), parameters: HOVER };
export const AccordionFocus: StoryObj = { name: "Accordion (focus-visible)", render: acc(), parameters: FOCUS };
export const AccordionDisabled: StoryObj = { name: "Accordion (disabled item)", render: acc(true) };

const imgs = [
  { src: "/examples/example-front.svg", alt: "Example front image", width: 260, height: 320 },
  { src: "/examples/example-back.svg", alt: "Example back image", width: 260, height: 320 },
  { src: "/examples/example-pack.svg", alt: "Example pack image", width: 260, height: 320 },
];
export const Gallery: StoryObj = { render: () => <div className="max-w-md"><ImageGallery images={imgs} name="Example product" /></div> };
export const GalleryHover: StoryObj = { name: "Gallery (hover zoom)", render: Gallery.render, parameters: HOVER };
export const GalleryNoImage: StoryObj = { name: "Gallery (no image yet)", render: () => <div className="max-w-md"><ImageGallery images={[]} name="Poland Spring 24 pk" /></div> };
export const GalleryLoading: StoryObj = { name: "Gallery (loading)", render: () => <div className="max-w-md"><Skeleton className="aspect-square" /></div> };

export const Announcement: StoryObj = { render: () => <AnnouncementBar>Open every day, 7 am to 10 pm.</AnnouncementBar>, parameters: { layout: "fullscreen" } };
export const AnnouncementInfo: StoryObj = { render: () => <AnnouncementBar tone="info">Holiday hours will be posted here.</AnnouncementBar>, parameters: { layout: "fullscreen" } };
export const Hero: StoryObj = { render: () => <HeroBanner eyebrow="494 Sea Street, Quincy" title="Cold beer. Fresh deli. One stop." body="Beer, wine, spirits, deli and groceries under one roof for Houghs Neck, Germantown, Merrymount and Adams Shore." cta={{ label: "Shop beer", href: "/c/beer" }} /> };
export const HeroHover: StoryObj = { name: "Hero (hover)", render: Hero.render, parameters: HOVER };

function ToastDemo() {
  const push = useToast();
  return <div className="flex gap-2"><Button onClick={() => push("Link copied")}>Neutral</Button><Button variant="secondary" onClick={() => push("Message sent. We'll reply soon.", "success")}>Success</Button><Button variant="secondary" onClick={() => push("That didn't send. Try again.", "error")}>Error</Button></div>;
}
export const Toasts: StoryObj = { render: () => <ToastProvider><ToastDemo /></ToastProvider> };
export const ToastStatic: StoryObj = { name: "Toast (each tone)", render: () => <div className="flex flex-col items-start gap-2"><Toast message="Link copied" /><Toast tone="success" message="Message sent" /><Toast tone="error" message="That didn't send. Try again." /></div> };

export const Skeletons: StoryObj = { render: () => <div className="flex max-w-sm flex-col gap-2"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-40" /></div> };
export const Empty: StoryObj = { name: "Empty state", render: () => <EmptyState icon="tag" title="No deals right now">Check back soon, or browse the full store.</EmptyState> };
export const ErrorDefault: StoryObj = { name: "Error state", render: () => <ErrorState message="We couldn't load this page." onRetry={() => {}} /> };
export const ErrorRetrying: StoryObj = { name: "Error state (retrying)", render: () => <ErrorState message="We couldn't load this page." onRetry={() => {}} retrying /> };

export const HoursOpen: StoryObj = { name: "Store hours (open)", render: () => <div className="max-w-sm"><StoreHours {...storeHours} now={OPEN_TIME} /></div> };
export const HoursClosed: StoryObj = { name: "Store hours (closed)", render: () => <div className="max-w-sm"><StoreHours {...storeHours} now={CLOSED_TIME} /></div> };
export const HoursHoliday: StoryObj = { name: "Store hours (holiday example)", render: () => <div className="max-w-sm"><StoreHours {...storeHours} now={OPEN_TIME} holidays={[{ date: "2026-10-30", label: "Example holiday", hours: { open: "09:00", close: "18:00" } }]} /></div> };

const map = () => <div className="max-w-md"><MapEmbed query={`${store.name}, ${store.address.street}, ${store.address.city} ${store.address.region}`} title="Map to the store" directionsHref={directionsUrl()} address={`${store.address.street}, ${store.address.city}, ${store.address.region}`} /></div>;
export const Map: StoryObj = { render: map };
export const MapHover: StoryObj = { name: "Map (hover)", render: map, parameters: HOVER };
export const MapFocus: StoryObj = { name: "Map (focus-visible)", render: map, parameters: FOCUS };
