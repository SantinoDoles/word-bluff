# Word Bluff

**A multiplayer party game where a convincing lie can beat a good vocabulary.**

Word Bluff brings 2–8 players together in a shared room. Players invent definitions for unusual real words, choose the meaning they believe is correct, and earn points for finding the truth or fooling their friends. Each player uses their own phone, tablet, or computer.

**[Play the live game](https://word-bluff-party-santi.santinodoles.chatgpt.site)**

## Features

- **Room-code multiplayer:** Create a room and share its five-character code or invite link.
- **Live synchronized rounds:** Server-controlled deadlines with room updates polled approximately once per second.
- **Timed wordplay:** 45 seconds to write a bluff and 25 seconds to guess.
- **Anonymous choices:** Definitions are shuffled; their authors and the correct answer stay hidden until the reveal.
- **Automatic scoring:** Earn points for correct guesses and successful bluffs, with a leaderboard after each round.
- **Two-player support:** Two additional game decoys keep small games interesting.
- **Six-round games:** Final results recognize a winner or shared winners, with an option to play again.
- **Seat restoration:** Refreshing on the same browser restores the player's seat using a locally stored session credential.
- **Responsive interface:** Phone-friendly controls, labeled inputs, keyboard focus states, and a rules dialog.
- **Concurrent-action protection:** Optimistic version checks prevent simultaneous updates from silently overwriting room state.

## How to play

1. A host creates a room. Between two and eight players join before the host starts.
2. Everyone receives the same unusual word and has **45 seconds** to submit a made-up definition.
3. Players have **25 seconds** to choose the real meaning from the shuffled definitions. Choosing your own bluff is prohibited.
4. The game reveals the real definition, bluff authors, and votes. Each player marks ready; the host advances.
5. After **six rounds**, the highest total wins. Ties share the victory.

| Action | Points |
| --- | ---: |
| Choose the real definition | +2 |
| An opponent chooses your bluff | +1 per opponent |
| Miss a submission or guess deadline | 0 for that action |
| An opponent chooses a game decoy | No player receives points |

## Technology

| Layer | Technologies |
| --- | --- |
| Interface | React 19, TypeScript, custom CSS, Lucide icons |
| Application framework | Vinext with Next.js-compatible App Router conventions |
| Development and bundling | Vite 8 |
| Server runtime | Cloudflare Workers |
| Persistent room state | Cloudflare D1 / SQLite |
| Schema and migrations | Drizzle ORM and Drizzle Kit |
| Local Cloudflare emulation | Wrangler / Miniflare |
| Live hosting | Sites on Cloudflare |

The dependency manifest also retains the bundled UI primitives and framework integration utilities used by the starter. The game itself uses custom components and CSS. Typography uses Google Fonts with local fallback fonts.

## Local setup

### Requirements

- **Node.js 22.13.0 or newer**, with npm installed.
- An internet connection for the initial dependency installation.
- A modern browser.

Local development requires **no passwords, API keys, or Cloudflare login**. Wrangler emulates the database locally.

### Install and run

Extract this repository, open a terminal in its root directory, and run:

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Open **http://localhost:5173**. Create a room in one browser profile and join from another profile, private window, or device to test multiplayer. Tabs in the same browser profile share the stored player seat.

The database command first creates an ignored `wrangler.local.json` from the safe `wrangler.local.example.json` template, then applies the committed migrations to the local `DB` binding. Both the local Wrangler configuration and Vite configuration use the same placeholder database ID and `.wrangler/state` storage location. **The placeholder is not a production database ID or a credential.**

### Test from a phone on your network

Start the development server with:

```sh
npm run dev -- --host 0.0.0.0
```

Connect the phone to the same network and open `http://<your-computer-LAN-IP>:5173`. If your firewall prompts, allow access on your private network. The hosted live demo is the simplest way to play across different networks.

### Build and check

```sh
npm run typecheck
npm run build
```

The build produces a Cloudflare-compatible Worker and client assets in `dist/`. To serve the production build locally:

```sh
npm run start
```

Use the URL printed by Wrangler. Run the local database migration command first if the database has not been initialized.

### Change the database schema

Edit `db/schema.ts`, then generate and apply a new migration:

```sh
npm run db:generate
npm run db:migrate:local
```

Commit the generated SQL and migration metadata in `drizzle/`. Preserve migration files that have already been applied.

## Architecture

```text
Player's browser
  ├─ Sends room actions to POST /api/game
  └─ Polls player-visible room state approximately once per second
                  │
                  ▼
Cloudflare Worker
  ├─ Validates the player seat and allowed action
  ├─ Advances expired server-controlled round timers
  ├─ Calculates reveal scores once
  └─ Saves room changes with an optimistic version check
                  │
                  ▼
Cloudflare D1
  └─ rooms: code, serialized game state, version, expiration
```

The server is authoritative for timers, votes, and scores. Writing and guessing phases always last their allotted time; submitting early does not end a phase. Timer transitions are applied when the next request reaches the room. The API returns only the current player's allowed view, hiding the real answer and other players' credentials until the appropriate reveal.

## Project structure

```text
app/
  page.tsx                 Game interface and room synchronization
  globals.css              Responsive game styling
  layout.tsx               Page metadata and root layout
  api/game/route.ts        Room actions and server validation
lib/
  game.ts                  Word bank, round transitions, scoring, visible state
  store.ts                 D1 binding access
  ...                      Framework integration helpers
db/                       Drizzle schema and database helper
drizzle/                  Committed SQL migrations and metadata
build/                    Worker and Sites build integration
components/               Bundled reusable UI primitives
scripts/                  Framework and local runtime helpers
public/                   Favicon and static assets
 .openai/hosting.json       Logical hosting bindings, with no live Site identity
wrangler.local.example.json  Safe local D1 configuration template
vite.config.ts            Vinext and local Cloudflare configuration
```

## Hosting

The live game is deployed through **Sites**. This export includes the complete application source, lockfile, database migrations, static assets, and build integration. The `.openai/hosting.json` file retains only logical bindings; the original live Site identifier has been removed so this repository is not attached to the existing deployment.

To deploy your own instance through Sites, register a new Site and publish it using the Sites workflow. Sites provisions the production D1 binding and applies the committed migrations. Independent Cloudflare deployment requires configuring your own Worker and D1 resources and adapting the Sites-specific build integration; `wrangler.local.example.json` is a local development template; the generated `wrangler.local.json` is ignored.

## Validation and current limits

Before publication, TypeScript checking and the production build passed. Local API integration checks covered a complete six-round game, scoring, hidden-answer filtering, own-vote rejection, duplicate actions, concurrent submissions and votes, seven concurrent guest joins, the eight-player limit, missed timers, replay, and seat authentication. Those checks used temporary development tools and are not shipped as an automated test suite in this repository.

- Rooms expire four hours after creation. Expiration prevents access; automatic deletion of expired database rows is not implemented.
- Joining after a game has started is disabled.
- The host advances only after every player marks ready. A disconnected player must return to their seat before the group can continue; host transfer during an active game is not implemented.
- Seat restoration depends on the same browser profile and its local storage. Clearing storage loses that seat.
- Updates use polling rather than WebSockets.
- The included word bank contains 24 entries, with six selected per game. Words may repeat across separate games.

## Repository hygiene

This source package contains no saved player credentials, deployment tokens, passwords, API keys, Git history, or local databases. Player credentials are generated at runtime; their implementation is source code, not a bundled credential. `.gitignore` excludes local environment files, credential files, build output, dependency folders, logs, and local database state.

## Word references

Definitions are brief paraphrases. Selected reference sources:

- [Cambridge Dictionary — apricity](https://dictionary.cambridge.org/dictionary/english/apricity)
- [American Heritage Dictionary — absquatulate](https://www.ahdictionary.com/word/search.html?q=absquatulate)
- [Dictionary.com — borborygmus](https://www.dictionary.com/browse/borborygmus)
- [Merriam-Webster — unusual words](https://www.merriam-webster.com/wordplay/beautiful-useless-obscure-words-volume-2/pennyweighter)

## Upload to GitHub

Create an empty GitHub repository, extract the ZIP, and upload the **contents** of the `word-bluff` folder. Include hidden files such as `.gitignore`, `.npmrc`, and `.openai/hosting.json`.

Alternatively, from the extracted `word-bluff` folder:

```sh
git init
git add .
git commit -m "Add Word Bluff multiplayer party game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/word-bluff.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Add the live demo URL to the repository's **About → Website** field so portfolio visitors can play directly.


## Direct Cloudflare binding configuration

Keep your existing `wrangler.json`, `wrangler.jsonc`, or `wrangler.toml` at the repository root before building. That file is the source of truth for Cloudflare bindings. The Vite configuration detects it and does not add the starter D1 or R2 placeholders alongside your bindings. Do not edit `dist/server/wrangler.json` by hand: it is regenerated during builds.

When no root Wrangler file exists, the starter retains local fallback bindings so development and the original Sites workflow continue to work. `wrangler.local.example.json` is a development template and is not automatically used as a production Wrangler configuration.

After configuring your own root Wrangler file:

```sh
npm run build
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

Check that `dist/server/wrangler.json` contains exactly one `d1_databases` entry with `binding: "DB"` and your existing database name and ID. A dry run does not deploy the Worker or apply database migrations.

The supplied fix changes only `vite.config.ts`; the game implementation and committed database schema/migrations are unchanged. The supplied archive contains no production Wrangler configuration or database credentials. Preserve your own root Wrangler file when replacing source files.
