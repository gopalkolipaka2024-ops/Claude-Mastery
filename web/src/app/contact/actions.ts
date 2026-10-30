"use server";

export type ContactState = {
  status: "idle" | "invalid" | "sent" | "unavailable";
  errors?: Partial<Record<"name" | "email" | "message", string>>;
  values?: { name: string; email: string; message: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Server-side validation for the contact form. Delivery (email + Turnstile) is wired up in Phase 3. */
export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = {
    name: String(form.get("name") ?? "").trim().slice(0, 100),
    email: String(form.get("email") ?? "").trim().slice(0, 200),
    message: String(form.get("message") ?? "").trim().slice(0, 2000),
  };
  if (String(form.get("website") ?? "")) return { status: "sent" }; // honeypot: bots get a fake success
  const errors: ContactState["errors"] = {};
  if (!values.name) errors.name = "Enter your name.";
  if (!EMAIL.test(values.email)) errors.email = "Enter an email address like name@example.com.";
  if (values.message.length < 10) errors.message = "Write a little more so we can help (at least 10 characters).";
  if (Object.keys(errors).length) return { status: "invalid", errors, values };
  // TODO(phase 3): verify Cloudflare Turnstile token and send with Resend.
  return { status: "unavailable", values };
}
