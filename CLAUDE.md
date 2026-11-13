# DeepEval Lab

A lab for learning LLM evaluation: a support bot for a made-up shop, graded with DeepEval. README.md has the overview.

## Commands

```bash
# Evaluate. Each run appends one line to results/ledger.jsonl
.venv/bin/python evals/run_eval.py <label> --prompt v2 --goldens v1 --note "what changed"

# Local viewer with live data, http://127.0.0.1:8765
.venv/bin/python server/serve.py

# Viewer, from web/
npm run typecheck
npm run build          # local build into server/dist
npm run snapshot       # export results/ into web/data/snapshot.json
npm run build:static   # public build into web/dist-static
```

## Rules

- **Run one evaluation at a time.** DeepEval keeps the run in progress in one temp file under `.deepeval/`. Two runs in this folder at once lose cases without an error.
- **Model calls go through `lab/claude_model.py` only.** The bot and the judge both use `claude -p`. Every evaluation spends the user's Claude subscription, about 9 calls per golden, so ask before starting one.
- **A custom judge must return a schema instance when given `schema`.** DeepEval metrics accept a string and parse it. The Synthesizer does not.
- **`results/` is not in git.** The public site reads `web/data/snapshot.json`. After a new evaluation, run `npm run snapshot` and commit the file, or the site stays as it was.
- **After a viewer change, run both builds.** `build` feeds the local server and `build:static` is what Vercel runs. Check the change in each.
- **The ledger is append only.** Don't edit or delete lines in `results/ledger.jsonl` to tidy a run.

## Viewer

- Built with UI SDK (`@ui-sdk/react`, beta). Look for a component there before writing markup with a `role`. The docs for the installed version are in `web/node_modules/@ui-sdk/react/docs/`: read `llms.txt` first, then only the component pages you need.
- Styles start from `@ui-sdk/core/web.css` and its `--ui-*` tokens. Colors use `light-dark()`, and the color scheme defaults to dark.
- `import.meta.env.MODE === "static"` marks the public build. It reads `data.json` and has no Ask the bot tab, which needs the local server.
- Headless Chrome lays out no narrower than 500px. A screenshot at 390px is cropped, not a phone layout.

## Language

- The viewer, README.md and commit messages are in English.
- The policy documents, goldens, prompts and Python comments are in Korean, because the bot answers Korean customers. Translating them changes what is evaluated and needs every run repeated.
- `web/src/labels.ts` gives the Korean labels in the data an English display form. Add to it when new data brings a new label.

## Deploy

- Pushing to `main` deploys https://deepeval-lab.vercel.app. The Vercel project's root directory is `web`.
- Commits use the GitHub noreply address set in this repository's git config. Don't override it with a personal address.
