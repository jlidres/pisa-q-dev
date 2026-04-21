export type AssessmentPayload = {
  subject: string
  grade: string
  exportedAt?: string
  source?: string
  units: unknown[]
}

export type AttemptPayload = {
  subject: string
  grade: string
  studentProfile: Record<string, unknown>
  responses: Record<string, unknown>
  scoreSummary?: Record<string, unknown>
}

export type PublishPayload = {
  subject: string
  grade: string
  actor?: string
}

export type DraftPayload = PublishPayload & {
  units: unknown[]
  exportedAt?: string
  source?: string
}