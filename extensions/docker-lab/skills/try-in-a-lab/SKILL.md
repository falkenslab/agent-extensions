---
name: try-in-a-lab
description: Try a tool, a service or a piece of code in a disposable docker-mcp lab instead of installing or running it on the person's computer - pick a pinned image, write a minimal lab, run it under the labs' safety policy, report what happened with evidence, and clean up. Use whenever something needs running or trying (a program, a database, a command-line tool, a script, someone's code) and it isn't installed, or shouldn't run on the real machine.
---

# Trying something in a lab

The computer the agent works on is the person's real machine: nothing gets installed on it, and code nobody has checked never runs on it. When something needs trying, it runs in a **lab**, a folder with a `compose.yaml` that docker-mcp starts under a safety policy: no internet unless the extension allows it, no mounts outside the lab's folder, never the Docker socket, limits on CPU, memory and processes, no new privileges. A lab is the only way docker-mcp isolates what it runs, so even a single container to try goes through one.

## When

- A tool or runtime isn't installed (a Python version, a database client, a compiler, `jq`): try it in a container that has it, instead of installing it or asking the person to.
- A service is needed for a while (a PostgreSQL, a Redis, a web server) to try something against it.
- Code from someone else, a download or a generated script has to run: it's untrusted until seen working, and it runs in a lab, never on the computer.
- Something must be tried in a clean, known environment (a given Linux, a given version), apart from what the computer has.

## How

1. **`server_info`**: the labs folder, and whether the mode has labs. In `read` mode nothing runs: say so and which mode would allow it.
2. **Pick the image**: an official one pinned to a tag (`python:3.12-slim`, `postgres:17`, `node:22-alpine`, `ubuntu:24.04`), never `latest`, and one that already has what's needed, since without internet nothing can be installed while it runs. If nothing has it, a `Dockerfile` in the lab's folder builds it (building may need the internet to download packages; when it fails for that, say so).
3. **Write the lab** in `<labs folder>/try-<what>/` with your own file tools, or give the files to the person to save if you have none: a `compose.yaml` with one service (more only if the try needs them), the files to try in the lab's folder, mounted read-only when they needn't be written (`./code:/work:ro`), and a command that keeps the service up (`command: ["sleep", "infinity"]`) when it's a tool rather than a server. No `ports`: everything is tried from inside. Use a name that says what it is, so `list_labs` shows it apart from real practices.
4. **`lab_up`**, after telling the person what it will run (the image, what's mounted, whether it has internet). If the policy refuses it, fix what the message lists; never look for a way around it.
5. **Try it** with `lab_exec`, the command as a list (`["sh", "-c", "…"]` for a shell line) and a `timeoutSeconds` that fits, so nothing runs for ever. A service: try it from another service of the lab, or from inside its own container, by service name.
6. **Report** what happened: the image, each command, its exit code and the relevant output quoted literally, and anything you couldn't try and why.
7. **Clean up**: `lab_down` when the try is over (its containers and volumes go; its folder stays), and offer to delete the lab's folder if it was only for this. In full mode, an image you pulled for the try (check `list_images` before pulling) can go too, with the person's yes; an image they already had stays.

## Rules

- Never install anything on the computer, not even "just for a moment", and never run untrusted code outside a lab. If something can't be tried in a lab, say what would be needed and let the person decide.
- Ask for nothing to be relaxed for convenience: internet, a mount outside the lab's folder or more resources are the person's choice in the extension's options, not yours.
- A lab with internet allowed reaches it whole: say so before running untrusted code in one.
- Results come from running, never from reading: don't report something works because the code looks right.
