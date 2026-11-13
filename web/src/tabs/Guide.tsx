import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion"
import { Button } from "@ui-sdk/react/button"
import type { ReactNode } from "react"
import { CORRECTNESS, evalRuns } from "../api"
import type { LabData } from "../api"
import { ScoreChip, Section } from "../ui"

type OnJump = (label: string, id: string, metric: string) => void

function Item({
  value,
  title,
  children,
}: {
  value: string
  title: string
  children: ReactNode
}) {
  return (
    <AccordionItem value={value}>
      <AccordionHeader>
        <AccordionTrigger>{title}</AccordionTrigger>
      </AccordionHeader>
      <AccordionPanel>
        <div className="prose">{children}</div>
      </AccordionPanel>
    </AccordionItem>
  )
}

function Guide({ data, onJump }: { data: LabData; onJump: OnJump }) {
  const runs = evalRuns(data)
  const last = runs.at(-1)
  const failed = last ? last.cases.filter((item) => !item.success).map((item) => item.id) : []

  return (
    <>
      <Section title="Where things stand">
        <p className="callout">
          {last ? (
            <>
              The latest run is <b>{last.label}</b>. Prompt <b>{last.prompt_version}</b> passed{" "}
              <b>{last.passed_cases}</b> of {last.total_cases} goldens.{" "}
              {failed.length ? (
                <>
                  Still failing: <b>{failed.join(", ")}</b>.
                </>
              ) : (
                "Nothing is failing."
              )}
            </>
          ) : (
            "No evaluation has been recorded yet."
          )}
        </p>
      </Section>

      <Section
        title="How to read the results"
        hint="Press a heading to fold or unfold it. The buttons in step 5 open the matching cell in Case comparison."
      >
        <Accordion multiple defaultValue={["score", "metrics", "matrix", "try"]}>
          <Item value="score" title="1. Reading one score">
            <p>
              <ScoreChip ok score={0.9} /> <ScoreChip ok={false} score={0.4} />
            </p>
            <ul>
              <li>
                The number is a <b>score from 0 to 1</b>. Higher is better. The judge LLM (Claude
                Sonnet) assigns it.
              </li>
              <li>
                ✓ and ✗ compare the score with the <b>threshold of 0.7</b>. At 0.7 or above the
                case passes; below it, the case fails.
              </li>
              <li>
                Treat a difference of 0.1 as no difference. Grading the same answer again moved
                the score by that much.
              </li>
            </ul>
          </Item>

          <Item value="metrics" title="2. What the three metrics ask">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Question it asks</th>
                    <th>Needs an expected answer</th>
                    <th>If it is low, suspect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="strong">Correctness</td>
                    <td>
                      Do the facts in the answer match the expected answer? Amounts, periods and
                      yes or no.
                    </td>
                    <td>Yes</td>
                    <td>
                      The retriever or the generator. <b>This is the number that matters most.</b>
                    </td>
                  </tr>
                  <tr>
                    <td className="strong">Faithfulness</td>
                    <td>Is everything in the answer found in the retrieved documents?</td>
                    <td>No</td>
                    <td>The generator (it made something up)</td>
                  </tr>
                  <tr>
                    <td className="strong">Answer Relevancy</td>
                    <td>Does the answer stay on the question, with no filler?</td>
                    <td>No</td>
                    <td>The generator (it explained things nobody asked)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <b>Combine them to narrow the cause.</b>
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Correctness</th>
                    <th>Faithfulness</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="verdict" data-verdict="fail">Low</td>
                    <td className="verdict" data-verdict="pass">High</td>
                    <td>
                      The generator followed its documents.{" "}
                      <b>The retriever handed it the wrong ones.</b>
                    </td>
                  </tr>
                  <tr>
                    <td className="verdict" data-verdict="fail">Low</td>
                    <td className="verdict" data-verdict="fail">Low</td>
                    <td>The generator invented content that is not in the documents.</td>
                  </tr>
                  <tr>
                    <td className="verdict" data-verdict="pass">High</td>
                    <td className="verdict" data-verdict="pass">High</td>
                    <td>
                      Healthy. If only Answer Relevancy is low, the answer is right but padded.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Item>

          <Item value="ledger" title="3. Reading Overview and Run ledger">
            <ul>
              <li>
                <b>The large 8/10</b> counts goldens that passed <b>all three</b> metrics. One
                failed metric fails the golden.
              </li>
              <li>
                <b>Average</b> is the mean score for one metric. <b>Passed 9/10</b> counts passes
                for that metric alone.
              </li>
              <li>
                <b>Compare runs on the same golden set only.</b> Runs 1 to 3 use v0 (10 goldens);
                runs 4 and 5 use v1 (21 goldens). Run 3 at 10/10 and run 4 at 18/21 use the same
                prompt. The score fell because the questions grew.
              </li>
              <li>With 21 goldens, one golden is about 5%. A one-golden gap is not a big gap.</li>
            </ul>
          </Item>

          <Item value="matrix" title="4. Reading Case comparison">
            <p>
              A row is one golden and a column is one run. <b>Read across</b> to see how one
              question's score moved with each change.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Across the row</th>
                    <th>Name</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <ScoreChip ok score={0.9} /> → <ScoreChip ok={false} score={0} />
                    </td>
                    <td className="strong">Regression</td>
                    <td>It worked, and the change broke it. Look at these first.</td>
                  </tr>
                  <tr>
                    <td>
                      <ScoreChip ok={false} score={0.3} /> → <ScoreChip ok score={1} />
                    </td>
                    <td className="strong">Improvement</td>
                    <td>The change fixed this case.</td>
                  </tr>
                  <tr>
                    <td>
                      <ScoreChip ok={false} score={0.2} /> → <ScoreChip ok={false} score={0.2} />
                    </td>
                    <td className="strong">Unresolved</td>
                    <td>The change did nothing for this case.</td>
                  </tr>
                  <tr>
                    <td>
                      – → <ScoreChip ok score={1} />
                    </td>
                    <td className="strong">New golden</td>
                    <td>The question was not in the earlier golden set.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <b>Read down</b> to see one run's weak spot. When the ✗ marks cluster in one kind,
              that kind is the weak spot.
            </p>
          </Item>

          <Item value="try" title="5. Try it">
            <h3>① Find a retrieval failure: g04, a change-of-mind return after 10 days</h3>
            <ul>
              <li>
                Correctness is 0.40, a fail. The answer said there is no clause for
                change-of-mind returns.
              </li>
              <li>Faithfulness in the same cell is 1.00. The generator invented nothing.</li>
              <li>
                The retrieved chunks do not include the <b>change-of-mind return</b> section. The
                customer's wording and the policy's term differ, so the cause is retrieval.
              </li>
            </ul>
            <div className="controls">
              <Button onClick={() => onJump("baseline", "g04", CORRECTNESS)}>
                Open g04 × baseline
              </Button>
            </div>

            <h3>② Find a regression: g10, a second size exchange</h3>
            <ul>
              <li>
                Across the row: 0.90, 0.00, 0.90, 0.90, 0.00. The last change (v3) broke it again.
              </li>
              <li>
                The v3 answer says the policy sets no limit on exchanges. The retrieved chunks do
                not include the <b>exchange cost and count</b> section.
              </li>
              <li>
                v3 added a step that rewrites the search query. That step fixed two other cases
                and spoiled retrieval for this one.
              </li>
            </ul>
            <div className="controls">
              <Button onClick={() => onJump("retriever-fix", "g10", CORRECTNESS)}>
                Open g10 × retriever-fix
              </Button>
              <Button onClick={() => onJump("fix-on-v1", "g10", CORRECTNESS)}>
                Compare: g10 × fix-on-v1
              </Button>
            </div>

            <h3>③ Find a right answer with filler: g09, in-store pickup</h3>
            <ul>
              <li>
                Correctness is 1.00. The answer correctly said the policy does not cover it and
                pointed to customer support.
              </li>
              <li>
                Answer Relevancy is 0.50, a fail. The answer also explained order cancellation and
                exchanges, which nobody asked about.
              </li>
              <li>That is why this golden is missing from the baseline's all-pass count.</li>
            </ul>
            <div className="controls">
              <Button onClick={() => onJump("baseline", "g09", "Answer Relevancy")}>
                Open g09 × baseline (Answer Relevancy)
              </Button>
            </div>
          </Item>

          <Item value="component" title="6. Reading Component evaluation">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Retriever</th>
                    <th>Generator</th>
                    <th>Meaning</th>
                    <th>Fix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="verdict" data-verdict="fail">✗</td>
                    <td className="verdict" data-verdict="pass">✓</td>
                    <td>It got the wrong documents and answered from them.</td>
                    <td>The retriever</td>
                  </tr>
                  <tr>
                    <td className="verdict" data-verdict="pass">✓</td>
                    <td className="verdict" data-verdict="fail">✗</td>
                    <td>It got the right documents and answered something else.</td>
                    <td>The answer prompt</td>
                  </tr>
                  <tr>
                    <td className="verdict" data-verdict="fail">✗</td>
                    <td className="verdict" data-verdict="fail">✗</td>
                    <td>Both are at fault. Fix the retriever first.</td>
                    <td>The retriever, then the prompt</td>
                  </tr>
                  <tr>
                    <td className="verdict" data-verdict="pass">✓</td>
                    <td className="verdict" data-verdict="pass">✓</td>
                    <td>
                      The parts are healthy. If Correctness is still low, question the expected
                      answer.
                    </td>
                    <td>The golden</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="muted">
              The retriever score (Contextual Relevancy) is the share of relevant sentences across
              everything retrieved. With three chunks, the score can be low even when the right
              chunk is there (f02 scored 0.14 and f03 scored 0.11 here). A score of 0.00 means no
              relevant sentence at all.
            </p>
          </Item>

          <Item value="stability" title="7. Reading Judge stability">
            <ul>
              <li>
                <b>Spread</b> is the gap between the highest and lowest score when the same answer
                is graded three times. A spread of 0 means the judge agreed with itself.
              </li>
              <li>
                <b>Flipped</b> means the same answer went between pass and fail. Do not trust the
                ✓ or ✗ of a case that flips.
              </li>
              <li>A gap between two runs that is smaller than the spread is not a real gap.</li>
            </ul>
          </Item>

          <Item value="limits" title="8. Before you trust the numbers">
            <ul>
              <li>The documents, questions and expected answers are all made up.</li>
              <li>Claude, not a person, reviewed the six synthetic goldens.</li>
              <li>
                v3 was written after seeing the v1 failures and graded on the same goldens. It
                may score lower on questions it has never seen.
              </li>
            </ul>
          </Item>
        </Accordion>
      </Section>
    </>
  )
}

export { Guide }
