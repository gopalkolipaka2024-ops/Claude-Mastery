import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PriceBlock } from "@/components/PriceBlock";
import { StockBadge } from "@/components/StockBadge";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { products } from "./fixtures";
import { FOCUS, HOVER } from "./states";

const meta: Meta = { title: "Components/Product" };
export default meta;

export const Price: StoryObj = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-4">
      <div><p className="mb-2 text-xs text-text-muted">Regular</p><PriceBlock price={{ regularCents: 2899 }} /></div>
      <div><p className="mb-2 text-xs text-text-muted">Sale with end date</p><PriceBlock price={{ regularCents: 1999, saleCents: 1749, saleEndsAt: "2099-12-31" }} /></div>
      <div><p className="mb-2 text-xs text-text-muted">Sale ended (shows regular)</p><PriceBlock price={{ regularCents: 1999, saleCents: 1749, saleEndsAt: "2020-01-01" }} /></div>
      <div><p className="mb-2 text-xs text-text-muted">No price published</p><PriceBlock price={{ regularCents: null }} /></div>
      <div className="sm:col-span-4"><p className="mb-2 text-xs text-text-muted">Large (product page)</p><PriceBlock size="lg" price={{ regularCents: 1999, saleCents: 1749, saleEndsAt: "2099-12-31" }} /></div>
    </div>
  ),
};

export const Stock: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StockBadge quantity={40} /><StockBadge quantity={3} /><StockBadge quantity={0} />
      <span className="text-sm text-text-muted">Unknown stock renders nothing:</span><StockBadge quantity={null} />
    </div>
  ),
};

const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">{children}</div>;
export const Card: StoryObj = { render: () => <Grid>{products.map((p) => <ProductCard key={p.slug} product={p} />)}</Grid> };
export const CardHover: StoryObj = { ...Card, parameters: HOVER };
export const CardFocusVisible: StoryObj = { ...Card, parameters: FOCUS };
export const CardLoading: StoryObj = { render: () => <Grid>{[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}</Grid> };
export const CardError: StoryObj = { render: () => <ErrorState title="Products didn't load" message="We couldn't reach the catalog. Check your connection and try again." onRetry={() => {}} /> };
