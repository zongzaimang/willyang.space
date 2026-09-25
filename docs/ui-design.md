# Shared UI rules

Updated: 2026-09-25

- All ten projects use the same introduction template. Markdown supplies the brand, model, date, scope, product heading and introduction; presentation stays in the shared template and CSS.
- Desktop introductions use two equal columns aligned at the top. At 960px and below they stack. At 700px and below, metadata uses label/value rows in Client, Scope, Year order.
- Neutral rules separate introduction from metadata, project content from next-project navigation, and page content from the global footer. The footer uses spacing internally. News uses rules only between entries.
- Yellow highlights the active navigation marker, project navigation affordances, selected text and active image zoom. Active navigation also has stronger text weight. Links and keyboard focus remain dark.
- Internal forward links use a right arrow; the return link uses a left arrow. The large footer email shows a thin dark underline on mouse hover or keyboard focus; the smaller About email remains underlined.
- Touch and coarse-pointer devices show card navigation cues without requiring hover. Interactive controls retain visible keyboard focus. Reduced-motion mode suppresses transitions and header movement.
- The image viewer fits the whole image into the available area by default and centers it. Original-size mode permits scrolling. Loading and failure messages use a live status region; closing restores focus and page scrolling.
- Original project images and editorial copy are preserved. All prior content edits remain in `_projects/*.md`.

Validation: content check, static build and release manifest verification; 84 page/viewport combinations at 320, 390, 768, 1024, 1440 and 1920px without horizontal page overflow; image zoom, Escape close, focus restoration and scroll unlocking checked in the local preview.
