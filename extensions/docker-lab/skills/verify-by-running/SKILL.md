---
name: verify-by-running
description: Verify that something works by running it in a docker-mcp lab rather than by reading it - code, a script, a set of instructions followed step by step, a statement and its solution, or someone's submission - and give a clear verdict with evidence; write lab.json checks that say what failed. Use whenever anyone asks whether something works, before trusting or handing out instructions or code, or to write or improve a lab's check.
---

# Verifying by running

Reading code or instructions says what they should do; running them says what they do. When anyone asks whether something works, run it in a lab (see `try-in-a-lab` and `build-a-lab`) and answer with what happened, never with what looks likely.

## What to verify

- **Code or a script**: it builds, runs, and does what was asked, on the inputs that matter.
- **Instructions followed step by step** (a tutorial, a statement, a README): every step works as written, from the starting point it assumes, and gets where it says. Follow them literally; where they're ambiguous or a step is missing, that's a finding.
- **A statement and its solution**, before handing them out: the starting files don't pass the check, the solution does, with a `lab_reset` between both so nothing leaks from one run into the other.
- **Someone's submission**: its files copied into the lab's folder, run against what was asked. It's untrusted: only ever in a lab.

## How

1. Put what's verified in the lab's folder: the code, the starting files, the solution, each in its own subfolder so runs don't mix.
2. **`lab_up`** after the person's yes, then run each step with **`lab_exec`** (a `timeoutSeconds` that fits), or **`lab_check`** when the lab has a check.
3. Watch the services too: `lab_status` and `lab_logs` say whether a failure is the thing verified or the lab around it.

## The verdict

End with **works** or **doesn't work**, then the evidence:

- each command run, in order, its exit code and the relevant output quoted literally, trimmed;
- for instructions: every point where they break or are ambiguous (a missing step, a version that doesn't exist, an output that differs from what they promise);
- what you couldn't verify, and why (it needs the internet, a service the lab doesn't have).

A verdict is evidence for whoever decides, not a decision: grading, publishing or fixing belongs to the person, or to the agent's own skills for it.

## Writing a lab's check

A lab's check (`lab.json`) is a shell line run inside one of its services: it passes when it exits 0.

- **Runs inside, without internet**: test from a service, by service name (`curl -fs http://web/`, `pg_isready -h db`), with tools its image has; when it lacks them, add a small checker service to the lab.
- **Tests the result, not the steps**: what has to work (the page answers with the expected content, the table has its rows, the data survives a restart), not how it was done.
- **Says what failed**: each condition echoes its reason before exiting, so the output says which: `sh -c 'curl -fs http://web/ >/dev/null || { echo "web does not answer"; exit 1; }; …'`.
- **Is quick and repeatable**: no long timeouts, nothing it changes makes the next run fail, and a short retry loop for services slow to start.
