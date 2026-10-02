/**
 * Application mirror of the Prisma enums in prisma/schema.prisma.
 * Values and order must match. Drift check: node scripts/check-enum-sync.mjs
 */

export const Role = {
  READER: "READER",
  CONTRIBUTOR: "CONTRIBUTOR",
  REVIEWER: "REVIEWER",
  EDITOR: "EDITOR",
  LEGAL: "LEGAL",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LeaderStatus = {
  ACTIVE: "ACTIVE",
  DECEASED: "DECEASED",
  RETIRED: "RETIRED",
  UNDER_INVESTIGATION: "UNDER_INVESTIGATION",
} as const;
export type LeaderStatus = (typeof LeaderStatus)[keyof typeof LeaderStatus];

/** Public only as VERIFIED or DISPUTED. There is no separate PUBLISHED state. */
export const PublishState = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  VERIFIED: "VERIFIED",
  DISPUTED: "DISPUTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type PublishState = (typeof PublishState)[keyof typeof PublishState];

export const ClaimOutcome = {
  PENDING: "PENDING",
  FULFILLED: "FULFILLED",
  FAILED: "FAILED",
  RETRACTED: "RETRACTED",
  MODIFIED: "MODIFIED",
} as const;
export type ClaimOutcome = (typeof ClaimOutcome)[keyof typeof ClaimOutcome];

export const IncidentCategory = {
  FINANCIAL_OPACITY: "FINANCIAL_OPACITY",
  COERCED_GIVING: "COERCED_GIVING",
  LUXURY_FUNDING: "LUXURY_FUNDING",
  SCANDAL_MORAL: "SCANDAL_MORAL",
  EMOTIONAL_MANIPULATION: "EMOTIONAL_MANIPULATION",
  ISOLATION_TACTICS: "ISOLATION_TACTICS",
  AUTHORITARIAN_CONTROL: "AUTHORITARIAN_CONTROL",
  DOCTRINAL_DEVIATION: "DOCTRINAL_DEVIATION",
  ABUSE_ALLEGATION: "ABUSE_ALLEGATION",
  LEGAL_FINDING: "LEGAL_FINDING",
  BITE_BEHAVIOR: "BITE_BEHAVIOR",
  BITE_INFORMATION: "BITE_INFORMATION",
  BITE_THOUGHT: "BITE_THOUGHT",
  BITE_EMOTIONAL: "BITE_EMOTIONAL",
} as const;
export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory];

export const BiteCategory = {
  BEHAVIOR: "BEHAVIOR",
  INFORMATION: "INFORMATION",
  THOUGHT: "THOUGHT",
  EMOTIONAL: "EMOTIONAL",
} as const;
export type BiteCategory = (typeof BiteCategory)[keyof typeof BiteCategory];

export const ScoreDimension = {
  PREDICTION: "PREDICTION",
  FINANCIAL: "FINANCIAL",
  BEHAVIORAL: "BEHAVIORAL",
  DOCTRINAL: "DOCTRINAL",
  CULTIC: "CULTIC",
} as const;
export type ScoreDimension = (typeof ScoreDimension)[keyof typeof ScoreDimension];

/** Incident rows never use PREDICTION. CULTIC incidents are not the cultic score input. */
export const IncidentDimension = {
  FINANCIAL: "FINANCIAL",
  BEHAVIORAL: "BEHAVIORAL",
  DOCTRINAL: "DOCTRINAL",
  CULTIC: "CULTIC",
} as const;
export type IncidentDimension = (typeof IncidentDimension)[keyof typeof IncidentDimension];

export const SourceTier = {
  PRIMARY: "PRIMARY",
  TIER1_MEDIA: "TIER1_MEDIA",
  SECONDARY: "SECONDARY",
  SOCIAL: "SOCIAL",
} as const;
export type SourceTier = (typeof SourceTier)[keyof typeof SourceTier];

export const EvidenceKind = {
  URL: "URL",
  ARCHIVE_SNAPSHOT: "ARCHIVE_SNAPSHOT",
  PDF: "PDF",
  VIDEO_TIMESTAMP: "VIDEO_TIMESTAMP",
  FILING: "FILING",
  SCREENSHOT: "SCREENSHOT",
} as const;
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];

export const VoteValue = {
  CONFIRM: "CONFIRM",
  REJECT: "REJECT",
  NEEDS_MORE: "NEEDS_MORE",
} as const;
export type VoteValue = (typeof VoteValue)[keyof typeof VoteValue];

export const ReviewKind = {
  COMMUNITY_REVIEW: "COMMUNITY_REVIEW",
  FINANCIAL_AUDIT: "FINANCIAL_AUDIT",
  BITE_ASSESSMENT: "BITE_ASSESSMENT",
} as const;
export type ReviewKind = (typeof ReviewKind)[keyof typeof ReviewKind];

export const ReplyStatus = {
  NOT_OFFERED: "NOT_OFFERED",
  OFFERED: "OFFERED",
  RECEIVED: "RECEIVED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const;
export type ReplyStatus = (typeof ReplyStatus)[keyof typeof ReplyStatus];

export const TakedownStatus = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  UPHELD: "UPHELD",
  REJECTED: "REJECTED",
} as const;
export type TakedownStatus = (typeof TakedownStatus)[keyof typeof TakedownStatus];

export const ContentTarget = {
  CLAIM: "CLAIM",
  INCIDENT: "INCIDENT",
  REVIEW: "REVIEW",
  PROFILE: "PROFILE",
  USER: "USER",
} as const;
export type ContentTarget = (typeof ContentTarget)[keyof typeof ContentTarget];

export const ScoreBand = {
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  LOW: "LOW",
  ELEVATED: "ELEVATED",
  HIGH: "HIGH",
  SEVERE: "SEVERE",
} as const;
export type ScoreBand = (typeof ScoreBand)[keyof typeof ScoreBand];

export const ModerationActionKind = {
  SUBMIT: "SUBMIT",
  MOVE_TO_REVIEW: "MOVE_TO_REVIEW",
  VERIFY: "VERIFY",
  REJECT: "REJECT",
  DISPUTE: "DISPUTE",
  WITHDRAW: "WITHDRAW",
  RESTORE: "RESTORE",
  EDIT: "EDIT",
  OFFER_REPLY: "OFFER_REPLY",
  RECORD_REPLY: "RECORD_REPLY",
  SUSPEND_USER: "SUSPEND_USER",
  REINSTATE_USER: "REINSTATE_USER",
  RESOLVE_TAKEDOWN: "RESOLVE_TAKEDOWN",
} as const;
export type ModerationActionKind = (typeof ModerationActionKind)[keyof typeof ModerationActionKind];
