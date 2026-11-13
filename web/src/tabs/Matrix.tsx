import { Button } from "@ui-sdk/react/button"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@ui-sdk/react/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Toggle } from "@ui-sdk/react/toggle"
import { useEffect, useMemo, useState } from "react"
import { CORRECTNESS, evalRuns, fmt } from "../api"
import type { EvalCase, EvalRun, LabData } from "../api"
import { kindLabel } from "../labels"
import { ScoreMeter, Section, Tag } from "../ui"

interface Jump {
  label: string
  id: string
  metric: string
  nonce: number
}

interface Cell {
  run: number
  id: string
}

function Matrix({ data, jump }: { data: LabData; jump: Jump | null }) {
  const runs = evalRuns(data)
  const metrics = useMemo(
    () => [...new Set(runs.flatMap((run) => Object.keys(run.metrics)))],
    [runs],
  )
  const [metric, setMetric] = useState(CORRECTNESS)
  const [failedOnly, setFailedOnly] = useState(false)
  const [cell, setCell] = useState<Cell | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!jump) return
    const run = runs.findIndex((item) => item.label === jump.label)
    if (run < 0) return
    setMetric(jump.metric)
    setFailedOnly(false)
    setCell({ run, id: jump.id })
    setOpen(true)
  }, [jump?.nonce])

  const info = new Map<string, EvalCase>()
  for (const run of runs)
    for (const item of run.cases) if (!info.has(item.id)) info.set(item.id, item)
  const everFailed = (id: string) =>
    runs.some((run) => {
      const result = run.cases.find((item) => item.id === id)?.metrics[metric]
      return result ? !result.success : false
    })
  const ids = [...info.keys()].sort().filter((id) => !failedOnly || everFailed(id))

  const run: EvalRun | undefined = cell ? runs[cell.run] : undefined
  const detail = run?.cases.find((item) => item.id === cell?.id)

  return (
    <Section
      title="Case comparison"
      hint="Each row is a golden and each column is an evaluation run. Press a cell to open that run's answer and the judge's reason. A dash means the golden was not in that run's golden set."
    >
      <div className="controls">
        <Select
          items={metrics}
          value={metric}
          onValueChange={(value) => {
            if (typeof value === "string") setMetric(value)
          }}
        >
          <SelectLabel>Metric</SelectLabel>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Toggle pressed={failedOnly} onPressedChange={setFailedOnly}>
          Only cases that ever failed
        </Toggle>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Kind</th>
              <th>Question</th>
              {runs.map((item) => (
                <th key={item.label} className="num">
                  {item.label}
                  <span className="sub">
                    {item.prompt_version} · {item.goldens}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <tr key={id}>
                <td className="strong">{id}</td>
                <td>
                  <Tag>{kindLabel(info.get(id)?.kind)}</Tag>
                </td>
                <td>{info.get(id)?.input}</td>
                {runs.map((item, index) => {
                  const result = item.cases.find((c) => c.id === id)?.metrics[metric]
                  if (!result)
                    return (
                      <td key={item.label} className="num muted">
                        –
                      </td>
                    )
                  return (
                    <td key={item.label} className="num">
                      <Button
                        className="score"
                        data-verdict={result.success ? "pass" : "fail"}
                        data-current={
                          open && cell?.run === index && cell.id === id ? "" : undefined
                        }
                        onClick={() => {
                          setCell({ run: index, id })
                          setOpen(true)
                        }}
                      >
                        <span className="sr-only">
                          {id} {item.label} {result.success ? "passed" : "failed"}
                        </span>
                        {result.success ? "✓" : "✗"} {fmt(result.score)}
                      </Button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer side="right" open={open} onOpenChange={setOpen}>
        <DrawerBackdrop />
        <DrawerContent className="case-drawer">
          {run && detail ? (
            <>
              <div className="drawer-head">
                <DrawerTitle>
                  {detail.id} · {run.label}
                </DrawerTitle>
                <DrawerClose>Close</DrawerClose>
              </div>
              <DrawerDescription>
                Prompt {run.prompt_version} · golden set {run.goldens} ·{" "}
                {kindLabel(detail.kind)}
              </DrawerDescription>
              <div className="drawer-body">
                <dl className="kv">
                  <dt>Question</dt>
                  <dd>{detail.input}</dd>
                  <dt>Expected</dt>
                  <dd>{detail.expected_output}</dd>
                  <dt>Actual</dt>
                  <dd>{detail.actual_output}</dd>
                  <dt>Retrieved</dt>
                  <dd>
                    {(detail.retrieval_context ?? []).map((doc) => (
                      <div key={doc}>{doc.split("\n")[0]}</div>
                    ))}
                  </dd>
                </dl>
                {Object.entries(detail.metrics).map(([name, result]) => (
                  <div key={name} className="metric-block">
                    <ScoreMeter label={name} score={result.score} ok={result.success} />
                    <p className="reason">
                      {result.success ? "Passed" : "Failed"} · threshold{" "}
                      {fmt(result.threshold)}
                      <br />
                      {result.reason ?? result.error ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <DrawerTitle>No cell selected</DrawerTitle>
          )}
        </DrawerContent>
      </Drawer>
    </Section>
  )
}

export { Matrix }
export type { Jump }
