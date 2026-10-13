export type FormErrors = Record<string, string>;

interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  projectType: string;
  location: string;
  budget: string;
  message: string;
}

export interface FormResult {
  ok: boolean;
  errors?: FormErrors;
  error?: string;
}

function validateContact(form: ContactPayload): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Please enter your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (form.phone.trim() && form.phone.trim().length < 5) {
    errors.phone = "Please check the phone number.";
  }
  if (form.message.trim().length < 10) {
    errors.message =
      "Tell us a little more about your project (at least 10 characters).";
  }
  return errors;
}

export async function sendContactForm(
  form: ContactPayload,
): Promise<FormResult> {
  const errors = validateContact(form);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  let response: Response;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        projectType: form.projectType || undefined,
        location: form.location.trim() || undefined,
        budget: form.budget || undefined,
        message: form.message.trim(),
      }),
    });
  } catch {
    return {
      ok: false,
      error:
        "We couldn't reach the server. Check your connection and try again.",
    };
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 422 && data.errors) {
    return { ok: false, errors: data.errors as FormErrors };
  }
  if (!response.ok) {
    return {
      ok: false,
      error:
        data.error ??
        "We couldn't send your message. Please try again.",
    };
  }
  return { ok: true };
}
