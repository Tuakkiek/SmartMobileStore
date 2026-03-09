# Frontend Architecture

## Layers
- `app`: bootstrap, providers, layouts, router composition, guards.
- `shared`: generic UI primitives, constants, assets, utilities, and HTTP client. No business logic or feature state.
- `features`: domain-owned modules. Each feature owns its pages, components, hooks, APIs, and state.

## Naming
- Components and pages: `PascalCase.jsx`
- APIs: `*.api.js`
- Zustand stores: `*.store.js`
- Hooks: `use*.js`

## Import Rules
- Cross-feature imports must go through a feature barrel, not internal files.
- `shared` must not import from `features` or `app`.
- `app` may import from `shared` and feature barrels only.
- Within a feature, prefer relative imports for internal files and keep ownership local.

## Directory Intent
- Put generic primitives in `src/shared/ui`.
- Put route URLs and guards in `src/app/router`.
- Keep feature depth shallow. Use an extra nested segment only for domain submodules like `content/homepage` and `content/videos`.
