# Changelog

All notable changes to this project are documented here. The format follows
Keep a Changelog, and the project aims to follow semantic versioning.

## [Unreleased]

Nothing yet.

## [1.1.0] - 2026-05-30

### Added

- Search as you type. The web tool now shows a live suggestion dropdown as you type an app name, with keyboard navigation. Before, a name search dumped a long list of result cards at once. Now you pick from a dropdown and add only what you want.
- Selected extensions appear as removable chips, each with its own download card. Remove one with the x on its chip, or press Backspace on an empty search box.
- A legal and trademarks note in the tool and the README. It states that this is an independent project, not affiliated with Microsoft, that nothing is redistributed, and that use is subject to the Visual Studio Marketplace Terms of Use.

### Changed

- The big paste box was replaced by a single search field with the dropdown. Pasting a URL or a publisher.extension id and pressing Enter still works.
- Hardened the marketplace calls against rate limiting. Searches are cancelled when superseded, results and version lookups are cached for the session, and a busy response is retried with a backoff and shown as a plain message.

## [1.0.0] - 2026-05-30

This release rebuilds the tool around the official Microsoft gallery API and
validates every part against the live marketplace in a real browser.

### Added

- Web tool now reads the version list straight from the official marketplace gallery API, so you no longer copy a version number by hand. Before, you had to read the version off the page and paste it. Now it loads automatically.
- Version picker that lists every published version of an extension.
- Platform picker for OS specific extensions. It appears only when an extension ships a separate build per platform, and it covers Windows, macOS, Linux, and Alpine on x64 and arm. This answers the OS specific request in issue 7.
- Search by app name. Type a plain name such as python or docker and the top matching extensions are listed, each with its own download controls.
- Batch input. Paste several links or identifiers, one per line, and every one resolves at once. This answers the multi extension request in issue 1.
- Dark mode with a toggle. Light is the default.
- An MIT LICENSE file. The old README claimed MIT but the file was missing.
- A CHANGELOG.

### Changed

- The download now uses the vspackage endpoint, which serves the file with a correct name such as esbenp.prettier-vscode-12.4.0.vsix. Before, the file often saved with a generic name and no extension.
- The console script and the bookmarklet now read the extension id from the page URL and ask the gallery API for the latest version, instead of scraping the page. Before, they relied on page specific CSS selectors that broke whenever Microsoft restyled the marketplace. Now they keep working across redesigns.
- The web tool was split into index.html, styles.css, and app.js. Before, everything was inlined in one file. Now each concern is in its own file and is easier to audit.

### Removed

- The duplicate second console script. Having two near identical scripts was the confusion raised in issue 6. One clear console script and one bookmarklet remain.

### Fixed

- The tool worked again. The previous scripts carried a note that they were not tested after July 2024 and depended on marketplace markup that has since changed. Every path is now tested against the live marketplace.
