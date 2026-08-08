# Illyrian Property Registry

MVP lokal për menaxhimin e pronave.

## Çfarë ka tani

- Shto / ndrysho / fshi pronë
- Status: Aktive, Rezervuar, Në negocim, Jo aktive
- Shitje / Qira
- Fusha të strukturuara për zonë, çmim, sipërfaqe, etj.
- Foto të shumta
- PDF i prezantimit
- IndexedDB me Dexie
- Fuzzy search me Fuse.js
- Filter sipas statusit dhe transaksionit
- Export / Import backup JSON
- Responsive për telefon

## Si ta hapësh

1. Instalo Node.js
2. Hape folderin në VS Code
3. Në terminal:

```bash
npm install
npm run dev
```

4. Hape adresën që jep Vite, zakonisht:
   http://localhost:5173

## Deploy falas në Vercel

Mënyra më e thjeshtë:

1. Krijo repository të ri në GitHub.
2. Ngarko këtë projekt.
3. Hyr në Vercel.
4. Add New Project.
5. Importo repository-n.
6. Framework: Vite
7. Build command: `npm run build`
8. Output directory: `dist`
9. Deploy.

## Kujdes për të dhënat

Të dhënat ruhen në IndexedDB të browserit.

Kjo do të thotë:
- nuk humbasin normalisht kur mbyll browserin;
- por laptopi dhe telefoni nuk sinkronizohen automatikisht;
- përdor Backup > Eksporto në laptop dhe Backup > Importo në telefon.

Mos bëj Clear Site Data pa pasur backup.

## Hapi tjetër i rekomanduar

Versioni 2:
- kartelë klienti
- kërkesat e klientit
- score automatik i përputhjes pronë-klient
- "shfaq vetëm pronat që i përshtaten këtij klienti"
