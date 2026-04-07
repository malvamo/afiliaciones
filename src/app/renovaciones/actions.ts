"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { RenewalStatus } from "@prisma/client";
import { addMonths, parseDateInputValue } from "@/lib/dates";

export async function startRenewal(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  if (!affiliationId) throw new Error("Missing affiliationId");

  await prisma.affiliation.update({
    where: { id: affiliationId },
    data: {
      renewalStatus: RenewalStatus.STARTED,
      renewalStartedAt: new Date(),
    },
  });


  redirect("/renovaciones");
}

export async function updateRenewal(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  const renewalStatus = String(formData.get("renewalStatus") ?? "").trim();
  const renewalNotes = String(formData.get("renewalNotes") ?? "").trim() || null;
  const newExpiresAt = parseDateInputValue(String(formData.get("newExpiresAt") ?? ""));
  if (!affiliationId) throw new Error("Missing affiliationId");

  const allowed = new Set([
    "NOT_STARTED",
    "STARTED",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
  ]);
  if (!allowed.has(renewalStatus)) throw new Error("Invalid renewalStatus");

  const current = await prisma.affiliation.findUnique({
    where: { id: affiliationId },
    select: {
      renewalStartedAt: true,
      expiresAt: true,
      activatedAt: true,
      insurance: { select: { termMonths: true } },
    },
  });
  if (!current) throw new Error("Affiliation not found");

  if (
    renewalStatus === "COMPLETED" &&
    newExpiresAt &&
    current.expiresAt &&
    newExpiresAt < current.expiresAt
  ) {
    throw new Error("newExpiresAt no puede ser anterior al vencimiento actual");
  }

  // When a renewal is completed, advance expiration and reset workflow
  // so the next cycle can be tracked again.
  if (renewalStatus === "COMPLETED") {
    const base = current.expiresAt ?? current.activatedAt ?? new Date();
    const nextExpiresAt = newExpiresAt ?? addMonths(base, current.insurance.termMonths ?? 12);

    await prisma.affiliation.update({
      where: { id: affiliationId },
      data: {
        expiresAt: nextExpiresAt,
        renewalStatus: RenewalStatus.NOT_STARTED,
        renewalNotes: null,
        renewalStartedAt: null,
        // allow future reminders to fire for the next window
        lastNotifiedRenewalAt: null,
        lastNotifiedRenewalStartAt: null,
        lastNotifiedRenewalEscalationAt: null,
      },
    });


    redirect("/renovaciones");
  }

  await prisma.affiliation.update({
    where: { id: affiliationId },
    data: {
      renewalStatus: renewalStatus as RenewalStatus,
      renewalNotes,
      renewalStartedAt:
        renewalStatus === "NOT_STARTED"
          ? null
          : current.renewalStartedAt ?? new Date(),
    },
  });


  redirect("/renovaciones");
}
