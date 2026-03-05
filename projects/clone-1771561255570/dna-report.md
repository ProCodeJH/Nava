# 🧬 Design DNA Report

> **URL:** https://dribbble.com/
> **Engine:** design-dna v10.0.0
> **Generated:** 2026-02-20T04:21:13.145Z
> **Viewport:** 1920×1080

---

## 🎨 Design Tokens

### Colors
| Color | Frequency |
|:------|:----------|
| `rgb(255, 255, 255)` | 1 |
| `rgb(234, 76, 137)` | 1 |
| `rgba(255, 255, 255, 0)` | 1 |
| `rgb(208, 213, 210)` | 1 |
| `rgb(237, 237, 237)` | 1 |
| `rgb(13, 12, 34)` | 1 |
| `rgb(61, 61, 78)` | 1 |
| `rgba(0, 0, 0, 0.5)` | 1 |
| `rgb(184, 80, 154)` | 1 |
| `rgb(58, 53, 70)` | 1 |
| `rgb(243, 243, 246)` | 1 |
| `rgb(253, 252, 251)` | 1 |
| `rgb(248, 248, 252)` | 1 |
| `rgb(248, 247, 244)` | 1 |
| `rgb(194, 233, 192)` | 1 |

### Typography
**Fonts:** Noto Sans KR, Mona Sans, Arial

| Size | Frequency |
|:-----|:----------|
| 14px | 658 |
| 12px | 345 |
| 16px | 324 |
| 13px | 169 |
| 9px | 24 |
| 13.3333px | 7 |
| 18px | 2 |
| 48px | 2 |
| 10px | 1 |

### CSS Variables (104)
```css
--tagify-dd-color-primary: 234, 100, 217;
--zi-header: 9996;
--zi-header-behind: calc(var(--zi-header) - 1);
--zi-shot-overlay: calc(var(--zi-header) + 1);
--zi-attachment-overlay: calc(var(--zi-shot-overlay) + 1);
--zi-default-overlay: calc(var(--zi-shot-overlay) + 3);
--zi-hovercard: calc(var(--zi-shot-overlay) + 1);
--zi-tipsy: calc(var(--zi-default-overlay) + 1);
--zi-dialog: calc(var(--zi-default-overlay) + 5);
--zi-filter: 1000;
--zi-dropdown: 1000;
--zi-autocomplete: calc(var(--zi-shot-overlay) + 1);
--zi-sticky-job-header: calc(var(--zi-hovercard) + 1);
--zi-jobs-bg-effect: 10;
--zi-playbook-overlay: var(--zi-shot-overlay);
--zi-playbook-notice: calc(var(--zi-playbook-overlay) - 1);
--zi-playbook-customize: calc(var(--zi-playbook-notice) + 1);
--zi-playbook-head: 2;
--zi-playbook-edit-links: calc(var(--zi-playbook-head) + 1);
--zi-max: 99999999999;
--attachment-min-width: 100px;
--attachment-max-width: 252px;
--attachment-min-height: 100px;
--attachment-max-height: 252px;
--btn-bg-color: #0d0c22;
--btn-bg-color-hover: #3d3d4e;
--btn-text-color: #fff;
--btn-text-color-hover: #fff;
--btn-border-color: var(--btn-bg-color);
--btn-border-color-hover: var(--btn-bg-color-hover);
```

---

## 📐 Layout & Spatial

### Sections (5)
| Name | Size | Padding |
|:-----|:-----|:--------|
| ckyPreferenceCenter | 845×853 | 0px |
| wrap | 1920×3046 | 0px |
| home-hero container2 | 1920×430 | 0px 72px |
| home-hero__search-container | 1008×184 | 0px |
| footer | 1920×508 | 0px |

### Grids (18)
- **announcements announcements--dark announcements--visible**: `1838px 32px` gap=14px
- **site-nav-sub site-nav-sub--wide-format**: `320px 186.078px` gap=normal
- **site-nav-sub__content-wrapper**: `20px 240.875px` gap=8px
- **site-nav-sub__content-wrapper**: `20px 207.391px` gap=8px
- **site-nav-sub__content-wrapper**: `20px 252.25px` gap=8px
- **site-nav-sub__content-wrapper**: `146.078px 0px` gap=8px
- **site-nav-sub site-nav-sub--wide-format**: `320px 168.953px` gap=normal
- **site-nav-sub__content-wrapper**: `21px 161.453px` gap=8px
- **site-nav-sub__content-wrapper**: `20px 215.234px` gap=8px
- **site-nav-sub__content-wrapper**: `128.953px 0px` gap=8px

### Z-Index Stack
- z-index: **999999999** — cky-modal (fixed)
- z-index: **9999999** — cky-consent-container cky-box-bottom-left (fixed)
- z-index: **10000** — signup-overlay (fixed)
- z-index: **9996** — site-nav (relative)
- z-index: **9996** — site-nav__wrapper (relative)
- z-index: **9996** — site-nav-sub (absolute)
- z-index: **9996** — site-nav-sub site-nav-sub--wide-format (absolute)
- z-index: **9996** — site-nav-sub site-nav-sub--wide-format (absolute)
- z-index: **9996** — site-nav-sub (absolute)
- z-index: **9996** — brief-floating-promo (fixed)

---

## ✨ Animation DNA

### @keyframes (170)
- **fade-in**: 2 steps
- **fade-in**: 2 steps
- **fade-out**: 2 steps
- **fade-out**: 2 steps
- **fade-in-up**: 2 steps
- **fade-in-up**: 2 steps
- **fade-out-up**: 2 steps
- **fade-out-up**: 2 steps
- **fade-in-up-large**: 2 steps
- **fade-in-up-large**: 2 steps

### Transitions (154)
- `.turbo-progress-bar`: width 300ms ease-out, opacity 150ms ease-in 150ms
- `.cancel-subscription-overlay input[type="radio"] +`: 0.2s linear
- `.slide-in-out-enter-active, .slide-in-out-leave-ac`: max-height 400ms, opacity 300ms, transform 300ms, -webkit-transform 300ms
- `.slide-in-right-enter-active, .slide-in-right-leav`: 0.5s
- `.slide-in-up-enter-active, .slide-in-up-leave-acti`: 0.5s
- `.modal .modal-action-indicator svg path`: fill 200ms
- `.cancel-subscription-overlay input[type="radio"] +`: 0.2s linear
- `.dd-toggle .dd-toggle-control`: 0.3s
- `.dd-toggle .dd-toggle-control::after`: 0.3s
- `.overlay`: visibility 0.07s ease-in, opacity

### Easing Functions
- `ease-out, ease-in`
- `linear`
- `ease-in-out`
- `ease`
- `ease, ease, ease, ease`
- `ease-in`
- `cubic-bezier(0.68, -0.55, 0.265, 1.2)`
- `ease, ease`
- `cubic-bezier(0.46, 0.1, 0.52, 0.98)`
- `ease-out`
- `ease, ease, ease, ease, ease`
- `cubic-bezier(0, 1, 0.5, 1)`
- `cubic-bezier(0.34, 1.56, 0.64, 1)`
- `ease-in-out, ease-in-out`
- `inherit`

---

## 📱 Responsive Analysis

### Breakpoints
`352px` · `375px` · `400px` · `410px` · `425px` · `440px` · `460px` · `480px` · `499px` · `500px` · `520px` · `530px` · `576px` · `660px` · `739px` · `767px` · `768px` · `789px` · `790px` · `800px` · `845px` · `919px` · `920px` · `959px` · `960px` · `980px` · `990px` · `1199px` · `1200px` · `1204px` · `1205px` · `1300px` · `1350px` · `1445px` · `1600px` · `1921px`

| Viewport | Height | Sections | Hidden |
|:---------|:-------|:---------|:-------|
|  (px) | 3642px | 25 | 0 |
|  (px) | 3102px | 25 | 0 |
|  (px) | 5234px | 25 | 1 |
|  (px) | 8591px | 23 | 1 |

---

## 🖱️ Interaction

### Hover Effects (180)
- `.modal .modal-action-indicator:hover`: backgroundColor: initial
- `.dd-toggle .dd-toggle-control:hover, .dd-toggle .d`: filter: brightness(105%)
- `.overlay-video a.close:hover`: backgroundColor: rgb(240, 130, 172)
- `.dialog-text-action:hover, a.dialog-text-action:ho`: color: rgb(61, 61, 78)
- `.site-notifications .site-notification-close:hover`: opacity: 1
- `.pswp__button:hover, .pswp__button:active, .pswp__`: opacity: 1, backgroundColor: initial, boxShadow: none, borderColor: initial
- `.pswp__button:hover, .pswp__button:active, .pswp__`: backgroundColor: rgb(255, 255, 255)
- `.flickity-enabled .flickity-prev-next-button:hover`: color: rgb(234, 76, 137)
- `.flickity-enabled:hover .flickity-prev-next-button`: opacity: 1
- `.shot-overlay .shot-nav-button:hover`: backgroundColor: rgb(158, 158, 167), color: rgb(255, 255, 255)

---

## 🛠️ Tech Stack

### Libraries (1)
- Bootstrap

### Bundle Info
- JS: 0.0KB | CSS: 0.0KB | Images: 0.0KB
- Scripts: 15 external + 10 inline | Styles: 9 external + 3 inline

---

## ⚡ Performance

| Metric | Value |
|:-------|:------|
| First Contentful Paint | 922ms |
| Cumulative Layout Shift | 0.0475 |
| TTFB | 504ms |
| DOM Content Loaded | 2045ms |
| Full Load | 2743ms |
| Total Resources | 147 (0KB) |

### will-change Audit (1 elements)
- `brief-floating-promo__close-button text-`: will-change: opacity

---

## ♿ Accessibility

**Score: 0/100**

✅ `prefers-reduced-motion` supported

### ❌ Errors (7)
- **img-no-alt**: Image missing alt attribute — `https://dribbble.com/assets/icons/close-v2-ee745bc0fbb9fb4478f0276268826717013f0`
- **form-no-label**: Form control without label — `INPUT type=radio id=(none)`
- **form-no-label**: Form control without label — `INPUT type=radio id=(none)`
- **form-no-label**: Form control without label — `INPUT type=radio id=(none)`
- **form-no-label**: Form control without label — `INPUT type=search id=tag`
- **form-no-label**: Form control without label — `INPUT type=search id=color`
- **form-no-label**: Form control without label — `INPUT type=hidden id=timeframe`

### ⚠️ Warnings (78)
- **empty-interactive**: Interactive element with no text or aria-label — `A`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONaa-SubmitButton`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONaa-ClearButton`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONsite-nav-icon-actions__item`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONaa-SubmitButton`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONaa-ClearButton`
- **empty-interactive**: Interactive element with no text or aria-label — `Ad-none`
- **empty-interactive**: Interactive element with no text or aria-label — `Ad-none`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `Abucket-shot btn2 btn2--circle `
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONbtn2 btn2--secondary-alt btn2-`
- **empty-interactive**: Interactive element with no text or aria-label — `BUTTONtext-button display-inline-fle`
- **empty-interactive**: Interactive element with no text or aria-label — `A`
- **empty-interactive**: Interactive element with no text or aria-label — `A`
- **empty-interactive**: Interactive element with no text or aria-label — `A`
- **empty-interactive**: Interactive element with no text or aria-label — `Aclose`

### Landmarks
- navigation: 1
- main: 1
- contentinfo: 1
- search: 2

---
*Generated by design-dna v4.5*
