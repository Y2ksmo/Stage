import type { Metadata } from "next";
import Link from "next/link";
import { DIMENSIONS, DISCLAIMER } from "../../components/ItemParts";
import { BAND_THRESHOLDS, HALF_LIFE_YEARS, METHODOLOGY_VERSION, MIN_OVERALL_CONFIDENCE, WEIGHTS } from "../../scoring/riskScore";
import { REPLY_WINDOW_DAYS } from "../../services/constants";

export const metadata: Metadata = {
  title: "Methodologie & werkwijze",
  description: "Hoe uitspraken en incidenten worden geverifieerd, hoe het recht op wederhoor werkt en hoe de risico-indicator wordt berekend.",
};

const pct = (w: number) => `${Math.round(w * 100)}%`;

// Numbers on this page (weights, thresholds, reply window, version) are imported from the code that
// enforces them, so the page cannot drift from the system's real behaviour.
export default function MethodologyPage() {
  const dims = Object.entries(WEIGHTS) as Array<[keyof typeof WEIGHTS, number]>;

  return (
    <main className="page page-wide">
      <header>
        <h1>Methodologie &amp; transparantie</h1>
        <p className="muted">Hoe uitspraken en incidenten over publieke figuren worden geverifieerd, hoe wederhoor werkt en hoe de risico-indicator tot stand komt. Methodologie v{METHODOLOGY_VERSION}.</p>
      </header>

      <section className="card">
        <h2>1. Wat dit platform wel en niet doet</h2>
        <ul>
          <li>Wij bundelen <strong>openbare, geciteerde bronnen</strong> over gedrag, voorspellingen, financiën en machtsuitoefening. Wij beoordelen niet of een geloof of leer waar is.</li>
          <li>Er wordt <strong>niets openbaar</strong> voordat het is geverifieerd. Een beschuldiging blijft als “beschuldiging” gelabeld, tenzij een rechtbank, toezichthouder of vergelijkbare instantie een bevinding heeft gedaan.</li>
          <li><strong>Niet geverifieerd betekent niet onwaar.</strong> Een ontbrekend item zegt niets over de persoon.</li>
        </ul>
      </section>

      <section className="card">
        <h2>2. Verificatie</h2>
        <p>Een item wordt automatisch geverifieerd zodra aan <strong>alle</strong> onderstaande eisen is voldaan:</p>
        <ul>
          <li><strong>Twee onafhankelijke bronnen.</strong> Bronnen van dezelfde uitgever of eigenaar tellen als één. Dezelfde persbericht-tekst in twee kranten is dus één bron.</li>
          <li><strong>Minstens één primaire bron of betrouwbaar medium</strong>: bijvoorbeeld een origineel document, register of opname, of een redactioneel verantwoordelijke nieuwsorganisatie.</li>
          <li><strong>Gearchiveerd en vastgelegd.</strong> Een bron telt alleen mee met een permanente archiefkopie en een controlegetal (hash), zodat achteraf wijzigen of verdwijnen niets kan veranderen.</li>
          <li><strong>Telt niet mee:</strong> niet-gearchiveerde links, screenshots en berichten van sociale media (ook niet als aanvulling om het aantal op te hogen).</li>
          <li><strong>Twee bevestigende stemmen van onafhankelijke reviewers.</strong> Reviewers beoordelen nooit hun eigen inzendingen, verklaren dat zij geen belangenconflict hebben en motiveren elke stem. Reviewers zien elkaars stemmen niet individueel, alleen aantallen. Bij tegenstrijdige stemmen (twee voor en twee tegen) blijft het item in beoordeling en beslist een redacteur, met een vastgelegde motivering en zonder belangenconflict, nooit over een eigen inzending. Dat besluit vervangt alleen de stemeis: ook dan moeten de bronnen, het wederhoor en de overige eisen in orde zijn.</li>
          <li><strong>Voorspellingen:</strong> voor de uitkomst “niet uitgekomen” of “achteraf aangepast” moet de uitspraak expliciet en toetsbaar zijn (specificiteit ten minste 0,6, op een schaal van 0 tot 1). Voor “niet uitgekomen” moet bovendien een streefdatum zijn vastgelegd en moet de dag van die datum zijn afgelopen.</li>
          <li><strong>Incidenten:</strong> het wederhoor (zie hieronder) moet zijn afgerond voordat het item kan worden geverifieerd.</li>
        </ul>
      </section>

      <section className="card">
        <h2>3. Recht op wederhoor</h2>
        <ul>
          <li>De betrokkene wordt, via een door ons vastgelegd contactadres, een <strong>termijn van {REPLY_WINDOW_DAYS} dagen</strong> geboden om te reageren. Het wederhoor wordt door de redactie gestart; zonder bekend contactadres kan het niet starten.</li>
          <li>Voor <strong>incidenten</strong> is afgerond wederhoor verplicht vóór verificatie. Bij <strong>claims</strong> wordt een lopende termijn afgewacht, maar is wederhoor niet altijd vereist.</li>
          <li>Een ontvangen reactie wordt <strong>redactioneel gecontroleerd</strong> (bijvoorbeeld op laster of privacygegevens van derden) en, indien goedgekeurd, <strong>ongewijzigd</strong> naast het item gepubliceerd. Wordt een reactie niet gepubliceerd, dan staat bij het item dat er een reactie is ontvangen die niet is gepubliceerd. De reden leggen wij intern vast.</li>
          <li>De status van het wederhoor is altijd openbaar: <em>aangeboden (termijn loopt)</em>, <em>reactie ontvangen</em>, <em>aangegeven niet te reageren</em>, of <em>geen reactie ontvangen</em>. <strong>Geen reactie heeft geen invloed</strong> op de beoordeling of de score.</li>
        </ul>
      </section>

      <section className="card">
        <h2>4. De risico-indicator (score)</h2>
        <p>
          Bij een dossier tonen wij, als er genoeg geverifieerde gegevens zijn, een <strong>risico-indicator van 0 tot 100</strong>. <strong>Hoger betekent meer risico-indicatoren</strong> in de geverifieerde, geciteerde gegevens. Dit is een samenvatting en <strong>geen oordeel over de persoon, zijn motieven of zijn geloof</strong>.
        </p>
        <table className="method-table">
          <thead><tr><th scope="col">Onderdeel</th><th scope="col">Gewicht</th></tr></thead>
          <tbody>
            {dims.map(([key, w]) => (
              <tr key={key}><td>{DIMENSIONS[key] ?? key}</td><td>{pct(w)}</td></tr>
            ))}
          </tbody>
        </table>
        <ul>
          <li><strong>Alleen geverifieerde items tellen mee.</strong> Betwiste, ingetrokken en nog niet beoordeelde items niet.</li>
          <li><strong>Ontbrekende gegevens zijn geen schuld en geen onschuld.</strong> Onderdelen zonder gegevens worden weggelaten en de overige gewichten herverdeeld; onderdelen met weinig bewijs wegen minder zwaar mee.</li>
          <li><strong>Zekerheid.</strong> Bij elke score hoort een zekerheidspercentage. Is de totale zekerheid lager dan {pct(MIN_OVERALL_CONFIDENCE)}, of is er van minder dan twee onderdelen iets bekend, dan tonen wij <em>“Onvoldoende data”</em> in plaats van een getal.</li>
          <li><strong>Ernst en actualiteit.</strong> Incidenten wegen mee naar ernst (schaal 1 tot 5) en worden na verloop van tijd lichter ({HALF_LIFE_YEARS} jaar halfwaardetijd), maar verdwijnen nooit helemaal. Een door een instantie vastgestelde bevinding weegt zwaarder.</li>
          <li><strong>Niveaus:</strong> onder {BAND_THRESHOLDS.ELEVATED} laag; {BAND_THRESHOLDS.ELEVATED} tot {BAND_THRESHOLDS.HIGH} verhoogd; {BAND_THRESHOLDS.HIGH} tot {BAND_THRESHOLDS.SEVERE} hoog; {BAND_THRESHOLDS.SEVERE} en hoger zeer hoog. Eén zeer zwaar, bevestigd onderdeel kan niet worden weggemiddeld door andere onderdelen.</li>
          <li><strong>Controle-indicatoren</strong> volgen het BITE-model (gedrag, informatie, gedachten en emoties) en worden beoordeeld op gedocumenteerde praktijken, niet op de inhoud van een geloof.</li>
          <li><strong>Eigen beperkingen.</strong> Ernst en specificiteit zijn oordelen van mensen volgens een vaste rubriek en kunnen verschillen. Wij publiceren de weging, zodat u haar kunt toetsen. De score verandert wanneer verificaties of betwistingen veranderen; elke berekening wordt bewaard.</li>
        </ul>
      </section>

      <section className="card">
        <h2>5. Rectificatie, betwisting en verwijdering</h2>
        <ul>
          <li>Bij elk item staat een link <strong>“Dien een verzoek tot verwijdering of rectificatie in”</strong>. Ga via <Link href="/search">zoeken</Link> naar het betreffende item of dossier om het formulier te openen. Het formulier is aan een item gekoppeld; u kunt het niet los openen.</li>
          <li>Een verzoek verbergt <strong>niets automatisch</strong>. Ons juridisch team beoordeelt het en besluit: het item tijdelijk betwisten, definitief intrekken, of het verzoek afwijzen. Elk besluit wordt met onderbouwing vastgelegd. Het e-mailadres van de aanvrager is niet geverifieerd en er wordt geen bevestiging per e-mail verstuurd; bewaar de referentie die u op het scherm krijgt.</li>
          <li><strong>Betwist:</strong> het item blijft zichtbaar met een duidelijke melding, telt tijdelijk niet mee in de score en wordt buiten zoekmachines gehouden. In onze eigen zoekfunctie blijft het vindbaar, met de aanduiding “Betwist”. Houdt de juridische beoordeling de inhoud overeind, dan wordt het item opnieuw aan de verificatie-eisen getoetst en keert het terug, of gaat het terug naar beoordeling als het daar niet aan voldoet.</li>
          <li><strong>Ingetrokken:</strong> het item is niet meer openbaar en wordt niet via het systeem teruggezet.</li>
        </ul>
      </section>

      <section className="card">
        <h2>6. Neutraliteit en beperkingen</h2>
        <ul>
          <li>Op de startpagina staan dossiers en items op <strong>recente geverifieerde activiteit</strong>, niet op score of oordeel. Een persoon wordt op de startpagina en in zoekresultaten alleen getoond als er minstens één openbaar item is.</li>
          <li>Het “responspercentage” bij een dossier telt alleen wederhoortermijnen die zijn <strong>afgesloten</strong>. Items waarbij nog niet om een reactie is gevraagd, tellen niet als “niet gereageerd”.</li>
          <li>Wij kunnen fouten maken. Ziet u er een, dien dan een verzoek in. Elke moderatie-actie en elke scoreberekening wordt met tijdstip vastgelegd.</li>
        </ul>
      </section>

      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
