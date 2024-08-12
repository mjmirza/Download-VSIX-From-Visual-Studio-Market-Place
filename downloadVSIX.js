/***
#          Download VS Code extensions as VSIX
#          Author: Mirza Iqbal
***/

// *** SCRIPTS NOT TESTED After July 2024 *** //

/***
// First 
***/
!function() {
    (function() {
        const extensionData = {
            version: "",
            publisher: "",
            identifier: "",
            getDownloadUrl: function() {
                return `https://${this.identifier.split(".")[0]}.gallery.vsassets.io/_apis/public/gallery/publisher/${this.identifier.split(".")[0]}/extension/${this.identifier.split(".")[1]}/${this.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`;
            },
            getFileName: function() {
                return `${this.identifier}_${this.version}.vsix`;
            },
            getDownloadButton: function() {
                const button = document.createElement("a");
                button.innerHTML = "Download VSIX";
                button.href = "javascript:void(0);";
                button.style.fontFamily = "wf_segoe-ui,Helvetica Neue,Helvetica,Arial,Verdana";
                button.style.display = "inline-block";
                button.style.padding = "2px 5px";
                button.style.background = "darkgreen";
                button.style.color = "white";
                button.style.fontWeight = "bold";
                button.style.margin = "2px 5px";
                button.setAttribute("data-url", this.getDownloadUrl());
                button.setAttribute("data-filename", this.getFileName());

                button.onclick = function(event) {
                    event.target.onclick = null;
                    event.target.innerHTML = "Downloading VSIX...";
                    const xhr = new XMLHttpRequest();
                    console.log(event.target.getAttribute("data-url"));
                    xhr.open("GET", event.target.getAttribute("data-url"), true);
                    xhr.responseType = "blob";

                    xhr.onprogress = function(event) {
                        if (event.lengthComputable) {
                            const progress = (event.loaded / event.total * 100).toFixed(0);
                            event.target.innerHTML = `Downloading VSIX... ${progress}%`;
                        }
                    };

                    xhr.onload = function() {
                        if (this.status === 200) {
                            const blob = this.response;
                            const link = document.createElement("a");
                            link.href = window.URL.createObjectURL(blob);
                            link.download = event.target.getAttribute("data-filename");
                            link.click();
                            event.target.href = link.href;
                            event.target.download = link.download;
                            event.target.innerHTML = "Download VSIX";
                        } else {
                            event.target.innerHTML = "Error. Please reload the page and try again.";
                            alert(`Error ${this.status} error receiving the document.`);
                        }
                    };

                    xhr.onerror = function() {
                        event.target.innerHTML = "Error. Please reload the page and try again.";
                        alert(`Error ${this.target.status} occurred while receiving the document.`);
                    };

                    xhr.send();
                };

                return button;
            }
        };

        const metadataMap = {
            Version: "version",
            Publisher: "publisher",
            "Unique Identifier": "identifier"
        };

        const metadataRows = document.querySelectorAll(".ux-table-metadata tr");

        for (let i = 0; i < metadataRows.length; i++) {
            const row = metadataRows[i];
            const cells = row.querySelectorAll("td");
            if (cells.length === 2) {
                const key = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                if (metadataMap.hasOwnProperty(key)) {
                    extensionData[metadataMap[key]] = value;
                }
            }
        }

        // Handle the case where the element might not exist
        const moreInfoElement = document.querySelector(".vscode-moreinformation");
        if (moreInfoElement) {
            moreInfoElement.parentElement.appendChild(extensionData.getDownloadButton()).scrollIntoView();
        } else {
            console.error("Element with class 'vscode-moreinformation' not found.");
        }
    }
    )()
}();


/***
// 2nd 
***/
(function() {
    const URL_VSIX_PATTERN = 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${version}/vspackage';
    const itemName = new URL(window.location.href).searchParams.get('itemName');
    const [publisher, extension] = itemName.split('.');
    const version = document.querySelector('#versionHistoryTab tbody tr .version-history-container-column').textContent;
    const url = URL_VSIX_PATTERN.replace('${publisher}', publisher).replace('${extension}', extension).replace('${version}', version);
    window.open(url, '_blank');

})();
