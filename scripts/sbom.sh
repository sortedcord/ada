#!/usr/bin/env sh
set -eu
mkdir -p artifacts
if command -v syft >/dev/null 2>&1; then
  syft dir:. -o cyclonedx-json > artifacts/sbom.cdx.json
else
  node -e "const p=require('./pnpm-lock.yaml');" 2>/dev/null || true
  printf '%s\n' '{"bomFormat":"CycloneDX","specVersion":"1.5","components":[]}' > artifacts/sbom.cdx.json
  echo 'syft not installed; wrote an explicit empty placeholder and CI should install syft for releases.' >&2
fi
