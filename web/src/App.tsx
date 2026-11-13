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
    <div className="page">
      <header className="masthead">
        <h1>DeepEval Lab</h1>
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
  )
}

export { App }
