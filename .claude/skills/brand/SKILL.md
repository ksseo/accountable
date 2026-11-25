---
name: brand
description: Accountable's brand guidelines for fonts, colors, surfaces and tone. Use for any UI work.
---

# Brand

## Fonts

The screens are in Korean, so everything uses one font that has both Korean and Latin letters: **Noto Sans KR**, weights 400, 500, 600 and 700. That covers headings, body, numbers, amounts and the Accountable wordmark (bold). Its numbers are all the same width, so amounts line up in columns without a monospace font. Never use italic; Korean fonts have none.

The brand's original fonts (Instrument Sans, Instrument Serif and JetBrains Mono) aren't used: they have no Korean letters, and mixing them with a Korean font looks patchy.

Noto Sans KR is on Google Fonts. In the app it's bundled from npm (`@fontsource/noto-sans-kr`) instead, so the app works offline; a standalone mockup may load it from Google Fonts.

## Colors

The color scheme for this product:

- **Primary**: Sea Green `#06D6A0`, Midnight text
- **Secondary**: Marigold `#FFC145`, Midnight text
- **Tertiary**: Coral `#F78C6B`, Midnight text
- **Information**: Cerulean `#118AB2`, white text
- **Highlight or alert**: Raspberry `#EF476F`, white text
- **Ink on light backgrounds**: Midnight `#073B4C`
- **Ink on dark backgrounds**: Sea Mist `#CDD8DB`

Use Sea Green, Marigold and Coral when three things sit side by side, such as pipeline stages or chart series. Add Cerulean fourth and Raspberry fifth.

## Surfaces

- **Light mode**: page background `#F0F4F5`, white panels and cards
- **Dark mode**: page background `#04232E`, black panels and cards. What floats over the page is lighter, since a shadow can't be seen on black: dialogs and a card being dragged `#0C313E`; menus, lists and the calendar `#154252`

Panels are rounded with no outline. Sea Green and Marigold are too bright for small text, so darken them for headings and body copy on light backgrounds and lighten them on dark ones.

## Avoid

Avoid borders on one edge of panels, or single-line borders at top of page.
Avoid over-use of gradient fills.

## Tone

Plain business English. Short labels, no jargon, no exclamation marks. Money is always shown with its currency.
Down-to-earth language without LLM smells like "It's not X. It's Y." and overly profound pithy statements where not needed.