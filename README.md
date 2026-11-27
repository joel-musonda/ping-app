# Ping

Every great idea has the potential to change something — so doesn't it deserve a place where it can be kept, thought through, and shared with the world? I think so too. That's why I built **Ping**.

![ping logo](./assets/logo.png)

Ping is a social web platform for writers, builders, and researchers to document journeys, ideas, projects, and reflections. Instead of scattered, standalone posts, everything lives in **notebooks** that are divided into **chapters**, so a body of work can grow and be read as one connected story.

---

## 🎨 The Inspiration

Ping was inspired by the need for a seamless, lightweight, and deeply aesthetic writing tool—free from the visual bloat of traditional document editors. The workspace features independent scrolling panels, absolute color demarcations, and a distraction-free environment.

Ping serves as an intuitive digital workbench where thoughts instantly translate into organized chapters, archives, and distributed public streams.

---

## ✨ Features

* **Notebooks & chapters** — create public or private notebooks with a description and cover image, then write ordered chapters inside them.
* **Rich-text editor** — Tiptap-based editor with headings, text alignment, underline, sub/superscript, images, and syntax-highlighted code blocks.
* **Public profiles** — every user gets a handle and a profile page at `/<handle>` listing their public notebooks, follower counts, and an activity calendar.
* **Social layer** — follow writers, like and comment on chapters, and receive follow/like notifications.
* **Community feed & search** — discover public notebooks and search across users and notebooks.
* **Dashboard & analytics** — manage your notebooks and view engagement (likes, comments, chapters) per notebook.
* **Authentication** — email/password sign-up with email verification, password reset, and Google/GitHub OAuth.
* **Account settings** — profile editing, light/dark theme, and account deletion.
* **Share images** — auto-generated Open Graph images for notebooks (`/notebooks/[notebookId]/image`).

---

## 🏗️ Technical Stack

* **Framework:** Next.js 16 (App Router) with React 19 and TypeScript
* **Text Engine:** Tiptap 3 (ProseMirror-backed editor) with `lowlight` for code highlighting
* **Database, Auth & Storage:** Appwrite Cloud (`appwrite` client SDK + `node-appwrite` for server routes)
* **Styling:** Tailwind CSS v4 (minimalist monochrome palette), shadcn/ui, and HeroUI
* **Data & Motion:** TanStack Query, Framer Motion, date-fns
* **Icons:** Lucide React and Hugeicons

---

## ⚙️ Engineering Principles & Process

The codebase is built on an architectural standard that guarantees rapid feature shipping without sacrificing maintainability.

### 🛡️ SOLID Design Implementation
* **Single Responsibility Principle (SRP):** Components are isolated modules. Core logic handles single data flows—like the `AuthCallbackPage` handling authentication tokens exclusively, passing routing states cleanly forward.
* **Open/Closed Principle (OCP):** Core modules are open to extension but closed to modification. For example, our custom Tiptap extension suite hooks seamlessly into default packages without modifying underlying editor code arrays.
* **Liskov Substitution Principle (LSP):** Object and parameter typing structures are predictable, meaning utility modules and database managers share cleanly polymorphic data payloads.
* **Interface Segregation Principle (ISP):** Client views receive only the narrow API datasets they require to render, preventing over-fetching anomalies.
* **Dependency Inversion Principle (DIP):** High-level page orchestrators depend strictly on abstractions (`@/lib/appwrite`) rather than raw, hardcoded endpoint strings, allowing fluid environment swapping.

### 📐 Structural Guidelines
* **KISS (Keep It Simple, Stupid):** Avoiding convoluted client abstractions. OAuth callbacks use native web states (`window.location.origin`) to seamlessly manage transitions without heavy environment management scripts.
* **DRY (Don't Repeat Yourself):** Asset pipeline endpoints, file upload bridges, and telemetry logic are consolidated entirely inside uniform helper utilities (`lib/appwrite.ts`) to avoid duplicate logic nodes.

---

## 🔁 Agile Development Methodology

Ping is engineered through adaptive, rapid-cycle execution:

* **Sprints:** Development is broken down into high-velocity micro-sprints focusing on critical product areas (Authentication Handshakes ➡️ Layout Optimization ➡️ Editor Integrity).
* **Feedback-Driven Iteration:** Early builds are continuously deployed and shared with users inside isolated beta loops to catch multi-device design or routing anomalies quickly.
* **Continuous Integration:** GitHub-driven deployment pipelines ship builds to Ping's hosting on Cloudflare and Appwrite for automated build verification and releases.

---

## 🚀 Local Installation & Setup

### Prerequisites

* Node.js 20+ and npm
* An [Appwrite Cloud](https://cloud.appwrite.io) project (or a self-hosted Appwrite instance)

### 1. Clone and install

```bash
git clone https://github.com/joel-musonda/ping-app.git
cd ping-app
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root (it is git-ignored):

```bash
# Appwrite project
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id

# Appwrite database and collections
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_PINGS_COLLECTION_ID=your-pings-collection-id
NEXT_PUBLIC_APPWRITE_NOTEBOOKS_COLLECTION_ID=your-notebooks-collection-id
NEXT_PUBLIC_APPWRITE_CHAPTERS_COLLECTION_ID=your-chapters-collection-id

# Server-only API key (used by /api/delete-account and server-side reads)
APPWRITE_API_KEY=your-server-api-key

# Public URL of the deployed site (used for share links / Open Graph metadata)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `APPWRITE_API_KEY` must never be exposed to the browser — keep it without the `NEXT_PUBLIC_` prefix. It needs the `users.write` scope for account deletion.

### 3. Set up Appwrite

In your Appwrite project, create one database containing these collections:

| Collection | ID | Key attributes |
| --- | --- | --- |
| Pings (profiles) | from env | `user_id`, `handle`, `bio` |
| Notebooks | from env | `owner_id`, `title`, `description`, `is_public`, `snapshot`, `cover_image_url`, `collaborator_ids` |
| Chapters | from env | `notebook_id`, `title`, `content_json`, `order_index`, `is_published` |
| Follows | `follows` | `follower_id`, `following_id` |
| Notifications | `notifications` | `user_id`, `sender_name`, `sender_handle`, `type`, `chapter_id` |
| Likes | `likes` | `user_id`, `chapter_id` |
| Comments | `comments` | `chapter_id`, `user_id`, `handle`, `name`, `content`, `avatar_url` |

Then:

* Add **full-text indexes** on Notebooks `title` and Pings `handle` (required for search).
* Create a **Storage bucket** for notebook cover images and set its ID as `IMAGES_BUCKET_ID` in `lib/appwrite.ts`.
* Add a **Web platform** for `localhost` (and your production domain).
* Enable the **Email/Password**, **Google**, and **GitHub** auth providers. OAuth callbacks return to `/auth/callback`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## 📁 Project Structure

```
app/            # Next.js App Router pages and API routes
  [handle]/     # Public user profiles
  notebooks/    # Notebook, chapter, and new-notebook pages + OG image route
  api/          # Server routes (e.g. delete-account)
  ...           # dashboard, community, analytics, settings, auth pages
components/     # Editor, Navbar, notebook/chapter views, shadcn/ui primitives
lib/            # Appwrite clients and data helpers, auth, theme, utils
public/         # Static assets and icons
```

---

## 📄 License

Released under the [MIT License](./LICENSE).
