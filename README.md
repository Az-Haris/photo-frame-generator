# Frame Studio

A browser-based photo frame generator built with plain HTML, CSS and JavaScript. Add a photo, pick a frame, adjust it, and download the result as a PNG. No build step, no dependencies, and your photos never leave your device.

## Features

- Upload a photo from your device, or drag and drop it onto the canvas
- Choose from bundled PNG frames, or add your own
- Live preview on a canvas
- Drag to reposition the photo, scroll to zoom
- Adjustments: zoom, rotate, move, flip, brightness, contrast, saturation, black and white, background colour
- Download the framed photo as a PNG at the frame's full resolution
- Responsive layout for desktop and mobile

## Project structure

```
photo-frame-generator/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
    ├── frame-gilded.png
    └── frame-instant.png
```

## Getting started

Run the project through a local web server. Opening `index.html` directly from disk (`file://`) works for previewing, but browsers block canvas export for images loaded that way, so the download button will fail.

```bash
# Python
python -m http.server 8000

# or Node
npx serve
```

Then open `http://localhost:8000`.

## Usage

1. Choose a photo in the left sidebar.
2. Select a frame.
3. Adjust the photo with the sliders, or drag and scroll on the canvas.
4. Click **Download photo**.

## Adding frames

Frames are PNG files with a transparent opening where the photo shows through.

1. Save your PNG in `assets/`.
2. Add an entry to the `FRAMES` list at the top of `js/app.js`:

```js
const FRAMES = [
  { id: 'gilded',  name: 'Gilded',  src: 'assets/frame-gilded.png' },
  { id: 'instant', name: 'Instant', src: 'assets/frame-instant.png' },
  { id: 'my-frame', name: 'My frame', src: 'assets/my-frame.png' }
];
```

Tips for frame files:

- The exported image uses the frame's native pixel size, so larger frames give higher-resolution output.
- Keep the outer corners opaque or square. Transparent outer corners will let the photo show through.
- You can also use the **Add your own PNG frame** link in the app to try a frame without editing code. These frames are not saved between visits.

## Browser support

Works in current versions of Chrome, Edge, Firefox and Safari. The brightness, contrast, saturation and black and white sliders rely on the canvas `filter` property and are disabled in browsers that don't support it.

## License

MIT. Use it however you like.
