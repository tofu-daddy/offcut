# Slice & Place

A non-destructive, mobile-first photo editor. Copy a shaped slice (square, circle, or triangle) of a photo into an independent layer, place it anywhere over the original, and transform it freely — the original photo is never modified.

Built with React, TypeScript, Vite, and a Canvas 2D rendering pipeline. Everything runs locally in the browser; no backend, no uploads.

## Getting started

```sh
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — type-check and build for production
- `pnpm test` — run the Vitest unit test suite
- `pnpm lint` — run oxlint

## Architecture

- `src/editor/` — the document model, coordinate/viewport math, shape geometry and hit-testing, the canvas render pipeline, undo/redo history, image loading, and export
- `src/hooks/useEditorDocument.ts` — editor state, gesture-grouped history
- `src/components/` — Header, PhotoCanvas (pointer gestures + rendering), TransformToolbar, ShapeSelector, PhotoPicker, ExportSheet, and the icon set
