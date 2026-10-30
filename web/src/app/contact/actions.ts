"use server";
import { headers } from "next/headers";
import { store } from "@/config/store";

export type ContactState = {
  status: "idle" | "invalid" | "sent" | "unavailable" | "failed";
  errors?: Partial<Record<"name" | "email" | "message" | "captcha", string>>;
  values?: { name: string; email: string; message: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Configured when the spam check and email provider keys are set (see the runbook). */
export const contactConfigured = async () =>
  !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.RESEND_API_KEY && process.env.CONTACT_TO && process.env.CONTACT_FROM);

async function humanCheck(token: string, ip: string | null) {
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  return !!j.success;
}

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
  if (!(await contactConfigured())) return { status: "unavailable", values };

  const h = await headers();
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token || !(await humanCheck(token, h.get("cf-connecting-ip")))) {
    return { status: "invalid", errors: { captcha: "Please complete the check that you're not a robot, then send again." }, values };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM, to: [process.env.CONTACT_TO], reply_to: values.email,
      subject: `Website message from ${values.name}`,
      text: `${values.message}\n\n— ${values.name} <${values.email}>`,
      html: `<p>${esc(values.message).replace(/\n/g, "<br>")}</p><p>— ${esc(values.name)} &lt;${esc(values.email)}&gt;</p><p style="color:#657189">Sent from the ${esc(store.name)} website contact form.</p>`,
    }),
  }).catch(() => null);
  if (!r?.ok) {
    console.error(JSON.stringify({ msg: "contact send failed", status: r?.status ?? "network" }));
    return { status: "failed", values };
  }
  return { status: "sent" };
}
