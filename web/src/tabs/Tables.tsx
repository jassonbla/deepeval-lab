import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion"
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"
import { useState } from "react"
import { evalRuns, fmt } from "../api"
import type { ComponentRun, LabData, SpanScore, StabilityRun } from "../api"
import { kindLabel, originLabel, reviewNote, runNote } from "../labels"
import { ScoreChip, Section, Tag } from "../ui"

function Ledger({ data }: { data: LabData }) {
  const runs = evalRuns(data)
  const names = [...new Set(runs.flatMap((run) => Object.keys(run.metrics)))]

  return (
    <Section
      title="Run ledger"
      hint="One line per evaluation run (results/ledger.jsonl, append only). Each line records what changed together with the scores."
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Label</th>
              <th>Prompt</th>
              <th>Golden set</th>
              <th className="num">All passed</th>
              {names.map((name) => (
                <th key={name} className="num">
                  {name}
                  <span className="sub">average · passed</span>
                </th>
              ))}
              <th className="num">Seconds</th>
              <th>What changed</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.label}>
                <td className="muted">{run.at.slice(5, 16)}</td>
                <td className="strong">{run.label}</td>
                <td>
                  <Tag>{run.prompt_version}</Tag>
                </td>
                <td>
                  <Tag>{run.goldens}</Tag>
                </td>
                <td className="num">
                  {run.passed_cases}/{run.total_cases}
                </td>
                {names.map((name) => {
                  const metric = run.metrics[name]
                  return (
                    <td key={name} className="num">
                      {metric ? `${fmt(metric.avg)} · ${metric.passed}/${metric.total}` : "–"}
                    </td>
                  )
                })}
                <td className="num">{run.seconds}</td>
                <td>{runNote(run.label, run.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function Picker({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next)
      }}
    >
      <SegmentedControlIndicator />
      {options.map((option) => (
        <SegmentedControlItem key={option.value} value={option.value}>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

function SpanCell({ span }: { span: SpanScore }) {
  return (
    <>
      <ScoreChip ok={span.success} score={span.score} />
      <span className="sub">{(span.reason ?? "").slice(0, 220)}</span>
    </>
  )
}

function Components({ data }: { data: LabData }) {
  const runs = data.ledger.filter((row): row is ComponentRun => row.kind === "component")
  const [label, setLabel] = useState(runs[0]?.label ?? "")
  const run = runs.find((item) => item.label === label) ?? runs[0]

  return (
    <Section
      title="Component evaluation"
      hint="The retriever and the generator inside the bot are graded separately. The retriever is graded on whether its chunks relate to the question (Contextual Relevancy), the generator on whether its answer rests on those chunks (Faithfulness). A failing retriever with a passing generator points to retrieval. Contextual Relevancy is the share of relevant sentences across all chunks, so unrelated chunks lower it even when the right chunk is present."
    >
      {run ? (
        <>
          <div className="controls">
            <Picker
              label="Component run"
              options={runs.map((item) => ({
                value: item.label,
                label: `${item.label} (prompt ${item.prompt_version})`,
              }))}
              value={run.label}
              onChange={setLabel}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Retrieved chunks</th>
                  <th>Retriever</th>
                  <th>Generator</th>
                </tr>
              </thead>
              <tbody>
                {run.cases.map((item) => (
                  <tr key={item.id}>
                    <td className="strong">{item.id}</td>
                    <td>{item.input}</td>
                    <td className="muted">
                      {item.retrieved.map((doc) => (
                        <div key={doc}>{doc}</div>
                      ))}
                    </td>
                    <td>
                      <SpanCell span={item.retriever} />
                    </td>
                    <td>
                      <SpanCell span={item.llm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">Nothing recorded yet.</p>
      )}
    </Section>
  )
}

function Stability({ data }: { data: LabData }) {
  const runs = data.ledger.filter((row): row is StabilityRun => row.kind === "stability")

  return (
    <Section
      title="Judge stability"
      hint="The answers stayed the same and only the grading was repeated. Spread is the gap between the highest and lowest score. When the spread crosses the 0.7 threshold, the same answer goes between pass and fail."
    >
      {runs.length === 0 ? <p className="muted">Nothing recorded yet.</p> : null}
      {runs.map((run) => (
        <div key={run.label} className="block">
          <dl className="stats">
            <div>
              <dt>Source</dt>
              <dd>
                {run.source} · {run.cases.length} answers × {run.repeats}
              </dd>
            </div>
            <div>
              <dt>Mean spread</dt>
              <dd>{fmt(run.mean_spread)}</dd>
            </div>
            <div>
              <dt>Max spread</dt>
              <dd>{fmt(run.max_spread)}</dd>
            </div>
            <div>
              <dt>Flipped</dt>
              <dd>{run.flipped}</dd>
            </div>
          </dl>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th className="num">First score</th>
                  <th>Regraded scores</th>
                  <th className="num">Spread</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {run.cases.map((item) => (
                  <tr key={item.id}>
                    <td className="strong">{item.id}</td>
                    <td>{item.input}</td>
                    <td className="num">{fmt(item.first)}</td>
                    <td>{item.scores.map(fmt).join(" · ")}</td>
                    <td className="num">{fmt(item.spread)}</td>
                    <td className="verdict" data-verdict={item.flips ? "fail" : "pass"}>
                      {item.flips ? "Flipped" : "Stable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </Section>
  )
}

function Goldens({ data }: { data: LabData }) {
  const names = Object.keys(data.goldens)
  const [name, setName] = useState(names.includes("v1") ? "v1" : (names[0] ?? ""))
  const goldens = data.goldens[name] ?? []
  const synth = name === "synth_raw"

  return (
    <Section
      title="Golden sets"
      hint="v0 is 10 hand-written goldens. v1 adds 5 written from failures and 6 synthetic goldens that passed review, 21 in all. synth_raw holds the 10 goldens the DeepEval Synthesizer produced, with the review result. Claude, not a person, did the review."
    >
      <div className="controls">
        <Picker
          label="Golden set"
          options={names.map((item) => ({
            value: item,
            label: `${item} (${data.goldens[item].length})`,
          }))}
          value={name}
          onChange={setName}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{synth ? "Review" : "Kind · origin"}</th>
              <th>Question (input)</th>
              <th>Expected answer (expected_output)</th>
            </tr>
          </thead>
          <tbody>
            {goldens.map((golden) => (
              <tr key={golden.id}>
                <td className="strong">{golden.id}</td>
                <td>
                  {synth ? (
                    <>
                      <span className="verdict" data-verdict={golden.accepted ? "pass" : "fail"}>
                        {golden.accepted ? "✓ Accepted" : "✗ Rejected"}
                      </span>
                      <span className="sub">{reviewNote(golden.id, golden.review_note)}</span>
                    </>
                  ) : (
                    <>
                      <Tag>{kindLabel(golden.kind)}</Tag>
                      <span className="sub">{originLabel(golden.origin)}</span>
                    </>
                  )}
                </td>
                <td>{golden.input}</td>
                <td>{golden.expected_output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function Prompts({ data }: { data: LabData }) {
  const versions = Object.entries(data.prompts)

  return (
    <Section
      title="Prompt versions"
      hint="These are the points where the system under test changed. v1 is the baseline, v0_bad is deliberately bad, v2 fixes the baseline failures, and v3 adds a step that rewrites the search query into policy terms. The prompts are in Korean because the bot answers Korean customers."
    >
      <Accordion multiple defaultValue={["v1"]}>
        {versions.map(([name, prompt]) => (
          <AccordionItem key={name} value={name}>
            <AccordionHeader>
              <AccordionTrigger>
                <span className="trigger-row">
                  {name}
                  <Tag>{prompt.top_k} chunks</Tag>
                  {prompt.rewrite ? <Tag>query rewrite</Tag> : null}
                </span>
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <pre>{prompt.text}</pre>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

export { Components, Goldens, Ledger, Picker, Prompts, Stability }
