# Astro Starter Kit: Minimal

## Chic documentation builds

Production builds use `src/data/stdlib.json`, a snapshot of the public API signatures,
comments, and relative source references already displayed on the documentation pages.
No compiler source checkout or private repository credentials are needed in CI.
Package descriptions are maintained separately in `src/lib/stdlib.ts`.

To refresh the snapshot locally, use Node.js 22.18 or newer:

```sh
CHIC_SOURCE_DIR=/path/to/chic npm run docs:refresh
npm run build
```

Review the generated documentation before committing it. Setting `CHIC_SOURCE_DIR`
during a build reads that checkout directly; leaving it unset uses the committed
snapshot, as GitHub Actions does. The build verifies all 17 package pages.

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
