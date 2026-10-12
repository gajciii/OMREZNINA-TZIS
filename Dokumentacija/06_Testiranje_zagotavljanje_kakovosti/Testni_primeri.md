# Omrežnina+ – funkcionalni testni primeri

| Podatek | Vrednost |
| --- | --- |
| Različica dokumenta | 4.0 – Markdown različica po dokumentu Testni primeri.docx |
| Datum priprave | 12. 10. 2026 |
| Avtor testnih primerov | ChatGPT – agent UI |
| Vrsta testiranja | Ročno funkcionalno testiranje prek uporabniškega vmesnika |
| Izhodišče | [SZPO: zahteve, uporabniški poteki in priprava](SZPO_priprava_testiranja.md) |
| Okolje | Lokalna aplikacija, zaledje in emulatorja Firebase Auth ter Firestore |
| Skupni predpogoji | Delujoča aplikacija in prijavljen namenski testni uporabnik; priprava P-01 iz SZPO |
| Začetni status TP-01–TP-05 | Izvedba ni potrjena |

Dokument vsebuje pet primerov za glavne funkcionalnosti iz dokumenta `00_Funkcionalnosti_user_stories`. Prijava je predpogoj. Obstoječi avtomatizirani testi projekta so bili izvajani, vendar njihova poročila ne dokazujejo izvedbe vsakega koraka teh petih primerov z navedenimi podatki.

Pred izvedbo preberi uporabniške poteke in pripravo P-01–P-05 v povezanem SZPO. Vsak primer je samostojen; ne predpostavlja uspešne izvedbe drugih primerov. Številke F-01, F-02 itd. ustrezajo poglavjem izvornega dokumenta funkcionalnosti.

## TP-01: Ročni vnos in shranjevanje računa

| Atribut | Vsebina |
| --- | --- |
| Funkcionalnosti | F-06 – ročni vnos podatkov; F-02 – prikaz stroškov |
| Zahteve in poteki SZPO | Z-01, Z-04; UP-01, UP-04 |
| Namen | Preveriti shranjevanje veljavnih podatkov računa in njihovo obstojnost po osvežitvi. |
| Prioriteta | Visoka |
| Vrsta scenarija | Pozitiven |
| Priprava | P-01 in P-02; za testnega uporabnika ne obstaja račun za januar 2026. |
| Testni podatki | Januar 2026; skupaj brez DDV 100 €; energija 70 €; omrežnina 20 €; prispevki 10 €; penali 0 €; DDV 22 €; opomba »Testni račun TP-01«. |
| Status | Izvedba ni potrjena |

| Korak | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri `/upload-reciept`. | Prikaže se obrazec »Ročni vnos podatkov računa« s polji za obdobje in podatke računa. |
| 2 | Izberi januar 2026 in izpolni navedene podatke. | Obrazec vsebuje vneseno obdobje, zneske in opombo. |
| 3 | Klikni »Shrani račun«. | Prikaže se »Račun uspešno vnešen!«. |
| 4 | Odpri `/reciept-explanation` in izberi januar 2026. | Prikazani so znesek brez DDV 100 €, energija 70 €, omrežnina 20 €, prispevki 10 €, penali 0 €, DDV 22 € in opomba »Testni račun TP-01«. |
| 5 | Osveži stran in ponovno izberi januar 2026. | Račun je še vedno dostopen z enakimi vrednostmi in opombo. |

**Končno stanje:** račun je shranjen pri testnem uporabniku za januar 2026.

**Čiščenje:** odstrani samo zapis računa, ustvarjen s tem primerom; ne celotnega uporabniškega računa. Evidenco izvedbe izpolni v razdelku »Zapis izvedbe«.

## TP-02: Uvoz dnevnih stanj iz datoteke CSV

| Atribut | Vsebina |
| --- | --- |
| Funkcionalnosti | F-06 – uvoz podatkov; F-01 – prikaz mesečne porabe |
| Zahteve in potek SZPO | Z-02, Z-03; UP-02 |
| Namen | Preveriti obdelavo, shranjevanje in prikaz podatkov iz podprtega CSV. |
| Prioriteta | Visoka |
| Vrsta scenarija | Pozitiven |
| Priprava | P-01 in P-03; brez podatkov o porabi za januar 2025; pripravljena datoteka `poraba_tp02.csv`. |
| Testni podatki | Dve kumulativni stanji: prejeta energija 100 → 112 kWh; oddana energija 0 → 1 kWh. |
| Status | Izvedba ni potrjena |

Točna vsebina sintetične datoteke `poraba_tp02.csv` v kodiranju UTF-8:

```csv
Datum,Prejeta delovna energija ET,Oddana delovna energija ET
2025-01-01,100,0
2025-01-02,112,1
```

Referenčni izračun: prejeta energija = 112 − 100 = **12 kWh**; oddana energija = 1 − 0 = **1 kWh**; neto poraba = 12 − 1 = **11 kWh**. Te vrednosti veljajo za navedeni vzorec, ne za poljubno datoteko iz MojElektro.

| Korak | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri `/upload-data` in izberi »Naloži dnevna stanja«. | Prikaže se obrazec za izbiro datoteke. |
| 2 | Izberi `poraba_tp02.csv` in klikni »Naloži csv ali excel«. Počakaj na zaključek obdelave. | Datoteka se sprejme in obdela brez sporočila o napaki. |
| 3 | Odpri `/monthly-consumption` in izberi leto 2025. | Na voljo so podatki za januar 2025. |
| 4 | V grafu oziroma podrobnem prikazu preveri januarske vrednosti. | Prejeta energija je 12 kWh, oddana energija 1 kWh, poraba pa 11 kWh. |
| 5 | Osveži stran in znova izberi isto obdobje. | Vrednosti so še vedno 12, 1 in 11 kWh; niso podvojene ali izgubljene. |

**Končno stanje:** podatki iz CSV so shranjeni pri testnem uporabniku.

**Čiščenje:** odstrani samo dnevne dokumente, ustvarjene s tem uvozom, in pripadajočo evidenco testnega uvoza, če jo sistem ustvari. Izpolni zapis izvedbe.

## TP-03: Pravilen prikaz mesečne porabe elektrike

| Atribut | Vsebina |
| --- | --- |
| Funkcionalnost | F-01 – prikaz mesečne porabe elektrike |
| Zahteva in potek SZPO | Z-03; UP-03 |
| Namen | Preveriti mesečne vsote in izbiro dnevnih podatkov po mesecih. |
| Prioriteta | Visoka |
| Vrsta scenarija | Pozitiven |
| Priprava | P-01 in P-04; štirje vnaprej pripravljeni dnevni zapisi, brez drugih podatkov za leto 2026. |
| Testni podatki | 1. januar 10 kWh; 2. januar 20 kWh; 1. februar 5 kWh; 2. februar 15 kWh. Oddana energija je vedno 0 kWh. |
| Status | Izvedba ni potrjena |

Podatki pomenijo dnevno energijo, ne kumulativnih stanj. Točna polja in poti dokumentov za neodvisno pripravo so navedeni v P-04 SZPO. Referenčni vsoti sta **30 kWh za januar** in **20 kWh za februar**.

| Korak | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri `/monthly-consumption` in izberi leto 2026. | Graf vsebuje januar in februar 2026. |
| 2 | Preveri januarsko porabo v grafu oziroma njegovem podrobnem prikazu. | Januarska poraba je 30 kWh. |
| 3 | Preveri februarsko porabo. | Februarska poraba je 20 kWh. |
| 4 | V prikazu porabe po dnevih izberi januar. | Za 1. januar je prikazanih 10 kWh, za 2. januar 20 kWh prejete energije; oddana energija je 0 kWh. |
| 5 | Izberi februar. | Za 1. februar je prikazanih 5 kWh, za 2. februar 15 kWh prejete energije; oddana energija je 0 kWh. Januarski podatki niso vključeni v februarski dnevni prikaz. |

**Končno stanje:** prikazano je izbrano obdobje; shranjeni podatki ostanejo nespremenjeni.

**Čiščenje:** odstrani štiri dnevne dokumente, pripravljene za ta primer. Izpolni zapis izvedbe.

## TP-04: Ločen prikaz stroškov energije in omrežnine

| Atribut | Vsebina |
| --- | --- |
| Funkcionalnost | F-02 – vizualizacija stroškov omrežnine in električne energije |
| Zahteva in potek SZPO | Z-04; UP-04 |
| Namen | Preveriti ločene stroškovne postavke in pravilne vrednosti ob spremembi obdobja. |
| Prioriteta | Srednja |
| Vrsta scenarija | Pozitiven |
| Priprava | P-01 in P-02; oba računa sta pripravljena vnaprej in preverjena v emulatorju; TP-01 ni predpogoj. |
| Status | Izvedba ni potrjena |

| Postavka | Januar 2026 | Februar 2026 |
| --- | --- | --- |
| Skupaj brez DDV | 100 € | 80 € |
| Energija | 70 € | 50 € |
| Omrežnina | 20 € | 25 € |
| Prispevki | 10 € | 5 € |
| Penali | 0 € | 0 € |
| DDV | 22 € | 17,60 € |

| Korak | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri `/reciept-explanation` in izberi januar 2026. | Prikaže se januarski račun. |
| 2 | Preglej »Strošek energije« in »Omrežnina«. | Postavki sta ločeni in označeni; prikazujeta 70 € in 20 €. |
| 3 | Preveri preostale zneske. | Znesek brez DDV je 100 €, prispevki 10 €, penali 0 € in DDV 22 €. |
| 4 | Preklopi na februar 2026 in preveri vse postavke. | Energija je 50 €, omrežnina 25 €, skupaj brez DDV 80 €, prispevki 5 €, penali 0 € in DDV 17,60 €. Januarske vrednosti ne ostanejo prikazane. |

Pri denarnih zneskih primerjaj številčno vrednost: zapis `17.6 €` je za ta primer enakovreden `17,60 €`. Oblikovanje decimalnega zapisa ni predmet tega testa.

**Končno stanje:** prikazan je februarski račun; podatki obeh računov ostanejo nespremenjeni.

**Čiščenje:** odstrani oba testna zapisa računov. Izpolni zapis izvedbe.

## TP-05: Simulacija uporabe naprav in zaznava prekoračitve

| Atribut | Vsebina |
| --- | --- |
| Funkcionalnosti | F-03 – simulacija porabe; F-05 – spremljanje prekoračitev |
| Zahtevi in potek SZPO | Z-05, Z-06; UP-05 |
| Namen | Preveriti seštevanje moči, primerjalni graf in status pod mejo, na meji ter nad njo. |
| Prioriteta | Visoka |
| Vrsta scenarija | Mejno testiranje |
| Priprava | P-01 in P-05; 4 kW v vseh blokih; toplotna črpalka prispeva 0 W; nobena naprava ni izbrana. |
| Testni podatki | TV 400 W; sušilni stroj 4000 W; dogovorjena moč 4000 W. |
| Status | Izvedba ni potrjena |

| Korak | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri `/simulate-power` in izberi samo TV. Počakaj na posodobitev rezultata. | Skupna moč je 400 W oziroma 0,40 kW; dogovorjena moč 4000 W; status »V REDU«. |
| 2 | Odznači TV in izberi samo sušilni stroj. | Skupna moč je 4000 W oziroma 4,00 kW; status ostane »V REDU«. |
| 3 | Ob izbranem sušilnem stroju dodaj TV. | Skupna moč je 4400 W oziroma 4,40 kW; status se spremeni v »PREKORAČITEV«. |
| 4 | Preveri primerjalni graf. | Graf prikazuje dogovorjeno moč 4 kW in moč izbranih naprav 4,4 kW. |
| 5 | Odznači sušilni stroj in počakaj na posodobitev. | Ostane samo TV; skupna moč je 400 W oziroma 0,40 kW; status se vrne na »V REDU«. |

**Končno stanje:** izbran ostane samo TV. Zneski tarif in stroški prekoračitve niso predmet tega primera.

**Čiščenje:** odznači TV ter obnovi prvotne nastavitve dogovorjene moči in toplotne črpalke. Izpolni zapis izvedbe.

## Matrika sledljivosti

X pomeni, da primer preverja vsaj del funkcionalnosti. Oznaka ne pomeni uspešne izvedbe ali popolne pokritosti funkcionalnosti.

| ID | Funkcionalnost | TP-01 | TP-02 | TP-03 | TP-04 | TP-05 |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| F-01 | Prikaz mesečne porabe elektrike | — | X | X | — | — |
| F-02 | Vizualizacija stroškov omrežnine in električne energije | X | — | — | X | — |
| F-03 | Simulacija porabe | — | — | — | — | X |
| F-05 | Spremljanje prekoračitev | — | — | — | — | X |
| F-06 | Ročni vnos podatkov ali uvoz iz mojelektro.si | X | X | — | — | — |

| Primer | Zahteve SZPO | Obseg preverjanja |
| --- | --- | --- |
| TP-01 | Z-01, Z-04 | Shranjevanje računa, pravilen prikaz in obstojnost podatkov |
| TP-02 | Z-02, Z-03 | Obdelava CSV in prikaz uvoženih vrednosti |
| TP-03 | Z-03 | Mesečne vsote in izbira dnevnega prikaza |
| TP-04 | Z-04 | Ločene stroškovne postavke in preklop obdobja |
| TP-05 | Z-05, Z-06 | Moč izbranih naprav, graf in opozorilo o prekoračitvi |

Izbrane funkcionalnosti so pokrite delno. F-02 se preverja prek tabele računa, F-03 prek moči naprav in F-05 prek simulirane prekoračitve. F-04 (napoved mesecev prekoračitev), F-07 (OCR) in F-08 (optimalna moč) nimajo testnih primerov v tem dokumentu.

## Zapis izvedbe

Za vsako dejansko izvedbo shrani ločeno kopijo evidence. Trenutno dejanski rezultati teh petih primerov niso vpisani.

| Primer | Izvajalec | Datum | Commit / različica aplikacije in brskalnik | Dejanski rezultat | Status | Dokazilo / napaka |
| --- | --- | --- | --- | --- | --- | --- |
| TP-01 | — | — | — | Ni zabeležen | Izvedba ni potrjena | — |
| TP-02 | — | — | — | Ni zabeležen | Izvedba ni potrjena | — |
| TP-03 | — | — | — | Ni zabeležen | Izvedba ni potrjena | — |
| TP-04 | — | — | — | Ni zabeležen | Izvedba ni potrjena | — |
| TP-05 | — | — | — | Ni zabeležen | Izvedba ni potrjena | — |

Ob izvedbi uporabi »Uspešno«, »Neuspešno« ali »Blokirano«. Navedi odstopanja po korakih. Pri uspešnem primeru potrdi ujemanje vseh pričakovanih rezultatov. Obstoječih rezultatov drugih avtomatiziranih testov ne prepisuj kot rezultate teh primerov.

## Končni konsolidirani ukaz za agent UI

Spodnji ukaz združuje zahteve in popravke iz priprave gradiva; ni dobesedni prepis enega zgodovinskega sporočila.

> Na podlagi dokumenta 00_Funkcionalnosti_user_stories, povezanega SZPO_priprava_testiranja.md in trenutne aplikacije Omrežnina+ pripravi natanko pet funkcionalnih testnih primerov: ročni vnos računa, uvoz dnevnih stanj CSV, prikaz mesečne porabe, ločen prikaz stroškov ter simulacijo moči z zaznavo prekoračitve. Prijavo obravnavaj kot predpogoj. Za vsak primer navedi ID, naslov, funkcionalnosti, zahteve in uporabniške poteke SZPO, namen, prioriteto, vrsto scenarija, pripravo, predpogoje, natančne podatke, oštevilčene korake s pričakovanim rezultatom pri vsakem koraku, končno stanje, čiščenje ter status. Dodaj skupne metapodatke in evidenco za izvajalca, datum, različico aplikacije, dejanski rezultat in dokazila. Primeri naj bodo neodvisni; razlikuj moč od energije, kumulativna stanja od dnevnih vrednosti in znesek brez DDV od DDV. Za CSV navedi točno vsebino sintetične datoteke. Pri simulaciji preveri vrednosti pod mejo, na meji in nad njo ter izključi dodatni prispevek toplotne črpalke. Uporabi merljive pričakovane rezultate, ki ustrezajo aplikaciji. Izvedbe brez dokazil ne označi kot uspešne ali neuspešne; uporabi »Izvedba ni potrjena«. Dodaj matriko sledljivosti, pojasni delno pokritost in navedi, katere funkcionalnosti niso zajete.

## Komentar pregleda in dopolnitev

Prvotni izbor se je preveč osredotočal na prijavo in registracijo. Navodilo je bilo dopolnjeno z zahtevo, naj primeri izhajajo iz glavnih funkcionalnosti dokumenta 00_Funkcionalnosti. Dodani so bili povezave na zahteve in predhodne poteke SZPO, natančna priprava podatkov ter merljivi rezultati. Splošna oznaka »Ni izvedeno« je bila nadomeščena z »Izvedba ni potrjena«, ker projekt že vsebuje poročila drugih izvedenih testov. Popravljena je bila tudi trditev o pokritosti: pet primerov preverja samo izbrane dele funkcionalnosti.

Predlog za lastne dopolnitve po pregledu: dodati primere neveljavnega CSV, manjkajočih in negativnih zneskov, praznega obdobja ter preverjanje izračuna cen simulacije. Za širšo pokritost bi bilo treba posebej pripraviti primere za OCR, napoved prekoračitev in optimalno moč. Ti predlogi niso dodatni izvedeni testni primeri.
