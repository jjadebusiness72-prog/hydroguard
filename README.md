# HydroGuard demo website

HydroGuard is a wristband for residents in aged care homes. It checks
temperature, heart rate and hydration every 2 hours to catch early signs of a
urinary tract infection (UTI) or dehydration. It’s also the resident’s room key
and shows staff where they are in the home.

This folder is a demo website for it. It’s plain HTML, CSS and JavaScript, so
there’s nothing to install or build. You can put it online for free with
GitHub Pages, then write the links to NFC tags so a phone tap opens the right
screen.

> **Demo only.** All residents, staff and readings are made up. The risk score
> has not been clinically validated and must not be used for care decisions.

A quick note on names: people often say “NFT tags”. The right term is
**NFC tags** (Near Field Communication). NFTs are something else entirely.

---

## What’s in the demo

| Page | Who uses it | What it shows |
| --- | --- | --- |
| `index.html` | Presenter | Start here. What HydroGuard is, the highest-risk resident’s latest reading, and links to every view. |
| `resident.html?id=margaret` | Resident, family, staff | A resident’s profile. This is what their wristband tag opens: readings, risk, contacts, For CPR or Not for CPR, and their room key. |
| `door.html?room=12` | Resident | The door reader. Tap the wristband to unlock their room. |
| `nurse.html` | RN, EN, AIN | Ward dashboard: residents sorted by risk, alerts, fluids and handover notes. Add `?id=margaret` to open with one resident picked. |
| `manager.html` | Nurse unit manager | Facility dashboard: trends across both wings, devices and staff. |
| `manager.html#map` | Staff | Floor plan showing where each resident is. Add `?id=margaret` before `#map` to highlight one resident (`manager.html?id=margaret#map`). |
| `report.html?id=margaret` | GP, family | Printable health report with 30-day trends. |
| `tags.html` | Whoever sets up the demo | Every link, with a QR code, a copy button and a printable tag sheet. |
| `404.html` | Anyone | Friendly “Page not found” page. GitHub Pages shows it for broken links. |

Resident IDs you can use in links: `margaret`, `ravi`, `elsie`, `bill`, `wei`,
`dorothy`, `joan`, `kev`. Rooms: 3, 7, 9, 12, 14, 16, 18, 21.

---

## Step 1. Make a GitHub account and a new repository

1. Go to [github.com](https://github.com) and choose **Sign up**. Follow the
   steps. A free account is fine.
2. Once you’re signed in, press the **+** at the top right and choose
   **New repository**.
3. In **Repository name**, type `hydroguard-demo`.
4. Choose **Public**. (GitHub Pages is free for public repositories.)
5. Leave everything else as it is and press **Create repository**.

## Step 2. Upload the website files

### The easy way: drag and drop in your browser

1. On your new repository’s page, choose **Add file**, then **Upload files**.
   (If you see a page of set-up instructions instead, click the
   **uploading an existing file** link.)
2. Open the `site` folder on your computer. Select **everything inside it**
   (on a Mac press Cmd + A, on Windows press Ctrl + A) and drag it all into
   the browser window.
   - Drag the **contents** of `site`, not the `site` folder itself.
     `index.html` must sit at the top level of the repository, not inside a
     folder. If you see `site/index.html` in the file list, it’s in the wrong
     place (see Troubleshooting).
   - The `assets` folder should upload with all its subfolders. If your
     browser won’t drag folders, use Chrome or Edge, or use the git method
     below.
   - The file `.nojekyll` is hidden on most computers. It’s nice to have but
     not essential. On a Mac, press Cmd + Shift + . (full stop) in Finder to
     show hidden files.
3. Scroll down, type a short message such as “First upload”, and press
   **Commit changes**.
4. Wait for the upload to finish. You should see `index.html`, `tags.html`,
   `README.md` and an `assets` folder in the file list.

### The other way: git commands

If you have [git](https://git-scm.com/downloads) installed, open Terminal (Mac)
or Git Bash (Windows) and run these commands. Replace `YOUR-USERNAME` with your
GitHub username.

```bash
cd path/to/hydroguard/site
git init
git add .
git commit -m "First upload"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hydroguard-demo.git
git push -u origin main
```

GitHub may ask you to sign in the first time you push.

## Step 3. Turn on GitHub Pages

1. In your repository, choose **Settings** (the tab with the cog).
2. In the left menu, choose **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then press **Save**.
5. Wait 1 to 2 minutes, then refresh the page. A box at the top will say
   “Your site is live at …”.

Your site address will be:

```
https://YOUR-USERNAME.github.io/hydroguard-demo/
```

Open it on your phone and computer to check it works.

## Step 4. Set up the NFC tags

**What to buy:** NTAG213 or NTAG215 NFC stickers, cards or silicone
wristbands. They’re cheap online (a pack of 10 to 50 is plenty). NTAG213
holds about 130 characters, which is enough for these links.

**What you need on your phone:** the free **NXP TagWriter** app (iPhone and
Android) or **NFC Tools** (iPhone and Android).

1. On your phone or computer, open `tags.html` **on the live site**:
   `https://YOUR-USERNAME.github.io/hydroguard-demo/tags.html`
2. Check the **Your site address** box at the top. It fills itself in from
   the page you’re on. If it’s wrong, type your live address and press
   **Save address**. It’s remembered on that device.
3. Find the tag you want, such as “Peggy O’Connell, sticker on Peggy’s
   wristband”. Press **Copy link**.
4. In TagWriter or NFC Tools, choose **Write**, then **Add a record**, then
   **URL**. Paste the link and save the record.
5. Press **Write** and hold the top of your phone flat on the sticker until
   the app says it’s done.
6. Stick the tag where the sheet suggests (wristband, door frame, nurses’
   station and so on). Use **Print tag sheet** to print labels with QR codes
   to go with each tag.
7. Test it: tap your phone on the tag.
   - **iPhone XS and later:** no app needed. With the screen on (even on the
     lock screen), hold the top of the phone near the tag and tap the banner.
   - **Android:** turn on NFC in Settings (search “NFC”), then hold the
     middle of the back of the phone near the tag.
   - **No NFC?** Scan the QR code on the tag sheet with the phone camera.

Optional extras on the tag sheet open the ward dashboard or floor plan with one
resident already picked (`nurse.html?id=…` and `manager.html?id=…#map`).

## Step 5. Update the site later

- **In the browser:** open the file in your repository, press the pencil icon
  to edit, then **Commit changes**. To replace files, use **Add file** then
  **Upload files** and upload the new versions with the same names. They
  replace the old ones.
- **With git:** make your changes, then run:

  ```bash
  git add .
  git commit -m "Describe what you changed"
  git push
  ```

Changes usually appear within 1 to 2 minutes. Your NFC tags don’t need
rewriting unless you change the site address or rename a page.

## Step 6. Swap photos or change residents

### Photos

Photos live in `assets/photos/`. Each one is named after the person:

- Residents: `margaret.jpg`, `ravi.jpg`, `elsie.jpg`, `bill.jpg`, `wei.jpg`,
  `dorothy.jpg`, `joan.jpg`, `kev.jpg`
- Staff: `staff-priya.jpg`, `staff-tom.jpg`, `staff-grace.jpg`,
  `staff-leanne.jpg`

To swap one, make a square photo about 400 × 400 pixels (under 100 KB is
ideal), name it exactly the same as the old one, and upload it over the top.
Use photos you have permission to use, such as free photos from
[Pexels](https://www.pexels.com) or [Unsplash](https://unsplash.com). Note the
source in `assets/photos/CREDITS.md`. If a photo is missing, the site shows
the person’s initials instead.

### Residents and staff

All the people are in `assets/js/data.js`. Open it in a text editor (or the
GitHub pencil editor). Each resident looks like this:

```js
{
  id: 'margaret', name: 'Margaret O’Connell', preferred: 'Peggy', age: 87, ...
  room: '12', wing: 'Banksia', nurse: 'priya',
  ...
  start: { temp: 36.8, hr: 78, hyd: 74 }, latest: { temp: 38.4, hr: 104, hyd: 52 },
  location: 'lounge', ...
},
```

- `id` is used in links and photo names. Keep it short, lowercase, no spaces.
  If you change it, rename the photo to match and rewrite that resident’s
  tags.
- `preferred` is the name staff use (Peggy, Bill, Kev).
- `start` and `latest` are the readings 22 hours ago and now. The site draws
  the readings in between and works out the risk score from `latest`.
  Raise the temperature or heart rate, or drop the hydration, to make someone
  higher risk.
- `location` must be one of: `room`, `lounge`, `dining`, `garden`,
  `activities`, `physio`.
- Room numbers also need a spot on the floor plan in `HG.ROOM_POS` in the
  same file.

Be careful with commas and quote marks: one missing comma can stop every page
from loading. If that happens, undo your last change.

## Troubleshooting

**I get a 404 “Page not found” for the whole site.**
Your files are probably inside a folder. In your repository, `index.html`
should be at the top level. If you see a `site` folder instead, either upload
again (drag the *contents* of `site`, not the folder), or in Settings → Pages
choose the folder that holds `index.html` if it’s offered. Also check Pages is
set to the **main** branch and **/ (root)**, and wait a couple of minutes after
saving.

**My changes don’t show up.**
GitHub takes 1 to 2 minutes to publish. Then your browser may be showing an
old copy. Do a hard refresh: Cmd + Shift + R on a Mac, Ctrl + F5 on Windows.
On a phone, close the tab and open the link again, or try a private window.
You can see publishing progress in the **Actions** tab of your repository.

**A tag opens the wrong page, or an old address.**
Tags keep whatever link was written to them. Open `tags.html` on the live
site, check **Your site address**, copy the link again and rewrite the tag.
Most tags can be rewritten many times, unless they were locked.

**A tag opens `localhost` or a `file:///` address.**
The links were copied while the site was open on your computer. Open
`tags.html` on the live GitHub Pages site, or type the live address into
**Your site address**, then rewrite the tag.

**Photos or styles are missing, or one page works but another doesn’t.**
GitHub Pages is case-sensitive. `Margaret.jpg` is not the same as
`margaret.jpg`, and `Index.html` won’t load as the home page. Keep all file
names lowercase, exactly as they are in this folder. Also check the whole
`assets` folder uploaded, including `css`, `js`, `img` and `photos`.

**My phone doesn’t react to the tag.**
Check NFC is turned on (Android). Hold the phone still for a second; the NFC
reader is at the top edge on iPhone and in the middle of the back on most
Android phones. Thick phone cases and metal surfaces can block NFC. Try the
QR code instead.

**The QR codes don’t show.**
They’re drawn by a small library loaded from the internet. Check you’re online
and refresh. The links and copy buttons still work without them.
