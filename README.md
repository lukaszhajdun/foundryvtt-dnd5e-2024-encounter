📘 D&D 5e 2024 – Encounter Calculator

Zaawansowany kalkulator starć dla Foundry VTT 13+
Zgodny z zasadami 5e 2024



📖 Opis modułu

Encounter Calculator to nowoczesne narzędzie dla Dungeon Masterów, które pozwala łatwo budować, analizować i zapisywać starcia zgodnie z zasadami D&D 5e 2024.
Działa w pełni w Foundry VTT 13+, wykorzystując ApplicationV2, drag-and-drop, dynamiczne popupy, generatory skarbów oraz zaawansowane funkcje dostępności.

🚀 Funkcje modułu

⚔️ Budowanie encounterów przez drag-and-drop

📊 Automatyczne obliczanie trudności starcia

🧮 Analiza XP z uwzględnieniem ilości przeciwników

🎛 Trzy poziomy budżetu XP: Niska / Umiarkowana / Wysoka

👥 Obsługa:

PC,

NPC,

monsterów,

aktorów typu group (automatyczny import członków),

aktorów typu encounter (import wrogów).



🪙 Zaawansowana obsługa walut i skarbów:

ręczne wpisywanie walut,

rzuty kośćmi (dowolne formuły Foundry),

Individual Treasure,

Treasure Hoards,

czyszczenie walut przed generowaniem,

automatyczne przeliczanie na GP.



🧰 Zaawansowane tworzenie encounterów:

nazwa, opis, podsumowanie,

waluty,

przedmioty,

foldery (tworzone automatycznie),

wartość przedmiotów,

wartość całkowita encountera.



🧺 Auto-loot z potworów:

wszystkie przedmioty lub po jednym,

pomijanie zaklęć,

pomijanie naturalnych broni,

obsługa stackowania i wartości w GP.



🎨 Motywy i dostępność:

tryb Dark / Light / High Contrast / Custom,

zmienne CSS,

powiększanie czcionki (0.8–1.4),

tryb dostępności (większe odstępy i ramki),

pełna spójność kolorystyczna kalkulatora i popupów.

🛠 Instalacja

Umieść moduł w folderze:

foundrydata/Data/modules/dnd5e-2024-encounter


lub zainstaluj przez Manifest URL (gdy dodasz do repozytorium).

Włącz moduł w:

Game Settings → Manage Modules



🧭 Otwieranie kalkulatora

W panelu narzędzi po lewej stronie pojawia się nowy przycisk:

Encounter Calculator

Kliknięcie otwiera okno kalkulatora.

🖱️ Przeciąganie aktorów

Do kolumn można przeciągnąć:

aktorów ze sceny,

aktorów z Actor Directory,

z kompedyjów,

aktorów typu group (automatycznie rozbijani na członków),

aktorów typu encounter.



📂 Panel: Sojusznicy i Wrogowie
Lewa kolumna — Sojusznicy

PC + przyjaźni NPC.

Prawa kolumna — Wrogowie

Monstra, wrogowie, nawet wrodzy PC.

Dostępne funkcje:

usuwanie wpisu (✖),

ilość wrogów: + / − / pole liczby (1–99),

XP liczone automatycznie,

XP całkowite = suma XP × ilość.

📉 Trudność starcia

Na dole znajdują się 3 przyciski:

Niska

Umiarkowana

Wysoka

Wybór natychmiast aktualizuje docelowy budżet XP.



🧮 Analiza encountera

Stopka kalkulatora wyświetla:

Budżet XP (docelowy)

Całkowite XP wrogów

Porównanie trudności

Liczba wrogów (uwzględnia ilości)

Przycisk „Utwórz Encounter”

📝 Tworzenie Encountera

Kliknięcie Utwórz Encounter otwiera rozbudowany popup z trzema zakładkami:



🟦 Zakładka: Ogólne

Pola:

Nazwa encountera

Podsumowanie (summary)

Opis (description)

Checkbox: Twórz / użyj katalogu

Pole: nazwa folderu

Dane NIE resetują się podczas przełączania zakładek.



🟧 Zakładka: Waluta

Możesz:

wpisać ręcznie: PP / GP / SP / CP / EP,

rzucić kostkami dla każdej waluty,

użyć generatorów zgodnych z DMG 2024:

Individual Treasure

Treasure Hoards

Waluty są czyszczone przed generowaniem.

Stopka pokazuje:

wartość walut w GP (z dokładnością do 0.01).



🎲 Rzuty walut (dowolne formuły Foundry)

Przy każdej walucie:

kliknij ikonę 🎲,

otworzy się popup w stylu modułu,

wpisz formułę (np. 3d100 + 4d10, 2d12*5),

wartość zostanie wpisana do pola waluty.



💰 Individual Treasure (zależnie od CR każdego wroga)

Liczone osobno dla każdego wroga,

oparte o tabelę,

wybór: rzut / średnia,

wynik nadpisuje pola walut.



🪙 Treasure Hoards (wg najwyższego CR)

Jedno losowanie dla encountera,

generuje:

GP,

liczbę magicznych przedmiotów,

waluty nadpisane,

przedmioty magiczne: tylko liczba (informacja dla DM-a).



🟩 Zakładka: Przedmioty

Funkcje:

drag-and-drop przedmiotów (świat / kompedyjów),

auto-loot z potworów:

tryby:

brak łupu,

po jednym przedmiocie z każdego typu,

wszystkie przedmioty,

naturalne bronie są automatycznie pomijane,

zaklęcia są pomijane,

ilości przedmiotów: + / − / pole liczby,

automatyczne łączenie identycznych przedmiotów,

przeliczanie wartości przedmiotów na GP.

Stopka wyświetla:

Złoto

Wartość przedmiotów

Razem (suma obu, 0.01 GP)

⚙️ Ustawienia modułu

W: Game Settings → Configure Settings → Module Settings



🎨 Motywy:

Dark

Light

High Contrast

Custom (własne kolory)



🔍 Tryb dostępności:

większa czcionka (0.8–1.4),

większe marginesy,

pogrubione ramki.

⚔️ Auto-loot:

None – nie dodawaj przedmiotów

Per type – po jednym z danego typu (bez naturalnych broni)

All items – wszystkie przedmioty (bez zaklęć i naturalnych broni)



🧭 Wskazówki dla DM-a

Encountery można przeciągać między kompedyjami.

Najszybszy workflow:
z mapy → kalkulator → popup → gotowy encounter w folderze.

Generator skarbów jest zgodny z DMG 2024 (i w pełni nadpisuje waluty).

Przedmioty naturalne (Slam, Bite, Claw) nigdy nie trafią do łupu.

Moduł integruje się z aktorami typu group i encounter, więc możesz łatwo przenosić całe drużyny i pakiety potworów.



📦 Status projektu

Moduł jest aktywnie rozwijany.
Przyjmowane są sugestie dotyczące:

losowania magicznych przedmiotów,

eksportu encounterów do journala,

zapisów presetów encounterów,

integracji z Combat Trackerem.

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast
LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons
Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
