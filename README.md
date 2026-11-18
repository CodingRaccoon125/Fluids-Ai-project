# Flow past a cylinder

Static site (no build step). Deploy: push to GitHub, then Settings → Pages → deploy from branch, root folder.
Local preview: `python3 -m http.server` in this folder, open http://localhost:8000.

- `js/lbm.js` – D2Q9 lattice Boltzmann solver (live for Re ≤ 300)
- `js/main.js` – slider, regime logic, plots
- `data/cd_st.js` – approximate Cd and St curves (verify against the cited primary sources)
- `videos/manifest.js` – add Wikimedia Commons or other freely licensed clips here. Keep each under ~5 MB (H.264 mp4). Check each file's license; CC BY-SA requires attribution and share-alike for adaptations.
- `vendor/katex` – KaTeX 0.16.11 (MIT)

Known limits: the live solver is 2D (no 3D wake transition), runs on the main thread, and has periodic top/bottom boundaries.
