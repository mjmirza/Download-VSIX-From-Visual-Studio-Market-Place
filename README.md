# Download VS Code Extensions as VSIX

![License](https://img.shields.io/badge/license-MIT-2e7d52)
![Dependencies](https://img.shields.io/badge/dependencies-none-2e7d52)
![Build step](https://img.shields.io/badge/build-none-2e7d52)
![Tracking](https://img.shields.io/badge/tracking-none-2e7d52)

Download any VS Code extension as a VSIX file straight from the official
Visual Studio Marketplace. Pick any version. Pick the right build for your
operating system. Everything runs in your browser with no install and no
tracking.

## What is this

Microsoft removed the plain download button from the marketplace, so getting a
VSIX file by hand is awkward. This project gives you that file back.

It is handy when you need to:

- Install an extension on a machine that has no internet access.
- Pin an older version because a new one broke something.
- Grab the build that matches a specific operating system and processor.
- Keep an offline archive of the extensions your team depends on.

There is nothing to install. The web tool is a single page. The bookmarklet and
the console script are small snippets you paste once.

## Three ways to download

### 1. The web tool, the easy way

1. Open the web tool. Locally you can open `index.html` in any browser. Hosted, open the GitHub Pages link for this repository.
2. Type an app name such as `python`. A live suggestion list appears as you type. Use the arrow keys and Enter, or click, to add the one you want. You can also paste a marketplace URL or a `publisher.extension` id such as `esbenp.prettier-vscode` and press Enter.
3. Each pick becomes a chip with its own card. Choose the version, and the platform if the extension shows one, then press Download VSIX.
4. Add as many extensions as you like. Remove one by pressing the small x on its chip.

### 2. The bookmarklet, one click on the page

1. Open `downloadVSIX.bookmark` and copy the whole line.
2. Make a new browser bookmark and paste that line as the address.
3. Open any extension page on the marketplace.
4. Click the bookmark. The latest VSIX downloads. For an extension with per platform builds, the direct links for each platform are shown.

### 3. The console script, for quick one off use

1. Open any extension page on the marketplace.
2. Open the developer console with F12.
3. Paste the contents of `downloadVSIX.js` and press Enter.

The console script and the bookmarklet read the extension identifier from the
page address, ask the marketplace for the latest version, and start the
download. They do not depend on the page markup, so they keep working when
Microsoft restyles the site.

## OS specific extensions

Most extensions ship one universal VSIX. Some, such as the C and C++ tools,
ship a separate VSIX per platform. For those, the web tool shows a platform
menu so you can pick the correct file. The covered platforms are:

- `win32-x64` and `win32-arm64` for Windows
- `darwin-x64` and `darwin-arm64` for macOS
- `linux-x64`, `linux-arm64`, and `linux-armhf` for Linux
- `alpine-x64` and `alpine-arm64` for Alpine

## How it works

The tool asks the official marketplace gallery service for the list of versions
of the extension you name. That service returns every version, and for OS
specific extensions it also returns the platform of each build. The tool then
builds the official Microsoft download link for the exact file you pick and
hands the download to your browser.

The download link points at the marketplace `vspackage` endpoint, which serves
the file with a correct name such as `esbenp.prettier-vscode-12.4.0.vsix`.

## Privacy and safety

- It runs entirely in your browser. There is no backend, no account, no cookies, and no analytics.
- It contacts one host only, `marketplace.visualstudio.com`. No third party service is involved.
- It has zero dependencies and no build step. You can read every line of the three small files yourself.
- Files download straight from Microsoft servers over HTTPS.

## Reliability and rate limits

The tool is built to stay light on the marketplace and to avoid being throttled
or blocked.

- The search waits until you pause typing before it asks the marketplace, and it never sends a query shorter than two letters.
- An older search is cancelled the moment you type more, so fast typing never stacks up calls.
- Every search result and every version lookup is cached in memory for the session, so retyping or removing and re adding never repeats a call.
- A version lookup that hits a busy response is retried with a short backoff, and a busy state shows a plain message rather than an error.
- It uses the same public gallery endpoints that VS Code itself uses, which are stable across marketplace redesigns. Because the tool reads version data from the API rather than scraping the page, a site restyle does not break it.

## Legal and trademarks

This is an independent open source project. It is not affiliated with, endorsed
by, or sponsored by Microsoft or by any extension publisher. Visual Studio, VS
Code, and the Visual Studio Marketplace are trademarks of Microsoft.

The tool does not host, modify, cache, or redistribute any extension. It builds
the official Microsoft download links, and every file is served directly by
Microsoft. Your use of the marketplace and of each extension is governed by the
[Visual Studio Marketplace Terms of Use](https://aka.ms/VSMarketplace-ToU) and
by each extension license. You are responsible for following them.

## Frequently asked questions

### How do I use the non bookmarklet versions

Open an extension page on the marketplace, open the console with F12, and paste
`downloadVSIX.js`. Or skip the console entirely and use the web tool, which is
the simplest path. This is the topic of issue 6, and the project now keeps one
clear console script instead of two near identical ones.

### Can it download an extension for a specific operating system

Yes. The web tool shows a platform menu for any extension that ships per
platform builds. This is the topic of issue 7.

### Can it download several extensions at once

Yes. Paste several links or identifiers in the web tool, one per line, and each
resolves with its own controls. This is the topic of issue 1.

### Is there a Firefox extension

There is no separate browser extension, and there does not need to be. The web
tool works in Firefox, Chrome, Edge, and Safari. The bookmarklet works in every
one of those too. A dedicated extension would add a store review and update
burden with no extra capability. This is the topic of issue 2.

### The downloaded file has no name or the wrong name

That was the behaviour of the old script. The tool now uses the `vspackage`
endpoint, which names the file correctly.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | The web tool markup |
| `styles.css` | The web tool styling, light and dark |
| `app.js` | The web tool logic |
| `downloadVSIX.js` | The console script |
| `downloadVSIX.bookmark` | The bookmarklet, one line |
| `LICENSE` | MIT license |
| `CHANGELOG.md` | Release notes |

## Run and test locally

Serve the folder with any static server and open the page.

```bash
python3 -m http.server 8137
# then open http://localhost:8137/index.html
```

The tool was validated end to end in a real browser against the live
marketplace. The checks cover an exact identifier, an OS specific extension, a
search by name, invalid input, a batch of several entries, the dark mode
toggle, and a full download that is unzipped and confirmed to contain a real
`extension.vsixmanifest`. The bookmarklet logic was validated from the live
marketplace page as well.

## Contributing

Issues and pull requests are welcome. Keep the project dependency free and
client side. No build step, no tracking, no third party calls beyond the
official marketplace.

## License

Released under the MIT License. See the `LICENSE` file.

## Author

Mirza Iqbal.
