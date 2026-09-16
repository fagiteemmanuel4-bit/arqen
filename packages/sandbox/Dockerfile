FROM node:22.12.0-bookworm-slim

ENV NODE_ENV=development \
    CI=true \
    HOME=/home/sandbox \
    PNPM_HOME=/home/sandbox/.local/share/pnpm \
    PATH=/home/sandbox/.local/share/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate \
    && groupadd --system --gid 10001 sandbox \
    && useradd --system --uid 10001 --gid 10001 --create-home --home-dir /home/sandbox sandbox \
    && mkdir -p /workspace /home/sandbox/.local/share/pnpm /opt/arqen \
    && chown -R sandbox:sandbox /workspace /home/sandbox /opt/arqen

COPY --chown=sandbox:sandbox registry-proxy.mjs /opt/arqen/registry-proxy.mjs

WORKDIR /workspace
USER sandbox

# The default process is inert. The host orchestrator starts repository
# commands explicitly with `docker exec`; untrusted code is never a host process.
ENTRYPOINT ["sleep", "infinity"]
