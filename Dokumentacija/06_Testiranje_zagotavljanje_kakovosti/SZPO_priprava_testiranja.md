# Omrežnina+ – specifikacija zahtev in priprava testiranja

| Podatek | Vrednost |
| --- | --- |
| Vrsta dokumenta | Delna specifikacija zahtev programske opreme (SZPO) za izbrani obseg testiranja |
| Različica | 1.0 |
| Datum | 12. 10. 2026 |
| Pripravil | ChatGPT – agent UI |
| Povezani dokument | [Testni primeri in matrika sledljivosti](Testni_primeri.md) |

## 1. Namen in izhodišča

Dokument opredeljuje zahteve, uporabniške poteke in pripravo okolja, iz katerih izhajajo testni primeri TP-01–TP-05. Vrstni red načrtovanja je: funkcionalnost → zahteva → uporabniški potek → priprava podatkov → testni primer → evidentiranje rezultata.

Osnova je dokument [Funkcionalnosti in uporabniške zgodbe](../00_Funkcionalnosti_user_stories/Funkcionalnosti_user_stories.docx). Podrobnosti obrazcev, poti in podatkov so usklajene s trenutno izvorno kodo. Ta dokument je naknadno pripravljena podrobnejša specifikacija za testiranje, ne izvorni SZPO celotnega projekta.

## 2. Obseg in uporabniki

Glavni uporabnik je gospodinjski odjemalec, ki vnaša račune, uvaža meritve, pregleduje porabo in stroške ter simulira uporabo električnih naprav. Izvajalec testiranja pripravi testni račun in podatke ter preveri odzive aplikacije.

| ID | Funkcionalnost iz izvornega dokumenta | Obseg te specifikacije |
| --- | --- | --- |
| F-01 | Prikaz mesečne porabe elektrike, poglavje 1 | Mesečne vsote in pregled dnevnih podatkov za izbrano obdobje |
| F-02 | Vizualizacija stroškov omrežnine in električne energije, poglavje 2 | Tabelarični prikaz stroškovnih postavk računa |
| F-03 | Simulacija porabe, poglavje 3 | Seštevanje moči izbranih naprav in primerjalni graf |
| F-05 | Spremljanje prekoračitev, poglavje 5 | Opozorilo pri simulirani prekoračitvi dogovorjene moči |
| F-06 | Ročni vnos podatkov ali uvoz iz mojelektro.si, poglavje 6 | Ročni vnos računa in uvoz podprte datoteke CSV z dnevnimi stanji |

Prijava je predpogoj. Pet izbranih primerov ne pokriva napovedovanja prekoračitev, OCR, optimalne moči, celotne zgodovine prekoračitev, izračuna cen simulacije ali vseh neveljavnih vnosov. Specifikacija zato ne pomeni popolne pokritosti projekta.

## 3. Podatki in pravila

- Denarni zneski so v EUR. Polje »Znesek skupaj« pomeni znesek **brez DDV**, DDV se vnese posebej.
- Energija je izražena v kWh, moč pa v W oziroma kW; 1000 W = 1 kW. Prikaz moči naprave ni isto kot mesečna poraba energije.
- CSV vsebuje kumulativna stanja števca. Razlika med zaporednima stanjema pomeni prejeto oziroma oddano energijo intervala. Za uporabljeni testni vzorec je neto poraba razlika med prejeto in oddano energijo.
- V TP-03 se uporabijo že pripravljene dnevne vrednosti, ne kumulativna stanja. Mesečna poraba je vsota dnevnih vrednosti v istem mesecu.
- Moč, ki je enaka dogovorjeni moči, ne predstavlja prekoračitve. Prekoračitev nastopi, ko je skupna moč strogo večja od dogovorjene.
- V simulacijskem primeru je moč toplotne črpalke 0 W, da ne vpliva na pričakovani rezultat.

## 4. Funkcionalne zahteve in merila sprejema

| Zahteva | Povezava | Zahtevano vedenje in merilo sprejema |
| --- | --- | --- |
| Z-01 | F-06 | Sistem omogoča ročni vnos obdobja, stroškovnih postavk in opombe ter shranjevanje računa pri uporabniku. Po shranjevanju prikaže potrditev; račun ostane dostopen po osvežitvi. |
| Z-02 | F-06 | Sistem obdela podprti CSV z dnevnimi stanji in shrani izpeljane podatke. Za stanja prejete energije 100 → 112 kWh in oddane 0 → 1 kWh so rezultati 12 kWh prejete, 1 kWh oddane in 11 kWh neto energije. |
| Z-03 | F-01 | Sistem prikaže mesečne in dnevne podatke izbranega obdobja. Za dnevni vrednosti 10 in 20 kWh v januarju prikaže 30 kWh, za 5 in 15 kWh v februarju pa 20 kWh. |
| Z-04 | F-02 | Sistem prikaže ločene označene postavke energije, omrežnine, prispevkov, penalov, zneska brez DDV in DDV. Ob spremembi obdobja se vse vrednosti posodobijo na izbrani račun. |
| Z-05 | F-03 | Sistem po izbiri oziroma odstranitvi naprave posodobi skupno moč in graf. TV 400 W in sušilni stroj 4000 W skupaj pomenita 4400 W oziroma 4,40 kW. |
| Z-06 | F-05 | Pri dogovorjeni moči 4000 W sistem za 400 W in 4000 W prikaže »V REDU«, za 4400 W pa »PREKORAČITEV«. Po zmanjšanju pod mejo se status vrne na »V REDU«. |

## 5. Uporabniški poteki pred oblikovanjem testnih primerov

### UP-01: Ročni vnos računa

**Zahteva:** Z-01. **Predpogoj:** prijavljen uporabnik in izbrano obdobje brez obstoječega računa.

1. Uporabnik odpre obrazec za ročni vnos računa (`/upload-reciept`).
2. Izbere leto in mesec ter vnese stroškovne postavke in opombo.
3. Zahteva shranjevanje z gumbom »Shrani račun«.
4. Sistem shrani račun in prikaže potrditev.
5. Uporabnik odpre pregled računa ter preveri shranjene podatke.

**Končno stanje:** račun je shranjen za uporabnika in obdobje. Konkretne vnose in preverjanje obstojnosti določa TP-01.

### UP-02: Uvoz dnevnih stanj

**Zahtevi:** Z-02, Z-03. **Predpogoj:** pripravljena datoteka podprtega formata in prazno ciljno obdobje.

1. Uporabnik odpre `/upload-data` in izbere »Naloži dnevna stanja«.
2. Izbere datoteko CSV in klikne »Naloži csv ali excel«.
3. Sistem obdela stanja števca in shrani podatke o energiji.
4. Uporabnik odpre `/monthly-consumption` in izbere leto uvoženih podatkov.
5. Sistem prikaže vrednosti za ustrezni mesec.

**Končno stanje:** uvoženi podatki so dostopni v pregledu porabe. Natančno vsebino datoteke in izračune določa TP-02.

### UP-03: Pregled mesečne in dnevne porabe

**Zahteva:** Z-03. **Predpogoj:** pripravljeni dnevni podatki za več mesecev.

1. Uporabnik odpre `/monthly-consumption`.
2. Izbere leto; sistem prikaže mesečne vsote tega leta.
3. Uporabnik preveri mesečne vrednosti v grafu oziroma njegovem podrobnem prikazu.
4. V dnevnem prikazu izbere mesec.
5. Sistem pokaže dnevne podatke izbranega meseca in jih ob novi izbiri posodobi.

**Končno stanje:** uporabnik vidi izbrano obdobje; shranjeni podatki se ne spremenijo. Konkretne vsote določa TP-03.

### UP-04: Pregled stroškov računa

**Zahteva:** Z-04. **Predpogoj:** pripravljena računa za dve različni obdobji.

1. Uporabnik odpre »Račun na kratko« (`/reciept-explanation`).
2. Izbere leto in mesec.
3. Sistem prikaže posamezne stroškovne postavke in zneske.
4. Uporabnik izbere drug mesec.
5. Sistem nadomesti prikazane vrednosti s podatki novega obdobja.

**Končno stanje:** prikazan je izbrani račun; shranjeni računi ostanejo nespremenjeni. Primerjavo vrednosti določa TP-04.

### UP-05: Simulacija moči in prekoračitve

**Zahtevi:** Z-05, Z-06. **Predpogoj:** znana dogovorjena moč in nadzorovan prispevek toplotne črpalke.

1. Uporabnik odpre `/simulate-power`.
2. Izbere napravo; sistem izračuna skupno moč in status glede na dogovorjeno moč.
3. Uporabnik spremeni kombinacijo naprav.
4. Sistem posodobi moč, status in primerjalni graf.
5. Uporabnik odstrani napravo in preveri ponovni izračun.

**Različice poteka:** skupna moč je pod mejo, enaka meji ali nad njo. Vse tri preverja TP-05.

## 6. Priprava pred izvedbo testnih primerov

### P-01: Okolje in evidenca

1. Po [navodilih projekta](../../README.md) zaženi lokalni sistem z `docker compose up --build`.
2. Preveri dosegljivost aplikacije na `http://localhost:5173` in upravljalnega vmesnika emulatorjev na `http://localhost:4000`.
3. Zabeleži različico oziroma commit aplikacije, brskalnik, izvajalca in datum. Uporabi namizni prikaz, da so grafi in postavke pregledni.
4. Pripravi namenski testni račun s potrjeno e-pošto in se prijavi. Zabeleži njegov UID za pripravo in čiščenje podatkov.
5. Primere izvajaj neodvisno. Priprava TP-04 ne sme biti odvisna od uspešnega TP-01; podatke pripravi znova.

### P-02: Podatki za ročni vnos in pregled računov

- **TP-01:** preveri, da za testni račun ni računa za januar 2026.
- **TP-04:** pred izvedbo shrani oba računa iz podatkovne tabele TP-04. V emulatorju preveri dejanske vrednosti pri `<UID>/racuni/2026/01` in `<UID>/racuni/2026/02`, da napaka pri pripravi ne vpliva na oceno prikaza.
- Pripravljaj in odstranjuj samo podatke namenskega testnega uporabnika.

### P-03: Datoteka za uvoz

1. V urejevalniku besedila ustvari `poraba_tp02.csv` v kodiranju UTF-8.
2. Vanjo kopiraj točno vsebino, navedeno v TP-02, vključno z glavo stolpcev in vejicami.
3. Preveri, da testni uporabnik nima podatkov o porabi za januar 2025.

To je sintetičen testni vzorec podprtega formata, ne dokaz dejanskega izvoza iz portala MojElektro. Za poljuben pravi izvoz pričakovane vrednosti 12/1/11 kWh ne veljajo samodejno.

### P-04: Neodvisni dnevni podatki za mesečni graf

V lokalnem vmesniku Firestore pri testnem UID pripravi naslednje dokumente. Vrednosti polj morajo biti številskega tipa. Ciljna meseca ne smeta vsebovati drugih dnevnih dokumentov; za testno leto naj ne bo drugih podatkov.

| Pot dokumenta | `delta prejeta delovna energija et` | `delta oddana delovna energija et` | `poraba et` |
| --- | --- | --- | --- |
| `<UID>/poraba/2026-01/2026-01-01` | 10 | 0 | 10 |
| `<UID>/poraba/2026-01/2026-01-02` | 20 | 0 | 20 |
| `<UID>/poraba/2026-02/2026-02-01` | 5 | 0 | 5 |
| `<UID>/poraba/2026-02/2026-02-02` | 15 | 0 | 15 |

Priprava neposredno v emulatorju loči test prikaza TP-03 od testa uvoza TP-02. Po pripravi ponovno odpri stran s porabo, da se podatki naložijo.

### P-05: Nastavitve simulacije

1. Zabeleži prvotne nastavitve dogovorjene moči in toplotne črpalke testnega uporabnika.
2. Nastavi dogovorjeno moč vseh petih časovnih blokov na 4 kW. V dokumentu `<UID>/dogovorjena-moc` so vrednosti polj `1`–`5` shranjene v W, zato mora vsako znašati 4000.
3. Za testnega uporabnika nastavi moč toplotne črpalke na 0 kW. Če nastavitev pripravljaš v emulatorju, uporabi polje `power` dokumenta `<UID>/toplotna-crpalka`.
4. Preveri, da se simulacija in podatki o tarifi uspešno naložijo. Nobena naprava naj ne bo izbrana.
5. Pred začetkom preverjanja potrdi, da simulacija kaže dogovorjeno moč 4 kW in ne dodaja moči toplotne črpalke.

## 7. Povezava priprave s testnimi primeri

| Testni primer | Zahteve | Uporabniški potek | Priprava |
| --- | --- | --- | --- |
| TP-01 | Z-01, Z-04 | UP-01, UP-04 | P-01, P-02 |
| TP-02 | Z-02, Z-03 | UP-02 | P-01, P-03 |
| TP-03 | Z-03 | UP-03 | P-01, P-04 |
| TP-04 | Z-04 | UP-04 | P-01, P-02 |
| TP-05 | Z-05, Z-06 | UP-05 | P-01, P-05 |

## 8. Pogoji začetka, zaključka in zapis rezultatov

Primer se začne, ko je priprava zaključena in so njegovi predpogoji preverjeni. Če okolje ali podatki niso pripravljeni, se izvedba označi kot »Blokirano« in navede razlog.

Primer je uspešen samo, če se vsi pričakovani rezultati ujemajo z dejanskimi. Odstopanja se zabeležijo s številko koraka, dejanskim rezultatom, dokazilom in povezavo do napake. Po preverjanju se odstranijo samo podatki, ustvarjeni za primer, ter obnovijo spremenjene nastavitve.

Obstoječa poročila Maven v `backend/target/surefire-reports` ob pregledu vsebujejo 124 uspešno izvedenih testov brez napak in preskočenih testov. To ne potrjuje izvedbe vseh korakov novo dokumentiranih TP-01–TP-05. Njihov začetni status je »Izvedba ni potrjena«; zamenja se šele na podlagi konkretne evidence.

## 9. Viri

- [Funkcionalnosti in uporabniške zgodbe](../00_Funkcionalnosti_user_stories/Funkcionalnosti_user_stories.docx)
- [Navodila za lokalni zagon](../../README.md)
- [Obrazec za ročni vnos](../../frontend/src/components/forms/UploadReciept.tsx)
- [Uvoz dnevnih stanj](../../frontend/src/components/forms/UploadInvoice.tsx) in [obdelava meritev](../../python_helper/parser.py)
- [Prikaz porabe](../../frontend/src/components/dashboard/MonthlyConsumptionChart.tsx)
- [Pregled računa](../../frontend/src/components/dashboard/ReceiptExplanation.tsx)
- [Simulacija](../../frontend/src/views/simulation/SimulatePower.tsx)
