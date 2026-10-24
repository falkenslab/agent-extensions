---
name: use-docker
description: Work the person's Docker with docker-mcp - containers, images, volumes, networks, Compose projects, disk usage and clean-ups - knowing what its mode allows, what to confirm first, the dangerous options that need an explicit yes, and how to explain a missing or stopped Docker. Use whenever the person asks for anything about their Docker that isn't trying something in a lab.
---

# Using Docker through docker-mcp

docker-mcp drives the Docker command line of the person's computer. It was started in one mode, chosen when the extension was installed, and only that mode's tools exist: **read** only looks, **lab** only runs labs (see `try-in-a-lab` and `build-a-lab`), **full** does everything Docker does. To try something without affecting the computer (a tool that isn't installed, someone's code), use a lab (see `try-in-a-lab`): labs run isolated, with limits and without internet, in every mode that has them. In full mode a single command can also run in an isolated one-off container (below). Settings are read once at startup, so changing the mode means changing the extension's options and restarting the session.

## First

1. **`server_info`** says the mode, the areas, the labs folder and whether Docker is there. Call it when unsure what you can do, and never promise a tool the mode doesn't have: if the person asks for something outside it, say which mode would allow it.
2. **`check_requirements`** when Docker seems missing or a call fails because it isn't running: it says whether Docker is installed, its version (24 or later), and how to install it on this system. Never install it yourself; tell the person what to run, or to start Docker Desktop.
3. **`docker_info`** for a first look: the engine, its resources, and how many containers and images there are.

## Asking first

- Anything that changes the machine (running, stopping, removing, pulling, building, pushing, creating, cleaning up) waits for the person's yes. Say exactly what will happen before calling it (the image, the name, the ports, the volumes), then let the session's own question be that yes: an agent on agent-kit in guided mode asks before these tools, and Claude Code asks for a tool the person hasn't allowed. Ask one yourself only in a client with no confirmation of its own.
- **What can't be undone docker-mcp asks the person itself**, in their app, a question the agent can't answer or skip: removing a container, an image, a volume or a network, `prune` (saying how much it would free), `compose_down` with its volumes, `lab_down` and `lab_reset`, and `run_container` with dangerous options. Name what goes before calling it (a volume's data goes with it; only pass `volumes: true` to `prune` when they asked for volumes to go), and don't ask another yes first. A no means nothing was done: say so, and don't call it again unless they ask. In an app that can't ask (no MCP elicitation) these tools refuse: tell the person, and never look for a way around it (`DOCKER_MCP_CONFIRM=client` is for an app that already asks before every call, set by the person when installing).
- **Dangerous options** of `run_container` (privileged, the host's network, processes or IPC, extra capabilities, devices, mounting the Docker socket, the host's root or the person's home folder) make docker-mcp ask the person first. Before calling, say in plain words what the option gives the container (mounting the Docker socket gives it control of all of Docker, privileged gives it the whole machine), so they answer knowing it.
- **Ports** publish on every interface by default: when the service is only for this computer, bind it to `127.0.0.1`.
- **Pushing** uses the login the person made with `docker login` in their own terminal. Never ask for a password or a token: when there is no login, tell them what to run.

## Common tasks

- **Why a container fails**: `list_containers` (with stopped ones), `inspect_container` (its state, exit code, restart count, mounts), `container_logs` (the last lines first), then `container_processes` or `container_stats` if it's running but misbehaving.
- **A one-off command, isolated** (full mode): `run_container` with `network: "none"`, `readOnly: true`, `noNewPrivileges: true`, limits (`cpus`, `memory`, `pids`), `remove: true`, `detach: false` and a `timeoutSeconds` that fits, so it returns the output and is gone; a `labels` mark (`{ "docker-mcp.sandbox": "try-<what>" }`) finds any left with `list_containers` (`label`). No mounts of the person's folders. More than one command, or a service: a lab.
- **Running a service**: `run_container` with a name, the image with its tag (never assume `latest` is what the person wants), ports, a named volume for data that must survive, and environment variables. Read it back with `inspect_container` and its logs.
- **Inside a container**: `exec_in_container` with the command as a list (`["sh", "-c", "…"]` for a shell line); `copy_to_container` and `copy_from_container` for files. A command that only reads needs no confirmation.
- **Images**: `pull_image`, `build_image` (from a folder with its Dockerfile, with a tag), `tag_image`, `push_image`.
- **Compose projects**: `compose_ps` and `compose_logs` to read one; `compose_up`, `compose_build`, `compose_exec` and `compose_down` to work it.
- **Disk**: `disk_usage`, then `prune` of what the person agrees to.

When a tool fails, its message says why (Docker stopped, a name taken, a port in use, an image not found): explain it to the person in plain words with what to do, rather than retrying the same call.
