"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendContactForm,
  type FormErrors,
} from "@/lib/forms";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import Image from "next/image";

const PROJECT_TYPES = [
  "New home build",
  "Renovation",
  "Apartment / multi-unit",
  "Commercial",
  "Not sure yet",
] as const;

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  projectType: "",
  location: "",
  budget: "",
  message: "",
};

export default function ContactPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [serverMessage, setServerMessage] = useState("");

  function update(
    field: keyof typeof INITIAL,
    value: string,
  ) {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear the field error as the user types
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setServerMessage("");
    const result = await sendContactForm(form);
    if (result.ok) {
      setStatus("success");
      setForm(INITIAL);
    } else {
      setStatus("error");
      setErrors(result.errors ?? {});
      setServerMessage(
        result.error ??
          "We couldn't send your message. Please try again.",
      );
    }
    void router;
  }

  const inputClasses = (field: keyof typeof INITIAL) =>
    `w-full rounded-md border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-200"
        : "border-navy/20 focus:border-primary focus:ring-primary-light"
    }`;

  return (
    <>
      <section className="bg-navy py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            Contact
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Tell us about your project
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Share a few details and a project coordinator
            will respond within one working day.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.4fr]">
          {/* Side panel */}
          <div>
            <SectionHeading
              eyebrow="Get in touch"
              title="What happens next?"
            />
            <ol className="mt-8 space-y-5">
              {[
                "We review your project details and location.",
                "A coordinator confirms feasibility and next steps.",
                "You receive a written scope and quotation.",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-ink/75">
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            <div className="relative mt-10 overflow-hidden rounded-2xl shadow-card">
              <Image
                src="/images/handshake.jpg"
                alt="Project discussion between property owner and coordinator"
                width={640}
                height={420}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>

            <p className="mt-6 text-sm text-ink/55">
              Prefer to read first? See our{" "}
              <a
                href="/pricing"
                className="font-semibold text-primary hover:underline"
              >
                service packages
              </a>{" "}
              or the{" "}
              <a
                href="/how-it-works"
                className="font-semibold text-primary hover:underline"
              >
                project lifecycle
              </a>
              .
            </p>
          </div>

          {/* Form */}
          <div className="rounded-2xl bg-pale p-6 shadow-card sm:p-8">
            {status === "success" ? (
              <div
                role="status"
                className="flex flex-col items-center py-10 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="mt-5 text-2xl font-bold text-navy">
                  Your inquiry has been received
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/70">
                  Thank you, {form.name || "friend"}. A project
                  coordinator will reach out to{" "}
                  {form.email || "your email"} within one
                  working day.
                </p>
                <Button
                  href="/contact"
                  variant="navy"
                  className="mt-8"
                  onClick={() => setStatus("idle")}
                >
                  Send another inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Full name <span aria-hidden="true" className="text-accent-dark">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className={inputClasses("name")}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="contact-name-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Email <span aria-hidden="true" className="text-accent-dark">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className={inputClasses("email")}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="contact-email-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Phone <span className="font-normal text-ink/50">(optional)</span>
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className={inputClasses("phone")}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                    />
                    {errors.phone && (
                      <p id="contact-phone-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-location"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Project location
                    </label>
                    <input
                      id="contact-location"
                      type="text"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder="e.g. Karen, Nairobi"
                      className={inputClasses("location")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-type"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Project type
                    </label>
                    <select
                      id="contact-type"
                      value={form.projectType}
                      onChange={(e) => update("projectType", e.target.value)}
                      className={inputClasses("projectType")}
                    >
                      <option value="">Select one</option>
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-budget"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Budget range
                    </label>
                    <select
                      id="contact-budget"
                      value={form.budget}
                      onChange={(e) => update("budget", e.target.value)}
                      className={inputClasses("budget")}
                    >
                      <option value="">Select one</option>
                      <option>Under KES 2M</option>
                      <option>KES 2M – 5M</option>
                      <option>KES 5M – 10M</option>
                      <option>KES 10M – 25M</option>
                      <option>Over KES 25M</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="contact-message"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Project details <span aria-hidden="true" className="text-accent-dark">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Tell us about your project — location, size, timeline, and where you are based."
                      className={`${inputClasses("message")} resize-y`}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "contact-message-error" : undefined}
                    />
                    {errors.message && (
                      <p id="contact-message-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {errors.message}
                      </p>
                    )}
                  </div>
                </div>

                {status === "error" && serverMessage && (
                  <p
                    role="alert"
                    className="mt-5 flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {serverMessage}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink/55">
                    We respond within one working day. Your
                    details are only used for your inquiry.
                  </p>
                  <Button
                    type="submit"
                    disabled={status === "submitting"}
                    className="px-8"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      "Send Inquiry"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
