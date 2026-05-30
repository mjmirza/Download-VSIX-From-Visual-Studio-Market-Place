/*
 * VSIX Downloader for the Visual Studio Marketplace
 * Author: Mirza Iqbal
 * License: MIT
 *
 * Pure client side. Zero dependencies. Zero build step. No tracking.
 * It contacts exactly one host, the official Microsoft marketplace gallery,
 * to read public version metadata and to serve the official VSIX download.
 */
(function () {
    "use strict";

    var GALLERY_QUERY = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
    var VSCODE_CATEGORY = "Microsoft.VisualStudio.Code"; // restricts search to VS Code extensions
    var SEARCH_PAGE_SIZE = 8;

    // Marketplace query flags. 1 means "include the version list" (with targetPlatform).
    var FLAG_INCLUDE_VERSIONS = 1;
    // Filter types used by the public gallery API.
    var FILTER_TARGET = 8;   // restrict to a product (VS Code)
    var FILTER_NAME = 7;     // exact publisher.extension lookup
    var FILTER_SEARCH = 10;  // free text search
    // Sort by install count, descending, so the most relevant result is first.
    var SORT_BY_INSTALLS = 4;
    var SORT_DESC = 0;

    var els = {
        input: document.getElementById("input"),
        fetchBtn: document.getElementById("fetchBtn"),
        clearBtn: document.getElementById("clearBtn"),
        status: document.getElementById("status"),
        results: document.getElementById("results"),
        themeToggle: document.getElementById("themeToggle")
    };

    /* ---------- theme. light is default, dark is opt in and remembered ---------- */
    try {
        if (localStorage.getItem("vsix-theme") === "dark") {
            document.documentElement.classList.add("dark");
        }
    } catch (e) { /* storage blocked, stay light */ }

    els.themeToggle.addEventListener("click", function () {
        var dark = document.documentElement.classList.toggle("dark");
        try { localStorage.setItem("vsix-theme", dark ? "dark" : "light"); } catch (e) {}
    });

    /* ---------- input parsing ---------- */

    // Classify one input line. Returns an object describing what to do.
    function classifyLine(raw) {
        var line = raw.trim();
        if (!line) { return null; }

        // A full marketplace URL. Pull the itemName parameter out of it.
        if (line.indexOf("http://") === 0 || line.indexOf("https://") === 0) {
            try {
                var u = new URL(line);
                var item = u.searchParams.get("itemName");
                if (item && isExactId(item)) {
                    return { kind: "id", value: item, label: item };
                }
                return { kind: "invalid", value: line, label: line };
            } catch (e) {
                return { kind: "invalid", value: line, label: line };
            }
        }

        // An exact publisher.extension identifier.
        if (isExactId(line)) {
            return { kind: "id", value: line, label: line };
        }

        // Anything else is treated as a free text search for an app by name.
        return { kind: "search", value: line, label: line };
    }

    function isExactId(s) {
        return /^[A-Za-z0-9][A-Za-z0-9-_]*\.[A-Za-z0-9][A-Za-z0-9-_.]*$/.test(s);
    }

    /* ---------- marketplace queries ---------- */

    function postQuery(criteria, extra) {
        var filter = { criteria: criteria, flags: FLAG_INCLUDE_VERSIONS };
        if (extra) {
            for (var k in extra) { if (extra.hasOwnProperty(k)) { filter[k] = extra[k]; } }
        }
        var body = { filters: [filter], flags: FLAG_INCLUDE_VERSIONS };
        return fetch(GALLERY_QUERY, {
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=3.0-preview.1",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) { throw new Error("marketplace returned status " + res.status); }
            return res.json();
        }).then(function (data) {
            var first = data && data.results && data.results[0];
            return (first && first.extensions) || [];
        });
    }

    function queryExact(itemName) {
        return postQuery([
            { filterType: FILTER_TARGET, value: VSCODE_CATEGORY },
            { filterType: FILTER_NAME, value: itemName }
        ]).then(function (exts) { return exts.length ? exts[0] : null; });
    }

    function querySearch(text) {
        return postQuery([
            { filterType: FILTER_TARGET, value: VSCODE_CATEGORY },
            { filterType: FILTER_SEARCH, value: text }
        ], {
            pageSize: SEARCH_PAGE_SIZE,
            pageNumber: 1,
            sortBy: SORT_BY_INSTALLS,
            sortOrder: SORT_DESC
        });
    }

    /* ---------- download url building ---------- */

    // The official VSIX package endpoint. It returns the file with a correct
    // filename, so a plain link download names the file properly.
    function buildDownloadUrl(publisher, extension, version, platform) {
        var url = "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/" +
            encodeURIComponent(publisher) + "/vsextensions/" +
            encodeURIComponent(extension) + "/" +
            encodeURIComponent(version) + "/vspackage";
        if (platform) { url += "?targetPlatform=" + encodeURIComponent(platform); }
        return url;
    }

    function suggestedFilename(itemName, version, platform) {
        return itemName + "-" + version + (platform ? "@" + platform : "") + ".vsix";
    }

    // Collapse the raw version list into ordered unique versions plus a map
    // from each version to the platforms that version was published for.
    function organiseVersions(ext) {
        var raw = ext.versions || [];
        var order = [];
        var platformsByVersion = {};
        for (var i = 0; i < raw.length; i++) {
            var v = raw[i].version;
            var tp = raw[i].targetPlatform || null;
            if (!platformsByVersion.hasOwnProperty(v)) {
                platformsByVersion[v] = [];
                order.push(v);
            }
            if (tp && platformsByVersion[v].indexOf(tp) === -1) {
                platformsByVersion[v].push(tp);
            }
        }
        return { order: order, platformsByVersion: platformsByVersion };
    }

    /* ---------- dom helpers. all text goes through textContent ---------- */

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) { node.className = className; }
        if (text !== undefined) { node.textContent = text; }
        return node;
    }

    function makeOption(value, text) {
        var o = document.createElement("option");
        o.value = value;
        o.textContent = text;
        return o;
    }

    function renderErrorCard(label, message) {
        var card = el("div", "card error");
        card.appendChild(el("p", "card-title", label));
        card.appendChild(el("p", "msg error", message));
        return card;
    }

    function renderCard(ext, fallbackPublisher, fallbackExtension) {
        var publisher = (ext.publisher && ext.publisher.publisherName) || fallbackPublisher;
        var extName = ext.extensionName || fallbackExtension;
        var itemName = publisher + "." + extName;
        var organised = organiseVersions(ext);
        var versions = organised.order;
        var platformsByVersion = organised.platformsByVersion;

        var card = el("div", "card");

        var head = el("div", "card-head");
        var titleWrap = el("div");
        titleWrap.appendChild(el("p", "card-title", ext.displayName || itemName));
        titleWrap.appendChild(el("span", "card-pub", itemName));
        head.appendChild(titleWrap);
        head.appendChild(el("span", "pill", versions.length + (versions.length === 1 ? " version" : " versions")));
        card.appendChild(head);

        var controls = el("div", "controls");

        var verWrap = el("div");
        verWrap.appendChild(el("label", "control-label", "Version"));
        var verSelect = document.createElement("select");
        for (var i = 0; i < versions.length; i++) {
            verSelect.appendChild(makeOption(versions[i], versions[i] + (i === 0 ? " (latest)" : "")));
        }
        verWrap.appendChild(verSelect);
        controls.appendChild(verWrap);

        var platWrap = el("div");
        platWrap.appendChild(el("label", "control-label", "Platform"));
        var platSelect = document.createElement("select");
        platWrap.appendChild(platSelect);
        controls.appendChild(platWrap);

        card.appendChild(controls);

        var urlBox = el("div", "url-box");
        card.appendChild(urlBox);

        var actions = el("div", "row-actions");
        var dlLink = document.createElement("a");
        dlLink.className = "btn btn-primary";
        dlLink.textContent = "Download VSIX";
        dlLink.setAttribute("target", "_blank");
        dlLink.setAttribute("rel", "noopener");
        var copyBtn = el("button", "btn btn-ghost", "Copy URL");
        copyBtn.type = "button";
        actions.appendChild(dlLink);
        actions.appendChild(copyBtn);
        card.appendChild(actions);

        function refreshUrl() {
            var version = verSelect.value;
            var plats = platformsByVersion[version] || [];
            var platform = plats.length ? platSelect.value : null;
            var url = buildDownloadUrl(publisher, extName, version, platform);
            dlLink.setAttribute("href", url);
            dlLink.setAttribute("download", suggestedFilename(itemName, version, platform));
            urlBox.textContent = url;
        }

        function refreshPlatforms() {
            var version = verSelect.value;
            var plats = (platformsByVersion[version] || []).slice().sort();
            while (platSelect.firstChild) { platSelect.removeChild(platSelect.firstChild); }
            if (plats.length === 0) {
                platWrap.style.display = "none";
            } else {
                platWrap.style.display = "";
                for (var j = 0; j < plats.length; j++) {
                    platSelect.appendChild(makeOption(plats[j], plats[j]));
                }
            }
            refreshUrl();
        }

        verSelect.addEventListener("change", refreshPlatforms);
        platSelect.addEventListener("change", refreshUrl);
        copyBtn.addEventListener("click", function () {
            var url = dlLink.getAttribute("href");
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    copyBtn.textContent = "Copied";
                    setTimeout(function () { copyBtn.textContent = "Copy URL"; }, 1500);
                });
            }
        });

        refreshPlatforms();
        return card;
    }

    /* ---------- orchestration ---------- */

    function setStatus(text) { els.status.textContent = text; }

    function clearResults() {
        while (els.results.firstChild) { els.results.removeChild(els.results.firstChild); }
    }

    function run() {
        var lines = els.input.value.split("\n");
        var jobs = [];
        for (var i = 0; i < lines.length; i++) {
            var job = classifyLine(lines[i]);
            if (job) { jobs.push(job); }
        }
        if (jobs.length === 0) {
            setStatus("Enter a marketplace link, a publisher.extension id, or an app name to search.");
            return;
        }

        clearResults();
        els.fetchBtn.setAttribute("aria-disabled", "true");
        setStatus("Working on " + jobs.length + (jobs.length === 1 ? " entry." : " entries."));

        var done = 0;
        var resolved = 0;

        function finish() {
            done++;
            if (done === jobs.length) {
                els.fetchBtn.removeAttribute("aria-disabled");
                setStatus("Done. Resolved " + resolved + " of " + jobs.length + ".");
            }
        }

        jobs.forEach(function (job) {
            if (job.kind === "invalid") {
                els.results.appendChild(renderErrorCard(job.label, "Not a valid marketplace link or publisher.extension id."));
                finish();
                return;
            }

            if (job.kind === "id") {
                queryExact(job.value).then(function (ext) {
                    var parts = job.value.split(".");
                    if (!ext) {
                        els.results.appendChild(renderErrorCard(job.value, "No extension found with that id."));
                    } else {
                        resolved++;
                        els.results.appendChild(renderCard(ext, parts[0], parts.slice(1).join(".")));
                    }
                }).catch(function (err) {
                    els.results.appendChild(renderErrorCard(job.value, "Could not reach the marketplace. " + err.message));
                }).then(finish);
                return;
            }

            // job.kind === "search"
            querySearch(job.value).then(function (exts) {
                if (!exts.length) {
                    els.results.appendChild(renderErrorCard(job.label, "No extensions matched that search."));
                    return;
                }
                var heading = el("p", "search-heading", "Top matches for " + job.label);
                els.results.appendChild(heading);
                for (var k = 0; k < exts.length; k++) {
                    resolved++;
                    var p = (exts[k].publisher && exts[k].publisher.publisherName) || "";
                    els.results.appendChild(renderCard(exts[k], p, exts[k].extensionName || ""));
                }
            }).catch(function (err) {
                els.results.appendChild(renderErrorCard(job.label, "Could not reach the marketplace. " + err.message));
            }).then(finish);
        });
    }

    els.fetchBtn.addEventListener("click", run);
    els.clearBtn.addEventListener("click", function () {
        els.input.value = "";
        clearResults();
        setStatus("");
        els.input.focus();
    });
    els.input.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { run(); }
    });
})();
