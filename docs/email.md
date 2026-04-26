# E-mail odosielanie

Aktuálna verzia detailu zápasu používa pre ikonu e-mailu predvyplnený `mailto:` odkaz:

- dostupný je len pre admina
- príjemca je aktívny `owner` alebo `coach`
- obsah e-mailu sa skladá z výsledku a zoznamu hráčov v družstvách

To znamená, že sa zatiaľ otvorí lokálny poštový klient v počítači alebo v prehliadači. Reálne serverové odosielanie cez SMTP ešte nie je zapojené.

## Budúce SMTP nastavenie

Keď budeme prechádzať na serverové odosielanie, nastavovať sa to bude v súbore `.env.local`:

```env
SMTP_HOST=smtp.tvoja-domena.sk
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tvoj_smtp_ucet
SMTP_PASSWORD=tvoje_smtp_heslo
MAIL_FROM="Volejbal Tatry <noreply@tvoja-domena.sk>"
```

Význam premenných:

- `SMTP_HOST` - adresa SMTP servera
- `SMTP_PORT` - port, najčastejšie `587` alebo `465`
- `SMTP_SECURE` - `true` pre implicit TLS, inak `false`
- `SMTP_USER` - prihlasovacie meno do SMTP
- `SMTP_PASSWORD` - heslo do SMTP
- `MAIL_FROM` - adresa odosielateľa

## Ďalší krok

Pri napojení reálneho SMTP pribudne:

- server action alebo API route na odoslanie e-mailu
- HTML šablóna, aby výsledok vyzeral podobne ako v detaile zápasu
- rozšírenie príjemcov aj na hráčov, ktorí v danom zápase hrali
