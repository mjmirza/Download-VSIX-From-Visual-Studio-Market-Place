/*
 * VSIX Downloader for the Visual Studio Marketplace
 * Author: Mirza Iqbal
 * License: MIT
 *
 * Pure client side. Zero dependencies. Zero build step. No tracking.
 * It contacts exactly one host, the official Microsoft marketplace gallery,
 * to read public metadata and to serve the official VSIX download.
 *
 * Interaction. Type an app name and pick from a live suggestion dropdown,
 * or paste a marketplace URL or a publisher.extension id and press Enter.
 * Each pick becomes a removable chip with its own version and platform
 * controls. Add as many as you like.
 */
(function () {
    "use strict";

    var GALLERY_QUERY = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
    var VSCODE_CATEGORY = "Microsoft.VisualStudio.Code";
    var SUGGEST_PAGE_SIZE = 8;
    var DEBOUNCE_MS = 200;

    var FILTER_TARGET = 8;   // restrict to VS Code
    var FILTER_NAME = 7;     // exact publisher.extension lookup
    var FILTER_SEARCH = 10;  // free text search
    var SORT_BY_INSTALLS = 4;
    var SORT_DESC = 0;

    var els = {
        search: document.getElementById("search"),
        chips: document.getElementById("chips"),
        suggest: document.getElementById("suggest"),
        results: document.getElementById("results"),
        status: document.getElementById("status"),
        clearBtn: document.getElementById("clearBtn"),
        themeToggle: document.getElementById("themeToggle")
    };

    // In memory caches so repeated or backspaced queries never re hit the API.
    // This keeps the tool light on the marketplace and stays clear of rate limits.
    var suggestCache = {};   // query text -> suggestion list
    var exactCache = {};     // itemName -> extension object
    var suggestAbort = null; // AbortController for the live search in flight

    function isRateLimited(err) {
        return err && /status 429/.test(err.message);
    }

    /* ---------- theme. light default, dark opt in and remembered ---------- */
    try {
        if (localStorage.getItem("vsix-theme") === "dark") { document.documentElement.classList.add("dark"); }
    } catch (e) {}
    els.themeToggle.addEventListener("click", function () {
        var dark = document.documentElement.classList.toggle("dark");
        try { localStorage.setItem("vsix-theme", dark ? "dark" : "light"); } catch (e) {}
    });

    /* ---------- marketplace queries ---------- */

    function postQuery(criteria, extra, flags, signal) {
        var filter = { criteria: criteria, flags: flags };
        if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) { filter[k] = extra[k]; } } }
        return fetch(GALLERY_QUERY, {
            method: "POST",
            headers: {
                "Accept": "application/json;api-version=3.0-preview.1",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ filters: [filter], flags: flags }),
            signal: signal
        }).then(function (res) {
            if (!res.ok) { throw new Error("marketplace returned status " + res.status); }
            return res.json();
        }).then(function (data) {
            var first = data && data.results && data.results[0];
            return (first && first.extensions) || [];
        });
    }

    // One retry with backoff for transient marketplace failures (429 or 5xx).
    // The download links themselves never need this, only the metadata calls.
    function withRetry(fn, attempts, delayMs) {
        return fn().catch(function (err) {
            var transient = isRateLimited(err) || /status 5\d\d/.test(err.message) || /Failed to fetch|NetworkError/.test(err.message);
            if (attempts > 1 && transient) {
                return new Promise(function (resolve) { setTimeout(resolve, delayMs); })
                    .then(function () { return withRetry(fn, attempts - 1, delayMs * 2); });
            }
            throw err;
        });
    }

    // Fast suggestions, cached, and cancellable so fast typing never stacks calls.
    function querySuggest(text, signal) {
        var key = text.toLowerCase();
        if (suggestCache.hasOwnProperty(key)) { return Promise.resolve(suggestCache[key]); }
        return postQuery([
            { filterType: FILTER_TARGET, value: VSCODE_CATEGORY },
            { filterType: FILTER_SEARCH, value: text }
        ], { pageSize: SUGGEST_PAGE_SIZE, pageNumber: 1, sortBy: SORT_BY_INSTALLS, sortOrder: SORT_DESC }, 0, signal)
        .then(function (exts) {
            var list = exts.map(function (e) {
                var pub = (e.publisher && e.publisher.publisherName) || "";
                return { itemName: pub + "." + e.extensionName, displayName: e.displayName || e.extensionName };
            }).filter(function (s) { return s.itemName.indexOf(".") > 0; });
            suggestCache[key] = list;
            return list;
        });
    }

    // Authoritative full version and platform list for one extension, cached,
    // with a retry so a momentary throttle does not surface as a hard error.
    function queryExact(itemName) {
        if (exactCache.hasOwnProperty(itemName)) { return Promise.resolve(exactCache[itemName]); }
        return withRetry(function () {
            return postQuery([
                { filterType: FILTER_TARGET, value: VSCODE_CATEGORY },
                { filterType: FILTER_NAME, value: itemName }
            ], null, 1);
        }, 3, 700).then(function (exts) {
            var ext = exts.length ? exts[0] : null;
            exactCache[itemName] = ext;
            return ext;
        });
    }

    /* ---------- download url building ---------- */

    function buildDownloadUrl(publisher, extension, version, platform) {
        var url = "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/" +
            encodeURIComponent(publisher) + "/vsextensions/" +
            encodeURIComponent(extension) + "/" + encodeURIComponent(version) + "/vspackage";
        if (platform) { url += "?targetPlatform=" + encodeURIComponent(platform); }
        return url;
    }

    function suggestedFilename(itemName, version, platform) {
        return itemName + "-" + version + (platform ? "@" + platform : "") + ".vsix";
    }

    function organiseVersions(ext) {
        var raw = ext.versions || [];
        var order = [];
        var platformsByVersion = {};
        for (var i = 0; i < raw.length; i++) {
            var v = raw[i].version;
            var tp = raw[i].targetPlatform || null;
            if (!platformsByVersion.hasOwnProperty(v)) { platformsByVersion[v] = []; order.push(v); }
            if (tp && platformsByVersion[v].indexOf(tp) === -1) { platformsByVersion[v].push(tp); }
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
        o.value = value; o.textContent = text; return o;
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
            if (plats.length === 0) { platWrap.style.display = "none"; }
            else {
                platWrap.style.display = "";
                for (var j = 0; j < plats.length; j++) { platSelect.appendChild(makeOption(plats[j], plats[j])); }
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

    /* ---------- selection state, chips, and cards ---------- */

    var selected = {}; // itemName -> { chip, card }

    function setStatus(text) { els.status.textContent = text; }

    function updateCount() {
        var n = Object.keys(selected).length;
        setStatus(n === 0 ? "" : n + (n === 1 ? " extension selected." : " extensions selected."));
    }

    function removeExtension(itemName) {
        var s = selected[itemName];
        if (!s) { return; }
        if (s.chip && s.chip.parentNode) { s.chip.parentNode.removeChild(s.chip); }
        if (s.card && s.card.parentNode) { s.card.parentNode.removeChild(s.card); }
        delete selected[itemName];
        updateCount();
    }

    function addChip(itemName, label) {
        var chip = el("span", "chip");
        chip.appendChild(el("span", "chip-label", label || itemName));
        var x = el("button", "chip-x", "");
        x.type = "button";
        x.setAttribute("aria-label", "Remove " + itemName);
        x.textContent = "×"; // multiplication sign as a close glyph
        x.addEventListener("click", function () { removeExtension(itemName); els.search.focus(); });
        chip.appendChild(x);
        els.chips.appendChild(chip);
        return chip;
    }

    function addExtension(itemName, label) {
        itemName = itemName.trim();
        if (!itemName) { return; }
        if (selected[itemName]) {
            // already added. flash the existing chip.
            var c = selected[itemName].chip;
            if (c) { c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); }
            return;
        }
        selected[itemName] = { chip: null, card: null };
        var loading = el("div", "card loading");
        loading.appendChild(el("p", "card-title", label || itemName));
        loading.appendChild(el("p", "msg", "Loading versions."));
        els.results.appendChild(loading);
        selected[itemName].card = loading;
        var chip = addChip(itemName, label);
        selected[itemName].chip = chip;
        updateCount();

        queryExact(itemName).then(function (ext) {
            if (!selected[itemName]) { return; } // removed while loading
            var card;
            if (!ext) {
                card = el("div", "card error");
                card.appendChild(el("p", "card-title", label || itemName));
                card.appendChild(el("p", "msg error", "No extension found with that id."));
            } else {
                var parts = itemName.split(".");
                card = renderCard(ext, parts[0], parts.slice(1).join("."));
            }
            els.results.replaceChild(card, loading);
            selected[itemName].card = card;
        }).catch(function (err) {
            if (!selected[itemName]) { return; }
            var card = el("div", "card error");
            card.appendChild(el("p", "card-title", label || itemName));
            var why = isRateLimited(err)
                ? "The marketplace is busy. Remove this and try again in a moment."
                : ("Could not reach the marketplace. " + err.message);
            card.appendChild(el("p", "msg error", why));
            els.results.replaceChild(card, loading);
            selected[itemName].card = card;
        });
    }

    /* ---------- direct input parsing ---------- */

    function isExactId(s) {
        return /^[A-Za-z0-9][A-Za-z0-9-_]*\.[A-Za-z0-9][A-Za-z0-9-_.]*$/.test(s);
    }
    // Returns an itemName if the text is a URL or an exact id, else null.
    function parseDirect(raw) {
        var line = (raw || "").trim();
        if (!line) { return null; }
        if (line.indexOf("http://") === 0 || line.indexOf("https://") === 0) {
            try {
                var item = new URL(line).searchParams.get("itemName");
                return item && isExactId(item) ? item : null;
            } catch (e) { return null; }
        }
        return isExactId(line) ? line : null;
    }

    /* ---------- autocomplete dropdown ---------- */

    var suggestions = [];
    var activeIndex = -1;
    var reqToken = 0;
    var debounceTimer = null;

    function closeSuggest() {
        els.suggest.hidden = true;
        while (els.suggest.firstChild) { els.suggest.removeChild(els.suggest.firstChild); }
        suggestions = [];
        activeIndex = -1;
        els.search.setAttribute("aria-expanded", "false");
        els.search.removeAttribute("aria-activedescendant");
    }

    function renderSuggestions(list) {
        suggestions = list;
        activeIndex = -1;
        while (els.suggest.firstChild) { els.suggest.removeChild(els.suggest.firstChild); }
        if (!list.length) { closeSuggest(); return; }
        for (var i = 0; i < list.length; i++) {
            var li = el("li", "suggest-item");
            li.id = "suggest-opt-" + i;
            li.setAttribute("role", "option");
            li.setAttribute("data-index", String(i));
            li.appendChild(el("span", "suggest-name", list[i].displayName));
            li.appendChild(el("span", "suggest-id", list[i].itemName));
            li.addEventListener("mousedown", function (e) {
                // mousedown, not click, so the input does not blur first
                e.preventDefault();
                var idx = parseInt(this.getAttribute("data-index"), 10);
                chooseSuggestion(idx);
            });
            els.suggest.appendChild(li);
        }
        els.suggest.hidden = false;
        els.search.setAttribute("aria-expanded", "true");
    }

    function setActive(idx) {
        var items = els.suggest.querySelectorAll(".suggest-item");
        for (var i = 0; i < items.length; i++) { items[i].classList.remove("active"); }
        activeIndex = idx;
        if (idx >= 0 && idx < items.length) {
            items[idx].classList.add("active");
            els.search.setAttribute("aria-activedescendant", items[idx].id);
            items[idx].scrollIntoView({ block: "nearest" });
        } else {
            els.search.removeAttribute("aria-activedescendant");
        }
    }

    function chooseSuggestion(idx) {
        var s = suggestions[idx];
        if (!s) { return; }
        addExtension(s.itemName, s.displayName);
        els.search.value = "";
        closeSuggest();
        els.search.focus();
    }

    function runSuggest(text) {
        var myToken = ++reqToken;
        // Cancel any earlier search still in flight so fast typing never stacks calls.
        if (suggestAbort) { try { suggestAbort.abort(); } catch (e) {} }
        var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
        suggestAbort = controller;
        querySuggest(text, controller ? controller.signal : undefined).then(function (list) {
            if (myToken !== reqToken) { return; } // a newer query superseded this one
            if (els.search.value.trim().length < 2) { closeSuggest(); return; }
            renderSuggestions(list);
        }).catch(function (err) {
            if (err && err.name === "AbortError") { return; } // superseded, ignore
            if (myToken !== reqToken) { return; }
            closeSuggest();
            if (isRateLimited(err)) { setStatus("The marketplace is busy. Wait a moment and type again."); }
        });
    }

    els.search.addEventListener("input", function () {
        var val = els.search.value;
        if (debounceTimer) { clearTimeout(debounceTimer); }
        // A URL or exact id is added on Enter, not searched.
        if (parseDirect(val) || val.trim().length < 2) { closeSuggest(); return; }
        debounceTimer = setTimeout(function () { runSuggest(val.trim()); }, DEBOUNCE_MS);
    });

    els.search.addEventListener("keydown", function (e) {
        var open = !els.suggest.hidden && suggestions.length > 0;
        if (e.key === "ArrowDown") {
            if (open) { e.preventDefault(); setActive((activeIndex + 1) % suggestions.length); }
        } else if (e.key === "ArrowUp") {
            if (open) { e.preventDefault(); setActive((activeIndex - 1 + suggestions.length) % suggestions.length); }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && activeIndex >= 0) { chooseSuggestion(activeIndex); return; }
            var direct = parseDirect(els.search.value);
            if (direct) { addExtension(direct, direct); els.search.value = ""; closeSuggest(); return; }
            if (open) { chooseSuggestion(0); return; } // accept the top match
        } else if (e.key === "Escape") {
            closeSuggest();
        } else if (e.key === "Backspace" && els.search.value === "") {
            var keys = Object.keys(selected);
            if (keys.length) { removeExtension(keys[keys.length - 1]); }
        }
    });

    els.search.addEventListener("blur", function () {
        // delay so a mousedown on an option can register first
        setTimeout(closeSuggest, 120);
    });

    els.clearBtn.addEventListener("click", function () {
        Object.keys(selected).forEach(removeExtension);
        els.search.value = "";
        closeSuggest();
        setStatus("");
        els.search.focus();
    });
})();
