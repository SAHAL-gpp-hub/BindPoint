# Design System & UI/UX Guidelines: Print Station

## 1. Visual Language & Direction

A refined, utilitarian aesthetic inspired by classic high-end editorial stationery, physical print receipts, and modern Swiss typography. The interface feels dependable, crisp, and tactile—treating print management as a precision craft rather than a generic SaaS tool.

### Core Principles
- **Ink & Paper**: Warm off-white background paired with deep carbon ink typography.
- **Single Restrained Accent**: Deep Ink-Green (`#144a38`) for focused primary interactive moments. No blue/purple gradients, no neon halos.
- **Structural Restraint**: Flat surfaces, hairline 1px borders (`#E5E0D8`), tight 4px–6px corner radii, near-zero shadows. No glassmorphism, no rounded bubble cards.
- **Tabular & Typographic Precision**: Monospace tabular numerals for currency (`₹`), order numbers (`PR-261031-0042`), page counts, and 12-digit UTR identifiers.
- **Ledger-Style Cost Breakdown**: Styled like a physical itemized receipt with ruled divider lines, right-aligned monetary values, and double-underline totals.

---

## 2. Design Tokens

### Color Palette

| Token Name | Hex Code | Purpose |
|---|---|---|
| **Background / Canvas** | `#F9F8F6` | Warm off-white paper canvas |
| **Surface Raised** | `#FFFFFF` | Form fields, active sheets, dialogs |
| **Surface Subtle** | `#F2EFE9` | Thumbnail trays, muted blocks, hover backgrounds |
| **Border Hairline** | `#E4DFD5` | Default 1px structural dividers and boundaries |
| **Border Focused** | `#144A38` | Active input border & keyboard focus rings |
| **Ink Primary** | `#1C1E1B` | Primary text, titles, ledger headings |
| **Ink Secondary** | `#525650` | Form labels, helper descriptions, timestamps |
| **Ink Muted** | `#868A82` | Placeholders, inactive steps, table column heads |
| **Accent Primary** | `#144A38` | Primary CTA buttons, active selection rings |
| **Accent Hover** | `#0E382A` | Primary CTA pressed/hover state |
| **Accent Subtle** | `#EAF2EE` | Accent badges, highlighted table rows |

#### Semantic Status Tokens
| State | Text & Icon | Background Badge | Border |
|---|---|---|---|
| **Submitted / Pending** | `#854D0E` (Amber-800) | `#FEF3C7` (Amber-100) | `#FDE68A` |
| **Verification Required** | `#B45309` (Amber-700) | `#FFFBEB` (Amber-50) | `#FCD34D` |
| **Confirmed / Paid** | `#166534` (Emerald-800)| `#DCFCE7` (Emerald-100) | `#BBF7D0` |
| **Printing** | `#1E40AF` (Blue-800) | `#DBEAFE` (Blue-100) | `#BFDBFE` |
| **Completed** | `#0F5132` (Forest-800) | `#D1E7DD` (Forest-100) | `#A3CFBB` |
| **Cancelled / Rejected** | `#991B1B` (Red-800) | `#FEE2E2` (Red-100) | `#FECACA` |

### Typography

- **Primary UI Font**: Inter / Geist / system grotesk fallback (`font-sans`: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Data & Numeric Font**: JetBrains Mono / Geist Mono / monospace fallback (`font-mono`: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) with `font-variant-numeric: tabular-nums`.

#### Scale
- **Display / H1**: `24px` (`text-2xl`), weight 600, tight tracking (`tracking-tight`).
- **Section / H2**: `18px` (`text-lg`), weight 600.
- **Subhead / H3**: `15px` (`text-sm`), weight 600, uppercase letter-spacing for ledger caps (`tracking-wider`).
- **Body Regular**: `14px` (`text-sm`), weight 400, leading 1.5.
- **Micro / Caption**: `12px` (`text-xs`), weight 500.
- **Inputs & Fields**: `16px` on mobile (prevents iOS Safari zoom-on-focus), `14px` on desktop.

### Geometry & Spacing
- **Radii**: `rounded` (4px) on buttons, chips, and small controls; `rounded-md` (6px) on containers and modals. No pill buttons except status chips.
- **Borders**: Hairline 1px solid throughout.
- **Shadows**: Subtle single-layer shadow (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`).

---

## 3. Mobile Viewport Architecture (360px – 390px)

1. **Sticky Bottom Action Bar**:
   - Primary forward action (e.g., "Review Cost →", "My PDF is Final", "Pay ₹115 via UPI") fixed at screen bottom with safe-area padding (`pb-[env(safe-area-inset-bottom)]`).
   - Minimum tap targets $\ge 48\text{px}$.
2. **Compact Progress Stepper**:
   - Header shows a single line: *"Step 3 of 7: Review Cost"* with a hairline segmented progress bar, saving vertical screen real estate.
3. **Touch-Optimized PDF Viewer**:
   - Vertical continuous page scrolling with viewport lazy loading.
   - Fixed bottom viewer toolbar: Previous / Next, `Page X of N`, Zoom toggle, Fit-Width, and Bottom Sheet trigger for thumbnails.
   - Clear badge per page: `[Special Paper]` on Page 1, `[Normal Colour]` on Pages $2 \dots N$.
4. **App-Switch Resilient Payment Screen**:
   - After tapping "Pay with UPI app", the view transitions cleanly to:
     *"Done paying? Enter your 12-digit UTR below."*
   - Form state persists across backgrounding, app switcher transitions, and accidental page reloads.
   - Direct numerical keyboard (`inputmode="numeric"`, `pattern="[0-9]*"`).

---

## 4. Desktop Viewport Architecture (1024px – 1920px)

1. **Student Flow**:
   - Focused single-column reading column ($640\text{px}$) with an optional persistent side summary rail on wider screens ($960\text{px}+$ layout).
   - Horizontal step indicators with step status (`Done`, `Current`, `Upcoming`).
   - Desktop PDF viewer: Side-by-side thumbnail navigator rail, zoom slider, keyboard shortcuts (Left/Right arrows, `F` for fullscreen, `+`/`-` for zoom).
   - Desktop payment: High-contrast scannable QR code in a dedicated panel, alongside copyable UPI details.
2. **Admin Flow**:
   - Dense, high-information-density table with sticky header.
   - Status filters, search bar, sort indicators, and date pickers.
   - Row selection checkboxes with a live sticky floating action bar:
     *"3 orders selected — 62 pages, ₹385 — [Download ZIP] [Create Print Batch]"*
   - Split view / drawer for instant order details, timeline audit log, and inline PDF preview without navigating away.
