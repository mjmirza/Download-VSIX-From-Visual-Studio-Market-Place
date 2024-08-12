# Download VS Code Extensions as VSIX

This script allows you to download VS Code extensions as VSIX files directly from the Visual Studio Marketplace.

## How to Use

1. **Open the VS Code extension page on the Visual Studio Marketplace.**
2. **Open the browser's developer console.** (Usually by pressing F12)
3. **Paste the script into the console and press Enter.**
4. **A "Download VSIX" button will appear on the page.** Click it to download the VSIX file.

## Script Breakdown

The script consists of two parts:

**1. First Script:**

- Extracts the extension's version, publisher, and unique identifier from the page.
- Constructs the download URL for the VSIX file.
- Creates a download button that triggers the download process.
- Handles progress updates and error messages during the download.

**2. Second Script:**

- Extracts the extension's name, publisher, and version from the page.
- Constructs the URL for the VSIX file using a different API endpoint.
- Opens the VSIX file in a new browser tab.

## Notes

- This script is designed to work with the current structure of the Visual Studio Marketplace. If the website changes, the script may need to be updated.
- The script assumes that the element with the class "vscode-moreinformation" exists on the page. If it doesn't, you'll need to adjust the selector or use a different approach to find the correct parent element.
- The second script is also assumed to be working correctly. If you encounter issues with it, you'll need to debug it separately.

## Author

Mirza Iqbal

## License

This script is released under the MIT License.
