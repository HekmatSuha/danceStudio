import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

const getSmtpConfig = (): SmtpConfig => {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "";

  if (!host) throw new Error("SMTP_HOST is not configured.");
  if (!from) throw new Error("SMTP_FROM is not configured.");
  if ((user && !pass) || (!user && pass)) {
    throw new Error("SMTP_USER and SMTP_PASS must both be set when using SMTP auth.");
  }

  return {
    host,
    port,
    secure,
    user: user || undefined,
    pass: pass || undefined,
    from,
  };
};

let cachedTransporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const config = getSmtpConfig();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });
  return cachedTransporter;
};

export async function sendInstructorWelcomeEmail(input: {
  to: string;
  firstName: string;
  loginEmail: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const config = getSmtpConfig();
  const transporter = getTransporter();

  const subject = "Your instructor account credentials";
  const text = [
    `Hi ${input.firstName || "Instructor"},`,
    "",
    "Your instructor account has been created.",
    "",
    `Login email: ${input.loginEmail}`,
    `Temporary password: ${input.tempPassword}`,
    "",
    `Login here: ${input.loginUrl}`,
    "",
    "Please sign in and change your password right away.",
  ].join("\n");

  const safeFirstName = input.firstName || "Instructor";
  const html = `
    <p>Hi ${safeFirstName},</p>
    <p>Your instructor account has been created.</p>
    <p><strong>Login email:</strong> ${input.loginEmail}<br/>
    <strong>Temporary password:</strong> ${input.tempPassword}</p>
    <p><a href="${input.loginUrl}">Sign in</a></p>
    <p>Please sign in and change your password right away.</p>
  `;

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject,
    text,
    html,
  });
}
