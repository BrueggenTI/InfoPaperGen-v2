import React from 'react';

/**
 * Handles the paste event on an element and extracts the first image file.
 * @param event The clipboard event.
 * @param onFileExtracted A callback function that receives the extracted file.
 */
export const handleImagePaste = (
  event: React.ClipboardEvent<HTMLElement>,
  onFileExtracted: (file: File) => void
) => {
  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        onFileExtracted(file);
      }
      // Prevent the default paste action to avoid pasting the image as text
      event.preventDefault();
      break;
    }
  }
};
