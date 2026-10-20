# Propora typography

Use tokens from `app/globals.css` instead of introducing page-specific font sizes.

| Role | Token | Desktop / mobile size | Weight |
| --- | --- | --- | --- |
| Page heading (h1) | --propora-text-page | 32 / 26 px | 700 |
| Section heading (h2) | --propora-text-section | 22 px | 700 |
| Card heading (h3) | --propora-text-title | 18 px | 700 |
| Body | --propora-text-body | 16 px | 400 |
| Labels, buttons, details | --propora-text-label | 14 px | 400 or 700 |
| Help, metadata, badges | --propora-text-caption | 12 px | 400 or 700 |

The application uses locally bundled Atkinson Hyperlegible in weights 400 and 700. Preserve its license in `public/fonts/atkinson-hyperlegible/OFL.txt`.

Use heading line heights of 1.25–1.4, paragraph line height of 1.6, and help-text line height of at least 1.5. Choose heading levels by content structure. On mobile, wrap text and provide sufficient space instead of shrinking help text. Payment labels must accurately describe implemented behavior.
