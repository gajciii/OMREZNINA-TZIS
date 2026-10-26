# Avtomatizirano funkcionalno testiranje Omrežnina+

| Podatek | Vrednost |
| --- | --- |
| Izhodišče | [Pregledani testni primeri TP-01–TP-05](Testni_primeri.md) in [priprava P-01–P-05](SZPO_priprava_testiranja.md) |
| Avtor testnih skript in dokumentacije | ChatGPT – agent UI |
| Orodje | Cypress 14.3.3, TypeScript, brskalnik Electron |
| Okolje | Lokalna aplikacija v Docker Compose, Firebase Auth in Firestore emulatorja |
| Namen | Izvesti vseh pet primerov prek uporabniškega vmesnika in preveriti njihove konkretne pričakovane rezultate |
| Človeški pregled skript | Še ni zabeležen; kontrolni seznam je na koncu dokumenta |

## Izbira orodja

Projekt uporablja React, TypeScript in Vite, v razvojnem okolju pa že ima Cypress ter obstoječe teste prijave. Cypress je zato primerna izbira za nadgradnjo testiranja: nove skripte ostanejo v istem jeziku in uporabljajo obstoječo infrastrukturo. `frontend/package.json` navaja `^14.3.3`, datoteka `frontend/package-lock.json` pa določa konkretno različico **14.3.3**, ki jo namesti `npm ci`.

Cypress izvaja dejanske interakcije v brskalniku: izpolnjevanje obrazcev, izbiro datotek, klike, spremembo obdobja in osvežitev strani. Poizvedbe in trditve ponavlja do izpolnitve pogoja oziroma časovne omejitve, kar omogoča čakanje na stanje aplikacije brez fiksnih pavz. [Uradna razlaga ponavljanja poizvedb in trditev](https://docs.cypress.io/app/core-concepts/retry-ability).

Za avtomatski zagon se uporablja `cypress run --browser electron`, za pregled skript pa interaktivni način `cypress open --e2e --browser electron`. Cypress se lahko izvaja v GitHub Actions po namestitvi odvisnosti in zagonu aplikacije. [Uradna navodila za CI](https://docs.cypress.io/app/continuous-integration/overview).

Rezultati so vgrajeni **JUnit XML**, konzolni izpis, video in posnetki zaslona ob napakah. Vgrajeni reporter `junit` omogoča strojno berljive rezultate brez dodatne odvisnosti za poročila HTML. [Uradna dokumentacija reporterjev](https://docs.cypress.io/app/tooling/reporters).

## Namestitev in lokalni zagon

Potrebuješ Node.js 22, npm ter delujoč Docker Compose oziroma Docker Desktop. Ukazi spodaj se izvajajo iz **korena projekta**.

Namestitev odvisnosti iz zaklenjenih različic in preverjanje Cypressa:

```bash
npm ci --prefix frontend --legacy-peer-deps --no-audit --no-fund
npm --prefix frontend exec -- cypress install
npm --prefix frontend exec -- cypress verify
```

`--legacy-peer-deps` uporablja enak način namestitve kot cevovod za obstoječe odvisnosti projekta. Cypress je že naveden med razvojnimi odvisnostmi, zato ga ni treba ponovno dodajati z `npm install --save-dev`.

Zaženi aplikacijo in preveri osnovno delovanje:

```bash
WEATHER_ENABLED=false OPENWEATHER_API_KEY='' docker compose up --build --detach --wait --wait-timeout 300
npm run smoke
```

Testi uporabljajo `http://127.0.0.1:5173`. Frontend, Spring Boot backend in Python storitve delujejo skupaj z emulatorjema. Izklop zunanjih vremenskih zahtev in prazen OpenWeather ključ odstranita odvisnost teh primerov od zunanjih vremenskih storitev.

Izvedba vseh Cypress testov, vključno z obstoječimi testi prijave:

```bash
npm --prefix frontend run test:e2e
```

Samostojna izvedba enega primera:

```bash
npm --prefix frontend run test:e2e -- --spec cypress/e2e/tp01-invoice.cy.ts
```

Interaktivni pregled korakov in trditev:

```bash
npm --prefix frontend run test:e2e:open
```

Če lupina iz nadrejene aplikacije podeduje `ELECTRON_RUN_AS_NODE=1`, se Electron lahko zažene v napačnem načinu. Na macOS oziroma Linuxu spremenljivko odstrani samo za ta zagon:

```bash
env -u ELECTRON_RUN_AS_NODE npm --prefix frontend run test:e2e
```

Posamezne skripte imajo lastno pripravo in čiščenje, zato TP-04 lahko zaženeš neposredno, brez predhodnega TP-01. Za preverjanje ponovljivosti izvedi vseh pet primerov še enkrat, za preverjanje neodvisnosti pa posamezne skripte samostojno oziroma v drugačnem vrstnem redu. Rezultate teh preverjanj zabeleži ločeno od prve izvedbe.

Po koncu lahko aplikacijo ustaviš z `docker compose down`; ta ukaz ohrani lokalni podatkovni volumen.

## Priprava podatkov in robustnost

Pripravo izvaja [pomočnik za emulatorje](../../frontend/cypress/node/fixtures.ts), ki ga uporabljajo skupne funkcije [prepareCase, login in cleanupCase](../../frontend/cypress/support/functional.ts).

| Primer / priprava | Kaj skripta pripravi in preveri |
| --- | --- |
| Vsi primeri, P-01 | Nov namenski uporabnik z enkratnim UID in naslovom `e2e-tp-…@example.test`; potrditev e-pošte v Auth emulatorju; preverjanje potrjenosti; začetno prazno podatkovno območje; prijava skozi dejanski UI. |
| TP-01, P-02 | Prazni podatki novega uporabnika zagotavljajo, da račun za januar 2026 ne obstaja. Vnos računa opravi sam test prek obrazca. |
| TP-02, P-03 | Začetno prazna poraba; [poraba_tp02.csv](../../frontend/cypress/fixtures/poraba_tp02.csv) vsebuje točno glavo in dve vrstici iz TP-02, v UTF-8. Podatke obdela dejanski Python parser. |
| TP-03, P-04 | Štirje dnevni dokumenti za 1. in 2. januar ter 1. in 2. februar 2026: prejeta energija 10, 20, 5 in 15 kWh, oddana energija 0. Priprava in povratno branje neposredno v Firestore emulatorju. |
| TP-04, P-02 | Neodvisno pripravljena januarski in februarski račun z vsemi zneski iz testnega primera; povratno branje in primerjava zapisanih polj. |
| TP-05, P-05 | Vseh pet blokov ima 4000 W; polje `power` toplotne črpalke je 0. Zapis je neposreden, saj aplikacijski API za toplotno črpalko zavrne ničelno moč. Test pred kliki preveri prebrane dogovorjene moči, ničelni prispevek črpalke in odsotnost izbranih naprav. |

Vsak test ima svoj UID in `testIsolation: true`; to dopolnjuje ločevanje stanja brskalnika z ločevanjem podatkov v bazi. Cypressovo izolacijo brskalnika opisuje [uradna dokumentacija](https://docs.cypress.io/app/core-concepts/test-isolation). Testi ne uporabljajo skupnega uporabniškega računa ali rezultatov predhodnega primera.

Priprava sme dostopati samo do lokalnih emulatorjev projekta `demo-omreznina`. Čiščenje sprejme samo UID, ustvarjen v trenutnem procesu, odstrani nastale dokumente in preveri obnovitev začetnega stanja. Po TP-05 se obnovi tudi prvotna odsotnost nastavitev: nov uporabnik pred testom ni imel dokumentov dogovorjene moči in toplotne črpalke. Pred čiščenjem brskalnik zapusti spreminjani obrazec; dodatni zaključni hook pokrije tudi primere, ko običajno čiščenje ne uspe zaključiti.

**Namenski Auth računi ostanejo v lokalnem emulatorju.** Čiščenje petih dokumentiranih primerov odstranjuje njihove podatke, ne celotnega uporabniškega računa. To sledi zahtevam testnih primerov. Starejši smoke test in test prijave imata svoj ločen način čiščenja, ki lahko odstrani njun namenski račun.

Za izbiro elementov se uporabljajo stabilni `data-cy` atributi, povezane oznake polj in vidni gumbi. Pri obrazcih z mobilno in namizno različico test izbere vidno različico. Pri simulaciji `aria-pressed` omogoča preverjanje izbranih naprav. Grafi se preverjajo z dejansko prikazanimi tooltipi na izrisanih SVG elementih; testi ne berejo notranjega stanja Reacta.

`cy.intercept` spremlja dejanske zahteve brez zamenjave odgovorov. Test počaka na zaključeno zahtevo in nato preveri uporabniku vidni rezultat. Ni fiksnih `cy.wait(1000)` pavz. Posebno pozornost zahteva ročni račun: obrazec tudi samodejno shranjuje, zato TP-01 sprejme samo zahtevo z vsemi pričakovanimi podatki, zahteva potrditev po kliku »Shrani račun« in nato preveri račun po ponovnem nalaganju.

Pri TP-05 vsaka sprememba naprav sproži simulacijo, nato izračun cene in nalaganje tarife. `assertSimulation` zato pri vsakem rezultatu počaka tudi na odgovor za tarifo. Preverjanje tooltipov se začne po tem zaporedju, da ga naknadni izris grafa ne prekine. TP-03 in TP-04 s pomočnikom `assertFixturesUnchanged` pred čiščenjem povratno prebereta pripravljene dokumente in preverita, da pregled podatkov ni spremenil njihovih polj.

## Dodatno preverjanje parserja CSV in XLSX

Pri preverjanju podprtega XLSX je bila odkrita napaka pri razporeditvi stolpcev: parser je paril sosednja številska stolpca, izvoz pa lahko najprej vsebuje prejete energije ET/VT/MT in nato oddane energije ET/VT/MT. [Popravek parserja](../../python_helper/parser.py) zdaj poveže prejeto in oddano energijo po imenu ter isti tarifi, zato vrstni red stolpcev ne spremeni izračuna. Manjkajoče meritve ostanejo `null` in se ne pretvorijo v izmišljeno ničelno porabo.

[Pet regresijskih testov](../../python_helper/tests/test_parser.py) uporablja izključno sintetične podatke. Preverjajo skupine stolpcev po smeri energije, prepleten in obrnjen vrstni red, natančni CSV TP-02, XLSX s 365 dnevi in zaključnim stanjem naslednjega leta ter manjkajočo meritev oddane energije. To so dodatni testi parserja poleg petih funkcionalnih primerov v brskalniku.

Ob zagnanem Docker okolju jih iz korena projekta izvedi z:

```bash
docker compose exec -T parser python -m unittest discover -s tests -v
```

## Sledljivost vseh korakov

Vsaka skripta vsebuje en test `it` za celoten izvorni primer, z označenimi koraki v `cy.log`. **JUnit poroča o uspehu celotnega primera, ne o ločenem uspehu vsakega koraka.** Spodnja matrika povezuje posamezni korak s konkretno trditvijo. Video in interaktivni dnevnik omogočata pregled poteka; pri napaki se doda posnetek zaslona in izpis neuspele trditve. Vpis v matriko pomeni implementirano preverjanje, ne že dokazane uspešne izvedbe.

### TP-01 — [tp01-invoice.cy.ts](../../frontend/cypress/e2e/tp01-invoice.cy.ts)

| Korak | Implementirano dejanje in preverjanje | Dokazilo ob izvedbi |
| --- | --- | --- |
| Predpogoji | `prepareCase('TP-01')` preveri novega potrjenega uporabnika in prazno bazo; `login` preveri uspešno UI prijavo istega UID. | Rezultat priprave in prijave; ob neuspehu test ne nadaljuje. |
| 1 | Odpre `/upload-reciept`; preveri vidni naslov »Ročni vnos podatkov računa«. | Trditev vidnosti in video obrazca. |
| 2 | Izbere 2026/01; vpiše in preveri vrednosti 100, 70, 20, 10, 0 in 22 ter opombo »Testni račun TP-01«. | `have.value` za obdobje in vsako vnosno polje. |
| 3 | Klikne »Shrani račun«; počaka na odgovor za popoln pričakovani zapis in preveri vidno »Račun uspešno vnešen!«. | Status dejanske zahteve, trditev potrditve in video. |
| 4 | Odpre `/reciept-explanation`, izbere januar 2026; `assertInvoice` preveri označene vrstice vseh šestih zneskov in opombo. | Vidne celice tabele, vsaka primerjana z neodvisno pričakovano vrednostjo. |
| 5 | Osveži stran, ponovno izbere januar 2026 in ponovi vsa preverjanja. | Ponovne trditve istih podatkov po osvežitvi. |
| Čiščenje | `cleanupCase` odstrani nastale dokumente tega UID in s povratnim branjem potrdi začetno stanje; Auth račun ostane. | Uspešen zaključni hook oziroma napaka čiščenja v rezultatu. |

[Pomočnik assertInvoice](../../frontend/cypress/support/invoice.ts) preverja znesek ob pravilni oznaki postavke. Denarni zapis normalizira številčno, zato sta `17.6 €` in `17,60 €` enakovredna.

### TP-02 — [tp02-csv.cy.ts](../../frontend/cypress/e2e/tp02-csv.cy.ts)

| Korak | Implementirano dejanje in preverjanje | Dokazilo ob izvedbi |
| --- | --- | --- |
| Predpogoji | `prepareCase('TP-02')`, prijava, prazna poraba in nespremenjena datoteka `poraba_tp02.csv`. | Preverjena priprava; točna datoteka je del repozitorija. |
| 1 | Odpre `/upload-data`, klikne »Naloži dnevna stanja« in preveri viden vnos za datoteko. | Trditev vidnosti in video. |
| 2 | Izbere datoteko, preveri njeno ime, klikne »Naloži csv ali excel«; počaka na obdelavo, preveri potrditev ter odsotnost sporočila o napaki. | Odgovor dejanskega uvoza in uporabniku vidno sporočilo. |
| 3 | Odpre `/monthly-consumption`, izbere leto 2025 in preveri januar 2025. | Vrednosti izbirnikov leta in meseca. |
| 4 | `assertMonthlyValues` preveri tooltip za januar: prejeta 12, oddana 1 in poraba 11 kWh. | Vidni naslov obdobja in tri številčne vrednosti grafa. |
| 5 | Osveži stran, ponovno izbere obdobje in preveri istih 12/1/11 kWh. | Ponovne trditve prikaza; podvojene ali izgubljene vrednosti povzročijo neuspeh. |
| Čiščenje | Odstrani samo nastale dokumente lastnega UID, vključno z morebitnimi dodatnimi dokumenti uvoza; preveri začetno stanje. | Rezultat zaključnega hooka. |

Referenčni izračun ostaja neodvisen od aplikacije: `112 − 100 = 12`, `1 − 0 = 1`, `12 − 1 = 11 kWh`.

### TP-03 — [tp03-consumption.cy.ts](../../frontend/cypress/e2e/tp03-consumption.cy.ts)

| Korak | Implementirano dejanje in preverjanje | Dokazilo ob izvedbi |
| --- | --- | --- |
| Predpogoji | `prepareCase('TP-03')` zapiše in povratno preveri štiri dnevne dokumente; TP-02 se ne uporablja za pripravo. | Primerjava vseh pripravljenih polj z vrednostmi P-04. |
| 1 | Odpre porabo, izbere 2026 in preveri, da sta na voljo januar in februar. | Vrednost leta in natančen seznam mesecev. |
| 2 | `assertMonthlyValues` preveri januarski tooltip s porabo 30 kWh. | Vidno obdobje »januar 2026« in vrednost 30 kWh. |
| 3 | Isti pomočnik preveri februarski tooltip s porabo 20 kWh. | Vidno obdobje »februar 2026« in vrednost 20 kWh. |
| 4 | Izbere januar; `assertDay` za 1. in 2. januar preveri 10/20 kWh prejete ter 0 kWh oddane energije. | Tooltip z natančnim datumom in vrednostmi obeh serij. |
| 5 | Izbere februar; preveri naslov obdobja, dve dnevni oznaki brez januarja ter 5/15 kWh prejete in 0 kWh oddane energije. | Datumi in vrednosti februarskih tooltipov; izključitev januarskih oznak. |
| Končno stanje | `assertFixturesUnchanged` pred čiščenjem preveri, da so polja štirih pripravljenih dnevnih dokumentov ostala nespremenjena. | Povratna primerjava pripravljenih dokumentov v emulatorju. |
| Čiščenje | Odstrani štiri dnevne dokumente ter morebitne privzete nastavitve, nastale pri obisku aplikacije, samo za ta UID. | Povratna primerjava z začetnim stanjem. |

Pomočnika `assertMonthlyValues` in `hoverLineDay` sta v [chart.ts](../../frontend/cypress/support/chart.ts). Izbirnik leta je prikazan tudi pri enem razpoložljivem letu, da se korak izbire lahko izvede z natančno predpisanimi podatki.

### TP-04 — [tp04-costs.cy.ts](../../frontend/cypress/e2e/tp04-costs.cy.ts)

| Korak | Implementirano dejanje in preverjanje | Dokazilo ob izvedbi |
| --- | --- | --- |
| Predpogoji | `prepareCase('TP-04')` neodvisno zapiše oba računa in preveri njune vrednosti v emulatorju. | Povratna primerjava januarskega in februarskega zapisa. |
| 1 | Odpre `/reciept-explanation`, preveri naslov in izbere januar 2026. | Vidni pregled in izbrano obdobje. |
| 2 | `assertInvoice` preveri ločeni označeni vrstici »Strošek energije« = 70 € in »Omrežnina« = 20 €. | Trditvi v ustreznih vrsticah tabele. |
| 3 | Preveri še skupaj brez DDV 100 €, prispevke 10 €, penale 0 € in DDV 22 €. | Štiri dodatne številčne primerjave. |
| 4 | Izbere februar in preveri 80/50/25/5/0/17,60 € v ustreznih šestih vrsticah; energija in omrežnina ne kažeta prejšnjih 70/20 €. | Vseh šest novih vrednosti in dodatni preverjanji odstranitve starih prikazov. |
| Končno stanje | `assertFixturesUnchanged` pred čiščenjem preveri nespremenjena polja obeh pripravljenih računov. | Povratna primerjava obeh računov v emulatorju. |
| Čiščenje | Odstrani oba testna računa in preveri povrnitev začetnega podatkovnega stanja. | Rezultat zaključnega hooka. |

### TP-05 — [tp05-simulation.cy.ts](../../frontend/cypress/e2e/tp05-simulation.cy.ts)

| Korak | Implementirano dejanje in preverjanje | Dokazilo ob izvedbi |
| --- | --- | --- |
| Predpogoji | Pripravi pet blokov po 4000 W in črpalko 0 W; po odprtju simulacije preveri prebrane nastavitve in nič izbranih naprav. | Primerjava odgovorov za dejansko pripravljeno stanje; `aria-pressed` ni nikjer `true`. |
| 1 | Izbere TV; `assertSimulation` preveri zahtevano napravo, vidnih 400 W/0,40 kW, dogovorjenih 4000 W in »V REDU«; preveri uspešno nalaganje tarife. | Dejanski odgovor simulacije in vidni rezultat. |
| 2 | Odznači TV, izbere sušilni stroj; po odgovorih simulacije in tarife preveri 4000 W/4,00 kW in »V REDU«. | Stanje gumbov in rezultat na meji. |
| 3 | Doda TV; po odgovorih simulacije in tarife preveri obe napravi, 4400 W/4,40 kW in »PREKORAČITEV«. | Stanje gumbov in rezultat nad mejo. |
| 4 | `hoverBar` odpre tooltip obeh stolpcev: »Dogovorjena moč« 4 kW in »Poraba« 4,4 kW. | Dejansko vidna naslova in vrednosti primerjalnega grafa. |
| 5 | Odznači sušilni stroj; po odgovorih simulacije in tarife preveri, da ostane TV, skupna moč 400 W/0,40 kW in status »V REDU«. | Ponovni odgovor in prikaz pod mejo. |
| Čiščenje | Odznači TV, preveri izginotje rezultata; helper obnovi začetno stanje nastavitev, pri novem uporabniku njuno odsotnost. | Stanje UI in povratna primerjava baze po čiščenju. |

## Rezultati in vključitev v cevovod

[Konfiguracija Cypressa](../../frontend/cypress.config.ts) uporablja namizni prikaz 1440 × 1000. Vsaka izvedba dobi `runId`: privzeto iz časa začetka, v GitHub Actions pa `ci-<run_id>-<run_attempt>`. Spremenljivka `E2E_RUN_ID` omogoča lastno enkratno oznako.

| Izhod | Mesto in namen |
| --- | --- |
| JUnit XML | `frontend/cypress/results/<runId>/junit-[hash].xml`; rezultat, trajanje in morebitna napaka posameznega testa. Hash prepreči prepis poročil različnih skript znotraj iste izvedbe. |
| Konzola | Izpis runnerja in reporterja z `toConsole: true`; v CI je v dnevniku koraka za Cypress. |
| Podatki o okolju | `frontend/cypress/results/<runId>/environment.json`: commit, podatek o spremembah delovnega drevesa glede na commit, Node, platforma in čas začetka. |
| Povzetek izvedbe | `frontend/cypress/results/<runId>/summary.json`: različica Cypressa in brskalnika, začetek/konec ter število uspešnih, neuspešnih, čakajočih in preskočenih testov. |
| Video | `frontend/cypress/videos/<runId>/`; video posamezne skripte pri `cypress run`. |
| Posnetek napake | `frontend/cypress/screenshots/<runId>/`; samodejni posnetki ob neuspehu. Mapa pri uspešni izvedbi lahko manjka. |
| Dnevniki aplikacije v CI | `frontend/cypress/results/docker-compose.log`; zbrani tudi ob neuspehu testov. |

[Cevovod GitHub Actions](../../.github/workflows/e2e.yml) se sproži ob `push` na katerokoli vejo in ob odprtju, posodobitvi ali ponovnem odprtju pull requesta. Zaporedje je:

1. Prevzem kode, Node.js 22, namestitev zaklenjenih odvisnosti, gradnja frontenda in preverjanje Cypressa.
2. Zagon celotne aplikacije z Docker Compose ter čakanje na zdravje storitev in dosegljivost aplikacije.
3. `npm run smoke` za osnovno preverjanje storitev in shrambe.
4. `docker compose exec -T parser python -m unittest discover -s tests -v` za pet regresijskih testov parserja CSV/XLSX; rezultati so v dnevniku tega koraka.
5. `npm --prefix frontend run test:e2e` za pet funkcionalnih primerov in obstoječe Cypress teste.
6. Zajem dnevnikov, objava dokazil z `if: always()` in ustavitev vsebnikov, tudi kadar testi ne uspejo.

Neuspešen Cypress test pomeni neuspešen korak cevovoda. Dokazila so pripeta izvedbi Actions kot **`cypress-evidence-<run_id>-<run_attempt>`** in se hranijo **14 dni**. Testi uporabljajo lokalne emulatorje in za te funkcionalne primere ne potrebujejo produkcijskih Firebase poverilnic ali Cypress Cloud računa. Obstoječi ločeni workflow za analizo kakovosti ostane samostojen.

## Evidenca dejanske izvedbe in pregled uporabnika

Avtomatizirane skripte je pripravil in 26. 10. 2026 izvedel agent UI. Lokalna izvedba celotnega nabora je bila uspešna: **21/21 testov**, brez napak ali preskočenih testov. Ponovitev TP-01–TP-05 je uspela **5/5**, vsak primer pa tudi v samostojnem procesu. Uspešni so še gradnja frontenda, preverjanje namestitve Cypressa, smoke test in vseh **5 regresijskih testov parserja**.

Dokazila so shranjena v [mapi izvedbe](dokazila/cypress-2026-10-26/): [celoten nabor](dokazila/cypress-2026-10-26/celoten-nabor/summary.json), [ponovitev](dokazila/cypress-2026-10-26/ponovitev-tp/summary.json), JUnit XML in metapodatki vsakega samostojnega zagona. Testirana je bila delovna različica nad commitom `1adc3ec9f84201d8c525769ba93bf6cab992e314`; [SHA-256 manifest](dokazila/cypress-2026-10-26/source-sha256.json) določa vsebino spremenjenih testnih in aplikacijskih datotek. Okolje: macOS ARM64, Node.js 23.11.0, Cypress 14.3.3 in Electron 130.0.6723.137. Cevovod uporablja Node.js 22.

| Primer | Datum in izvajalec | Različica / brskalnik | Dejanski rezultat | Status | Dokazilo |
| --- | --- | --- | --- | --- | --- |
| TP-01 | 26. 10. 2026, agent UI | Delovna različica zgoraj / Electron 130 | Vse postavke in opomba pravilne tudi po osvežitvi | Uspešno | [Samostojna izvedba](dokazila/cypress-2026-10-26/samostojni-tp01/summary.json) |
| TP-02 | 26. 10. 2026, agent UI | Delovna različica zgoraj / Electron 130 | Uvoz in prikaz 12/1/11 kWh, enako po osvežitvi | Uspešno | [Samostojna izvedba](dokazila/cypress-2026-10-26/samostojni-tp02/summary.json) |
| TP-03 | 26. 10. 2026, agent UI | Delovna različica zgoraj / Electron 130 | Vsoti 30/20 kWh, pravilni dnevni podatki, baza nespremenjena | Uspešno | [Samostojna izvedba](dokazila/cypress-2026-10-26/samostojni-tp03/summary.json) |
| TP-04 | 26. 10. 2026, agent UI | Delovna različica zgoraj / Electron 130 | Vseh šest postavk pravilnih za oba meseca, baza nespremenjena | Uspešno | [Samostojna izvedba](dokazila/cypress-2026-10-26/samostojni-tp04/summary.json) |
| TP-05 | 26. 10. 2026, agent UI | Delovna različica zgoraj / Electron 130 | Meje 400/4000/4400/400 W, statusi in graf 4/4,4 kW pravilni | Uspešno | [Samostojna izvedba](dokazila/cypress-2026-10-26/samostojni-tp05/summary.json) |

Pri prvem preverjanju sta bili odpravljeni napaki testne infrastrukture: avtentikacijske zahteve ne uporabljajo Firestore skrbniške glave, TP-05 pa po vsaki simulaciji počaka tudi na prikaz tarife, da ponovno risanje grafa ne prekine preverjanja tooltippa. Končna dokazila zgoraj so iz uspešnih izvedb po popravkih. Človeški pregled skript je še odprt.

Pri neskladju navedi številko koraka, dejanski rezultat, poročilo/posnetek ter povezavo do napake. Napaka priprave se evidentira kot blokiran primer; neuspeh funkcionalne trditve kot neuspešen primer. Cypressova tehnična oznaka v obeh primerih lahko pomeni neuspeh, zato je razlaga v evidenci pomembna. Če je `workingTreeDirty: true`, commit sam ne predstavlja vseh testiranih sprememb; priloži tudi uporabljeno delovno različico oziroma diff.

Naslednji seznam je namenjen **uporabnikovemu pregledu**. Agent ga ne označuje namesto uporabnika:

- [ ] Primerjal/-a sem vseh pet skript s pregledanimi TP-01–TP-05 in matriko zgoraj.
- [ ] Preveril/-a sem predpogoje, natančne podatke, vse korake ter čiščenje vsakega primera.
- [ ] Preveril/-a sem, da trditve zajamejo pričakovane vrednosti in stanja uporabniškega vmesnika.
- [ ] Preveril/-a sem selektorje, čakanje na dogodke oziroma elemente in neodvisnost testov.
- [ ] Pregledal/-a sem dejansko lokalno izvedbo, samostojen zagon primerov in ponovljivost.
- [ ] Pregledal/-a sem izvedbo GitHub Actions ter prenesel/-la ustrezna dokazila.

| Podatek o človeškem pregledu | Vrednost |
| --- | --- |
| Pregledal/-a | — |
| Datum | — |
| Pregledani commit / delovna različica | — |
| Ugotovitve in zahtevani popravki | — |
