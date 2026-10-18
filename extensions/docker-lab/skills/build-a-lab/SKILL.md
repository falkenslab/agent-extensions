---
name: build-a-lab
description: Build a reproducible docker-mcp lab - a folder with a compose.yaml of one or more services that passes the labs' safety policy, the files it works on, and a lab.json check that says whether it works - and run it through its life: start, work inside, reset, stop. Use when an environment with several services is needed (a web app with its database, a practice for a course, a setup to reproduce a problem), or to start, reset or stop an existing lab.
---

# Building a lab

A lab is a folder in docker-mcp's labs folder (`server_info` and `list_labs` say where) with a `compose.yaml` and, optionally, a `lab.json` with its check. docker-mcp runs it as its own Compose project, apart from anything else on the computer, so the same lab can be started, broken, reset and started again on any machine with Docker: a practice handed to a class, an app with its database, a problem to reproduce.

## The policy

`lab_up` refuses a lab, listing every problem, if a service:

- is privileged, adds capabilities or devices, or uses the host's network, processes or IPC;
- mounts anything outside the lab's own folder, or the Docker socket;
- builds from outside the lab's folder;
- uses an image outside the allowed ones (when the extension's options set a list).

A lab that complies runs with limits per service (from the extension's options), no new privileges and, unless the options allow it, **no internet**: its services reach each other by service name and nothing else, and the computer can't reach their ports. Design for that from the start.

## The folder

docker-mcp has no tool to write files: write them with your own file tools if you have them, or give them to the person to save, in `<labs folder>/<lab name>/`.

- **`compose.yaml`**: each service with an image pinned to a tag, or a `build` from a folder inside the lab; bind mounts only from the lab's folder (`./site:/usr/share/nginx/html`), so the files worked on are ordinary files the person can edit; named volumes for data that must survive a restart; `depends_on` with a `healthcheck` when a service needs another ready; no `ports`, since everything is checked from inside.
- **What the services need** baked into their images (a Dockerfile in the lab), since nothing downloads while it runs without internet.
- **`lab.json`**: `{ "check": { "service": "<service>", "command": "<a shell line that exits 0 when it works>" } }`. See `verify-by-running` for writing one that tells what failed.
- **`README.md`**: what the lab is for and how to use it (for a practice, its statement).

Then `list_labs` shows it with its check.

## Its life

1. **`lab_up`**, after telling the person what it will run (its services and images). If refused, fix each problem listed; never look for a way around the policy.
2. **`lab_status`** for its services and their state; **`lab_logs`** (a `service`, a `tail`) when one isn't up.
3. **`lab_exec`** to work inside a service, the command as a list (`["sh", "-c", "…"]`): a command that only reads needs no confirmation, one that changes the lab does. What changes inside a container is lost on a reset; what changes in the lab's folder stays.
4. **`lab_check`** to see whether it works (`verify-by-running`).
5. **`lab_reset`** back to a clean start when something is broken: its containers and volumes go, its folder's files stay. Confirm first.
6. **`lab_down`** when done, to free the computer: the same loss as a reset, confirmed first.

In lab mode these tools are all there is: if the person asks for something else with Docker, say that the extension is in lab mode and which mode would allow it.
