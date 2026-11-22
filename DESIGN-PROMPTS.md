# Design prompts for ChatGPT (image generation)

The site now uses a bold poster style: **orange #FF4A1C, cream #F5ECD9, charcoal #1B1B1B**, heavy rounded type (Poppins), halftone mountains and a black Doberman mascot with a spiked collar.

**How to use these:** start a new ChatGPT image chat, attach your reference image (the "Portfolio – Student Portfolio & School Hub" picture), paste the **Style anchor**, then paste one prompt at a time. Ask for a **transparent background PNG** where noted (if ChatGPT gives a flat background, say "remove the background and keep it transparent"). Save the files into `public/assets/art/` with the names shown, then tell Claude: *"Swap the art in public/assets/art into the portfolio design."*

## 0. Style anchor (paste first, keep in the same chat)
```
Use the attached image as the style reference for every image in this chat. Style: bold screen-print / risograph poster illustration. Strict palette: vivid orange-red (#FF4A1C), warm cream (#F5ECD9) and near-black charcoal (#1B1B1B) only, plus tiny amounts of the same colours in tints. Halftone dot shading, rough ink texture, high contrast, flat shapes, no gradients, no glossy 3D, no photorealism. Subject matter is friendly and suitable for primary school children in New Zealand. No text unless I ask for it. Keep the black Doberman mascot (pointed ears, long muzzle, spiked collar) consistent with the reference whenever it appears.
```

## 1. Mascot sheet (most important)
```
Character sheet of the black Doberman mascot from the reference, on a plain cream background. Show 6 poses in a 3x2 grid, each full body or head-and-shoulders: (1) proud front-facing head, (2) sitting and smiling with tongue out, (3) holding a book, (4) giving a thumbs up with a paw, (5) wearing small round glasses and holding a pencil, (6) asleep curled up. Keep it friendly, not aggressive. Same spiked collar in every pose. Screen-print halftone style.
```
Save as `mascot-sheet.png`, then ask for each pose again as its own transparent PNG: `mascot-head.png` (pose 1, used as the logo), `mascot-happy.png`, `mascot-reading.png`, `mascot-thumbs.png`, `mascot-writing.png`, `mascot-sleeping.png`.

## 2. Logo lockup
```
A logo: the word "Portfolio" in very heavy rounded geometric sans-serif capitals-and-lowercase, cream coloured, with the Doberman head rising from behind the letters "tf" like in the reference. Under it, a thin line with the small spaced caps "STUDENT PORTFOLIO & SCHOOL HUB". Transparent background, cream and charcoal only, ready to sit on an orange background. Wide 3:1 format.
```
Save as `logo.png`. Then: *"Make a square app icon version: just the Doberman head on an orange rounded square."* → `icon-512.png`.

## 3. Halftone mountain banner (header art)
```
A wide panoramic banner of the New Zealand Southern Alps in the halftone woodcut style of the reference: charcoal mountains with cream snow caps, dense halftone dots fading to nothing toward the left so the left half is empty. Transparent background, 4:1 ratio, 2400x600 px.
```
Save as `mountains.png`. Variations: `mountains-canterbury.png` ("Canterbury plains with the Southern Alps behind, a few sheep as tiny silhouettes"), `mountains-night.png` ("same but charcoal sky with a cream moon").

## 4. Subject icons (Maths, Reading, Writing, Topic, Inbox)
```
A set of 5 square icons in the reference style, each on a cream rounded-square tile with a charcoal halftone-shaded illustration and one orange accent: (1) Maths – a ruler and compass with a "+" and "=" , (2) Reading – an open book with a small bird flying out, (3) Writing – a pencil drawing a wavy line, (4) Topic – a globe with a small kiwi bird, (5) Inbox – a tray with a paper arrow dropping in. Identical size and line weight, no text.
```
Save as `icon-maths.png`, `icon-reading.png`, `icon-writing.png`, `icon-topic.png`, `icon-inbox.png`.

## 5. Empty-state illustrations
```
Three spot illustrations with the Doberman mascot, transparent background, square: (1) the dog looking into an empty folder with its head tilted, (2) the dog holding a camera, (3) the dog waving next to a QR code. Reference style, no text.
```
Save as `empty-work.png`, `empty-camera.png`, `empty-family.png`.

## 6. Family QR card background
```
A landscape card background 1050x600 px, orange with a halftone charcoal mountain range along the bottom and a small cream Doberman head badge in the top-left corner. Leave a large clean orange area on the right and a clean cream square (about 300x300) on the left centre for a QR code. No text.
```
Save as `card-family.png`. Student login card: ask for *"the same, but the clean area is a wide cream rounded rectangle for a code."* → `card-login.png`.

## 7. Celebration / certificate pieces
```
A set of transparent-background stickers in the reference style: a star badge, a trophy, a laurel ribbon with an empty centre, a "well done" burst with no text, and the Doberman wearing a small medal. Cream, charcoal and orange only.
```
Save as `sticker-*.png`. (Used for the learning summary "Worth celebrating" box.)

## 8. Background pattern
```
A seamless repeating pattern tile 600x600 px: tiny cream halftone dots and very small mountain and paw-print shapes on an orange background, low contrast so text can sit on top. Must tile seamlessly.
```
Save as `pattern.png`.

## Tips for better results
- Always attach the reference image again if ChatGPT starts to drift.
- If the dog looks aggressive, add: "friendly, approachable, big kind eyes, relaxed ears".
- Ask for "no text, no letters" on everything except the logo; fix spelling by adding text yourself.
- Ask for 2x size ("square 2048x2048") for anything used big.
- Don't put real students' photos into AI tools; these prompts need none.
