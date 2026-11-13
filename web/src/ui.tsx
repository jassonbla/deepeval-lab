import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@ui-sdk/react/meter"
import type { ReactNode } from "react"
import { fmt } from "./api"

function ScoreChip({ ok, score }: { ok: boolean; score: number | null }) {
  return (
    <span className="chip" data-verdict={ok ? "pass" : "fail"}>
      {ok ? "✓" : "✗"} {fmt(score)}
    </span>
  )
}

function ScoreMeter({
  label,
  score,
  ok,
}: {
  label: string
  score: number | null
  ok: boolean
}) {
  return (
    <Meter
      value={score ?? 0}
      min={0}
      max={1}
      format={(value) => value.toFixed(2)}
      data-verdict={ok ? "pass" : "fail"}
    >
      <MeterLabel>{label}</MeterLabel>
      <MeterValue />
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {hint ? <p className="hint">{hint}</p> : null}
      {children}
    </section>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}

export { ScoreChip, ScoreMeter, Section, Tag }
