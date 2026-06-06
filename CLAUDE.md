# StyleBook — Claude Code Context

## Platform
This app runs on **Caffeine AI** (caffeine.ai), which builds and deploys to the
**Internet Computer Protocol (ICP)** using a **Motoko** backend canister.

## File structure
All frontend work goes in `src/frontend/src/`. There is also an old `src/` root
with abandoned prototype files — ignore those entirely.

## Build & lint
- Build: `cd src/frontend && npm run build`
- Linter: **Biome** (strict). Common rules that bite:
  - `useSingleVarDeclarator` — no `const a = x, b = y;`, split into two lines
  - `noUnusedTemplateLiteral` — use plain strings when no interpolation needed
  - Array index as React key — use a stable unique value instead
- Always run `npm run build` before committing to catch type and lint errors.

## ICP / canister ID — critical pattern
The Motoko backend canister ID is **not** available as a Vite env var at build
time. Caffeine injects it into `/env.json` (`backend_canister_id`) at deploy
time. The correct pattern to read it:

```typescript
// In useInitData (or equivalent startup hook), before any API calls:
const res = await fetch("/env.json");
const env = await res.json();
const id = env.backend_canister_id;
if (id && id !== "undefined") api.initCanisterId(id);
```

```typescript
// In api.ts:
let _canisterId: string | null = null;
export function initCanisterId(id: string) { _canisterId = id; _actorInstance = null; }
function getActor() {
  const id = _canisterId ?? import.meta.env.CANISTER_BACKEND;
  if (!id || id === "undefined") throw new Error("Canister ID not set");
  if (!_actorInstance) _actorInstance = createActor(id, ...);
  return _actorInstance;
}
```

Do NOT use `import.meta.env.VITE_CANISTER_ID_BACKEND` — that is never set by
Caffeine. The `CANISTER_*` prefix (vite-plugin-environment) may also be unset;
always prefer the `env.json` fetch approach.

## Caffeine import workflow
Caffeine skips imports when file hashes match its last deployed draft.
Workaround: merge changes into `main` on GitHub, make a trivial edit in the
Caffeine editor (add/remove a space), deploy that, then import from GitHub.

## State management
- **Zustand** store in `src/frontend/src/store/useAppStore.ts`
- `partialize` only persists `settings` — appointments/services come from ICP
- Always wrap Zustand selectors returning objects with `useShallow` to prevent
  React error #185 (infinite render loop from new object references each render)
- Store actions (addAppointment, deleteAppointment, etc.) update in-memory state
  only — always also call the corresponding `api.*` function to persist to ICP

## Development branch
Active branch: `claude/modest-galileo-sT46Z`
