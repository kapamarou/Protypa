import { NextResponse } from "next/server";

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

  const recipient = RECIPIENT_MAP[subject] ?? "info@protupa.gr";

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f;">
      <div style="background: #056ef5; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">Νέο μήνυμα επικοινωνίας</h1>
        <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">Protypa.gr — ${subject}</p>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; width: 120px; font-weight: bold;">Όνομα</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Email</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;"><a href="mailto:${email}" style="color: #056ef5;">${email}</a></td>
          </tr>
          ${school ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Φροντιστήριο</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${school}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #555; font-weight: bold;">Θέμα</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0a0a0f;">${subject}</td>
          </tr>
        </table>
        <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #555; font-weight: bold;">Μήνυμα</p>
          <p style="margin: 0; font-size: 15px; color: #0a0a0f; line-height: 1.6; white-space: pre-wrap;">${message}</p>
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
      replyTo:  { email, name },
      subject:  `[${subject}] Μήνυμα από ${name}`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Brevo error:", err);
    return NextResponse.json({ error: "Αποτυχία αποστολής. Δοκιμάστε ξανά." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
