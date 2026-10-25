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

## Deck architecture
- Keep the existing 1920×1080 canvas, slide registry and global `--slide-*` tokens as the single presentation system; additional slides must use the same system to remain consistent.
- Derive navigation bounds and displayed slide counts from the slide registry, never a literal total, so deck extensions remain reachable.
- Use the shared Button's deck variants for presentation controls so colors remain semantic and keyboard focus stays accessible.
- The /teleprompter route reads the same `src/lib/presenter/script.json` as the presenter assistant, so the spoken script stays single-sourced.
- Presenter answers use a same-origin streaming TanStack server route and request-scoped AI Gateway Responses helpers; keys and prompts stay server-side to prevent client disclosure.
- Ground presenter answers in only the selected slide and its curated script, preserving scientific qualifications instead of importing facts from other slides.
- Persist AI provider access denials in a service-role-only circuit-breaker table so reloads cannot replay blocked calls; clear only after service restoration and explicit owner action.
