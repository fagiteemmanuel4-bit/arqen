FROM node:22.12.0-bookworm-slim

ENV NODE_ENV=development \
    CI=true \
    HOME=/home/sandbox \
    PNPM_HOME=/home/sandbox/.local/share/pnpm \
    PATH=/home/sandbox/.local/share/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Install pnpm without introducing a shell-based runtime entrypoint.
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate \
    && groupadd --system --gid 10001 sandbox \
    && useradd --system --uid 10001 --gid 10001 --create-home --home-dir /home/sandbox sandbox \
    && mkdir -p /workspace /home/sandbox/.local/share/pnpm \
    && chown -R sandbox:sandbox /workspace /home/sandbox

WORKDIR /workspace

# The repository is copied into an ephemeral container/volume by the host
# orchestrator. No host repository path or host environment is baked into
# this image.
USER sandbox

# The sandbox must never depend on a network-accessible entrypoint. The
# orchestrator explicitly enables registry-only egress for installation and
# switches the container to network=none before serving.
ENTRYPOINT ["/usr/bin/env"]
CMD ["bash", "-lc", "exec \"$SHELL\" -l"]
