import { CORRECTNESS, evalRuns, fmt } from "../api"
import type { LabData } from "../api"
import { runNote } from "../labels"
import { ScoreMeter, Section, Tag } from "../ui"

function Overview({ data }: { data: LabData }) {
  const runs = evalRuns(data)
  const calls = Object.entries(data.calls)
  const total = calls.reduce(
    (sum, [, item]) => ({ count: sum.count + item.count, usd: sum.usd + item.api_price_usd }),
    { count: 0, usd: 0 },
  )

  return (
    <>
      <Section
        title="Change, measure, compare"
        hint="Each card is one evaluation run. The large number counts goldens that passed every metric. After each change to the prompt or the golden set, the same evaluation ran again."
      >
        <ol className="cards">
          {runs.map((run, index) => {
            const correctness = run.metrics[CORRECTNESS]
            return (
              <li key={run.label} className="card">
                <div className="card-label">
                  {index + 1}. {run.label}
                </div>
                <div className="card-big">
                  {run.passed_cases}
                  <span>/{run.total_cases}</span>
                </div>
                <ScoreMeter
                  label="Correctness average"
                  score={correctness?.avg ?? null}
                  ok={(correctness?.avg ?? 0) >= 0.7}
                />
                <div className="card-tags">
                  <Tag>prompt {run.prompt_version}</Tag>
                  <Tag>goldens {run.goldens}</Tag>
                </div>
                <p className="card-note">{runNote(run.label, run.note)}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section title="What this lab showed">
        <ul className="findings">
          <li>
            <b>Regressions get caught.</b> A deliberately bad prompt lowered the Correctness
            score.
          </li>
          <li>
            <b>The golden set sets the score.</b> The prompt that passed all 10 goldens fails some
            of the 21. A pass rate only means something within its golden set.
          </li>
          <li>
            <b>Where it fails.</b> Correctness can be low while Faithfulness is 1.0. The generator
            followed its documents, and the retriever handed it the wrong ones.
          </li>
          <li>
            <b>A fix can break something else.</b> v3 fixed two failures, and g10, which had
            passed, now fails.
          </li>
          <li>
            <b>Judge stability was measured.</b> With fixed grading steps, 10 answers were graded
            3 more times each. The spread is in Judge stability.
          </li>
          <li>
            <b>Synthetic goldens need review.</b> Some of the 10 synthesized goldens had a wrong or
            speculative expected answer.
          </li>
        </ul>
      </Section>

      <Section
        title="Model calls"
        hint={`Every call went through the claude -p subscription. USD is not a real charge; it is the API-price equivalent the CLI reports. The app model is ${data.app_model}.`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th className="num">Calls</th>
                <th className="num">Model time (s)</th>
                <th className="num">API-price equivalent (USD)</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(([name, item]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="num">{item.count}</td>
                  <td className="num">{item.seconds.toFixed(0)}</td>
                  <td className="num">{item.api_price_usd.toFixed(3)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="num">{total.count}</td>
                <td />
                <td className="num">{fmt(total.usd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export { Overview }
