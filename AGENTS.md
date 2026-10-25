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
