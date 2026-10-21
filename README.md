# Čupko

Naša razvojna verzija interaktivnog 3D čupavca iz projekta Puff.

## Šta je novo

- Čupkovo ime i jednostavne kontrole na našem jeziku.
- Četiri gotova izgleda, dužina krzna, kovrdžice i dugme za vjetrić.
- Detaljna podešavanja u zatvorenoj sekciji „Tatina radionica“ (nije roditeljska blokada).
- Preciznija provjera dodira pri pritisku i otpuštanju prsta.
- Pokretanje bez Unix komandi u npm skriptama.

## Pokretanje na laptopu

Uz instaliran Node.js 24, u terminalu otvorenom u ovom folderu:

```sh
npm ci
npm run dev
```

Otvori adresu koju terminal prikaže. Za probu lakšeg režima dodaj `?mode=webgl` na adresu.

## Provjere i objavljivanje

```sh
npm run build
npm run lint
```

Folder `dist` je spreman za statički hosting. U ZIP-u je i gotova izgrađena verzija; mora se posluživati preko web servera, ne dvoklikom na HTML. Kamera zahtijeva dozvolu i HTTPS (ili localhost).

Ovaj paket nije objavljen i ne mijenja postojeći AI Studio link. Rad bez interneta i instalacija kao aplikacije još nisu dodati. Nisu potrebni AI API ključevi za osnovnu igru.

## Status provjera

Build i TypeScript provjera prolaze. Završnu vizuelnu provjeru i reakciju 3D lika na pravom telefonu treba odraditi prije objave.

## Čupkove reakcije

Povlači prst ili miš sa pritisnutim dugmetom preko Čupka: on zadovoljno žmirka. Zvuk se posebno uključuje dugmetom „Uključi zvuk“ i može se odmah utišati. To je tih sintetizovan ton, bez mikrofona ili AI servisa.

Nakon 35 sekundi bez dodira počinje drijemati, a oko 45. sekunde zatvara oči. Dodir ga budi. Vrijeme pauzira dok je kartica skrivena. Spavanje ne mijenja boje, frizuru ili izabrano okruženje.
