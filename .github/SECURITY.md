# Security Policy

## What this tool touches

The web tool runs entirely in your browser. It has no backend, no build step,
no dependencies, and no tracking. It calls two Microsoft endpoints directly.

- The Marketplace search API, to find extensions and list their versions.
- The Marketplace asset endpoint, to fetch the VSIX file itself.

Nothing you type is sent anywhere else. No file passes through a server we
control, because there is no server we control. Every download comes straight
from Microsoft to your machine.

## Supported versions

The tool is a single page with no releases. The version on the `main` branch is
the supported one. If you are running an older copy you cloned months ago,
refresh it before reporting a problem.

## Reporting a vulnerability

Use GitHub private vulnerability reporting. Open the Security tab on this
repository and choose Report a vulnerability. That opens a private thread
visible only to the maintainer.

Please do not open a public issue for a security problem. A public issue tells
everyone about the hole before there is a fix.

What to include.

- What you did, step by step, so it can be reproduced.
- What happened, and what you expected instead.
- Your browser and operating system.
- Any proof of concept, kept as small as possible.

## What to expect

- An acknowledgement within 7 days.
- An assessment within 14 days, saying whether it is accepted and why.
- A fix on `main` as soon as one is ready, with credit to you unless you ask
  otherwise.

This is a single maintainer project, so those are honest targets rather than a
contractual guarantee.

## What is in scope

- Cross site scripting or injection through extension names, versions, or a
  pasted marketplace URL.
- Anything that causes the page to fetch from a host other than Microsoft.
- Anything that leaks what you searched for or downloaded to a third party.
- A crafted input that makes the page build a download link to somewhere it
  should not.

## What is out of scope

- Rate limiting by the Microsoft Marketplace API. That is Microsoft's control,
  not ours, and the tool documents it.
- Vulnerabilities in the extensions you download. Those belong to their
  publishers. This tool builds a link and never modifies a file.
- Vulnerabilities in the Visual Studio Marketplace itself. Report those to
  Microsoft through MSRC.
- Missing security headers on GitHub Pages, which we do not configure.
- Anything that requires the attacker to already control the victim's browser.

## Trademarks

This is an independent open source tool. It is not affiliated with, endorsed
by, or sponsored by Microsoft. Visual Studio, VS Code, and the Visual Studio
Marketplace are trademarks of Microsoft.
