# Simonov DOP - Coming Soon Website

A minimalist, cinematic landing page for Director of Photography "Simonov DOP".

## Quick Start

1. Open `index.html` in a browser, or
2. Serve locally with any static server:
   ```bash
   npx serve .
   ```

## Customization Guide

### Changing the Background Image

1. Place your image in the `assets/` folder
2. Open `styles.css` and find the `.bg-image` class (around line 95)
3. Update the `background-image` URL:
   ```css
   .bg-image {
     background-image: url('assets/your-image.jpg');
   }
   ```

**Recommended specs:**
- Resolution: 1920x1080 or higher
- Format: JPG or WebP for best performance
- Style: Cinematic, low-key lighting, film set imagery

---

### Adding Video Background

1. Place your video in the `assets/` folder (MP4 recommended)
2. Open `index.html` and uncomment the `<video>` element (around line 35)
3. Update the `src` path to your video file
4. Comment out the `<div class="bg-image">` element

```html
<!-- Uncomment this: -->
<video class="bg-video" autoplay muted loop playsinline>
  <source src="assets/your-video.mp4" type="video/mp4">
</video>

<!-- Comment out or remove this: -->
<!-- <div class="bg-image"></div> -->
```

**Video tips:**
- Keep file size under 10MB for fast loading
- Resolution: 1920x1080 (1080p)
- Compress with HandBrake or similar
- Video is automatically hidden on mobile for performance

---

### Changing Text Content

Edit in `index.html`:

```html
<h1 class="headline">Coming Soon</h1>
<p class="name">Simonov DOP</p>
<p class="subtitle">Director of Photography</p>
```

---

### Adjusting Colors & Overlay

Edit CSS variables in `styles.css` (`:root` section at top):

```css
:root {
  /* Overlay darkness (0.4 = 40%, 0.6 = 60%) */
  --overlay-opacity: 0.55;
  
  /* Text colors */
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
}
```

---

### Changing Fonts

Current fonts:
- **Headline**: Playfair Display (cinematic serif)
- **Body**: Inter (modern sans-serif)

To change:
1. Update the Google Fonts link in `index.html` `<head>`
2. Update `--font-headline` and `--font-body` in `styles.css`

---

## File Structure

```
simonov-dop/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── README.md           # This file
└── assets/
    ├── background.jpg  # Default background image
    └── (your media files)
```

## Browser Support

- Chrome, Edge, Firefox, Safari (latest versions)
- iOS Safari, Android Chrome
- Respects `prefers-reduced-motion` for accessibility

## Performance

- Mobile-first responsive design
- Video disabled on mobile (< 768px) for performance
- Uses `100dvh` for proper mobile viewport handling
- Safe area insets for notched devices
