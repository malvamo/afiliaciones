import "dotenv/config";

import { prisma } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { subMonths } from "@/lib/dates";
import { createTransport, getMailConfig } from "@/lib/mail";
import { dateKey } from "@/lib/tz";

function formatDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type DailyReportResult = {
  ok: true;
  sentTo: string[];
  renewalCount: number;
  renewalEscalationCount?: number;
  activationDelayCount: number;
  activationEscalationCount?: number;
  skipped?: boolean;
};

export async function runDailyRenewalReminder(): Promise<DailyReportResult> {
  const enabled =
    String(optionalEnv("DAILY_EMAIL_ENABLED") ?? "false").toLowerCase() ===
    "true";
  if (!enabled) {
    return {
      ok: true,
      sentTo: [],
      renewalCount: 0,
      activationDelayCount: 0,
      skipped: true,
    };
  }

  const now = new Date();
  const timeZone = optionalEnv("NOTIFY_TIMEZONE") ?? "America/New_York";
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayKey = dateKey(now, timeZone);

  const renewalCandidates = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null },
      renewalStatus: "NOT_STARTED",
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
      OR: [
        { lastNotifiedRenewalStartAt: null },
        { lastNotifiedRenewalStartAt: { lt: oneDayAgo } },
      ],
    },
    include: {
      specialist: { select: { firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, renewalLeadMonths: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 500,
  });

  const dueToday = renewalCandidates
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      const startKey = dateKey(startAt, timeZone);
      if (startKey !== todayKey) return null;

      // send once on the first day the window starts
      if (a.lastNotifiedRenewalStartAt) {
        const notifiedKey = dateKey(a.lastNotifiedRenewalStartAt, timeZone);
        if (notifiedKey >= startKey) return null;
      }
      return {
        id: a.id,
        specialist: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        startAt,
        expiresAt: a.expiresAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 200);

  const inProgressCandidates = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null },
      renewalStatus: { not: "NOT_STARTED" },
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
      OR: [
        { lastNotifiedRenewalEscalationAt: null },
        { lastNotifiedRenewalEscalationAt: { lt: oneDayAgo } },
      ],
    },
    include: {
      specialist: { select: { firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 800,
  });

  const escalationDays = [45, 30, 14, 7, 3, 1, 0];
  const renewalEscalations = inProgressCandidates
    .map((a) => {
      if (!a.expiresAt) return null;
      const expiresAt = a.expiresAt;

      const matchDays = escalationDays.find((days) => {
        const notifyAt = new Date(expiresAt.getTime() - days * 24 * 60 * 60 * 1000);
        return dateKey(notifyAt, timeZone) === todayKey;
      });
      if (typeof matchDays !== "number") return null;

      const notifyAt = new Date(expiresAt.getTime() - matchDays * 24 * 60 * 60 * 1000);
      const notifyKey = dateKey(notifyAt, timeZone);
      if (a.lastNotifiedRenewalEscalationAt) {
        const notifiedKey = dateKey(a.lastNotifiedRenewalEscalationAt, timeZone);
        if (notifiedKey >= notifyKey) return null;
      }

      return {
        id: a.id,
        specialist: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        renewalStatus: String(a.renewalStatus),
        expiresAt,
        daysLeft: matchDays,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 200);

  const activationCandidates = await prisma.affiliation.findMany({
    where: {
      status: { in: ["IN_PROCESS", "NOT_STARTED"] },
      requestedAt: { not: null },
      activatedAt: null,
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
      OR: [
        { lastNotifiedActivationAt: null },
        { lastNotifiedActivationAt: { lt: oneDayAgo } },
      ],
    },
    include: {
      specialist: { select: { firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, activationLeadMonths: true } },
    },
    orderBy: { requestedAt: "asc" },
    take: 500,
  });

  const activationDelayed = activationCandidates
    .map((a) => {
      if (!a.requestedAt) return null;
      const expectedAt = new Date(a.requestedAt);
      expectedAt.setMonth(
        expectedAt.getMonth() + (a.insurance.activationLeadMonths ?? 0)
      );
      const expectedKey = dateKey(expectedAt, timeZone);
      if (expectedKey !== todayKey) return null;

      if (a.lastNotifiedActivationAt) {
        const notifiedKey = dateKey(a.lastNotifiedActivationAt, timeZone);
        if (notifiedKey >= expectedKey) return null;
      }
      return {
        id: a.id,
        specialist: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        requestedAt: a.requestedAt,
        expectedAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 200);

  const activationEscalationCandidates = await prisma.affiliation.findMany({
    where: {
      status: { in: ["IN_PROCESS", "NOT_STARTED"] },
      requestedAt: { not: null },
      activatedAt: null,
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
      OR: [
        { lastNotifiedActivationEscalationAt: null },
        { lastNotifiedActivationEscalationAt: { lt: oneDayAgo } },
      ],
    },
    include: {
      specialist: { select: { firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, activationLeadMonths: true } },
    },
    orderBy: { requestedAt: "asc" },
    take: 800,
  });

  const activationEscalationDays = [7, 14, 30, 60];
  const activationEscalations = activationEscalationCandidates
    .map((a) => {
      if (!a.requestedAt) return null;
      const expectedAt = new Date(a.requestedAt);
      expectedAt.setMonth(
        expectedAt.getMonth() + (a.insurance.activationLeadMonths ?? 0)
      );

      const matchDays = activationEscalationDays.find((days) => {
        const notifyAt = new Date(expectedAt.getTime() + days * 24 * 60 * 60 * 1000);
        return dateKey(notifyAt, timeZone) === todayKey;
      });
      if (typeof matchDays !== "number") return null;

      const notifyAt = new Date(expectedAt.getTime() + matchDays * 24 * 60 * 60 * 1000);
      const notifyKey = dateKey(notifyAt, timeZone);
      if (a.lastNotifiedActivationEscalationAt) {
        const notifiedKey = dateKey(a.lastNotifiedActivationEscalationAt, timeZone);
        if (notifiedKey >= notifyKey) return null;
      }

      return {
        id: a.id,
        specialist: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        requestedAt: a.requestedAt,
        expectedAt,
        daysAfterExpected: matchDays,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 200);

  // If there is nothing to notify today, do not send an email.
  if (
    dueToday.length === 0 &&
    activationDelayed.length === 0 &&
    renewalEscalations.length === 0 &&
    activationEscalations.length === 0
  ) {
    return {
      ok: true,
      sentTo: [],
      renewalCount: 0,
      renewalEscalationCount: 0,
      activationDelayCount: 0,
      activationEscalationCount: 0,
      skipped: true,
    };
  }

  const cfg = getMailConfig();
  const transporter = createTransport();

  const dateLabel = formatDate(now, timeZone);
  const subject = `Afiliaciones - Recordatorio diario (${dateLabel})`;

  const text = [
    `Recordatorio diario (${dateLabel})`,
    "",
    `Renovaciones a iniciar hoy: ${dueToday.length}`,
    `Renovaciones en curso (alertas): ${renewalEscalations.length}`,
    `Activaciones demoradas: ${activationDelayed.length}`,
    `Activaciones demoradas (seguimiento): ${activationEscalations.length}`,
    "",
    ...dueToday.map(
      (r) =>
        `- ${r.specialist} | ${r.clinic} | ${r.insurance} | iniciar: ${formatDate(r.startAt, timeZone)} | vence: ${formatDate(r.expiresAt, timeZone)}`
    ),
    renewalEscalations.length ? "" : null,
    ...renewalEscalations.map(
      (r) =>
        `- RENOVACION EN CURSO | ${r.renewalStatus} | ${r.specialist} | ${r.clinic} | ${r.insurance} | vence: ${formatDate(r.expiresAt, timeZone)} | dias: ${r.daysLeft}`
    ),
    dueToday.length && activationDelayed.length ? "" : null,
    ...activationDelayed.map(
      (r) =>
        `- ACTIVACION DEMORADA | ${r.specialist} | ${r.clinic} | ${r.insurance} | solicitada: ${formatDate(r.requestedAt, timeZone)} | esperada: ${formatDate(r.expectedAt, timeZone)}`
    ),
    activationEscalations.length ? "" : null,
    ...activationEscalations.map(
      (r) =>
        `- ACTIVACION (SEGUIMIENTO) | +${r.daysAfterExpected} dias | ${r.specialist} | ${r.clinic} | ${r.insurance} | solicitada: ${formatDate(r.requestedAt, timeZone)} | esperada: ${formatDate(r.expectedAt, timeZone)}`
    ),
  ]
    .filter((x): x is string => typeof x === "string")
    .join("\n");

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; line-height:1.4">
    <h2 style="margin:0 0 8px">Recordatorio diario</h2>
    <div style="color:#555; margin:0 0 16px">${escapeHtml(dateLabel)} (${escapeHtml(timeZone)})</div>
    <div>Renovaciones a iniciar hoy: <b>${dueToday.length}</b></div>
    <div>Renovaciones en curso (alertas): <b>${renewalEscalations.length}</b></div>
    <div>Activaciones demoradas: <b>${activationDelayed.length}</b></div>
    <div>Activaciones demoradas (seguimiento): <b>${activationEscalations.length}</b></div>
    ${
      dueToday.length
        ? `<h3 style="margin:16px 0 8px">Renovaciones a iniciar hoy</h3>
           <ul>
             ${dueToday
               .map(
                 (r) =>
                   `<li>${escapeHtml(r.specialist)} | ${escapeHtml(r.clinic)} | ${escapeHtml(r.insurance)} | iniciar: ${escapeHtml(formatDate(r.startAt, timeZone))} | vence: ${escapeHtml(formatDate(r.expiresAt, timeZone))}</li>`
               )
               .join("")}
           </ul>`
        : ""
    }
    ${
      renewalEscalations.length
        ? `<h3 style="margin:16px 0 8px">Renovaciones en curso (alertas)</h3>
           <ul>
             ${renewalEscalations
               .map(
                 (r) =>
                   `<li>(${escapeHtml(String(r.daysLeft))} dias) ${escapeHtml(r.renewalStatus)} | ${escapeHtml(r.specialist)} | ${escapeHtml(r.clinic)} | ${escapeHtml(r.insurance)} | vence: ${escapeHtml(formatDate(r.expiresAt, timeZone))}</li>`
               )
               .join("")}
           </ul>`
        : ""
    }
    ${
      activationDelayed.length
        ? `<h3 style="margin:16px 0 8px">Activaciones demoradas</h3>
           <ul>
             ${activationDelayed
               .map(
                 (r) =>
                   `<li>${escapeHtml(r.specialist)} | ${escapeHtml(r.clinic)} | ${escapeHtml(r.insurance)} | solicitada: ${escapeHtml(formatDate(r.requestedAt, timeZone))} | esperada: ${escapeHtml(formatDate(r.expectedAt, timeZone))}</li>`
               )
               .join("")}
           </ul>`
        : ""
    }

    ${
      activationEscalations.length
        ? `<h3 style="margin:16px 0 8px">Activaciones demoradas (seguimiento)</h3>
           <ul>
             ${activationEscalations
               .map(
                 (r) =>
                   `<li>(+${escapeHtml(String(r.daysAfterExpected))} dias) ${escapeHtml(r.specialist)} | ${escapeHtml(r.clinic)} | ${escapeHtml(r.insurance)} | solicitada: ${escapeHtml(formatDate(r.requestedAt, timeZone))} | esperada: ${escapeHtml(formatDate(r.expectedAt, timeZone))}</li>`
               )
               .join("")}
           </ul>`
        : ""
    }
  </div>
  `.trim();

  await transporter.sendMail({
    from: cfg.from,
    to: cfg.to,
    subject,
    text,
    html,
  });

  if (dueToday.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: dueToday.map((d) => d.id) } },
      data: { lastNotifiedRenewalStartAt: now },
    });
  }

  if (renewalEscalations.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: renewalEscalations.map((d) => d.id) } },
      data: { lastNotifiedRenewalEscalationAt: now },
    });
  }

  if (activationDelayed.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: activationDelayed.map((d) => d.id) } },
      data: { lastNotifiedActivationAt: now },
    });
  }

  if (activationEscalations.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: activationEscalations.map((d) => d.id) } },
      data: { lastNotifiedActivationEscalationAt: now },
    });
  }

  return {
    ok: true,
    sentTo: cfg.to,
    renewalCount: dueToday.length,
    renewalEscalationCount: renewalEscalations.length,
    activationDelayCount: activationDelayed.length,
    activationEscalationCount: activationEscalations.length,
  };
}
