import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FilterDrawer, FilterPanel, type FilterState } from "@/components/FilterPanel";
import { SortMenu, type SortValue } from "@/components/SortMenu";
import { LoadMore } from "@/components/LoadMore";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { facets } from "./fixtures";
import { FOCUS, HOVER } from "./states";

const meta: Meta = { title: "Components/Listing" };
export default meta;

function Panel({ disabled, initial = {} }: { disabled?: boolean; initial?: FilterState }) {
  const [v, setV] = useState<FilterState>(initial);
  return <div className="max-w-xs"><FilterPanel facets={facets} value={v} onChange={setV} disabled={disabled} /></div>;
}
export const Filters: StoryObj = { render: () => <Panel /> };
export const FiltersSelected: StoryObj = { render: () => <Panel initial={{ facets: { size: ["12 pk", "30 pk"] }, inStock: true }} /> };
export const FiltersHover: StoryObj = { render: () => <Panel />, parameters: HOVER };
export const FiltersFocus: StoryObj = { render: () => <Panel />, parameters: FOCUS };
export const FiltersDisabled: StoryObj = { name: "Filters (loading/disabled)", render: () => <Panel disabled /> };
export const FiltersPriceError: StoryObj = {
  name: "Filters (price error)",
  render: () => <Panel />,
  play: async ({ canvasElement }) => {
    const [min, max] = [...canvasElement.querySelectorAll('input[inputmode="decimal"]')] as HTMLInputElement[];
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(min, "50"); min!.dispatchEvent(new Event("input", { bubbles: true }));
    set.call(max, "10"); max!.dispatchEvent(new Event("input", { bubbles: true }));
  },
};

function Drawer() {
  const [v, setV] = useState<FilterState>({});
  return <FilterDrawer facets={facets} value={v} onChange={setV} resultCount={412} />;
}
export const MobileFilterDrawer: StoryObj = {
  render: () => <Drawer />, globals: { viewport: { value: "mobile2" } },
  play: async ({ canvasElement }) => { (canvasElement.querySelector("button") as HTMLButtonElement).click(); },
};

function Sort({ disabled }: { disabled?: boolean }) {
  const [v, setV] = useState<SortValue>("relevance");
  return <SortMenu value={v} onChange={setV} disabled={disabled} />;
}
export const SortDefault: StoryObj = { name: "Sort menu", render: () => <Sort /> };
export const SortHover: StoryObj = { name: "Sort menu (hover)", render: () => <Sort />, parameters: HOVER };
export const SortFocus: StoryObj = { name: "Sort menu (focus-visible)", render: () => <Sort />, parameters: FOCUS };
export const SortDisabled: StoryObj = { name: "Sort menu (disabled)", render: () => <Sort disabled /> };

export const LoadMoreDefault: StoryObj = { name: "Load more", render: () => <LoadMore shown={36} total={412} onLoadMore={() => {}} /> };
export const LoadMoreLoading: StoryObj = { name: "Load more (loading)", render: () => <LoadMore shown={36} total={412} onLoadMore={() => {}} loading /> };
export const LoadMoreError: StoryObj = { name: "Load more (error)", render: () => <LoadMore shown={36} total={412} error="More products didn't load." onRetry={() => {}} /> };
export const LoadMoreDone: StoryObj = { name: "Load more (all shown)", render: () => <LoadMore shown={412} total={412} /> };
export const LoadMoreNoJs: StoryObj = { name: "Load more (link fallback)", render: () => <LoadMore shown={36} total={412} nextHref="?page=2" /> };

export const NoResults: StoryObj = {
  render: () => (
    <EmptyState title="No matches for “corna extar”" actions={<><Button variant="secondary">Clear filters</Button><Button variant="ghost">Browse beer</Button></>}>
      <p>Did you mean <a className="font-semibold text-primary underline" href="#">corona extra</a>? Try fewer words, or call us and we'll check the shelf.</p>
    </EmptyState>
  ),
};
