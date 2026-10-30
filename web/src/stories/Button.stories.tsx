import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ACTIVE, FOCUS, HOVER } from "./states";

const meta: Meta<typeof Button> = { title: "Components/Button", component: Button, args: { children: "Call to confirm" } };
export default meta;
type S = StoryObj<typeof Button>;

const All = (args: Parameters<typeof Button>[0]) => (
  <div className="flex flex-wrap gap-3">
    {(["primary", "secondary", "ghost", "accent"] as const).map((v) => <Button key={v} {...args} variant={v}>{args.children} </Button>)}
  </div>
);
export const Default: S = { render: All };
export const Hover: S = { render: All, parameters: HOVER };
export const FocusVisible: S = { render: All, parameters: FOCUS };
export const Active: S = { render: All, parameters: ACTIVE };
export const Disabled: S = { render: All, args: { disabled: true } };
export const Loading: S = { render: All, args: { loading: true, children: "Checking" } };
export const WithIcon: S = { args: { children: <><Icon name="phone" size={18} />Call (617) 472-6455</> } };
export const Sizes: S = { render: (a) => <div className="flex items-center gap-3"><Button {...a} size="sm">Small</Button><Button {...a}>Medium</Button><Button {...a} size="lg">Large</Button></div> };
