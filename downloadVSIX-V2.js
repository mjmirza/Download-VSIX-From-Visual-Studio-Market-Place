/***
#          Download VS Code extensions as VSIX
#          Author: Mirza Iqbal
***/

// *** SCRIPTS NOT TESTED After July 2024 *** //

/***
// First Script: Extracts extension data and creates a download button
***/
!function() {
    (function() {
        // Object to store extension data (version, publisher, identifier)
        const extensionData = {
            version: "",
            publisher: "",
            identifier: "",
            // Function to get the download URL for the VSIX file
            getDownloadUrl: function() {
                return `https://${this.identifier.split(".")[0]}.gallery.vsassets.io/_apis/public/gallery/publisher/${this.identifier.split(".")[0]}/extension/${this.identifier.split(".")[1]}/${this.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`;
            },
            // Function to get the filename for the downloaded VSIX file
            getFileName: function() {
                return `${this.identifier}_${this.version}.vsix`;
            },
            // Function to create the download button element
            getDownloadButton: function() {
                const button = document.createElement("a");
                button.innerHTML = "Download VSIX";
                button.style.fontFamily = "wf_segoe-ui,Helvetica Neue,Helvetica,Arial,Verdana";
                button.style.display = "inline-block";
                button.style.padding = "10px 20px"; // Increased padding for a bigger button
                button.style.background = "darkgreen";
                button.style.color = "white";
                button.style.fontWeight = "bold";
                button.style.fontSize = "16px"; // Increased font size
                button.style.margin = "2px 5px";
                button.style.textDecoration = "none"; // Remove default link underline

                // Store the download URL and filename in data attributes
                button.setAttribute("data-download-url", this.getDownloadUrl());
                button.setAttribute("data-download-filename", this.getFileName());

                // Event handler for when the button is clicked
                button.onclick = function(event) {
                    const downloadUrl = event.target.getAttribute("data-download-url");
                    const downloadFilename = event.target.getAttribute("data-download-filename");

                    // Create a temporary link element
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = downloadFilename;

                    // Trigger the download
                    link.click();
                };

                return button;
            }
        };

        // Map to associate metadata table headers with extension data keys
        const metadataMap = {
            Version: "version",
            Publisher: "publisher",
            "Unique Identifier": "identifier"
        };

        // Select all rows in the metadata table
        const metadataRows = document.querySelectorAll(".ux-table-metadata tr");

        // Iterate through each row to extract extension data
        for (let i = 0; i < metadataRows.length; i++) {
            const row = metadataRows[i];
            const cells = row.querySelectorAll("td");
            if (cells.length > 1) {
                const key = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                if (metadataMap.hasOwnProperty(key)) {
                    extensionData[metadataMap[key]] = value;
                }
            }
        }

        // Find the element with the class "vscode-moreinformation"
        const moreInfoElement = document.querySelector(".ms-Fabric.root-38");
        if (moreInfoElement) {
            // Append the download button to the parent element
            moreInfoElement.parentElement.appendChild(extensionData.getDownloadButton());
        } else {
            console.error("Element with class 'vscode-moreinformation' not found.");
        }
    }
    )()
}();

/***
// Second Script: Opens the VSIX file in a new tab
***/
(function() {
    // Pattern for constructing the VSIX file URL
    const URL_VSIX_PATTERN = 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${version}/vspackage';
    // Get the extension name from the URL
    const itemName = new URL(window.location.href).searchParams.get('itemName');
    // Split the extension name into publisher and extension parts
    const [publisher, extension] = itemName.split('.');
    // Get the version from the page
    const version = document.querySelector('#versionHistoryTab tbody tr .version-history-container-column').textContent;
    // Construct the VSIX file URL
    const url = URL_VSIX_PATTERN.replace('${publisher}', publisher).replace('${extension}', extension).replace('${version}', version);
    // Open the VSIX file in a new tab
    window.open(url, '_blank');

})();
