import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MegaMenu } from "@/components/MegaMenu";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchBox } from "@/components/SearchBox";
import { store, directionsUrl } from "@/config/store";
import { categories, exampleSearch, OPEN_TIME, CLOSED_TIME, storeHours } from "./fixtures";
import { FOCUS, HOVER } from "./states";

const meta: Meta = { title: "Components/Navigation", parameters: { layout: "fullscreen" } };
export default meta;

const header = (now: Date) => <Header categories={categories} phone={store.phone} hours={storeHours} now={now} search={(q) => exampleSearch(q)} onSearch={() => {}} />;
export const HeaderOpen: StoryObj = { name: "Header (store open)", render: () => header(OPEN_TIME) };
export const HeaderClosed: StoryObj = { name: "Header (store closed)", render: () => header(CLOSED_TIME) };
export const HeaderMobile: StoryObj = { render: () => header(OPEN_TIME), globals: { viewport: { value: "mobile2" } } };

export const MegaMenuDefault: StoryObj = { name: "Mega menu", render: () => <div className="h-96 px-4"><MegaMenu categories={categories} /></div> };
export const MegaMenuHover: StoryObj = { name: "Mega menu (hover)", render: MegaMenuDefault.render, parameters: HOVER };
export const MegaMenuFocus: StoryObj = { name: "Mega menu (focus-visible)", render: MegaMenuDefault.render, parameters: FOCUS };
export const MegaMenuOpen: StoryObj = {
  name: "Mega menu (open)",
  render: MegaMenuDefault.render,
  play: async ({ canvasElement }) => { (canvasElement.querySelector("nav button") as HTMLButtonElement | null)?.click(); },
};

export const Crumbs: StoryObj = { name: "Breadcrumbs", render: () => <div className="p-4"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Beer & Seltzers", href: "/c/beer" }, { label: "Light beer", href: "/c/beer/light-beer" }, { label: "Coors Light 30 pk" }]} /></div> };

const box = (opts?: { delay?: number; fail?: boolean }, disabled?: boolean) => () => (
  <div className="h-96 max-w-xl p-4"><SearchBox disabled={disabled} search={(q) => exampleSearch(q, opts)} onSubmit={() => {}} /></div>
);
export const Search: StoryObj = { render: box() };
export const SearchHover: StoryObj = { render: box(), parameters: HOVER };
export const SearchFocus: StoryObj = { render: box(), parameters: FOCUS };
export const SearchLoading: StoryObj = {
  render: box({ delay: 60_000 }),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input") as HTMLInputElement;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "coors"); input.dispatchEvent(new Event("input", { bubbles: true }));
  },
};
export const SearchResults: StoryObj = { render: box(), play: SearchLoading.play };
export const SearchError: StoryObj = { render: box({ fail: true }), play: SearchLoading.play };
export const SearchDisabled: StoryObj = { render: box({}, true) };

export const SiteFooter: StoryObj = { name: "Footer", render: () => <Footer name={store.name} address={store.address} phone={store.phone} email={store.email} week={[...store.hours]} directionsHref={directionsUrl()} /> };
