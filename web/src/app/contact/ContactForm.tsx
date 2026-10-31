"use client";
import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/Button";
import { sendContact, type ContactState } from "./actions";

const field = "h-11 w-full rounded-md border bg-surface px-3 text-text";
const LABELS = { name: "Name", email: "Email", message: "Message", captcha: "Robot check" } as const;

export function ContactForm({ phone, turnstileKey }: { phone: { display: string; e164: string }; turnstileKey?: string | null }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.status !== "idle") summary.current?.focus(); }, [state]);
  const err = state.errors ?? {};
  const v = state.values;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div ref={summary} tabIndex={-1} aria-live="polite" className="outline-none">
        {state.status === "invalid" && (
          <div className="rounded-md bg-danger-50 p-3 text-danger-700">
            <p className="font-semibold">Please fix {Object.keys(err).length === 1 ? "this" : `these ${Object.keys(err).length} things`}:</p>
            <ul className="mt-1 list-disc pl-5">
              {(Object.keys(err) as (keyof typeof LABELS)[]).map((k) => (
                <li key={k}><a href={`#${k}`} className="inline-flex min-h-11 items-center underline">{LABELS[k]}: {err[k]}</a></li>
              ))}
            </ul>
          </div>
        )}
        {state.status === "sent" && <p className="rounded-md bg-success-50 p-3 text-success-700">Thanks. Your message was sent.</p>}
        {state.status === "failed" && (
          <p role="alert" className="rounded-md bg-danger-50 p-3 text-danger-700">
            Your message didn&apos;t go through on our side. Please try again in a minute, or call <a className="font-semibold underline" href={`tel:${phone.e164}`}>{phone.display}</a>.
          </p>
        )}
        {state.status === "limited" && (
          <p role="alert" className="rounded-md bg-warning-50 p-3 text-warning-700">
            Too many messages from your connection just now. Please wait a minute and try again, or call <a className="font-semibold underline" href={`tel:${phone.e164}`}>{phone.display}</a>.
          </p>
        )}
        {state.status === "unavailable" && (
          <p className="rounded-md bg-warning-50 p-3 text-warning-700">
            Online messages aren&apos;t switched on yet, so this wasn&apos;t sent. Please call <a className="font-semibold underline" href={`tel:${phone.e164}`}>{phone.display}</a>.
          </p>
        )}
      </div>
      <p className="text-sm text-text-muted">All fields are required.</p>
      {[
        { id: "name", label: "Name", type: "text", auto: "name" },
        { id: "email", label: "Email", type: "email", auto: "email" },
      ].map((f) => (
        <div key={f.id} className="flex flex-col gap-1">
          <label htmlFor={f.id} className="font-semibold">{f.label}</label>
          <input id={f.id} name={f.id} type={f.type} autoComplete={f.auto} defaultValue={v?.[f.id as "name"]} required
            aria-invalid={!!err[f.id as "name"] || undefined} aria-describedby={err[f.id as "name"] ? `${f.id}-err` : undefined}
            className={`${field} ${err[f.id as "name"] ? "border-danger-600" : "border-border-input"}`} />
          {err[f.id as "name"] && <p id={`${f.id}-err`} className="text-sm text-danger-600">{err[f.id as "name"]}</p>}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="font-semibold">Message</label>
        <textarea id="message" name="message" rows={5} defaultValue={v?.message} required aria-invalid={!!err.message || undefined} aria-describedby={err.message ? "message-err" : undefined}
          className={`w-full rounded-md border bg-surface p-3 ${err.message ? "border-danger-600" : "border-border-input"}`} />
        {err.message && <p id="message-err" className="text-sm text-danger-600">{err.message}</p>}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {turnstileKey && (
        <div className="flex flex-col gap-1">
          {/* Cloudflare Turnstile: usually invisible; loads only when the form is configured to send. */}
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div id="captcha" tabIndex={-1} className="cf-turnstile" data-sitekey={turnstileKey} data-theme="light" />
          {err.captcha && <p className="text-sm text-danger-600">{err.captcha}</p>}
        </div>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-fit">Send message</Button>
    </form>
  );
}
