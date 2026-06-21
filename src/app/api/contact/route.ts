import { NextResponse } from "next/server";
import { escHtml } from "@/lib/escape";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const RECIPIENT_MAP: Record<string, string> = {
  "Γενικές":      "info@protupa.gr",
  "Πληροφορίες":  "info@protupa.gr",
  "Εκπαιδευτικά": "sales@protupa.gr",
  "Τεχνικά":      "support@protupa.gr",
};

export async function POST(req: Request) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
  }

  // 5 contact submissions per IP per 15 minutes — prevents email spam
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
           ?? req.headers.get("x-real-ip")
           ?? "unknown";
  const rl = await checkRateLimit(`contact:${ip}`, 5, 900);
  if (!rl.allowed) return tooManyRequests();

  let body: { name: string; email: string; school?: string; subject: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, school, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Συμπληρώστε όλα τα υποχρεωτικά πεδία." }, { status: 400 });
  }

  // Enforce max lengths to prevent abuse / oversized payloads.
  if (name.length > 200 || email.length > 254 || (school ?? "").length > 300 || subject.length > 100 || message.length > 5000) {
    return NextResponse.json({ error: "Ένα ή περισσότερα πεδία υπερβαίνουν το επιτρεπτό μέγεθος." }, { status: 400 });
  }

  // Escape all user-supplied strings before interpolating into HTML to prevent
  // injection attacks via email clients that render HTML.
  const safeName    = escHtml(name);
  const safeEmail   = escHtml(email);
  const safeSchool  = school ? escHtml(school) : null;
  const safeSubject = escHtml(subject);
  const safeMessage = escHtml(message);

  const recipient = RECIPIENT_MAP[subject] ?? "info@protupa.gr";

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f;">
      <div style="background: #056ef5; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">Νέο μήνυμα επικοινωνίας</h1>
        <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">Protypa.gr — ${safeSubject}</p>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; width: 120px; font-weight: bold;">Όνομα</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Email</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;"><a href="mailto:${safeEmail}" style="color: #056ef5;">${safeEmail}</a></td>
          </tr>
          ${safeSchool ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Φροντιστήριο</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${safeSchool}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Θέμα</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${safeSubject}</td>
          </tr>
        </table>
        <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #555; font-weight: bold;">Μήνυμα</p>
          <p style="margin: 0; font-size: 15px; color: #0a0a0f; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
        </div>
      </div>
    </div>
  `;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender:   { name: "Protypa.gr", email: "info@protupa.gr" },
      to:       [{ email: recipient }],
      replyTo:  { email: safeEmail, name: safeName },
      subject:  `[${safeSubject}] Μήνυμα από ${safeName}`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    console.error("Brevo error: HTTP", res.status);
    return NextResponse.json({ error: "Αποτυχία αποστολής. Δοκιμάστε ξανά." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
