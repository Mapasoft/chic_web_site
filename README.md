# Astro Starter Kit: Minimal

## Chic documentation builds

Production builds use `src/data/stdlib.json`, a snapshot of the public API signatures,
attributes, source conditions, structure fields, comments, and relative source references.
No compiler source checkout or private repository credentials are needed in CI.
Package descriptions are maintained separately in `src/lib/stdlib.ts`.

To refresh the snapshot locally, use Node.js 22.18 or newer:

```sh
CHIC_SOURCE_DIR=/path/to/chic npm run docs:refresh
CHIC_SOURCE_DIR=/path/to/chic npm run docs:check
npm test
npm run build
```

Review the generated documentation before committing it. Setting `CHIC_SOURCE_DIR`
during a build reads that checkout directly; leaving it unset uses the committed
snapshot, as GitHub Actions does. The build verifies every package page, rendered
signature, structure declaration, and internal navigation link.

The extractor reads the working tree, including uncommitted source changes. It
includes all top-level public `func` and `struct` declarations, even without
comments, and preserves overloads and imported functions. `@internal` declarations,
function-local declarations, and commented-out code are excluded. Structures retain
their fields, defaults, inline members, and conditional fields. Source comments are
used as written; missing descriptions are not invented. Constants, enums, unions,
and aliases are not separate entries in this structures/functions reference.

Both sides of platform conditions are documented with their original conditions;
these are declaration variants, not a promise that all platforms implement the same
behavior. The `core.process` non-macOS branch, for example, returns `Unsupported`.
Packages follow `#package` declarations where present, otherwise the legacy
directory rules. Unsupported top-level directives fail the refresh instead of
silently producing incomplete documentation.

`src/data/stdlib-sources.json` records every source file's package, SHA-256, and
public/internal declaration counts. `docs:check` compares both committed snapshots
with the current source tree without writing changes. Neither local absolute paths
nor function implementation bodies are included in the snapshot.

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
