import { revalidatePath } from "next/cache";

/* Page refresh after data changes. Product pages and the home page are pre-rendered;
   a webhook refreshes only the products it touched, a full sync or admin change refreshes everything.
   Listing and search pages render on request, so they pick up changes from the snapshot by themselves. */
export function revalidateChanges(slugs: string[], _departments: string[]) {
  for (const s of new Set(slugs)) revalidatePath(`/p/${s}`);
  revalidatePath("/");
  revalidatePath("/deals");
}

export function revalidateEverything() {
  revalidatePath("/", "layout");
}
