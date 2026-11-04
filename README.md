# ProjectMatch

**Tinder for projects.** ProjectMatch connects people based on what they want to build, not on their CV. Swipe through projects that need someone like you, send a request with one swipe and start building together as soon as the project owner accepts.

🔗 **Live:** [projectmatchapp.netlify.app](https://projectmatchapp.netlify.app)

---

## Why ProjectMatch

Lots of people have ideas, but few have a team.

- A developer has an app idea but no designer.
- A designer wants to build a portfolio but can't find real projects to work on.
- A marketer wants to test an idea but has no one to handle the tech.
- Bootcamp students often work alone, even though teamwork is what matters most.
- A junior seeks a senior to learn from in a fun project

The result is that ideas die, projects never get finished and people grow more slowly than they could.

### The solution

ProjectMatch matches you on **projects, not profiles**. Instead of asking *"Who are you?"*, the app asks *"What do you want to build?"*. You browse concrete projects, see which roles they need and show interest in the ones you want to be part of.

### What makes it different

| Platform | Focus |
| --- | --- |
| LinkedIn | CV-based networking |
| Upwork | Assignments and paid gigs |
| Discord | Communities, but unstructured |
| GitHub | Code, not finding collaborators |
| **ProjectMatch** | **Project-focused, action-driven, built on matching** |

### Who it's for

- Bootcamp and vocational college (YH) students
- Developers, designers and marketers
- Indie hackers
- Anyone who wants to build a portfolio through real projects

---

## Features

- **Sign up and log in** with email and password
- **Onboarding** that sets up your profile (name, tagline, roles and more) before you start
- **Swipe feed**: swipe right to show interest or left to skip. Projects that need one of your roles are shown first, and projects you've already swiped on don't come back
- **Create, edit and delete projects** with title, description, stage, hours per week, roles needed and an optional link
- **Requests**: project owners can accept or dismiss interest requests and open the interested person's full profile before deciding
- **Matches**: a list of everyone you've matched with, linking to their profiles
- **Real-time chat** for each match, with a conversation list that highlights unread messages
- **Profile** with bio, roles, tools, GitHub and portfolio links, plus a customizable avatar (upload a photo or pick an emoji, colors and font)
- **Notification badges** for new requests, new matches and unread messages
- **Password reset** via email
- **Privacy policy and terms of service** pages

---

## Tech stack

- **[React](https://react.dev)** with React Router
- **[Vite](https://vite.dev)** for development and builds
- **[Supabase](https://supabase.com)**:
  - Postgres database
  - Authentication
  - Row Level Security (RLS) for data access
  - Realtime for chat and live notification badges
  - Storage for avatar images
- **[Netlify](https://www.netlify.com)** for hosting

---

## Running locally

**Requirements:** Node.js and a Supabase project.

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase project's URL and anon key (found under *Project Settings → API* in Supabase):

   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   Never commit this file.

3. Start the dev server:

   ```bash
   npm run dev
   ```

Other scripts: `npm run build` (production build), `npm run preview` (preview the build) and `npm run lint`.

---

## Database overview

All tables live in Supabase Postgres and are protected by Row Level Security.

| Table | Purpose |
| --- | --- |
| `profiles` | User profile: name, tagline, bio, roles, tools, links, avatar and onboarding status |
| `projects` | Projects created by users: title, description, stage, roles needed, hours per week, link |
| `swipes` | Every swipe (left and right) a user has made, so swiped projects are hidden from the feed |
| `interests` | Pending requests: a user swiped right on a project and is waiting for the owner's answer |
| `matches` | An accepted request, linking project, owner and requester |
| `messages` | Chat messages belonging to a match |

Avatar images are stored in the Supabase Storage bucket `avatars`.

---

## Roadmap

- Report and block users
- Search and filters in the feed
- Share projects via link
- Email confirmation on sign-up
- Push notifications
