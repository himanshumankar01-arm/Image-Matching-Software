# Image Matching Software

React app that loads images from a database folder, takes the latest uploaded image, matches it with an image matching algorithm and shows an analysis report.

## Run

```bash
npm install
npm run dev
```

Open the address shown in the terminal (http://localhost:5173).

## How it works

1. **Database folder.** Put images in the `database/` folder (sub-folders are fine; a sub-folder name is used as the person name). The app lists them on start. To use any other folder: `DB_DIR=/path/to/photos npm run dev` (Windows PowerShell: `$env:DB_DIR="D:\photos"; npm run dev`). You can also pick a folder from the page with **Load folder**.
2. **Upload latest image.** Drop an image or choose one from your drive. The files in `sample-uploads/` are ready-made tests: resized, cropped, mirrored, exact copy and unrelated.
3. **Matching algo.** Perceptual hash (25%), difference hash (20%), color-aware structure (45%) and color histogram (10%). Every database image is also tried as a center crop up to 36%, mirrored and rotated. Identical files are found by SHA-256 and score 100%.
4. **Analysis report.** 100% exact, 80% and above strong, 20% to 79% weak, below 20% no match. The left panel counts each level and filters the report. The report lists the closest image, what changed, each score, a ranked table and a copyable text version.

The person search box limits matching to one person or file name.

This compares pictures. It does not identify people, and a different photo of the same person will usually score low.

## Files

- `vite.config.js` dev and preview server that serves `database/` and `sample-uploads/`
- `src/matching.js` the matching algorithm
- `src/App.jsx` state, folder loading and the matching run
- `src/components/` Sidebar, UploadPanel, DatabasePanel, Report

Demo photos come from the scikit-image sample data.
