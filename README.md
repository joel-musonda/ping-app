<div align="center">

<img src="./assets/logo.png" alt="Ping logo" width="96" />

# Ping

**Notebooks for your journeys, ideas, projects, and reflections.**

Write in chapters, not scattered posts, and share your body of work as one connected story.

[Live site](https://pingblogs.com) · [Report a bug](https://github.com/joel-musonda/ping-app/issues) · [Request a feature](https://github.com/joel-musonda/ping-app/issues)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-FD366E?logo=appwrite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white) ![License: MIT](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Appwrite Setup](#appwrite-setup)
  - [Running Locally](#running-locally)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## About

Every great idea deserves a place where it can be kept, thought through, and shared. Ping is a social writing platform for writers, builders, and researchers. Instead of standalone articles, work lives in **notebooks** divided into **chapters**, so a project or journey can grow over time and be read from start to finish.

The workspace is deliberately minimal: a distraction-free, monochrome interface with independently scrolling panels, built to stay out of the way of the writing.

## Features

| Area | What you get |
| --- | --- |
| **Writing** | Public or private notebooks with cover images; ordered chapters; Tiptap editor with headings, alignment, underline, sub/superscript, images, and syntax-highlighted code blocks |
| **Profiles** | A public page at `/<handle>` with notebooks, follower counts, and an activity calendar |
| **Social** | Follow writers, like and comment on chapters, follow/like notifications |
| **Discovery** | Community feed of public notebooks and search across users and notebooks |
| **Insights** | Dashboard and per-notebook engagement (likes, comments, chapters) |
| **Accounts** | Passwordless sign-in with Google or a one-time email code, automatic account creation, light/dark theme, account deletion |
| **Sharing** | Auto-generated Open Graph images for every notebook |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Editor | [Tiptap 3](https://tiptap.dev) (ProseMirror) with `lowlight` |
| Backend | [Appwrite](https://appwrite.io): Auth, Databases, Storage (`appwrite` + `node-appwrite`) |
| Styling | Tailwind CSS 4, shadcn/ui, HeroUI |
| Data & motion | TanStack Query, Framer Motion, date-fns |
| Icons | Lucide, Hugeicons |

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- An [Appwrite Cloud](https://cloud.appwrite.io) project (or a self-hosted Appwrite instance)

### Installation

```bash
git clone https://github.com/joel-musonda/ping-app.git
cd ping-app
npm install
```

### Environment Variables

Create a `.env.local` file in the project root (it is git-ignored):

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_PINGS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_NOTEBOOKS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_CHAPTERS_COLLECTION_ID=
APPWRITE_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | Database containing all collections |
| `NEXT_PUBLIC_APPWRITE_*_COLLECTION_ID` | IDs of the Pings, Notebooks, and Chapters collections |
| `APPWRITE_API_KEY` | **Server-only** key with `users.write` scope, used to delete accounts. Never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used in share links and Open Graph metadata (defaults to `https://pingblogs.com`) |

### Appwrite Setup

Create one database with the following collections:

| Collection | ID | Attributes |
| --- | --- | --- |
| Pings (profiles) | from env | `user_id`, `handle`, `bio` |
| Notebooks | from env | `owner_id`, `title`, `description`, `is_public`, `snapshot`, `cover_image_url`, `collaborator_ids` |
| Chapters | from env | `notebook_id`, `title`, `content_json`, `order_index`, `is_published` |
| Follows | `follows` | `follower_id`, `following_id` |
| Notifications | `notifications` | `user_id`, `sender_name`, `sender_handle`, `type`, `chapter_id` |
| Likes | `likes` | `user_id`, `chapter_id` |
| Comments | `comments` | `chapter_id`, `user_id`, `handle`, `name`, `content`, `avatar_url` |

Then:

1. Add **full-text indexes** on Notebooks `title` and Pings `handle` (required for search).
2. Create a **Storage bucket** for cover images and set its ID as `IMAGES_BUCKET_ID` in `lib/appwrite.ts`.
3. Register a **Web platform** for `localhost` and your production domain.
4. In **Auth → Settings**, enable **Email OTP** and the **Google** OAuth provider, and disable **Email/Password**. Google sign-in returns to `/auth/callback/<state>`; only hostnames registered as Web platforms are accepted as redirect targets.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
├── [handle]/          # Public user profiles
├── notebooks/         # Notebook, chapter, and editor pages + OG image route
├── api/               # Server routes (e.g. delete-account)
└── ...                # Dashboard, community, analytics, settings, auth flows
components/            # Editor, Navbar, notebook/chapter views, shadcn/ui primitives
lib/                   # Appwrite clients and data helpers, auth, theme, utils
public/                # Static assets and icons
```

## Architecture

- **Thin pages, shared data layer.** Pages depend on helpers in `lib/appwrite.ts` and `lib/auth.ts` rather than calling Appwrite endpoints directly, so data access lives in one place.
- **Single-responsibility components.** Each route and component owns one flow (for example, `app/auth/callback` only completes OAuth sign-in).
- **Extensible editor.** Editor behaviour is composed from Tiptap extensions instead of modifying editor internals.
- **Server-only privileges.** Privileged operations such as account deletion run in route handlers with the Appwrite API key and verify the caller's session first.

## Deployment

Production is deployed on **Appwrite Sites** and served at [pingblogs.com](https://pingblogs.com). Set the environment variables above in the Appwrite Sites project settings.

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch: `git checkout -b feature/my-change`
2. Make your changes and run `npm run lint` and `npm run build`
3. Open a pull request describing the change

For bugs and feature ideas, please [open an issue](https://github.com/joel-musonda/ping-app/issues).

## License

Distributed under the [MIT License](./LICENSE). © 2026 Joel Musonda
