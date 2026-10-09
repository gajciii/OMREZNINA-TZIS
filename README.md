# ⚡ Omrežnina+

Omrežnina+ prikazuje porabo elektrike, račune, časovne bloke, prekoračitve in optimum dogovorjene moči. Celotna aplikacija teče na tvojem računalniku: React frontend, Java backend, tri Python storitve ter lokalna Firebase Auth in Firestore emulatorja.

## Zagon z Docker Compose

Za zagon potrebuješ nameščen in odprt [Docker Desktop](https://www.docker.com/products/docker-desktop/). V terminalu odpri korensko mapo projekta in zaženi:

```bash
docker compose up --build
```

Docker ob prvem zagonu zgradi frontend, backend, tri Python storitve ter lokalna emulatorja Firebase Auth in Firestore. Ko so storitve pripravljene, odpri:

- aplikacija: **http://localhost:5173**
- upravljanje lokalnih uporabnikov in podatkov: **http://localhost:4000**

Za ustavitev v terminalu pritisni `Ctrl+C`, nato zaženi:

```bash
docker compose down
```

Podatki ostanejo shranjeni v Docker volumnu `omreznina_firebase-data` in se ob naslednjem zagonu obnovijo. Ukaz `docker compose down -v` izbriše tudi lokalno bazo, zato ga uporabi samo, ko želiš podatke namenoma odstraniti.

Za izbirne API ključe in koordinate kopiraj `.env.local.example` v `.env.local`, nato zaženi:

```bash
docker compose --env-file .env.local up --build
```

## Prva prijava in podatki

Odpri aplikacijo in registriraj račun. Lokalni emulator ne pošilja emailov: aplikacija po registraciji pokaže povezavo **Potrdi email lokalno**. Odpri jo in se prijavi. Tudi ponastavitev gesla pokaže lokalno povezavo. Firebase emulator podpira te postopke prek [lokalnih kod za email dejanja](https://firebase.google.com/docs/emulator-suite/connect_auth).

Lokalna baza je ob prvi uporabi prazna. Računi in podatki iz prejšnjega Firebase projekta v oblaku se ne prenesejo samodejno; podatke o porabi lahko ponovno uvoziš skozi aplikacijo. Projekt uporablja lokalni ID `demo-omreznina`.

Ob pravilni ustavitvi Docker Compose se uporabniki in Firestore podatki izvozijo v trajni Docker volume ter ob naslednjem zagonu obnovijo. Shranjevanje uporablja uradna [Firebase export/import mehanizma](https://firebase.google.com/docs/emulator-suite/install_and_configure).

## Izbirne vremenske in AI funkcije

Osnovna aplikacija ne potrebuje API ključev. Za AI klepet in trenutno temperaturo kopiraj `.env.local.example` v `.env.local` v korenu projekta in nastavi `OPENAI_API_KEY` oziroma `OPENWEATHER_API_KEY`. Po spremembi ponovno zaženi aplikacijo.

Koordinate za lokalno vremensko analizo so privzeto Ljubljana. Spremeni jih z `LOCAL_LATITUDE` in `LOCAL_LONGITUDE` v `.env.local`. Statistična predikcija uporablja lokalno Python storitev; vremenska dopolnitev uporablja Open-Meteo in ob nedostopnosti vrne prazno temperaturo. Za izklop teh zunanjih vremenskih zahtev nastavi `WEATHER_ENABLED=false`.

## Storitve in razvoj

| Storitev | Lokalni naslov |
| --- | --- |
| React + Vite | http://127.0.0.1:5173 |
| Spring Boot API | http://127.0.0.1:8080 |
| Parser dnevne porabe | http://127.0.0.1:8001 |
| Prekoračitve in optimum | http://127.0.0.1:8002 |
| Statistična predikcija | http://127.0.0.1:8003 |
| Firebase Auth | http://127.0.0.1:9099 |
| Firestore | http://127.0.0.1:8081 |
| Firebase UI | http://127.0.0.1:4000 |

Vsa objavljena vrata Docker Compose so omejena na lokalni računalnik. Frontend pošilja zahteve skozi Vite proxy `/api` v lokalni backend. Nastavitve backenda so v `backend/src/main/resources/application.properties`, frontend pa uporablja lokalne nastavitve v `frontend/.env` in `frontend/.env.production`.

Preverjanje že zagnanega lokalnega sistema:

```bash
npm run smoke
```

Preveri proxy, registracijo, potrditev emaila, prijavo, zapis in branje baze, CSV uvoz, prekoračitve, optimum, predikcijo ter ponastavitev gesla. Ustvari in po preverjanju odstrani samo svoj testni račun in njegove podatke.

Gradnja frontenda in testi backenda:

```bash
npm --prefix frontend run build
mvn -f backend/pom.xml test
```

GitHub Actions preverja lokalni sistem in Cypress teste. Samodejni deploy na Render ter Netlify konfiguracija sta odstranjena. Morebitne že obstoječe spletne storitve v računih teh ponudnikov je treba izklopiti v njihovih nadzornih ploščah.

Če so vrata zasedena, ustavi prejšnji zagon. Stanje in dnevnike vsebnikov preveri z `docker compose ps` in `docker compose logs`.

[Dokumentacija projekta](https://omreznina.gitbook.io/omreznina+) · [GitHub](https://github.com/adam8kac/Omreznina)
