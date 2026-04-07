import nodemailer from "nodemailer";
import { requireEnv, optionalEnv } from "@/lib/env";

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string[];
};

export function getMailConfig(): MailConfig {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const secure = String(optionalEnv("SMTP_SECURE") ?? "false").toLowerCase() === "true";
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const from = requireEnv("NOTIFY_EMAIL_FROM");
  const toRaw = requireEnv("NOTIFY_EMAIL_TO");
  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid number");
  }
  if (to.length === 0) throw new Error("NOTIFY_EMAIL_TO must have at least 1 recipient");

  return { host, port, secure, user, pass, from, to };
}

export function createTransport() {
  const cfg = getMailConfig();
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}
