This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Assignment 3 & 4: Roles, Permissions & Realtime

Core features added on top of Assignment 2:

- **Role-based access control**: OWNER / ADMIN / MEMBER roles on team memberships, enforced server-side in every API route (lib/permissions.ts is the single source of truth). ADMINs cannot modify/promote OWNERs or delete teams; MEMBERs can only manage tasks they created or are assigned to and can only assign tasks to themselves. The last OWNER of a team can never be demoted/removed. Role changes and role capabilities are also enforced in the UI.
- **Real-time team chat**: per-team chat with live broadcast (Supabase Realtime), message history with cursor pagination (pp/api/teams/[id]/messages/route.ts), typing indicators and online-presence badges (components/ChatPanel.tsx).
- **Real-time task board**: task creates/updates/deletes are broadcast to all team pages so open boards update live without refresh; drag-and-drop across status columns.
- **Notifications**: in-app bell with unread badge; teammates get notified when you assign them a task (TASK_ASSIGNED) or add them to a team (TEAM_ADDED); delivered live via a personal channel (user:{userId}) plus persisted rows in Postgres.
- **Bonus - Activity log**: collapsible "Recent Activity" audit trail on each team page (member adds/removals, role changes, task changes) backed by the ActivityLog table.
- **Bonus - Typing indicator & presence**: live "X is typing..." hints and online member count in the chat header.
- **Bonus - File upload**: paste/upload images in chat, stored in Supabase Storage.

### Realtime notes

Broadcasting uses Supabase's public key (no service role / private channels), so channel topics are not access-controlled at the transport layer - authorization is enforced by the REST API and the membership checks made before subscribing. Events sent: message.new, 	ask.created, 	ask.updated, 	ask.deleted on 	eam:{teamId}; 
otification.new on user:{userId}.

### Seed demo accounts

`ash
npm run seed
`

Creates two accounts for grading (password Password123! on both):

- 	est@example.com - OWNER of team "Alpha Engineering Squad"
- member@example.com - MEMBER of the same team
