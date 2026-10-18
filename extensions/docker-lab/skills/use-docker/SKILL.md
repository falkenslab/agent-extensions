---
name: use-docker
description: Work the person's Docker with docker-mcp - containers, images, volumes, networks, Compose projects, disk usage and clean-ups - knowing what its mode allows, what to confirm first, the dangerous options that need an explicit yes, and how to explain a missing or stopped Docker. Use whenever the person asks for anything about their Docker that isn't trying something in a lab.
---

# Using Docker through docker-mcp

docker-mcp drives the Docker command line of the person's computer. It was started in one mode, chosen when the extension was installed, and only that mode's tools exist: **read** only looks, **lab** only runs labs (see `try-in-a-lab` and `build-a-lab`), **full** does everything Docker does. To try something without affecting the computer (a tool that isn't installed, someone's code), use a lab, not `run_container`: only labs run isolated, with limits and without internet. Settings are read once at startup, so changing the mode means changing the extension's options and restarting the session.

## First

1. **`server_info`** says the mode, the areas, the labs folder and whether Docker is there. Call it when unsure what you can do, and never promise a tool the mode doesn't have: if the person asks for something outside it, say which mode would allow it.
2. **`check_requirements`** when Docker seems missing or a call fails because it isn't running: it says whether Docker is installed, its version (24 or later), and how to install it on this system. Never install it yourself; tell the person what to run, or to start Docker Desktop.
3. **`docker_info`** for a first look: the engine, its resources, and how many containers and images there are.

## Asking first

- Anything that changes the machine (running, stopping, removing, pulling, building, pushing, creating, cleaning up) is confirmed with the person first, saying exactly what will happen: the image, the name, the ports, the volumes.
- **Removing** a container, image, volume or network, and `prune`, can't be undone. Name what goes; a volume's data is gone with it. For `prune`, show `disk_usage` first so the person sees what would be reclaimed, and only pass `volumes: true` when they asked for volumes to go.
- **Dangerous options** of `run_container` (privileged, the host's network, processes or IPC, extra capabilities, devices, mounting the Docker socket, the host's root or the person's home folder) are refused until `confirmedDangerous: true`. Pass it only after asking the person in plain words what the option gives the container (mounting the Docker socket gives it control of all of Docker, privileged gives it the whole machine), never on your own.
- **Ports** publish on every interface by default: when the service is only for this computer, bind it to `127.0.0.1`.
- **Pushing** uses the login the person made with `docker login` in their own terminal. Never ask for a password or a token: when there is no login, tell them what to run.

## Common tasks

- **Why a container fails**: `list_containers` (with stopped ones), `inspect_container` (its state, exit code, restart count, mounts), `container_logs` (the last lines first), then `container_processes` or `container_stats` if it's running but misbehaving.
- **Running a service**: `run_container` with a name, the image with its tag (never assume `latest` is what the person wants), ports, a named volume for data that must survive, and environment variables. Read it back with `inspect_container` and its logs.
- **Inside a container**: `exec_in_container` with the command as a list (`["sh", "-c", "…"]` for a shell line); `copy_to_container` and `copy_from_container` for files. A command that only reads needs no confirmation.
- **Images**: `pull_image`, `build_image` (from a folder with its Dockerfile, with a tag), `tag_image`, `push_image`.
- **Compose projects**: `compose_ps` and `compose_logs` to read one; `compose_up`, `compose_build`, `compose_exec` and `compose_down` to work it.
- **Disk**: `disk_usage`, then `prune` of what the person agrees to.

When a tool fails, its message says why (Docker stopped, a name taken, a port in use, an image not found): explain it to the person in plain words with what to do, rather than retrying the same call.
