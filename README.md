# ⚡ Omrežnina+

Omrežnina+ prikazuje porabo elektrike, račune, časovne bloke, prekoračitve in optimum dogovorjene moči. Celotna aplikacija teče na tvojem računalniku: React frontend, Java backend, tri Python storitve ter lokalna Firebase Auth in Firestore emulatorja.

## Zagon na macOS

V Finderju dvoklikni **`Zazeni.command`** ali v terminalu iz korena projekta zaženi:

```bash
./start-local.sh
```

Skript ob prvem zagonu namesti projektne odvisnosti, prenese lokalna emulatorja in zgradi backend. Nato zažene vse storitve ter počaka, da so pripravljene. Ob naslednjih zagonih uporabi že pripravljeno okolje; odvisnosti ponovno namesti le ob spremembi njihovih konfiguracij.

- Aplikacija: **http://localhost:5173**
- Upravljanje lokalnih uporabnikov in podatkov: **http://localhost:4000**
- Ustavitev in shranjevanje podatkov: **Ctrl+C** v terminalu, kjer aplikacija teče.

Za običajen zagon so potrebni Node.js 20.12+ (priporočeno 22 ali 24), JDK 21+ in Python 3.11–3.14 (priporočeno 3.12). Maven je izbiren: skript uporabi nameščen Maven ali projektni Maven Wrapper. Če uporabljaš drug Python, ga izberi z `OMREZNINA_PYTHON=/pot/do/python ./start-local.sh`.

Projektne knjižnice so nameščene v `node_modules`, `frontend/node_modules` in `.venv`. Globalna namestitev Firebase CLI in Firebase račun nista potrebna. Prva priprava potrebuje internet za prenose; običajna prijava, baza, uvoz podatkov in izračuni nato delujejo lokalno.

## Prva prijava in podatki

Odpri aplikacijo in registriraj račun. Lokalni emulator ne pošilja emailov: aplikacija po registraciji pokaže povezavo **Potrdi email lokalno**. Odpri jo in se prijavi. Tudi ponastavitev gesla pokaže lokalno povezavo. Firebase emulator podpira te postopke prek [lokalnih kod za email dejanja](https://firebase.google.com/docs/emulator-suite/connect_auth).

Lokalna baza je ob prvi uporabi prazna. Računi in podatki iz prejšnjega Firebase projekta v oblaku se ne prenesejo samodejno; podatke o porabi lahko ponovno uvoziš skozi aplikacijo. Projekt uporablja lokalni ID `demo-omreznina`.

Ob ustavitvi s Ctrl+C se uporabniki in Firestore podatki izvozijo v `.local/firebase-data`; ob naslednjem zagonu se uvozijo nazaj. Shranjevanje uporablja uradna [Firebase export/import mehanizma](https://firebase.google.com/docs/emulator-suite/install_and_configure). Terminal zapri šele, ko se ustavitev konča. Ob prisilni prekinitvi procesa se lahko izgubijo spremembe od zadnjega izvoza.

Za varnostno kopijo po ustavitvi kopiraj **celotno mapo `.local`**, saj `.local/mfa-key` vsebuje tudi ključ za shranjene MFA nastavitve. Mapa vsebuje osebne podatke in je izključena iz Gita. Dnevniki posameznih storitev so v `.local/logs`.

## Izbirne vremenske in AI funkcije

Osnovna aplikacija ne potrebuje API ključev. Za AI klepet in trenutno temperaturo kopiraj `.env.local.example` v `.env.local` v korenu projekta in nastavi `OPENAI_API_KEY` oziroma `OPENWEATHER_API_KEY`. Po spremembi ponovno zaženi aplikacijo.

Koordinate za lokalno vremensko analizo so privzeto Ljubljana. Spremeni jih z `LOCAL_LATITUDE` in `LOCAL_LONGITUDE` v `.env.local`. Statistična predikcija uporablja lokalno Python storitev; vremenska dopolnitev uporablja Open-Meteo in ob nedostopnosti vrne prazno temperaturo. Za izklop teh zunanjih vremenskih zahtev nastavi `WEATHER_ENABLED=false`.

## Alternativa: Docker Compose

Če imaš zagnan Docker Desktop, lahko celoten sistem zaženeš brez lokalne Jave, Pythona ali Node.js:

```bash
docker compose up --build
```

Aplikacija in Firebase upravljalnik uporabljata ista naslova. Za ustavitev v drugem terminalu zaženi:

```bash
docker compose down
```

Podatki se ohranijo v Docker volume `firebase-data`. Docker in običajni zagon uporabljata ločeni bazi. `docker compose down -v` izbriše Docker podatke. Običajnega in Docker zagona ne izvajaj hkrati, ker uporabljata ista vrata.

Za izbirne ključe in koordinate z Dockerjem uporabi `docker compose --env-file .env.local up --build`.

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

Vse storitve pri običajnem zagonu poslušajo na loopback vmesniku. Frontend pošilja zahteve skozi Vite proxy `/api` v lokalni backend. Nastavitve backenda so v `backend/src/main/resources/application.properties`, frontend uporablja lokalne nastavitve v `frontend/.env` in `frontend/.env.production`.

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

Če so vrata zasedena, ustavi prejšnji zagon. Ob napaki preglej ustrezen dnevnik v `.local/logs`; launcher ob izhodu ene storitve ustavi tudi druge.

[Dokumentacija projekta](https://omreznina.gitbook.io/omreznina+) · [GitHub](https://github.com/adam8kac/Omreznina)
