import { Button } from "@ui-sdk/react/button"
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import { useState } from "react"
import { ask } from "../api"
import type { AskResult, LabData } from "../api"
import { Section } from "../ui"
import { Picker } from "./Tables"

function Ask({ data }: { data: LabData }) {
  const versions = Object.keys(data.prompts)
  const [question, setQuestion] = useState("")
  const [version, setVersion] = useState(versions.includes("v3") ? "v3" : versions[0])
  const [result, setResult] = useState<AskResult | null>(null)
  const [error, setError] = useState("")

  const run = async () => {
    const text = question.trim()
    if (!text) return
    setError("")
    try {
      setResult(await ask(text, version))
    } catch (cause) {
      setResult(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <Section
      title="Ask the bot"
      hint="Send the bot a question. Each question calls claude -p once (twice for v3). The bot's documents are in Korean, so ask in Korean."
    >
      <div className="ask">
        <Field>
          <FieldLabel>Question</FieldLabel>
          <Input
            value={question}
            onValueChange={(value) => setQuestion(value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) void run()
            }}
            placeholder="제주도로 4만원어치 주문하면 배송비가 얼마인가요?"
          />
          <FieldDescription>
            The policies cover shipping, returns and refunds, exchanges, membership and points,
            and payment and cancellation.
          </FieldDescription>
        </Field>
        <div className="controls">
          <Picker
            label="Prompt version"
            options={versions.map((item) => ({ value: item, label: item }))}
            value={version}
            onChange={setVersion}
          />
          <Button onClick={run} pendingAnnouncement="Getting an answer">
            Ask
          </Button>
        </div>
      </div>

      {error ? (
        <p className="callout" data-verdict="fail" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <dl className="kv answer">
          <dt>Answer</dt>
          <dd>{result.output}</dd>
          <dt>Retrieved</dt>
          <dd>
            {result.retrieval_context.map((doc) => (
              <p key={doc}>{doc}</p>
            ))}
          </dd>
        </dl>
      ) : null}
    </Section>
  )
}

export { Ask }
