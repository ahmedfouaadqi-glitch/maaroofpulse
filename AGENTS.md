<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## MAAROOF PULSE architecture
- Roles live in `public.user_roles` (super_admin/editor/subscriber/guest); checks go through security-definer SQL fns (`has_role`, `is_staff`, `can_view_full`) — avoids RLS recursion and privilege escalation.
- Visitors read teasers only via the `get_teaser_signals` RPC; the full `signals` table is RLS-gated to subscribers/staff.
- Crawling (Firecrawl direct API + AI extraction) lives in `src/lib/crawl.server.ts`; cron fires every 5 min during hours 00 and 12 UTC, each call crawling 2 stale sources, so every source refreshes once per 12h window within request time limits.
- UI strings live in `src/lib/i18n.tsx` (en/ar dictionary); add both languages for every new key.
- New signups get the guest role (limited RPC view); only admins grant subscriber — keeps full access manual.
