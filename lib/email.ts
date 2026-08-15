/** Build Django-parity contact emails (subjects/bodies from webApp/views.py). */

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
};

export type BuiltEmails = {
  company: { subject: string; body: string; to: string };
  client: { subject: string; body: string; to: string };
};

export function buildContactEmails(
  payload: ContactPayload,
  companyTo = process.env.EMAIL_TO || "info@elnahass-sonsgroup.com",
): BuiltEmails {
  const { name, email, phone, outlineDesc: description } = payload;
  const recipientEmail = companyTo;

  const subject = "Client Wants To Contact You From Your Website";
  const body =
    `Someone Filled the Form and needs to Contact You:\nHis name is: ${name}\nHis email is: ${email}\n` +
    `His Phone is: ${phone}\n` +
    `His Description is: ${description}`;

  const subject2 =
    "Elnahass For Construction and Technology Interested in Your Project";
  const body2 =
    `Dear ${name},\n\n` +
    "I hope this message finds you well.\nWe would like to express our sincere appreciation for your " +
    "interest in our company, Elnahass For Construction and Technology. Your project has captured" +
    " our attention, and we are " +
    "eager to learn more about it.\nOur team is committed to delivering high-quality solutions and " +
    "services to our clients. We believe that your project aligns with our expertise and values, " +
    "and we are excited about the opportunity to collaborate with you.\n\nA representative from Elnahass " +
    "For Construction and Technology will be reaching out to you very soon to discuss your project in detail. We are " +
    "confident that our partnership will lead to success and innovation.\nIn the meantime, if you have " +
    "any immediate questions or would like to provide additional " +
    `information about your project, please do not hesitate to contact us at ${recipientEmail}.\n` +
    "Thank you once again for considering Elnahass For Construction and Technology as your trusted partner." +
    " We look forward to the opportunity to work with you and bring your vision to life.\n\n" +
    "Best regards,\n" +
    "From: Eng Alaa Elnahass\n" +
    "Co-Founder For: " +
    "Elnahass For Construction and Technology\n" +
    `${recipientEmail}`;

  return {
    company: { subject, body, to: recipientEmail },
    client: { subject: subject2, body: body2, to: email },
  };
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS,
  );
}

export async function sendContactEmails(
  payload: ContactPayload,
): Promise<{ sent: boolean; mocked: boolean; error?: string }> {
  const emails = buildContactEmails(payload);
  // Match Django fail_silently=True so Mongo insert still succeeds if SMTP fails.
  // Set EMAIL_FAIL_SILENTLY=0 to surface SMTP errors as thrown exceptions.
  const failSilently = process.env.EMAIL_FAIL_SILENTLY !== "0";

  if (!isSmtpConfigured()) {
    const missing = ["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS"].filter(
      (k) => !process.env[k],
    );
    console.error("[email] SMTP not configured — emails not sent", {
      missing,
      companyTo: emails.company.to,
      clientTo: emails.client.to,
      nodeEnv: process.env.NODE_ENV,
    });
    return {
      sent: false,
      mocked: true,
      error: `SMTP not configured (missing ${missing.join(", ")})`,
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.EMAIL_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER!;
    // Admin/company: new lead notification with reply-to = submitter
    await transporter.sendMail({
      from,
      to: emails.company.to,
      replyTo: payload.email,
      subject: emails.company.subject,
      text: emails.company.body,
    });
    // Submitter: acknowledgment / confirmation
    await transporter.sendMail({
      from,
      to: emails.client.to,
      subject: emails.client.subject,
      text: emails.client.body,
    });
    console.info("[email] sent company + client", {
      companyTo: emails.company.to,
      clientTo: emails.client.to,
    });
    return { sent: true, mocked: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", message);
    if (failSilently) {
      return { sent: false, mocked: false, error: message };
    }
    throw err;
  }
}
