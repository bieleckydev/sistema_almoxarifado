# UI/UX & Frontend Guidelines

## Density & Layout
- Favor business software density (ERP/SaaS operational style) over marketing landing page aesthetics.
- Avoid excessive vertical padding on table rows (standardize between 8px and 12px vertical padding).
- Do not constrain main dashboard tables inside narrow centered containers on wide screens; use responsive full-width layout with controlled gutters (w-full, p-6 or p-8).

## Information Architecture & Data Display
- Zero redundant status indicators: Never combine a color bar, a status badge, and a verbal status unless each presents unique, non-overlapping information.
- Every data table representing assets or inventory must include actionable row triggers (e.g., Quick actions, context menu, or inline edit).
- If a progress/threshold bar is used, explicitly show the numeric target/minimum and max scale, not just an unlabelled vertical notch.

## Component Styling (Anti-AI Clichés)
- Avoid floating generic icons inside rounded neutral boxes in metric cards purely for decoration. Use metric comparisons (e.g., trend, delta %, actionable filters) or remove the icon.
- Replace overly rounded "pill" badges (`rounded-full`) with subtle status tags (`rounded-md`, border-subtle, neutral backgrounds with semantic dot indicators).
- Use subtle border separation (`border-slate-200 / border-slate-800`) over heavy dropshadows or high-contrast contrasting background blocks.
