# Contributing

Thanks for looking. This project is small on purpose, and the bar for a change
is that it keeps the tool small.

## The three rules that shape everything

1. **Zero dependencies.** No npm install, no package.json, no bundler, no
   framework. If a change needs a build step, it does not belong here.
2. **Zero tracking.** No analytics, no telemetry, no third party script, no
   font CDN, no pixel. The page talks to Microsoft and to nobody else.
3. **Zero backend.** Everything runs in the visitor's browser. If a feature
   needs a server, it is out of scope, however useful it would be.

A pull request that breaks one of these gets declined, even when the feature
itself is good. Say so up front in the description if you think your change is
worth an exception, and explain why.

## The whole development loop

There is no toolchain to set up.

```
git clone https://github.com/mjmirza/Download-VSIX-From-Visual-Studio-Market-Place.git
cd Download-VSIX-From-Visual-Studio-Market-Place
open index.html
```

Edit the file, refresh the browser, look at it. That is the loop.

Four files carry the whole tool.

| File | What it holds |
|---|---|
| `index.html` | The page structure and all copy |
| `app.js` | Search, version lookup, platform detection, download links |
| `styles.css` | Everything visual |
| `downloadVSIX.js` | The standalone console script |

`downloadVSIX.bookmark` is the bookmarklet, which is `downloadVSIX.js` squeezed
onto one line. Change one and change the other.

## Before you open a pull request

Run through this by hand. It takes about two minutes.

- [ ] Search for `python` and confirm the suggestion list appears as you type.
- [ ] Add two extensions at once and confirm each chip keeps its own version
      and platform controls.
- [ ] Pick an older version and confirm the download link changes with it.
- [ ] Try `ms-vscode.cpptools`, which ships a separate build per platform, and
      confirm the platform menu appears.
- [ ] Paste a full marketplace URL and confirm it resolves.
- [ ] Paste a `publisher.extension` id and confirm it resolves.
- [ ] Open the page with the browser console visible and confirm there are no
      errors.
- [ ] Resize to a phone width and confirm nothing overflows sideways.
- [ ] Check it in light and dark mode.

Test in at least two browsers. Chrome and Firefox is a reasonable pair.

## What makes a pull request easy to accept

- One change per pull request. A bug fix and a redesign in the same branch
  means neither gets merged quickly.
- A description that says what broke, what you changed, and how you checked it.
  Paste the actual output or describe what you saw, rather than ticking a box.
- No new files unless the change genuinely needs one.
- Copy that matches the existing voice. Plain sentences, no marketing language.

## What gets declined

- Anything adding a dependency, a build step, a backend, or tracking.
- Anything that mirrors, caches, or rehosts extension files. This tool builds a
  link to Microsoft and never touches the file.
- Anything implying the project is affiliated with Microsoft.
- Framework rewrites. React would not make a 4 file page better.

## Reporting a bug instead

Open an issue. There is a template for a download that fails on a specific
extension, which is the most common report, and it asks for the exact
extension id, because a bug that only shows on one extension is impossible to
chase without it.

Security problems go through the Security tab, not a public issue. See
[SECURITY.md](SECURITY.md).

## Code of conduct

Participating here means following the [Code of Conduct](CODE_OF_CONDUCT.md).
