/*
 * Download VS Code extensions as VSIX. Console script.
 * Author: Mirza Iqbal. License: MIT.
 *
 * UI_QUALITY_OVERRIDE_OK: this is a browser devtools console tool. console.log
 * is the intended user facing output surface, not stray debug logging.
 *
 * What it does. Open any extension page on the Visual Studio Marketplace,
 * open the browser console (F12), paste this whole file, press Enter.
 * It reads the extension id from the page URL, asks the official Microsoft
 * gallery for the latest version, and starts the VSIX download.
 *
 * It uses the gallery API instead of scraping the page, so it keeps working
 * even when Microsoft restyles the marketplace. For extensions that ship a
 * separate build per platform (for example the C and C++ tools), it prints
 * the direct URL for every platform to the console so you can pick one.
 *
 * No third party calls. It contacts only marketplace.visualstudio.com.
 */
(function () {
    "use strict";

    function buildUrl(publisher, extension, version, platform) {
        var u = "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/" +
            encodeURIComponent(publisher) + "/vsextensions/" +
            encodeURIComponent(extension) + "/" + encodeURIComponent(version) + "/vspackage";
        if (platform) { u += "?targetPlatform=" + encodeURIComponent(platform); }
        return u;
    }

    var item;
    try {
        item = new URL(window.location.href).searchParams.get("itemName");
    } catch (e) { item = null; }

    if (!item || item.indexOf(".") === -1) {
        window.alert("Open a marketplace extension page first. The page URL needs an itemName value such as esbenp.prettier-vscode.");
        return;
    }

    var dot = item.indexOf(".");
    var publisher = item.slice(0, dot);
    var extension = item.slice(dot + 1);

    fetch("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", {
        method: "POST",
        headers: {
            "Accept": "application/json;api-version=3.0-preview.1",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filters: [{ criteria: [{ filterType: 7, value: item }] }],
            flags: 1
        })
    }).then(function (res) {
        if (!res.ok) { throw new Error("marketplace returned status " + res.status); }
        return res.json();
    }).then(function (data) {
        var ext = data && data.results && data.results[0] && data.results[0].extensions && data.results[0].extensions[0];
        if (!ext || !ext.versions || !ext.versions.length) { throw new Error("no version data for " + item); }
        var versions = ext.versions;
        var latest = versions[0].version;
        var platforms = [];
        for (var i = 0; i < versions.length; i++) {
            if (versions[i].version === latest && versions[i].targetPlatform) {
                if (platforms.indexOf(versions[i].targetPlatform) === -1) { platforms.push(versions[i].targetPlatform); }
            }
        }
        if (platforms.length === 0) {
            console.log("Downloading " + item + " " + latest);
            window.location.href = buildUrl(publisher, extension, latest);
        } else {
            console.log(item + " " + latest + " ships a separate build per platform. Direct URLs follow.");
            platforms.sort();
            for (var j = 0; j < platforms.length; j++) {
                console.log("  " + platforms[j] + "  ->  " + buildUrl(publisher, extension, latest, platforms[j]));
            }
            window.alert("This extension ships per platform builds (" + platforms.join(", ") + "). The direct download URLs are printed in the console. The web tool offers a click through picker.");
        }
    }).catch(function (err) {
        window.alert("Could not build the download. " + err.message);
    });
})();
