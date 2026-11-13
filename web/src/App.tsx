import { Button } from "@ui-sdk/react/button"
import { Preferences, usePreference } from "@ui-sdk/react/preferences"
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { useEffect, useState } from "react"
import { CORRECTNESS, loadData, STATIC } from "./api"
import type { LabData } from "./api"
import { Ask } from "./tabs/Ask"
import { Guide } from "./tabs/Guide"
import { Matrix } from "./tabs/Matrix"
import type { Jump } from "./tabs/Matrix"
import { Overview } from "./tabs/Overview"
import { Components, Goldens, Ledger, Prompts, Stability } from "./tabs/Tables"
import { colorScheme } from "./theme"

const TABS = [
  ["guide", "Guide"],
  ["overview", "Overview"],
  ["ledger", "Run ledger"],
  ["matrix", "Case comparison"],
  ["component", "Component evaluation"],
  ["stability", "Judge stability"],
  ["goldens", "Golden sets"],
  ["prompts", "Prompts"],
  ["ask", "Ask the bot"],
] as const

const REPO = "https://github.com/jassonbla/deepeval-lab"

const VISIBLE = TABS.filter(([value]) => !(STATIC && value === "ask"))

const fromHash = () => {
  const name = location.hash.slice(1).split("/")[0]
  return VISIBLE.some(([value]) => value === name) ? name : "guide"
}

// #matrix/<run label>/<golden id> opens that cell, so a case can be linked to.
const jumpFromHash = (): Jump | null => {
  const [name, label, id] = location.hash.slice(1).split("/").map(decodeURIComponent)
  return name === "matrix" && label && id
    ? { label, id, metric: CORRECTNESS, nonce: Date.now() }
    : null
}

const SCHEMES = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
] as const

function SchemePicker() {
  const { value } = usePreference(colorScheme)
  return (
    <SegmentedControl
      aria-label="Color scheme"
      value={value}
      onValueChange={(next) => {
        const match = SCHEMES.find(([name]) => name === next)
        if (match) colorScheme.set(match[0])
      }}
    >
      <SegmentedControlIndicator />
      {SCHEMES.map(([name, label]) => (
        <SegmentedControlItem key={name} value={name}>
          {label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

function App() {
  const [data, setData] = useState<LabData | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState(fromHash)
  const [jump, setJump] = useState<Jump | null>(jumpFromHash)

  useEffect(() => {
    loadData().then(setData, (cause) => setError(String(cause)))
    const onHash = () => setTab(fromHash())
    addEventListener("hashchange", onHash)
    return () => removeEventListener("hashchange", onHash)
  }, [])

  const select = (value: string) => {
    setTab(value)
    history.replaceState(null, "", `#${value}`)
  }

  return (
    <Preferences preferences={[colorScheme]}>
    <div className="page">
      <header className="masthead">
        <div className="masthead-row">
          <h1>DeepEval Lab</h1>
          <div className="masthead-actions">
            <SchemePicker />
            <Button render={<a href={REPO} target="_blank" rel="noreferrer" />}>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
              GitHub
            </Button>
          </div>
        </div>
        <p>
          A record of improving a support bot for a made-up shop through evaluation.{" "}
          {STATIC
            ? `Static snapshot${data?.exported_at ? ` exported ${data.exported_at}` : ""}. The live "Ask the bot" tab runs only on the local server.`
            : "Reload after a new run."}
        </p>
      </header>

      {error ? (
        <p className="callout" data-verdict="fail" role="alert">
          Could not load the data: {error}
        </p>
      ) : null}
      {!data && !error ? <p className="muted">Loading.</p> : null}

      {data ? (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (typeof value === "string") select(value)
          }}
        >
          <TabsList aria-label="Lab results">
            {VISIBLE.map(([value, label]) => (
              <TabsTab key={value} value={value}>
                {label}
              </TabsTab>
            ))}
          </TabsList>
          <TabsPanel value="guide">
            <Guide
              data={data}
              onJump={(label, id, metric) => {
                setJump({ label, id, metric, nonce: Date.now() })
                select("matrix")
              }}
            />
          </TabsPanel>
          <TabsPanel value="overview">
            <Overview data={data} />
          </TabsPanel>
          <TabsPanel value="ledger">
            <Ledger data={data} />
          </TabsPanel>
          <TabsPanel value="matrix">
            <Matrix data={data} jump={jump} />
          </TabsPanel>
          <TabsPanel value="component">
            <Components data={data} />
          </TabsPanel>
          <TabsPanel value="stability">
            <Stability data={data} />
          </TabsPanel>
          <TabsPanel value="goldens">
            <Goldens data={data} />
          </TabsPanel>
          <TabsPanel value="prompts">
            <Prompts data={data} />
          </TabsPanel>
          {STATIC ? null : (
            <TabsPanel value="ask">
              <Ask data={data} />
            </TabsPanel>
          )}
        </Tabs>
      ) : null}
    </div>
    </Preferences>
  )
}

export { App }
