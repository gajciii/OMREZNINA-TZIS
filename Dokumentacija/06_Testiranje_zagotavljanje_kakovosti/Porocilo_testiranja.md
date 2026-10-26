# Poročilo o avtomatiziranem funkcionalnem testiranju Omrežnina+

Avtomatizirano testiranje je potrdilo pričakovano delovanje vseh petih pregledanih primerov TP-01–TP-05. V referenčnem zagonu GitHub Actions je uspelo vseh **21 Cypress testov**, od tega **5 primerov za nalogo** in **16 obstoječih testov prijave ter registracije**. Ločeno je uspelo vseh **5 regresijskih testov parserja**. Gradnja, analiza kode in osnovno preverjanje storitev so bili prav tako uspešni.

| Podatek | Vrednost |
| --- | --- |
| Projekt | Omrežnina+ |
| Datum izvedbe in poročila | 26. 10. 2026 |
| Priprava skript in poročila | ChatGPT – agent UI |
| Izvedba referenčnih avtomatiziranih testov | GitHub Actions |
| Testirana veja | `main` |
| Testirani commit | [`c0a58ff53075e4956bff4313f9af456be866d5f8`](https://github.com/gajciii/OMREZNINA-TZIS/commit/c0a58ff53075e4956bff4313f9af456be866d5f8) |
| Referenčni zagon | [Build, analyze and test — 40313013358](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40313013358) |
| Končni status zagona | `completed / success` |
| Človeški pregled skript | Še ni zabeležen; evidenca je na koncu poročila |

## Namen in obseg

Namen naloge je bil avtomatizirati testne primere iz predhodnih nalog, preveriti njihove konkretne pričakovane rezultate in vključiti izvajanje v cevovod. Izhodišče so [pregledani testni primeri](Testni_primeri.md) in [priprava P-01–P-05](SZPO_priprava_testiranja.md). Njihove predpisane vrednosti ostajajo merilo uspeha.

Pet primerov pokriva ročni vnos in obstojnost računa, uvoz dnevnih stanj CSV, mesečno in dnevno porabo, prikaz stroškov ter simulacijo moči pod dogovorjeno mejo, na njej in nad njo. Prijava je njihov predpogoj. Vsaka Cypress skripta vsebuje en test `it`, ki izvede celoten dokumentirani primer z več preverjanji.

Oznake »Izvedba ni potrjena« v izhodiščnem dokumentu opisujejo stanje ob njegovi pripravi. To poročilo predstavlja ločeno evidenco dejanske avtomatizirane izvedbe 26. 10. 2026.

## Izbira orodja in okolje

Uporabljen je **Cypress s TypeScriptom**, saj frontend uporablja React, TypeScript in Vite, Cypress pa je bil že vključen med odvisnosti projekta. Skripte izvajajo klike, vnos podatkov, izbiro datoteke in osvežitev v pravem brskalniku. Preverjajo prikazane zneske, energijo, moč in stanja, zato uspeh ne temelji samo na nalaganju strani.

| Sestavni del | Referenčno okolje CI |
| --- | --- |
| Izvajalno okolje | GitHub Actions, `ubuntu-24.04` |
| Cypress | 14.3.3 |
| Brskalnik | Electron 130, brez prikazanega okna |
| Node.js za frontend in teste | 22.23.3 |
| Java za gradnjo in analizo | 21 |
| Prikaz | 1440 × 1000 |
| Naslov aplikacije | `http://127.0.0.1:5173` |
| Aplikacija | React/Vite, Spring Boot in Python storitve v Docker Compose |
| Podatkovno okolje | Lokalna emulatorja Firebase Auth in Firestore, projekt `demo-omreznina` |
| Zunanje vremenske zahteve | Izklopljene za ta testni potek |

Odvisnosti se namestijo iz zaklenjene datoteke z `npm ci --prefix frontend --legacy-peer-deps --no-audit --no-fund`. Cevovod pred testi zgradi frontend, preveri namestitev Cypressa ter počaka na pripravljenost aplikacije. Konfiguracija je v [cypress.config.ts](../../frontend/cypress.config.ts), ukazi pa v [package.json](../../frontend/package.json).

## Priprava podatkov in zanesljivost skript

Vsak primer uporablja svojega namenskega uporabnika in neodvisno pripravljene podatke. [Pomočnik za pripravo](../../frontend/cypress/node/fixtures.ts) pred izvedbo preveri stanje v emulatorju. TP-03 samostojno pripravi štiri dnevne zapise, TP-04 dva računa, TP-05 pa pet blokov z mejo 4000 W in ničelni prispevek toplotne črpalke. TP-01 račun vnese prek obrazca, TP-02 pa dejansko naloži [poraba_tp02.csv](../../frontend/cypress/fixtures/poraba_tp02.csv).

Po izvedbi se odstranijo podatki posameznega primera in preveri začetno stanje. Pri simulaciji se obnovijo tudi nastavitve. Namenski Auth računi ostanejo v emulatorju, kot določajo izhodiščni primeri. Testi TP-01–TP-05 ne uporabljajo osebnega uporabniškega računa ali osebnih meritev iz `podatki/`.

Robustnost zagotavljajo stabilni atributi `data-cy`, povezave med oznakami in polji ter preverjanje vidnih elementov. Skripte čakajo na dejanske omrežne odgovore in pričakovano stanje namesto fiksnih časovnih pavz. `cy.intercept` spremlja zahteve in ne nadomešča odgovorov strežnika. Zneski se primerjajo številčno, pri grafih pa se preverjajo vidni namigi z ustreznim obdobjem oziroma datumom.

Podrobna povezava **primer → korak → preverjanje → dokazilo** je v [matriki sledljivosti skript](Avtomatizirano_testiranje.md#sledljivost-vseh-korakov). Omogoča pregled predpogojev, podatkov, vseh korakov, pričakovanih rezultatov in čiščenja.

## Rezultati primerov za nalogo

Vsi spodnji rezultati pripadajo referenčnemu zagonu in commitu iz uvodne tabele. Posamezni primeri niso bili preskočeni ali blokirani.

| Primer in skripta | Preverjeni podatki in dejanski rezultat | Status |
| --- | --- | --- |
| [TP-01 — Ročni račun](../../frontend/cypress/e2e/tp01-invoice.cy.ts) | Januar 2026: skupaj brez DDV 100 €, energija 70 €, omrežnina 20 €, prispevki 10 €, penali 0 €, DDV 22 € in opomba »Testni račun TP-01«. Prikazana je bila potrditev shranjevanja. Vse vrednosti in opomba so ostale enake po osvežitvi. | Uspešno |
| [TP-02 — Uvoz CSV](../../frontend/cypress/e2e/tp02-csv.cy.ts) | Datoteka `poraba_tp02.csv` je bila sprejeta in obdelana. Za januar 2025 je graf prikazal 12 kWh prejete, 1 kWh oddane in 11 kWh neto energije. Po osvežitvi so vrednosti ostale enake. | Uspešno |
| [TP-03 — Mesečna poraba](../../frontend/cypress/e2e/tp03-consumption.cy.ts) | Za leto 2026 sta bili mesečni vsoti 30 kWh za januar in 20 kWh za februar. Dnevne vrednosti so bile 10/20 kWh za 1./2. januar ter 5/15 kWh za 1./2. februar, oddana energija vedno 0 kWh. Februar ni vseboval januarskih datumov; pripravljeni zapisi so ostali nespremenjeni. | Uspešno |
| [TP-04 — Stroški](../../frontend/cypress/e2e/tp04-costs.cy.ts) | Januar: skupaj brez DDV/energija/omrežnina/prispevki/penali/DDV = 100/70/20/10/0/22 €. Po preklopu na februar: 80/50/25/5/0/17,60 €. Postavke so bile ločeno označene, stari zneski zamenjani, shranjena računa nespremenjena. | Uspešno |
| [TP-05 — Simulacija](../../frontend/cypress/e2e/tp05-simulation.cy.ts) | Pri meji 4000 W je zaporedje naprav dalo 400 → 4000 → 4400 → 400 W. Statusi so bili »V REDU« → »V REDU« → »PREKORAČITEV« → »V REDU«. Namiga grafa sta prikazala 4 kW dogovorjene moči in 4,4 kW moči izbranih naprav. | Uspešno |

**Rezultat izbranih primerov: 5 izvedenih, 5 uspešnih, 0 neuspešnih, 0 preskočenih.** To pomeni uspeh vseh izbranih scenarijev in ne popolne pokritosti aplikacije.

## Dodatna preverjanja in ponovljivost

| Preverjanje | Rezultat | Dokazilo |
| --- | --- | --- |
| Celoten Cypress nabor v referenčnem CI | 21/21 uspešnih; 5 primerov naloge in 16 obstoječih testov avtentikacije | [Dnevnik testnega joba](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40313013358/job/121539213345) |
| Regresijski testi parserja v referenčnem CI | 5/5 uspešnih | Isti dnevnik, korak `Check daily CSV and XLSX parser regressions` |
| Osnovno preverjanje storitev in shrambe | Uspešno | Isti dnevnik, korak `Check local services and storage` |
| Gradnja in analiza SonarCloud | Job uspešno zaključen pred testnim jobom | [Build and analyze](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40313013358/job/121538592285) |
| Lokalni celoten Cypress nabor | 21/21 uspešnih | [Povzetek](dokazila/cypress-2026-10-26/celoten-nabor/summary.json) |
| Lokalna ponovitev TP-01–TP-05 | 5/5 uspešnih | [Povzetek](dokazila/cypress-2026-10-26/ponovitev-tp/summary.json) |
| Lokalni samostojni zagoni | Vsak primer 1/1 uspešen | [TP-01](dokazila/cypress-2026-10-26/samostojni-tp01/summary.json), [TP-02](dokazila/cypress-2026-10-26/samostojni-tp02/summary.json), [TP-03](dokazila/cypress-2026-10-26/samostojni-tp03/summary.json), [TP-04](dokazila/cypress-2026-10-26/samostojni-tp04/summary.json), [TP-05](dokazila/cypress-2026-10-26/samostojni-tp05/summary.json) |
| Lokalna ponovitev po popravku preverjanja grafov | 5/5 uspešnih | [Povzetek](dokazila/cypress-2026-10-26/ponovitev-grafi/summary.json) |

Lokalne izvedbe so potekale na macOS ARM64 z Node.js 23.11.0 in Electronom 130.0.6723.137. Izhodiščne izvedbe so uporabljale delovno različico nad commitom `1adc3ec`, ponovitev grafov pa nad `6012c21`; pripadajoča manifesta [prvih izvedb](dokazila/cypress-2026-10-26/source-sha256.json) in [ponovitve grafov](dokazila/cypress-2026-10-26/ponovitev-grafi/source-sha256.json) določata testirano vsebino. Te izvedbe so dokaz razvoja in ponovljivosti; referenčni rezultat končne različice je zagon CI na `c0a58ff`.

Parser je del aplikacije, ki bere datoteke meritev in računa dnevne razlike stanj števca. [Dodatni Python testi](../../python_helper/tests/test_parser.py) preverjajo povezovanje stolpcev po tarifi, neodvisnost od vrstnega reda stolpcev, rezultat 12/1/11 kWh za CSV TP-02, obdelavo 365 dni v XLSX z zaključnim stanjem naslednjega leta in ohranitev neznane vrednosti pri manjkajoči oddani energiji. Uporabljajo sintetične podatke in ne sodijo med pet funkcionalnih primerov v brskalniku.

## Odkrite napake in izvedeni popravki

| Ugotovitev | Vpliv in popravek | Preverjanje po popravku |
| --- | --- | --- |
| Parser je povezoval sosednja številska stolpca namesto prejete in oddane energije iste tarife. | Pri razporeditvi najprej ET/VT/MT prejete in nato ET/VT/MT oddane energije je lahko izračunal napačno porabo. Zdaj povezuje stolpce po imenu in tarifi. | Vseh 5 regresijskih testov parserja je uspešnih; TP-02 potrjuje uvoz tudi prek aplikacije. |
| Izbirnik leta pri enem razpoložljivem letu ni bil prikazan. | Koraka izbire leta iz TP-02 in TP-03 ni bilo mogoče izvesti na predpisanih podatkih. Izbirnik je zdaj na voljo tudi pri enem letu. | TP-02 in TP-03 uspešno izbereta leto in preverita vrednosti. |
| Samodejno shranjevanje računa je lahko vrnilo odgovor pred shranitvijo vseh končnih polj. | Čakanje samo na prvi odgovor ne bi dokazovalo celotnega računa. Skripta počaka na zahtevo z vsemi pričakovanimi podatki in preveri prikaz po osvežitvi. | TP-01 preveri vse zneske in opombo pred osvežitvijo in po njej. |
| Preverjanje namiga grafa TP-05 je bilo v prvem CI nestabilno ob ponovnem izrisu. | [Prvi zagon](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40309454717) je imel 20/21 uspešnih Cypress testov. Popravljena poizvedba pri ponovitvah poišče trenutni SVG stolpec in ponovno sproži premik kazalca. Pričakovani vrednosti 4 in 4,4 kW sta ostali enaki. | [Zagon po popravku](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40311399165) in referenčni skupni CI sta uspešna 21/21. |

Neuspeh prvega TP-05 je bil povezan s sinhronizacijo testne skripte z grafom. Sam po sebi ni dokazoval napačnega izračuna moči aplikacije. Končno poročilo upošteva rezultat po popravku in ohranja povezavo do začetne napake.

## Cevovod in dokazila

[Workflow `ci.yml`](../../.github/workflows/ci.yml) ob pushu ali spremembi pull requesta izvede naslednji potek:

**Build and analyze → priprava aplikacije → osnovni testi → testi parserja → Cypress → shranjevanje dokazil → ustavitev okolja.**

Prvi job izvede Maven `verify` s profilom `no-integration-tests` in analizo SonarCloud. Drugi job `Smoke, parser and Cypress` uporablja `needs: build`, zato se začne šele po uspešnem prvem jobu. Neuspeh testa povzroči neuspeh cevovoda. Zajem dnevnikov, objava dokazil in ustavitev okolja uporabljajo `if: always()`.

| Dokazilo | Vsebina in mesto |
| --- | --- |
| [Referenčni zagon CI](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40313013358) | Testirani commit, zaporedje jobov, statusi korakov in konzolni rezultati. |
| [Arhiv dokazil CI](https://github.com/gajciii/OMREZNINA-TZIS/actions/runs/40313013358/artifacts/12646131774) | `cypress-evidence-40313013358-1`: JUnit XML, metapodatki okolja, povzetek, videi in dnevniki aplikacije. |
| `frontend/cypress/results/ci-40313013358-1/` | Pot rezultatov med izvajanjem CI; vsebuje `junit-[hash].xml`, `environment.json` in `summary.json`. |
| [Lokalna dokazila v repozitoriju](dokazila/cypress-2026-10-26/) | Shranjeni JUnit XML, povzetki, metapodatki in manifesta lokalnih izvedb. |

JUnit XML poroča o posameznem testnem primeru; podrobna preverjanja korakov so razvidna iz skripte in poteka izvajanja. Video se shrani za posamezno skripto, posnetek zaslona pa nastane ob napaki, zato pri uspešni izvedbi mapa posnetkov lahko manjka. Hash v imenu XML prepreči prepis poročil različnih skript.

Arhiv CI se hrani 14 dni in ima trenutno naveden iztek **9. 11. 2026**. Za zagovor po tem datumu je treba arhiv pravočasno prenesti; lokalna dokazila, vključena v repozitorij, ostanejo dostopna.

## Omejitve in končna ocena

V izbranih petih scenarijih končna izvedba ni pokazala odstopanj od pričakovanih rezultatov. Preverjanje se nanaša na namizni Electron in lokalno aplikacijo z emulatorjema; ne potrjuje vseh brskalnikov, mobilnih prikazov ali produkcijskega okolja.

Pokritost funkcionalnosti je delna. Niso zajeti OCR, napoved mesecev prekoračitev, izračun optimalne moči, splošno preverjanje vseh tarif in stroškov simulacije ter celovit nabor neveljavnih vhodov. Prav tako niso bili s temi primeri izvedeni obremenitveni, varnostni ali dostopnostni preizkusi. Uspešen job Maven/SonarCloud s profilom `no-integration-tests` ne pomeni izvedbe vseh integracijskih testov zaledja.

Tehnični del avtomatizacije izbranih primerov je izveden: skripte obstajajo, pričakovani rezultati so preverjeni, samostojne in ponovljene lokalne izvedbe imajo dokazila, skupni cevovod pa je uspešen. Za zaključek pregleda, ki ga zahteva naloga, mora uporabnica še primerjati skripte s primeri in zabeležiti svoj pregled.

## Evidenca človeškega pregleda

Agent ne potrjuje pregleda v imenu uporabnice. Pri pregledu uporabi [podrobno matriko](Avtomatizirano_testiranje.md#sledljivost-vseh-korakov) in izpolni naslednje:

- [ ] Predpogoji, testni podatki in vsi koraki ustrezajo pregledanim primerom.
- [ ] Trditve preverjajo pričakovane rezultate, tudi po osvežitvi ali menjavi obdobja.
- [ ] Izbira elementov, čakanje, priprava podatkov in čiščenje omogočajo neodvisne izvedbe.
- [ ] Pregledani so rezultati CI, poročila in potek vsaj izbranih skript.

| Podatek | Zapis uporabnice |
| --- | --- |
| Pregledala | — |
| Datum pregleda | — |
| Pregledani commit | — |
| Ugotovitve in morebitne dopolnitve | — |

Za prikaz samo petih primerov naloge ob zagnanem lokalnem okolju izvedi iz korena projekta:

```bash
npm --prefix frontend run test:e2e -- --spec "cypress/e2e/tp*.cy.ts"
```

Za interaktivni pregled uporabi `npm --prefix frontend run test:e2e:open`. Celotna navodila za namestitev in zagon so v [dokumentaciji avtomatiziranega testiranja](Avtomatizirano_testiranje.md#namestitev-in-lokalni-zagon).
