import { AppBadge, type BadgeTone } from "@/components/app/Badge";

type AffiliationStatus =
  | "NOT_STARTED"
  | "IN_PROCESS"
  | "ACTIVE"
  | "REJECTED"
  | "NOT_POSSIBLE";

type RenewalStatus =
  | "NOT_STARTED"
  | "STARTED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

const AFFILIATION_SET = new Set<AffiliationStatus>([
  "NOT_STARTED",
  "IN_PROCESS",
  "ACTIVE",
  "REJECTED",
  "NOT_POSSIBLE",
]);

const RENEWAL_SET = new Set<RenewalStatus>([
  "NOT_STARTED",
  "STARTED",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
]);

function asAffiliationStatus(value: string): AffiliationStatus | null {
  return AFFILIATION_SET.has(value as AffiliationStatus)
    ? (value as AffiliationStatus)
    : null;
}

function asRenewalStatus(value: string): RenewalStatus | null {
  return RENEWAL_SET.has(value as RenewalStatus) ? (value as RenewalStatus) : null;
}

function toneForAffiliationStatus(status: AffiliationStatus): BadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "IN_PROCESS":
      return "info";
    case "NOT_STARTED":
      return "warning";
    case "REJECTED":
      return "danger";
    case "NOT_POSSIBLE":
      return "neutral";
  }
}

function labelForAffiliationStatus(status: AffiliationStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Activa";
    case "IN_PROCESS":
      return "En tramite";
    case "NOT_STARTED":
      return "No iniciada";
    case "REJECTED":
      return "Rechazada";
    case "NOT_POSSIBLE":
      return "No posible";
  }
}

export function AffiliationStatusBadge({ status }: { status: string }) {
  const s = asAffiliationStatus(status);
  if (!s) {
    return (
      <AppBadge tone="neutral" title={status}>
        {status}
      </AppBadge>
    );
  }
  return (
    <AppBadge tone={toneForAffiliationStatus(s)} title={s}>
      {labelForAffiliationStatus(s)}
    </AppBadge>
  );
}

function toneForRenewalStatus(status: RenewalStatus): BadgeTone {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return "success";
    case "SUBMITTED":
    case "STARTED":
      return "info";
    case "REJECTED":
      return "danger";
    case "NOT_STARTED":
      return "neutral";
  }
}

function labelForRenewalStatus(status: RenewalStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "No iniciada";
    case "STARTED":
      return "Iniciada";
    case "SUBMITTED":
      return "Enviada";
    case "APPROVED":
      return "Aprobada";
    case "REJECTED":
      return "Rechazada";
    case "COMPLETED":
      return "Completada";
  }
}

export function RenewalStatusBadge({ status }: { status: string }) {
  const s = asRenewalStatus(status);
  if (!s) {
    return (
      <AppBadge tone="neutral" title={status}>
        {status}
      </AppBadge>
    );
  }
  return (
    <AppBadge tone={toneForRenewalStatus(s)} title={s}>
      {labelForRenewalStatus(s)}
    </AppBadge>
  );
}
