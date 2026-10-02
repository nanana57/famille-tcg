/* ===========================================================
   FAMILLE TCG — v20
   Utilitaires (en tête d'app.js) : sécurité + accessibilité
   =========================================================== */
const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
/** Échappe une valeur avant insertion dans innerHTML (anti-XSS). */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/** Classe .is-mobile tenue à jour (rotation, redimensionnement, tablette, émulation). */
function majClasseMobile() {
    const tactile = ('ontouchstart' in window) && navigator.maxTouchPoints > 0 && window.innerWidth <= 1024;
    const etroit = window.matchMedia('(max-width: 820px)').matches;
    document.body.classList.toggle('is-mobile', tactile || etroit);
}

/** Accessibilité : rôles, clavier, annonces — sans toucher au HTML métier. */
function ameliorerAccessibilite() {
    $$('[id$="-overlay"]').forEach((el) => {
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        const titre = $('h1,h2,h3', el);
        if (titre) { titre.id ||= `${el.id}-titre`; el.setAttribute('aria-labelledby', titre.id); }
    });
    $$('div[onclick],span[onclick],p[onclick]').forEach((el) => {
        if (el.id && el.id.endsWith('-overlay')) return;
        if (el.classList.contains('detail-container')) return;
        el.setAttribute('role', 'button'); el.tabIndex = 0;
    });
    document.addEventListener('keydown', (e) => {
        const t = e.target;
        if ((e.key === 'Enter' || e.key === ' ') && t.matches?.('[role="button"]:not(button)')) { e.preventDefault(); t.click(); }
        if (e.key === 'Escape') {
            const ouvert = $$('[id$="-overlay"]').find((o) => o.hasAttribute('onclick') && getComputedStyle(o).display !== 'none');
            ouvert?.click();
        }
    });
    $('#motd-banner')?.setAttribute('role', 'status');
    $('#action-log')?.setAttribute('aria-live', 'polite');
    $('#tour-indicateur')?.setAttribute('aria-live', 'polite');
    $$('.hint[id^="auth-error"]').forEach((e) => e.setAttribute('role', 'alert'));
    $$('input[placeholder]:not([aria-label])').forEach((i) => i.setAttribute('aria-label', i.placeholder));
    $('#main-nav')?.setAttribute('aria-label', 'Navigation principale');
}
document.addEventListener('DOMContentLoaded', ameliorerAccessibilite);


/** Mesure la hauteur réelle de la barre de navigation (0 si masquée) -> --nav-h */
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('main-nav');
    if (!nav || !window.ResizeObserver) return;
    const maj = () => document.documentElement.style.setProperty('--nav-h', (nav.offsetParent || nav.offsetHeight ? nav.offsetHeight : 0) + 'px');
    new ResizeObserver(maj).observe(nav); maj();
});
/* ===========================================================
   FAMILLE TCG — moteur de jeu (Édition Ultime v16)
   Bluff révélé sans effet + Mobile flex column + Bot intelligent
   =========================================================== */

var collectionJoueur = {};
var mesDecks = [];
var profil = {
    coins: 0,
    deckStart: false,
    lastLogin: 0,
    tuto_0:false, tuto_1:false, tuto_2:false, tuto_3:false, tuto_4:false,
    tuto_5:false, tuto_6:false, tuto_7:false, tuto_8:false, tuto_9:false,
    tutoComplet:false,
    tutoCartesGagnees: [],
    tutoCoinsGagnes: 0,
    tutoExpressReussi: false,
    tutoSkipped: [],
    tutoEtapeActuelle: 0,
    avatar: '🧑',
    codeAmi: null,
    amis: [],
    demandesAmisRecues: [],
    demandesAmisEnvoyees: [],
    deckParDefaut: null,
    decksSupprimes: [],
    statsDecks: {},
    statsCartes: {},
    messagesAmi: {},
    xp: 0,
    niveau: 1,
    streak: 0,
    derniereConnexion: 0,
    quetes: [],
    quetesDate: '',
    bonusTemporaire: null,
    deckStats: {},
    historique: []
};
var deckEnEdition = null;
var tempDeckCartes = [];
var triCourant = 'famille';

var tourActuel = 'joueur', timer = null, tempsRestant = 60, selection = null, ciblage = null, partieFinie = false, uidSeq = 1;
var modeEnLigne = false, modeAttente = false, mulliganValide = false;
var modeTuto = false, etapeTuto = 0, currentTutoLevel = 0;
var modeTournoi = false, tournoiEnCours = null;
var modeSpectateur = false, partieObservee = null;
var modeChallenge = false;
var _dernierIdTraite = 0, _compteurAction = 0, _replayEnCours = false;
var stats = { parties:0, victoires:0, defaites:0 };
var _timerMulligan = null;
var _syncSeed = 12345;
var _tutoInterval = null;
var _tutoSuccessInterval = null;
var _deckUtiliseEnCours = null;
var _sortieAutorisee = false;
var _bluffPending = null;
window.appPret = false;

var cartesBannies = [];

var _tapTimer = null;
var _tapMoved = false;

/* ===========================================================
   AUDIO
   =========================================================== */
var _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) {
        try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { _audioCtx = null; }
    }
    return _audioCtx;
}
function jouerSon(type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect((typeof _bus === 'function' && _bus('fx')) || ctx.destination);
    switch(type) {
        case 'attack':
            osc.type = 'square';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t); osc.stop(t + 0.22); break;
        case 'hurt':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t); osc.stop(t + 0.32); break;
        case 'summon':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(680, t + 0.35);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.start(t); osc.stop(t + 0.42); break;
        case 'click':
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, t);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.start(t); osc.stop(t + 0.07); break;
        case 'victory':
            [523, 659, 784, 1047].forEach((f, i) => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.connect(g); g.connect((typeof _bus === 'function' && _bus('fx')) || ctx.destination);
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0.15, t + i*0.1);
                g.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.25);
                o.start(t + i*0.1); o.stop(t + i*0.1 + 0.3);
            });
            osc.start(t); osc.stop(t + 0.01); break;
        case 'defeat':
            [392, 330, 262, 196].forEach((f, i) => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.connect(g); g.connect((typeof _bus === 'function' && _bus('fx')) || ctx.destination);
                o.type = 'sawtooth'; o.frequency.value = f;
                g.gain.setValueAtTime(0.13, t + i*0.15);
                g.gain.exponentialRampToValueAtTime(0.001, t + i*0.15 + 0.3);
                o.start(t + i*0.15); o.stop(t + i*0.15 + 0.35);
            });
            osc.start(t); osc.stop(t + 0.01); break;
        case 'coin':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t); osc.stop(t + 0.17); break;
        case 'levelup':
            [523, 784, 1047, 1319].forEach((f, i) => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.connect(g); g.connect((typeof _bus === 'function' && _bus('fx')) || ctx.destination);
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.15, t + i*0.08);
                g.gain.exponentialRampToValueAtTime(0.001, t + i*0.08 + 0.4);
                o.start(t + i*0.08); o.stop(t + i*0.08 + 0.45);
            });
            osc.start(t); osc.stop(t + 0.01); break;
        case 'tutoStep':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
            gain.gain.setValueAtTime(0.09, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t); osc.stop(t + 0.22); break;
        case 'tutoDone':
            [659, 784, 988, 1319].forEach((f, i) => {
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.connect(g); g.connect((typeof _bus === 'function' && _bus('fx')) || ctx.destination);
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0.14, t + i*0.09);
                g.gain.exponentialRampToValueAtTime(0.001, t + i*0.09 + 0.3);
                o.start(t + i*0.09); o.stop(t + i*0.09 + 0.35);
            });
            osc.start(t); osc.stop(t + 0.01); break;
        case 'error':
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.start(t); osc.stop(t + 0.24); break;
    }
}

/* ===========================================================
   PARTICULES
   =========================================================== */
function creerParticules(x, y, couleur, nombre) {
    if (typeof AUDIO !== 'undefined' && (!AUDIO.particules || AUDIO.eco)) return;
    nombre = nombre || 12;
    const layer = document.getElementById('particles-layer');
    if (!layer) return;
    for (let i = 0; i < nombre; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (Math.PI * 2 * i) / nombre + Math.random() * 0.5;
        const dist = 40 + Math.random() * 80;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background = couleur;
        p.style.boxShadow = `0 0 10px ${couleur}`;
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        p.style.animationDelay = (Math.random() * 0.15) + 's';
        layer.appendChild(p);
        setTimeout(() => p.remove(), 1400);
    }
}
function creerTrail(x1, y1, x2, y2) {
    const layer = document.getElementById('particles-layer');
    if (!layer) return;
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const t = document.createElement('div');
    t.className = 'attack-trail';
    t.style.left = midX + 'px';
    t.style.top = midY + 'px';
    t.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    layer.appendChild(t);
    setTimeout(() => t.remove(), 500);
}
function creerSlash(x, y) {
    const layer = document.getElementById('particles-layer');
    if (!layer) return;
    const s = document.createElement('div');
    s.className = 'slash-fx';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    layer.appendChild(s);
    setTimeout(() => s.remove(), 500);
}
function creerDeathBurst(x, y) {
    const layer = document.getElementById('particles-layer');
    if (!layer) return;
    const b = document.createElement('div');
    b.className = 'death-burst';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    layer.appendChild(b);
    setTimeout(() => b.remove(), 700);
}

/* ===========================================================
   CARTES
   =========================================================== */
function C(id, prenom, famille, cout, atk, vie, rarete, desc, motsCles, emoji) {
    return { id: id, prenom: prenom, famille: famille, cout: cout, atk: atk, vie: vie, rarete: rarete, desc: desc, motsCles: motsCles || [], emoji: emoji };
}

var dbCartes = [
    C('m1','Farid','Meridja',6,5,6,'legendaire','Cri de guerre : donne +2/+2 aux autres Meridja alliés.',[],'👨🏻'),
    C('m2','Bachira','Meridja',6,4,7,'legendaire','Provocation. Rage : quand elle subit des dégâts, rend 3 patience à son héros.',['Provocation','Rage'],'👩🏻'),
    C('m3','Meriem','Meridja',4,4,4,'epique','Gagne +1/+1 pour chaque Marouf adverse en jeu.',[],'👱‍♀️'),
    C('m4','Amina','Meridja',4,3,5,'rare','Cri de guerre : +2 attaque si Marouane est en jeu.',[],'👩🏽'),
    C('m5','Marouane','Meridja',4,4,2,'rare','Attaque dès son arrivée.',['Charge'],'🧔🏽‍♂️'),
    C('m6','Anness','Meridja',2,3,2,'commune','Cri de guerre : +1 attaque à une créature alliée.',[],'👦🏻'),
    C('m7','Abder','Meridja',2,3,2,'commune','Cri de guerre : +0/+1 à une créature alliée.',[],'👦🏽'),
    C('m8','Channel','Meridja',2,2,1,'commune','Agilité féline : attaque dès son arrivée.',['Charge','Chat'],'🐈'),
    C('m9','Blue','Meridja',2,2,1,'commune','Miaule très fort la nuit.',['Charge','Chat'],'🐈'),
    C('m10','Hunter','Meridja',2,2,1,'commune','Saute partout sans prévenir.',['Charge','Chat'],'🐈'),
    C('m11','Imran','Meridja',2,2,2,'commune','Cri de guerre : lance un dé. Pair, pioche une carte. Impair, gagne 1 mana ce tour. Gagne +2/+2 si Amina et Marouane sont en jeu.',[],'👦🏽'),
    C('m12','Zacharia','Meridja',4,3,3,'epique','Cri de guerre : lance un dé et inflige ce nombre de dégâts au héros adverse. Gagne +2/+2 si Amina et Marouane sont en jeu.',[],'👦🏼'),

    C('ma1','Nourdinne','Marouf',6,4,6,'legendaire','Cri de guerre : -2 attaque à toutes les créatures ennemies.',[],'👨🏽‍🦳'),
    C('ma2','Karima','Marouf',6,3,8,'legendaire','À la fin de ton tour, pioche une carte.',['Provocation'],'🧕'),
    C('ma3','Islem','Marouf',4,4,5,'epique','Annule le prochain sort lancé par l\'adversaire.',[],'🧑🏽'),
    C('ma4','Inès','Marouf',4,3,6,'epique','Cri de guerre : invoque un Chat protecteur 2/1 avec Provocation.',[],'👩🏽‍🦱'),
    C('ma5','Nesrine','Marouf',4,4,4,'rare','Cri de guerre : +1/+1 à une créature alliée.',[],'👧🏽'),
    C('ma6','Kika','Marouf',4,4,4,'rare','Cri de guerre : +0/+2 à une créature alliée.',[],'👧🏻'),
    C('ma7','Lyna','Marouf',4,4,4,'rare','Cri de guerre : +2 attaque à une créature alliée.',[],'👧🏼'),
    C('ma8','Zahida','Marouf',2,2,4,'commune','Cri de guerre : rend 2 points de vie à une créature alliée.',[],'👵🏽'),
    C('ma9','Kiki','Marouf',2,1,1,'commune','Survole les défenses : attaque dès son arrivée.',['Charge'],'🐦'),
    C('ma10','Chat Islem','Marouf',2,2,1,'commune','Ronronne pour apaiser les tensions.',['Charge','Chat'],'🐈'),
    C('ma11','Hiba','Marouf',3,2,4,'rare','Cri de guerre : lance un dé et inflige ce nombre de dégâts à une cible ennemie. Gagne +2/+2 si Inès et Islem sont en jeu.',[],'👧🏽'),

    C('k1','Sid Ali','Kerkache',7,5,7,'legendaire','Les créatures alliées adjacentes ne peuvent pas être ciblées par les sorts.',['Provocation'],'👴🏽'),
    C('k2','Samia','Kerkache',6,4,8,'legendaire','À la fin de ton tour, rend 3 patience à ton héros.',[],'👵🏻'),
        C('k3','Farid K.','Kerkache',5,5,6,'epique','Rage : quand il est blessé, gagne +3 en attaque.',['Rage'],'👨🏽'),
    C('k4','Ryma','Kerkache',4,3,6,'rare','Cri de guerre : +1/+1 à une créature alliée.',['Provocation'],'👩🏽‍🦱'),
    C('k5','Asma','Kerkache',3,2,5,'rare','Cri de guerre : rend 2 patience à ton héros.',[],'👩🏻'),
    C('k6','Malek','Kerkache',4,4,4,'rare','Charge foudroyante : attaque dès son arrivée.',['Charge'],'👦🏽'),
    C('k7','Pina','Kerkache',2,1,2,'commune','Oiseau ultra rapide : attaque dès son arrivée.',['Charge'],'🦜'),
    C('k8','Yoka','Kerkache',2,1,2,'commune','Gazouille joyeusement.',['Charge'],'🕊️'),
    C('k9','Usagi','Kerkache',3,2,3,'rare','Cri de guerre : +2 en force à Ryma si elle est en jeu. Sinon, +1 force à une créature alliée au hasard.',[],'🐰'),
    C('k10','Mimosa','Kerkache',2,2,2,'commune','Cri de guerre : lance une pièce. Pile, se détruit. Face, +2 force à une créature alliée au hasard.',[],'🐱'),

    C('ka1','Khaled','Belgacemi',6,5,5,'legendaire','Cri de guerre : donne +2/+2 aux autres Belgacemi alliés.',[],'👨🏽'),
    C('ka2','Hanifa','Belgacemi',6,3,6,'legendaire','Cri de guerre : invoque un Bon repas 3/3.',[],'🧕'),
    C('ka3','Safya','Belgacemi',4,4,4,'epique','Cri de guerre : double l\'attaque de Saad s\'il est en jeu.',[],'👩🏽'),
    C('ka4','Saad','Belgacemi',4,4,4,'epique','Cri de guerre : +4 en vie si Safya est en jeu.',[],'🧔🏻'),
    C('ka5','Naila','Belgacemi',3,3,4,'rare','Cri de guerre : pioche un sort de ton deck.',[],'👩🏻'),
    C('ka6','Nassim','Belgacemi',3,4,3,'rare','Cri de guerre : inflige 2 dégâts à une cible ennemie.',[],'🧑🏽'),
    C('ka7','Toufik','Belgacemi',4,4,5,'rare','Cri de guerre : +0/+2 à une créature alliée.',['Provocation'],'👨🏽‍🦱'),
    C('ka8','Manel','Belgacemi',3,3,3,'rare','Cri de guerre : +1/+1 à une créature alliée.',[],'👩🏽‍🦰'),
    C('ka9','Camilla','Belgacemi',2,3,2,'commune','Cri de guerre : +1/+1 à Kamel s\'il est en jeu.',[],'👧🏽'),
    C('ka10','Kamel','Belgacemi',2,3,2,'commune','Cri de guerre : +1/+1 à Camilla si elle est en jeu.',[],'👦🏻'),
    C('ka11','Hanna','Belgacemi',3,2,4,'rare','Cri de guerre : lance un dé et soigne une cible alliée de ce nombre de PV. Gagne +2/+2 si Saad et Safya sont en jeu.',[],'👧🏻'),

    C('n1','Mima','Neutre',8,4,8,'legendaire','À la fin de ton tour, soigne entièrement tes créatures.',['Provocation'],'👵🏻'),
    C('n2','Sidou','Neutre',6,6,6,'legendaire','Cri de guerre : endort une créature ennemie pendant 2 tours.',[],'👴🏻'),
    C('n3','Nounou','Neutre',4,2,5,'rare','Cri de guerre : rend 2 patience à ton héros.',[],'👩‍🍼'),
    C('n4','Femme de ménage','Neutre',3,2,4,'commune','Cri de guerre : détruit le terrain adverse.',[],'🧹'),
    C('n5','Collègue de travail','Neutre',3,3,3,'commune','Cri de guerre : pioche une carte si tu as un terrain en jeu.',[],'👨‍💼'),
    C('n6','Le voisin relou','Neutre',2,1,4,'commune','Provocation. Il est toujours là quand il faut pas.',['Provocation'],'👨‍🦰'),
    C('n7','Khalo Kamel','Neutre',5,3,6,'epique','Soutien : à la fin de ton tour, donne +1/+1 à une créature alliée au hasard.',[],'🧔‍♂️'),

    C('t1','Moeurs Verdey','Terrain',4,0,0,'commune','Tes chats coûtent 1 mana de moins.',[],'🌍'),
    C('t2','Villeparisis','Terrain',4,0,0,'commune','Tes créatures avec Provocation gagnent +2 en vie.',[],'🏙️'),
    C('t3','Belleville','Terrain',4,0,0,'commune','À la fin de chaque tour, rend 2 patience aux deux héros.',[],'🏡'),
    C('t4','Beaulieu','Terrain',4,0,0,'commune','Tes créatures de famille gagnent +1 en attaque.',[],'🌳'),
    C('t5','Dammartin-en-Goële','Terrain',3,0,0,'commune','Cri de guerre : lance un dé. Sur 3 ou moins, le bruit des avions t\'inflige 2 dégâts.',[],'🛫'),
    C('t6','Los Angeles','Terrain',4,0,0,'rare','Cri de guerre : pile ou face. Pile, gagne 1 mana ce tour. Face, il ne se passe rien.',[],'🌴'),
    C('t7','Pontault-Combault','Terrain',3,0,0,'commune','Cri de guerre : lance un dé. 4 ou plus, soigne ton héros de 2 PV.',[],'🏘️'),
    C('t8','Clamart','Terrain',3,0,0,'rare','Cri de guerre : pile ou face. Pile, l\'adversaire défausse une carte. Face, il ne se passe rien.',[],'🚇'),
    C('t9','Le Parc Ballanger','Terrain',4,0,0,'epique','Les créatures Bluff coûtent 1 mana de moins. Quand une créature Bluff est révélée, pioche une carte.',[],'🌳'),

    C('s1','Va ranger ta chambre !','Sort',2,0,0,'commune','Renvoie une créature ennemie dans la main de son propriétaire.',[],'🧹'),
    C('s2','Qui a touché au thermostat ?','Sort',4,0,0,'epique','Inflige 2 dégâts à toutes les créatures.',[],'🌡️'),
    C('s3','La télécommande perdue','Sort',3,0,0,'rare','Endort une créature ennemie au hasard pendant un tour.',[],'📺'),
    C('s4','Le chien a mangé mes devoirs','Sort',1,0,0,'commune','Défausse une carte au hasard et gagne 3 mana ce tour.',[],'🐶'),
    C('s5','Crise d\'adolescence','Sort',4,0,0,'epique','Une créature ennemie attaque un de ses alliés.',[],'💢'),
    C('s6','Le regard de la mère','Sort',5,0,0,'legendaire','Détruit une créature ennemie ayant 5 attaque ou plus.',[],'👀'),
    C('s7','Album photo d\'enfance','Sort',3,0,0,'rare','Réduit à 1 l\'attaque d\'une créature ennemie.',[],'📸'),
    C('s8','Appel en visio surprise','Sort',2,0,0,'commune','Révèle la main adverse pendant un tour.',[],'📱'),
    C('s9','Tu as grandi !','Sort',3,0,0,'rare','Donne +3/+3 à une créature alliée.',[],'📈'),
    C('s10','Bataille de polochons','Sort',2,0,0,'commune','Inflige 1 dégât à trois cibles ennemies au hasard.',[],'🛏️'),
    C('s11','Embouteillages sur le périph','Sort',4,0,0,'rare','Au prochain tour, les cartes coûtent 2 mana de plus pour les deux joueurs.',[],'🚗'),
    C('s12','Tais-toi et mange','Sort',1,0,0,'commune','Réduit une créature au silence : son texte est annulé.',[],'🍲'),
    C('s13','Secret de famille','Sort',3,0,0,'epique','Pioche une carte au hasard depuis ton deck.',[],'🤫'),
    C('s14','Le cadeau de Noël raté','Sort',4,0,0,'epique','Transforme une créature ennemie en Paire de chaussettes 1/1.',[],'🎁'),
    C('s15','Réunion de famille','Sort',6,0,0,'legendaire','Remplit ton plateau de Cousins éloignés 1/1.',[],'👨‍👩‍👧‍👦'),
    C('s16','Argent de poche','Sort',0,0,0,'commune','Gagne 1 mana supplémentaire pour ce tour.',[],'💶'),
    C('s17','Fin des vacances','Sort',5,0,0,'epique','Détruit les terrains en jeu et inflige 3 dégâts au héros adverse.',[],'🎒'),
    C('s18','Plainte aux grands-parents','Sort',3,0,0,'rare','Pioche 2 cartes, ou 3 si Mima ou Sidou est en jeu.',[],'📞'),
    C('s19','Oubli de l\'anniversaire','Sort',2,0,0,'commune','L\'adversaire défausse une carte au hasard.',[],'📅'),
    C('s20','C\'est moi qui conduis !','Sort',4,0,0,'rare','Donne Charge à une de tes créatures : elle peut attaquer tout de suite.',[],'🏎️'),
    C('s21','Wifi en panne','Sort',2,0,0,'commune','Bloque la prochaine pioche de l\'adversaire.',[],'📵'),
    C('s22','Machine à laver qui déborde','Sort',3,0,0,'rare','Inflige 3 dégâts à une créature ennemie ciblée.',[],'🌊'),
    C('s23','Le wifi du voisin','Sort',2,0,0,'commune','Pioche immédiatement une carte.',[],'📶'),
    C('s24','Embrouille de famille','Sort',4,0,0,'epique','Échange l\'attaque et la vie d\'une créature ciblée.',[],'🔀'),
    C('s25','Les invités surprises','Sort',5,0,0,'epique','Invoque deux Cousins éloignés 1/1.',[],'🎉'),
    C('s26','Panne de four le jour du couscous','Sort',3,0,0,'rare','Détruit les terrains en jeu, des deux côtés.',[],'🍲'),
    C('s27','Retard chronique','Sort',2,0,0,'commune','Une créature ennemie ciblée ne peut pas attaquer au prochain tour.',[],'🐌'),
    C('s28','Selfie de famille','Sort',1,0,0,'commune','Donne +1/+1 à toutes tes créatures.',[],'🤳'),
    C('s29','Grand-mère a le dernier mot','Sort',6,0,0,'legendaire','Détruit toutes les créatures ennemies ayant 3 vie ou moins.',[],'👵'),
    C('s30','Cadeau de mariage moche','Sort',2,0,0,'rare','Transforme une créature alliée ciblée en Vase précieux 0/5 avec Provocation.',[],'🏺'),
    C('s31','Un verre de thé','Sort',2,0,0,'commune','Lance une pièce. Pile : +1 vie à un personnage. Face : -1 vie à un personnage.',[],'🍵'),
    C('s32','Le PC de Kamel','Sort',3,0,0,'rare','Pioche 2 cartes. Si Kamel est en jeu, pioche 3 cartes à la place.',[],'💻'),
    C('s33','Le nounours de Hanna','Sort',2,0,0,'commune','Donne +0/+3 à une créature alliée. Si Hanna est en jeu, donne +1/+3.',[],'🧸'),
    C('s34','La audi de Toufik','Sort',4,0,0,'rare','Donne Charge à une créature alliée. Si Toufik est en jeu, elle gagne aussi +2/+0.',[],'🚗'),
    C('s35','La recette de Mima','Sort',3,0,0,'commune','Soigne toutes tes créatures de 2 PV.',[],'🍲'),
    C('s36','Le fou rire de Bachira','Sort',2,0,0,'rare','Endort une créature ennemie pendant un tour.',[],'😂'),
    C('s37','La sieste de Sidou','Sort',3,0,0,'epique','Endort toutes les créatures ennemies pendant un tour.',[],'😴'),
    C('s38','Le café de Karima','Sort',1,0,0,'commune','Gagne 2 mana ce tour.',[],'☕'),
    C('s39','La bénédiction de Mima','Sort',5,0,0,'epique','Donne +2/+2 à toutes tes créatures.',[],'🙏'),
    C('s40','La malédiction de Khaled','Sort',4,0,0,'rare','Réduit l\'attaque de toutes les créatures ennemies de 2.',[],'💀'),
    
    C('sb1','Cache-cache','Sort',2,0,0,'commune','Révèle une carte Bluff alliée. Elle gagne +2/+2.',[],'🙈'),
    C('sb2','Surprise !','Sort',3,0,0,'rare','Révèle une carte Bluff alliée. Inflige 3 dégâts au héros adverse.',[],'🎉'),
    C('sb3','Mensonge','Sort',1,0,0,'commune','Révèle une carte Bluff alliée. Pioche une carte.',[],'🤥'),
    C('sb4','Embuscade','Sort',4,0,0,'epique','Révèle une carte Bluff alliée. Détruit une créature ennemie.',[],'🗡️'),
    C('sb5','Le grand secret','Sort',5,0,0,'legendaire','Révèle toutes les cartes Bluff alliées. Elles gagnent +3/+3 et Charge.',[],'🤫'),

    C('f1','Naila x Nassim','Nouvelle famille',8,7,7,'legendaire','Fusion : nécessite Naila et Nassim. Cri de guerre : inflige 4 dégâts.',['Fusion'],'💑'),
    C('f2','Amina x Marouane','Nouvelle famille',8,6,8,'legendaire','Fusion : nécessite Amina et Marouane. Cri de guerre : donne +3/+3 aux autres.',['Fusion'],'💑'),
    C('f3','Ines x Islem','Nouvelle famille',9,8,8,'legendaire','Fusion : nécessite Inès et Islem. Cri de guerre : annule le prochain sort.',['Fusion'],'💑'),
    C('f4','Toufik x Manel','Nouvelle famille',7,5,9,'legendaire','Fusion : nécessite Toufik et Manel. Provocation.',['Fusion','Provocation'],'💑'),
    C('f5','Safya x Saad','Nouvelle famille',8,7,7,'legendaire','Fusion : nécessite Safya et Saad. Cri de guerre : invoque Hanna.',['Fusion'],'💑'),
       C('f6','Pina x Yoka','Nouvelle famille',9,6,7,'legendaire','Fusion : nécessite Pina et Yoka. Cri de guerre : invoque Asma.',['Fusion'],'🦜🕊️'),

    C('c1','Naila x Farid','Cousins',7,6,6,'legendaire','Destruction : Inflige 3 dégâts à tous les ennemis (héros compris).',['Destruction'],'👫'),
    C('c2','Malek x Kamel','Cousins',5,5,5,'epique','Rage : Gagne Charge et +2 en attaque.',['Rage'],'👬'),
    C('c3','Meriem x Safya','Cousins',3,3,4,'rare','Rage : Pioche une carte.',['Rage'],'👭'),
    C('c4','Amina x Inès','Cousins',2,2,2,'commune','Destruction : Rend 4 patience à ton héros.',['Destruction'],'👭'),
    C('c5','Anness x Nassim','Cousins',4,4,5,'rare','Provocation. Rage : Inflige 2 dégâts au héros adverse.',['Provocation','Rage'],'👬'),
    C('c6','Ryma x Lyna','Cousins',3,4,2,'commune','Destruction : Donne +2/+2 à une de tes créatures au hasard.',['Destruction'],'👭'),
    C('c7','Imran x Toufik','Cousins',1,1,3,'commune','Rage : Gagne +1/+1.',['Rage'],'👬'),
    C('c8','Asma x Hiba','Cousins',6,5,5,'epique','Destruction : Détruit la créature ennemie ayant le plus d\'attaque.',['Destruction'],'👭'),
    C('c9','Bagarre de cousins','Sort',2,0,0,'commune','Inflige 1 dégât à toutes tes créatures (déclenche la Rage). Pioche 2 cartes.',[],'🤼'),
    C('c10','La table des enfants','Sort',4,0,0,'rare','Invoque deux Cousins éloignés 1/1 avec Provocation.',[],'🧒'),
    C('c11','Le grand repas','Sort',5,0,0,'epique','Déclenche l\'effet de Destruction de toutes tes créatures sans les tuer.',[],'🍽️'),
    C('c12','Cherchell','Terrain',3,0,0,'rare','Tes créatures Cousins coûtent 1 mana de moins.',[],'🏖️'),

    C('tb1','Farid le malicieux','Kerkache',4,3,4,'epique','Bluff. Quand révélé : Inflige 2 dégâts à une créature ennemie au hasard.',['Bluff'],'😏'),
    C('tb2','Naila l\'intrepide','Belgacemi',3,4,2,'rare','Bluff. Quand révélé : Pioche une carte.',['Bluff'],'🤩'),
    C('tb3','Kamel le gamer fou','Belgacemi',3,2,5,'rare','Bluff. Quand révélé : Gagne +2/+2.',['Bluff'],'🎮'),
    C('tb4','Hanna la sauvage','Belgacemi',2,3,1,'commune','Bluff. Quand révélé : Inflige 1 dégât à toutes les créatures ennemies.',['Bluff'],'😤'),
    C('tb5','Imran le casse cou','Meridja',2,2,2,'commune','Bluff. Quand révélé : Gagne Charge.',['Bluff'],'🤸'),
    C('tb6','Meriem la griboulleuse','Meridja',3,2,4,'rare','Bluff. Quand révélé : Soigne ton héros de 3 PV.',['Bluff'],'🤲'),
    C('tb7','Kika le cerveau','Marouf',4,3,5,'epique','Bluff. Quand révélé : Réduit l\'attaque d\'une créature ennemie de 2.',['Bluff'],'🧠'),
    C('tb8','Ryma la pilote','Kerkache',3,3,3,'rare','Bluff. Quand révélé : Donne Charge à une créature alliée au hasard.',['Bluff'],'🏎️'),
    C('tb9','Islem l\'audacieux','Marouf',4,4,4,'epique','Bluff. Quand révélé : Annule le prochain sort adverse.',['Bluff'],'😎'),
    C('tb10','Malek l\'indomptable','Kerkache',5,5,4,'epique','Bluff. Quand révélé : Gagne +0/+3 et Provocation.',['Bluff','Provocation'],'🛡️'),

    C('u1','La Famille Unie','Famille Unifiée',1,1,1,'legendaire','✨ CARTE UNIQUE ✨ L\'union sacrée des quatre familles. Une force minuscule, mais un symbole éternel.',['Unifiée'],'👨‍👩‍👧‍👦')
];

var parId = {};
dbCartes.forEach(function(c) { parId[c.id] = c; });
function defCarte(id) { return parId[id]; }

/* ===========================================================
   ILLUSTRATIONS DE CARTES (dossier img/cartes/)
   Nom de fichier = id de la carte (m1.webp, ma2.png, k1.jpg…)
   Extensions essayées dans l'ordre ; si aucune ne charge → emoji.
   =========================================================== */
var IMG_CARTES_DIR = 'img/cartes/';
var IMG_CARTES_EXTS = ['.webp', '.png', '.jpg', '.jpeg', '.jfif'];

/* ===========================================================
   ÉCONOMIE (réglable par l'admin : onglet « Économie »)
   =========================================================== */
var ECO_DEFAUT = {
    gainBotVictoire:50, gainBotDefaite:15, xpBot:25, forfaitBot:5,
    gainMultiVictoire:100, gainMultiDefaite:30, xpMulti:40, forfaitMulti:10, eloK:32,
    tournoi4Cout:500, tournoi4Bonus:1500, tournoi4Match:150, tournoi8Cout:1000, tournoi8Bonus:3000, tournoi8Match:250,
    gainTournoiPartieV:250, gainTournoiPartieD:80, xpTournoi:60, gainChallengeVictoire:300,
    prixBooster:50, xpBooster:5,
    prixCommune:10, prixRare:50, prixEpique:200, prixLegendaire:1000, ratioVentePct:50,
    bonusQuotidien:50, bonusSerie:25, niveauGain:100, niveauGain5:500, deckDepart:100, tutoEtape:500, multQuetes:100,
    draftVictoire:40, campagneBoss:150, prixDosTheme:300, prixDosEtoile:800, prixDosArc:1200
};
var ECO = Object.assign({}, ECO_DEFAUT, { ratioVente: 0.5 });
(function () { try { var s = JSON.parse(localStorage.getItem('ftcg_economie') || '{}'); Object.keys(ECO_DEFAUT).forEach(function (k) { var v = Number(s[k]); if (isFinite(v) && v >= 0 && v <= 10000000) ECO[k] = Math.round(v); }); ECO.ratioVente = Math.min(1, ECO.ratioVentePct / 100); } catch (e) {} })();


/** Construit le HTML de l'illustration d'une carte :
 *  <img> si une image existe pour cet id, sinon repli sur l'emoji.
 *  Le onerror essaie les extensions suivantes, puis remplace par l'emoji. */
function htmlIllustration(c) {
    const srcs = IMG_CARTES_EXTS.map(ext => IMG_CARTES_DIR + c.id + ext);
    return `<img class="card-img" src="${srcs[0]}" alt=""
        data-srcs="${srcs.join('|')}"
        data-emoji="${esc(c.emoji)}"
        data-try="0"
        onerror="repliIllustration(this)">`;
}

/** Appelé par <img onerror> : essaie l'extension suivante, puis l'emoji. */
function repliIllustration(img) {
    const srcs = (img.dataset.srcs || '').split('|');
    let i = parseInt(img.dataset.try || '0', 10) + 1;
    if (i < srcs.length) {
        img.dataset.try = i;
        img.src = srcs[i];
        return;
    }
    const span = document.createElement('span');
    span.className = 'card-emoji';
    span.textContent = img.dataset.emoji || '🃏';
    img.replaceWith(span);
}
window.repliIllustration = repliIllustration;

function getSyncRandom() {
    if (!modeEnLigne) return Math.random();
    _syncSeed = (_syncSeed * 9301 + 49297) % 233280;
    return _syncSeed / 233280;
}

var FUSIONS = { 'f1': ['ka5','ka6'], 'f2': ['m4','m5'], 'f3': ['ma3','ma4'], 'f4': ['ka7','ka8'], 'f5': ['ka3','ka4'], 'f6': ['k7','k8'] };
var FUSION_DE = {};
Object.entries(FUSIONS).forEach(function(entry) {
    var fid = entry[0], compo = entry[1];
    FUSION_DE[compo[0]] = FUSION_DE[compo[0]] || []; FUSION_DE[compo[1]] = FUSION_DE[compo[1]] || [];
    FUSION_DE[compo[0]].push({fusion:fid, autre:compo[1]}); FUSION_DE[compo[1]].push({fusion:fid, autre:compo[0]});
});

var POUVOIRS = {
    m1:{mode:'eclair',jouer:({moi,source})=>moi.plateau.filter(m=>m!==source&&m.famille==='Meridja').forEach(m=>buff(m,2,2))},
    m2:{mode:'infini',blesse:({moi})=>soinHero(moi,3)}, m3:{mode:'infini',aura:true},
    m4:{mode:'eclair',jouer:({moi,source})=>{if(moi.plateau.some(m=>m.id==='m5'))buff(source,2,0);}}, m5:{mode:'infini',aura:true},
    m6:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='m6'&&!m.jeton);if(c)buff(c,1,0);}},
    m7:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='m7'&&!m.jeton);if(c)buff(c,0,1);}}, m8:{mode:'infini',aura:true},
    m11:{mode:'eclair',jouer:({moi,source})=>{const v=lancerDe();if(v%2===0)piocher(moi,1);else moi.manaActuel+=1;if(moi.plateau.some(x=>x.id==='m4')&&moi.plateau.some(x=>x.id==='m5'))buff(source,2,2);}},
    m12:{mode:'eclair',jouer:({moi,ennemi,source})=>{const v=lancerDe();degatsHero(ennemi,v);if(moi.plateau.some(x=>x.id==='m4')&&moi.plateau.some(x=>x.id==='m5'))buff(source,2,2);}},

    ma1:{mode:'eclair',jouer:({ennemi})=>ennemi.plateau.forEach(m=>{m.atk=Math.max(0,m.atk-2);fxSur(m,'-2 ⚔','degat');})},
    ma2:{mode:'infini',finTour:({moi})=>{piocher(moi,1);fxSurHero(moi,'Pioche','buff');}}, ma3:{mode:'infini',jouer:({moi})=>{moi.contreSort=true;}},
    ma4:{mode:'eclair',jouer:({moi})=>invoquerJeton(moi,'Chat protecteur',2,1,'🐈',['Provocation','Chat'])},
    ma5:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='ma5'&&!m.jeton);if(c)buff(c,1,1);}},
    ma6:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='ma6'&&!m.jeton);if(c)buff(c,0,2);}},
    ma7:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='ma7'&&!m.jeton);if(c)buff(c,2,0);}},
    ma8:{mode:'eclair',cible:{camp:'allie',texte:'Soigne une créature alliée'},jouer:({cible})=>{if(cible)soinCreature(cible,2);}},
    ma9:{mode:'infini',aura:true},
    ma11:{mode:'eclair',cible:{camp:'ennemi',hero:true,texte:'Choisis une cible à frapper'},jouer:({moi,source,cible})=>{const v=lancerDe();fraper(cible,v);if(moi.plateau.some(x=>x.id==='ma3')&&moi.plateau.some(x=>x.id==='ma4'))buff(source,2,2);}},

    k1:{mode:'infini',aura:true}, k2:{mode:'infini',finTour:({moi})=>soinHero(moi,3)}, k3:{mode:'infini',blesse:({source})=>{buff(source,3,0);}},
    k4:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='k4'&&!m.jeton);if(c)buff(c,1,1);}},
    k5:{mode:'eclair',jouer:({moi})=>soinHero(moi,2)}, k6:{mode:'infini',aura:true},
    k9:{mode:'eclair',jouer:({moi,source})=>{
        const ryma = moi.plateau.find(m=>m.id==='k4');
        if(ryma) buff(ryma,2,0);
        else { const c = hasard(moi.plateau.filter(m=>m!==source)); if(c) buff(c,1,0); }
    }},
    k10:{mode:'eclair',jouer:({moi,source})=>{
        const pile = lancerPileOuFace();
        if(pile) { source.vie = 0; fxSur(source,'💥','degat'); }
        else { const c = hasard(moi.plateau.filter(m=>m!==source)); if(c) buff(c,2,0); }
    }},

    ka1:{mode:'eclair',jouer:({moi,source})=>moi.plateau.filter(m=>m!==source&&m.famille==='Belgacemi').forEach(m=>buff(m,2,2))},
    ka2:{mode:'eclair',jouer:({moi})=>invoquerJeton(moi,'Bon repas',3,3,'🍲',[])},
    ka3:{mode:'eclair',jouer:({moi})=>{const s=moi.plateau.find(m=>m.id==='ka4');if(s)buff(s,s.atk,0);}},
    ka4:{mode:'eclair',jouer:({moi,source})=>{if(moi.plateau.some(m=>m.id==='ka3'))buff(source,0,4);}},
    ka5:{mode:'eclair',jouer:({moi})=>piocherType(moi,'Sort')},
    ka6:{mode:'eclair',cible:{camp:'ennemi',hero:true,texte:'Inflige 2 dégâts'},jouer:({cible})=>{if(cible)fraper(cible,2);}},
    ka7:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='ka7'&&!m.jeton);if(c)buff(c,0,2);}},
    ka8:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id!=='ka8'&&!m.jeton);if(c)buff(c,1,1);}},
    ka9:{mode:'eclair',jouer:({moi})=>{const k=moi.plateau.find(m=>m.id==='ka10');if(k)buff(k,1,1);}},
    ka10:{mode:'eclair',jouer:({moi})=>{const c=moi.plateau.find(m=>m.id==='ka9');if(c)buff(c,1,1);}},
    ka11:{mode:'eclair',cible:{camp:'allie',hero:true,texte:'Choisis une cible à soigner'},jouer:({moi,source,cible})=>{const v=lancerDe();soigner(cible,v);if(moi.plateau.some(x=>x.id==='ka3')&&moi.plateau.some(x=>x.id==='ka4'))buff(source,2,2);}},

    n1:{mode:'infini',finTour:({moi})=>moi.plateau.forEach(m=>soinCreature(m,99))},
    n2:{mode:'eclair',cible:{camp:'ennemi',texte:'Endors une créature ennemie'},jouer:({cible})=>{if(cible){cible.gele=2;fxSur(cible,'💤','buff');}}},
    n3:{mode:'eclair',jouer:({moi})=>soinHero(moi,2)},
    n4:{mode:'eclair',jouer:({ennemi})=>{if(ennemi.terrain)ennemi.terrain=null;}},
    n5:{mode:'eclair',jouer:({moi})=>{if(moi.terrain)piocher(moi,1);}},
    n6:{mode:'infini',aura:true}, n7:{mode:'infini',finTour:({moi})=>{const c=hasard(moi.plateau);if(c)buff(c,1,1);}},

    t1:{mode:'infini',aura:true}, t2:{mode:'infini',aura:true}, t3:{mode:'infini',finTourGlobal:()=>{soinHero(J,2);soinHero(B,2);}}, t4:{mode:'infini',aura:true},
    t5:{mode:'eclair',jouer:({moi})=>{const v=lancerDe();if(v<=3)degatsHero(moi,2);}}, t6:{mode:'eclair',jouer:({moi})=>{const pile=lancerPileOuFace();if(pile)moi.manaActuel+=1;}},
    t7:{mode:'eclair',jouer:({moi})=>{const v=lancerDe();if(v>=4)soinHero(moi,2);}}, t8:{mode:'eclair',jouer:({ennemi})=>{const pile=lancerPileOuFace();if(pile)defausseAleatoire(ennemi);}},
    t9:{mode:'infini',aura:true,finTourGlobal:()=>{}},

    s1:{mode:'eclair',cible:{camp:'ennemi',texte:'Renvoie une créature en main'},jouer:({cible,ennemi})=>{if(cible)renvoyerEnMain(cible,ennemi);}},
    s2:{mode:'eclair',jouer:({moi,ennemi})=>[...moi.plateau,...ennemi.plateau].forEach(m=>fraper(m,2))},
    s3:{mode:'eclair',jouer:({ennemi})=>{const c=hasard(ennemi.plateau);if(c){c.gele=1;fxSur(c,'💤','buff');}}},
    s4:{mode:'eclair',jouer:({moi})=>{defausseAleatoire(moi);moi.manaActuel+=3;}},
    s5:{mode:'eclair',cible:{camp:'ennemi',texte:'Force une créature à frapper un allié'},jouer:({cible,ennemi})=>{if(!cible)return;const victime=hasard(ennemi.plateau.filter(m=>m!==cible));if(victime)echangeDegats(cible,victime);}},
    s6:{mode:'eclair',cible:{camp:'ennemi',filtre:m=>atkTot(m)>=5,texte:'Détruit une créature'},jouer:({cible})=>{if(cible)fraper(cible,999);}},
    s7:{mode:'eclair',cible:{camp:'ennemi',texte:'Réduit l\'attaque à 1'},jouer:({cible})=>{if(cible){cible.atk=1;fxSur(cible,'⚔ 1','degat');}}},
    s8:{mode:'eclair',jouer:({moi})=>{moi.voitMainAdverse=2;}},
    s9:{mode:'eclair',cible:{camp:'allie',texte:'Donne +3/+3'},jouer:({cible})=>{if(cible)buff(cible,3,3);}},
    s10:{mode:'eclair',jouer:({ennemi})=>{for(let i=0;i<3;i++){const c=hasard(ennemi.plateau);if(c)fraper(c,1);else degatsHero(ennemi,1);}}},
    s11:{mode:'eclair',jouer:({moi,ennemi})=>{moi.surcout=2;ennemi.surcout=2;}},
    s12:{mode:'eclair',cible:{camp:'tous',texte:'Réduit une créature au silence'},jouer:({cible})=>{if(cible)silencer(cible);}},
    s13:{mode:'eclair',jouer:({moi})=>piocherAleatoire(moi)},
    s14:{mode:'eclair',cible:{camp:'ennemi',texte:'Transforme'},jouer:({cible})=>{if(cible)transformer(cible);}},
    s15:{mode:'eclair',jouer:({moi})=>{while(moi.plateau.length<5)invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',[]);}},
    s16:{mode:'eclair',jouer:({moi})=>{moi.manaActuel+=1;}},
    s17:{mode:'eclair',jouer:({moi,ennemi})=>{moi.terrain=null;ennemi.terrain=null;degatsHero(ennemi,3);}},
    s18:{mode:'eclair',jouer:({moi})=>piocher(moi,moi.plateau.some(m=>m.id==='n1'||m.id==='n2')?3:2)},
    s19:{mode:'eclair',jouer:({ennemi})=>defausseAleatoire(ennemi)},
    s20:{mode:'eclair',cible:{camp:'allie',texte:'Donne Charge'},jouer:({cible})=>{if(!cible)return;if(!cible.motsCles.includes('Charge'))cible.motsCles.push('Charge');cible.malade=false;fxSur(cible,'Charge !','buff');}},
    s21:{mode:'eclair',jouer:({ennemi})=>{ennemi.pioceBloquee=true;}},
    s22:{mode:'eclair',cible:{camp:'ennemi',texte:'Inflige 3 dégâts'},jouer:({cible})=>{if(cible)fraper(cible,3);}},
    s23:{mode:'eclair',jouer:({moi})=>piocher(moi,1)},
    s24:{mode:'eclair',cible:{camp:'tous',texte:'Échange attaque et vie'},jouer:({cible})=>{if(!cible)return;const a=cible.atk,v=cible.vie;cible.atk=Math.max(0,v);cible.vie=Math.max(1,a);cible.vieMax=cible.vie;fxSur(cible,'🔀','buff');}},
    s25:{mode:'eclair',jouer:({moi})=>{invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',[]);invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',[]);}},
    s26:{mode:'eclair',jouer:({moi,ennemi})=>{moi.terrain=null;ennemi.terrain=null;}},
    s27:{mode:'eclair',cible:{camp:'ennemi',texte:'Endort une créature pour un tour'},jouer:({cible})=>{if(cible){cible.gele=1;fxSur(cible,'💤','buff');}}},
    s28:{mode:'eclair',jouer:({moi})=>moi.plateau.forEach(m=>buff(m,1,1))},
    s29:{mode:'eclair',jouer:({ennemi})=>ennemi.plateau.filter(m=>m.vie<=3).forEach(m=>fraper(m,999))},
    s30:{mode:'eclair',cible:{camp:'allie',texte:'Transforme une créature alliée'},jouer:({cible})=>{if(cible)transformerEn(cible,'Vase précieux',0,5,'🏺',['Provocation']);}},
    s31:{mode:'eclair',cible:{camp:'tous',hero:true,texte:'Choisis un personnage'},jouer:({cible})=>{const pile=lancerPileOuFace();if(pile)soigner(cible,1);else fraper(cible,1);}},
    s32:{mode:'eclair',jouer:({moi})=>{const n=moi.plateau.some(m=>m.id==='ka10')?3:2;piocher(moi,n);}},
    s33:{mode:'eclair',cible:{camp:'allie',texte:'Choisis une créature'},jouer:({moi,cible})=>{if(cible){const v=moi.plateau.some(m=>m.id==='ka11')?3:2;buff(cible,0,v);}}},
    s34:{mode:'eclair',cible:{camp:'allie',texte:'Choisis une créature'},jouer:({moi,cible})=>{if(cible){if(!cible.motsCles.includes('Charge'))cible.motsCles.push('Charge');cible.malade=false;if(moi.plateau.some(m=>m.id==='ka7'))buff(cible,2,0);}}},
    s35:{mode:'eclair',jouer:({moi})=>moi.plateau.forEach(m=>soinCreature(m,2))},
    s36:{mode:'eclair',cible:{camp:'ennemi',texte:'Choisis une créature'},jouer:({cible})=>{if(cible){cible.gele=1;fxSur(cible,'💤','buff');}}},
    s37:{mode:'eclair',jouer:({ennemi})=>ennemi.plateau.forEach(m=>{m.gele=1;fxSur(m,'💤','buff');})},
    s38:{mode:'eclair',jouer:({moi})=>{moi.manaActuel+=2;}},
    s39:{mode:'eclair',jouer:({moi})=>moi.plateau.forEach(m=>buff(m,2,2))},
    s40:{mode:'eclair',jouer:({ennemi})=>ennemi.plateau.forEach(m=>{m.atk=Math.max(0,m.atk-2);fxSur(m,'-2 ⚔','degat');})},

    sb1:{mode:'eclair',cible:{camp:'allie',filtre:m=>m.motsCles.includes('Bluff'),texte:'Choisis une créature Bluff'},jouer:({cible})=>{if(cible)revelerBluff(cible,{buff:[2,2]});}},
    sb2:{mode:'eclair',cible:{camp:'allie',filtre:m=>m.motsCles.includes('Bluff'),texte:'Choisis une créature Bluff'},jouer:({cible,ennemi})=>{if(cible){revelerBluff(cible,{degatsHero:3});degatsHero(ennemi,3);}}},
    sb3:{mode:'eclair',cible:{camp:'allie',filtre:m=>m.motsCles.includes('Bluff'),texte:'Choisis une créature Bluff'},jouer:({cible,moi})=>{if(cible){revelerBluff(cible,{pioche:1});piocher(moi,1);}}},
    sb4:{mode:'eclair',cible:{camp:'allie',filtre:m=>m.motsCles.includes('Bluff'),texte:'Choisis une créature Bluff'},jouer:({cible,ennemi})=>{if(cible){revelerBluff(cible,{detruireCible:true});if(ennemi.plateau.length)fraper(hasard(ennemi.plateau),999);}}},
    sb5:{mode:'eclair',jouer:({moi})=>{moi.plateau.filter(m=>m.motsCles.includes('Bluff')).forEach(m=>revelerBluff(m,{buff:[3,3],charge:true}));}},

    f1:{mode:'eclair',jouer:({ennemi})=>{for(let i=0;i<4;i++){const c=hasard(ennemi.plateau);if(c)fraper(c,1);else degatsHero(ennemi,1);}}},
    f2:{mode:'eclair',jouer:({moi,source})=>moi.plateau.filter(m=>m!==source).forEach(m=>buff(m,3,3))},
    f3:{mode:'eclair',jouer:({moi})=>{moi.contreSort=true;piocher(moi,1);}},
    f4:{mode:'eclair',jouer:({moi})=>{soinHero(moi,5);}},
    f5:{mode:'eclair',jouer:({moi})=>{if(!moi.plateau.some(m=>m.id==='ka11'))invoquerJeton(moi,'Hanna',3,2,'👧🏻',[]);}},
   f6:{mode:'eclair',jouer:({moi})=>{
    // Invoque Asma (k5) : son propre cri de guerre s'applique (soin 2)
    if(moi.plateau.length >= 5) return;
    const asma = instancier(defCarte('k5'), moi.cle, false);
    if(!asma) return;
    asma.malade = true;
    moi.plateau.push(asma);
    // Déclenche le cri de guerre d'Asma
    const pAsma = POUVOIRS['k5'];
    if(pAsma && pAsma.jouer) pAsma.jouer({moi, ennemi:autre(moi), source:asma, cible:null});
    fxSur(asma, 'Invoquée !', 'buff');
    jouerSon('summon');
}},

    c1:{mode:'infini',destruction:({ennemi})=>{ennemi.plateau.forEach(m=>fraper(m,3));degatsHero(ennemi,3);}},
    c2:{mode:'infini',blesse:({source})=>{if(!source.motsCles.includes('Charge')){source.motsCles.push('Charge');source.malade=false;fxSur(source,'Charge !','buff');}buff(source,2,0);}},
    c3:{mode:'infini',blesse:({moi})=>{piocher(moi,1);}},
    c4:{mode:'infini',destruction:({moi})=>{soinHero(moi,4);}},
    c5:{mode:'infini',blesse:({ennemi})=>{degatsHero(ennemi,2);}},
    c6:{mode:'infini',destruction:({moi})=>{const c=hasard(moi.plateau);if(c)buff(c,2,2);}},
    c7:{mode:'infini',blesse:({source})=>{buff(source,1,1);}},
    c8:{mode:'infini',destruction:({ennemi})=>{const cible=[...ennemi.plateau].sort((a,b)=>atkTot(b)-atkTot(a))[0];if(cible)fraper(cible,999);}},
    c9:{mode:'eclair',jouer:({moi})=>{moi.plateau.forEach(m=>fraper(m,1));piocher(moi,2);}},
    c10:{mode:'eclair',jouer:({moi})=>{invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',['Provocation']);invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',['Provocation']);}},
    c11:{mode:'eclair',jouer:({moi,ennemi})=>{moi.plateau.forEach(m=>{const p=POUVOIRS[m.id];if(p&&p.destruction&&!m.silence)p.destruction({moi,ennemi,source:m});});}},
    c12:{mode:'infini',aura:true}
};

dbCartes.forEach(function(c) {
    if (!POUVOIRS[c.id] && c.motsCles.some(k => k === 'Charge' || k === 'Provocation')) POUVOIRS[c.id] = { mode:'infini', aura:true };
    if ((c.motsCles.includes('Rage') || c.motsCles.includes('Destruction')) && !POUVOIRS[c.id]) POUVOIRS[c.id] = { mode:'infini' };
});

function modePouvoir(carte) { const p = POUVOIRS[carte.id]; if (!p) return null; return p.mode; }

var decksPreconstruitsBrut = [
    { nom:'Meridja Aggro',   cartes:['m1','m2','m3','m4','m4','m5','m5','m6','m6','m7','m7','m8','m8','m9','m9','m10','n1','n2','m11','m12'] },
    { nom:'Marouf Contrôle', cartes:['ma1','ma2','ma3','ma4','ma5','ma5','ma6','ma6','ma7','ma7','ma8','ma8','ma9','ma9','ma10','ma10','n1','n2','s1','ma11'] },
    { nom:'Kerkache Défense',cartes:['k1','k2','k3','k4','k4','k5','k5','k6','k6','k7','k7','k8','k8','k9','k10','s2','s5','s6','s11','f6'] },
    { nom:'Belgacemi Synergie', cartes:['ka1','ka2','ka3','ka4','ka5','ka5','ka6','ka6','ka7','ka7','ka8','ka8','ka9','ka9','ka10','ka10','n1','n2','s15','ka11'] },
    { nom:'Les Infiltrés', cartes:['f1','f2','f3','f4','f5','ka5','ka6','m4','m5','ma3','ma4','ka7','ka8','ka3','ka4','m11','m12','ma11','ka11','n7'] },
    { nom:'Alliance des Cousins', cartes:['c7','c7','c4','c4','c9','c9','c3','c3','c12','c12','c6','c6','c5','c5','c10','c10','c2','c11','c8','c1'] },
    { nom:'Les Turbulents', cartes:['tb1','tb1','tb2','tb2','tb3','tb3','tb4','tb4','tb5','tb5','tb6','tb6','tb7','tb8','tb9','tb10','sb1','sb2','sb3','t9'] }
];

var decksPreconstruits = decksPreconstruitsBrut.map(function(d) {
    return {
        nom: d.nom,
        cartes: d.cartes.map(function(id) { return { id: id, rarete: defCarte(id) ? defCarte(id).rarete : 'commune' }; })
    };
});

/* ===========================================================
   HELPERS COLLECTION
   =========================================================== */
function bonusActif() { return profil.bonusTemporaire && profil.bonusTemporaire.expireAt > Date.now(); }

function initColl(id) {
    if (!collectionJoueur[id] || typeof collectionJoueur[id] === 'number') {
        const defR = defCarte(id) ? defCarte(id).rarete : 'commune';
        const oldQty = typeof collectionJoueur[id] === 'number' ? collectionJoueur[id] : 0;
        collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0 };
        collectionJoueur[id][defR] = oldQty;
    }
    if (collectionJoueur[id].fusion !== undefined) delete collectionJoueur[id].fusion;
    if (collectionJoueur[id].unifiee !== undefined) delete collectionJoueur[id].unifiee;
    if (bonusActif()) {
        if (!collectionJoueur[id]._bonus3) {
            collectionJoueur[id].commune += 3;
            collectionJoueur[id].rare += 3;
            collectionJoueur[id].epique += 3;
            collectionJoueur[id].legendaire += 3;
            collectionJoueur[id]._bonus3 = true;
        }
    } else if (collectionJoueur[id]._bonus3) {
        collectionJoueur[id].commune = Math.max(0, collectionJoueur[id].commune - 3);
        collectionJoueur[id].rare = Math.max(0, collectionJoueur[id].rare - 3);
        collectionJoueur[id].epique = Math.max(0, collectionJoueur[id].epique - 3);
        collectionJoueur[id].legendaire = Math.max(0, collectionJoueur[id].legendaire - 3);
        delete collectionJoueur[id]._bonus3;
    }
}
function getTot(id) {
    initColl(id);
    const c = collectionJoueur[id];
    return c.commune + c.rare + c.epique + c.legendaire;
}
function getHighRarity(id) {
    initColl(id);
    const o = ['legendaire','epique','rare','commune'];
    for (let i = 0; i < o.length; i++) { if (collectionJoueur[id][o[i]] > 0) return o[i]; }
    return defCarte(id) ? defCarte(id).rarete : 'commune';
}

function formatCoins(c) { return c >= 999999 ? '∞' : c; }

function majTopBarCoins() {
    const el = document.getElementById('nav-coins');
    if (el) el.innerText = formatCoins(profil.coins) + " 💰";
    const lv = document.getElementById('nav-level');
    if (lv) lv.innerText = 'Niv. ' + (profil.niveau || 1);
}

function genererCodeAmi() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FT-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function dbCartesDispo() {
    const banned = window.cartesBannies || [];
    return dbCartes.filter(c => !banned.includes(c.id));
}
function carteEstBannie(id) { return (window.cartesBannies || []).includes(id); }

/* ===========================================================
   XP / NIVEAUX
   =========================================================== */
function xpRequis(niveau) { return 100 + (niveau - 1) * 50; }

function ajouterXP(n) {
    profil.xp = (profil.xp || 0) + n;
    let levelUp = false;
    while (profil.xp >= xpRequis(profil.niveau)) {
        profil.xp -= xpRequis(profil.niveau);
        profil.niveau++;
        levelUp = true;
    }
    if (levelUp) {
        afficherLevelUp(profil.niveau);
        jouerSon('levelup');
    }
    sauvegarderProgression();
    majTopBarCoins();
    majProfilUI();
}

function afficherLevelUp(niveau) {
    const ov = document.getElementById('levelup-overlay');
    const num = document.getElementById('levelup-num');
    const reward = document.getElementById('levelup-reward');
    if (num) num.innerText = niveau;
    if (reward) {
        if (niveau % 5 === 0) {
            reward.innerText = '+' + ECO.niveauGain5 + ' 💰 et +1 booster gratuit !';
            profil.coins += ECO.niveauGain5;
        } else {
            reward.innerText = '+' + ECO.niveauGain + ' 💰';
            profil.coins += ECO.niveauGain;
        }
    }
    if (ov) ov.classList.add('open');
}
function fermerLevelUp() {
    const ov = document.getElementById('levelup-overlay');
    if (ov) ov.classList.remove('open');
}

function majProfilUI() {
    const xpBar = document.getElementById('xp-bar');
    const xpTxt = document.getElementById('profil-xp');
    const nivTxt = document.getElementById('profil-niveau');
    const req = xpRequis(profil.niveau);
    const pct = Math.min(100, ((profil.xp || 0) / req) * 100);
    if (xpBar) xpBar.style.width = pct + '%';
    if (xpTxt) xpTxt.innerText = 'XP : ' + (profil.xp || 0) + ' / ' + req;
    if (nivTxt) nivTxt.innerText = 'Niveau ' + profil.niveau;
}

/* ===========================================================
   QUÊTES
   =========================================================== */
function jourActuel() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

function genererQuetes() {
    const pool = [
        { id:'jouer_bot',      titre:'Jouer 3 parties contre le bot',    cible:3,  recomp:100, type:'parties_bot' },
        { id:'gagner_bot',     titre:'Gagner 2 parties contre le bot',   cible:2,  recomp:150, type:'victoires_bot' },
        { id:'jouer_multi',    titre:'Jouer 1 partie multijoueur',       cible:1,  recomp:200, type:'parties_multi' },
        { id:'gagner_multi',   titre:'Gagner 1 partie multijoueur',      cible:1,  recomp:300, type:'victoires_multi' },
        { id:'booster',        titre:'Ouvrir 1 booster',                 cible:1,  recomp:30,  type:'boosters' },
        { id:'cartes_jouees',  titre:'Jouer 20 cartes',                  cible:20, recomp:100, type:'cartes_jouees' },
        { id:'degats',         titre:'Infliger 30 dégâts au total',      cible:30, recomp:150, type:'degats_total' },
        { id:'tuto',           titre:'Terminer une étape du tutoriel',   cible:1,  recomp:80,  type:'tutos' }
    ];
    pool.sort(() => Math.random() - 0.5);
    profil.quetes = pool.slice(0, 3).map(q => ({ ...q, progress: 0, claimed: false }));
    profil.quetesDate = jourActuel();
}
function verifierResetQuetes() {
    if (profil.quetesDate !== jourActuel()) {
        genererQuetes();
        sauvegarderProgression();
    }
}
function progresserQuete(type, montant) {
    montant = montant || 1;
    if (!Array.isArray(profil.quetes)) return;
    profil.quetes.forEach(q => {
        if (q.type === type && !q.claimed) {
            q.progress = Math.min(q.cible, (q.progress || 0) + montant);
            if (q.progress >= q.cible && !q.claimed) flashInfo(`✅ Quête accomplie : ${q.titre}`);
        }
    });
    sauvegarderProgression();
}
function ouvrirQuetes() {
    verifierResetQuetes();
    afficherQuetes();
    const ov = document.getElementById('quetes-overlay');
    if (ov) ov.classList.add('open');
}
function fermerQuetes() { const ov = document.getElementById('quetes-overlay'); if (ov) ov.classList.remove('open'); }
function afficherQuetes() {
    const box = document.getElementById('quetes-liste');
    if (!box) return;
    box.innerHTML = '';
    (profil.quetes || []).forEach((q, i) => {
        const el = document.createElement('div');
        el.className = 'quete-item' + (q.claimed ? ' complete' : '');
        const pct = Math.min(100, ((q.progress || 0) / q.cible) * 100);
        el.innerHTML = `
            <div class="q-info">
                <div class="q-titre">${q.titre}</div>
                <div class="q-bar-outer"><div class="q-bar-inner" style="width:${pct}%"></div></div>
                <div class="hint" style="font-size:11px;margin-top:4px;">${q.progress || 0} / ${q.cible}</div>
            </div>
            <div style="text-align:right;">
                <div class="q-recomp">+${Math.round(q.recomp * ECO.multQuetes / 100)}💰</div>
                <button onclick="recupererQuete(${i})" ${(!q.claimed && q.progress >= q.cible) ? '' : 'disabled'}>${q.claimed ? '✓' : 'Récupérer'}</button>
            </div>
        `;
        box.appendChild(el);
    });
}
function recupererQuete(i) {
    const q = profil.quetes[i];
    if (!q || q.claimed || q.progress < q.cible) return;
    profil.coins += Math.round(q.recomp * ECO.multQuetes / 100);
    q.claimed = true;
    ajouterXP(20);
    sauvegarderProgression();
    majTopBarCoins();
    jouerSon('coin');
    flashInfo(`+${Math.round(q.recomp * ECO.multQuetes / 100)} 💰 !`);
    afficherQuetes();
}

/* ===========================================================
   CONNEXION JOURNALIÈRE
   =========================================================== */
function verifierConnexionJournaliere() {
    const now = Date.now();
    const dernier = profil.derniereConnexion || 0;
    const unJour = 86400000;
    const deuxJours = 2 * unJour;
    if (now - dernier > deuxJours) profil.streak = 0;
    if (now - dernier < unJour && profil.streak > 0) return;
    setTimeout(() => {
        const ov = document.getElementById('daily-overlay');
        if (!ov) return;
        const row = document.getElementById('daily-streak-row');
        if (row) {
            row.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const d = document.createElement('div');
                d.className = 'daily-day' + (i < profil.streak ? ' claimed' : (i === profil.streak ? ' active' : ''));
                d.textContent = i === profil.streak ? '🎁' : (i + 1);
                row.appendChild(d);
            }
        }
        const gain = ECO.bonusQuotidien + profil.streak * ECO.bonusSerie;
        const btn = document.getElementById('btn-daily-claim');
        if (btn) btn.innerHTML = `<span class="btn-icon">🎁</span><span class="btn-label"><span class="btn-title">Récupérer</span><span class="btn-sub">+${gain} 💰</span></span><span class="btn-arrow">▶</span>`;
        ov.classList.add('open');
    }, 800);
}
function recupererRecompenseQuotidienne() {
    const gain = ECO.bonusQuotidien + profil.streak * ECO.bonusSerie;
    profil.coins += gain;
    profil.streak = Math.min(7, profil.streak + 1);
    profil.derniereConnexion = Date.now();
    ajouterXP(15);
    sauvegarderProgression();
    majTopBarCoins();
    jouerSon('coin');
    flashInfo(`🎁 +${gain} 💰`);
    fermerDailyOverlay();
}
function fermerDailyOverlay() {
    const ov = document.getElementById('daily-overlay');
    if (ov) ov.classList.remove('open');
}

/* ===========================================================
   SAUVEGARDE
   =========================================================== */
function sanitizeSave() {
    if (!profil.avatar) profil.avatar = '🧑';
    if (!profil.codeAmi) profil.codeAmi = genererCodeAmi();
    if (!Array.isArray(profil.amis)) profil.amis = [];
    if (!Array.isArray(profil.demandesAmisRecues)) profil.demandesAmisRecues = [];
    if (!Array.isArray(profil.demandesAmisEnvoyees)) profil.demandesAmisEnvoyees = [];
    if (!Array.isArray(profil.decksSupprimes)) profil.decksSupprimes = [];
    if (!profil.statsDecks || typeof profil.statsDecks !== 'object') profil.statsDecks = {};
    if (!profil.statsCartes || typeof profil.statsCartes !== 'object') profil.statsCartes = {};
    if (!profil.messagesAmi || typeof profil.messagesAmi !== 'object') profil.messagesAmi = {};
    if (!profil.xp) profil.xp = 0;
    if (!profil.niveau) profil.niveau = 1;
    if (!profil.streak) profil.streak = 0;
    if (!Array.isArray(profil.quetes)) profil.quetes = [];
    if (!profil.quetesDate) profil.quetesDate = '';
    if (!profil.deckStats || typeof profil.deckStats !== 'object') profil.deckStats = {};
    if (!Array.isArray(profil.historique)) profil.historique = [];
    if (!Array.isArray(profil.tutoCartesGagnees)) profil.tutoCartesGagnees = [];
    if (!Array.isArray(profil.tutoSkipped)) profil.tutoSkipped = [];
    if (!profil.tutoCoinsGagnes) profil.tutoCoinsGagnes = 0;

    if (typeof collectionJoueur === 'object' && collectionJoueur !== null) {
        for (let id in collectionJoueur) {
            if (typeof collectionJoueur[id] === 'number') {
                let oldVal = collectionJoueur[id];
                let defR = defCarte(id) ? defCarte(id).rarete : 'commune';
                collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0 };
                collectionJoueur[id][defR] = oldVal;
            }
            if (collectionJoueur[id].fusion) {
                collectionJoueur[id].legendaire = (collectionJoueur[id].legendaire || 0) + collectionJoueur[id].fusion;
                delete collectionJoueur[id].fusion;
            }
            if (collectionJoueur[id].unifiee) {
                collectionJoueur[id].legendaire = (collectionJoueur[id].legendaire || 0) + collectionJoueur[id].unifiee;
                delete collectionJoueur[id].unifiee;
            }
        }
    } else collectionJoueur = {};

    if (!Array.isArray(mesDecks)) mesDecks = [];
    mesDecks.forEach(d => {
        if (!d.cartes) d.cartes = [];
        d.cartes = d.cartes.map(c => {
            if (typeof c === 'string') {
                let def = defCarte(c);
                return def ? { id: c, rarete: def.rarete } : null;
            }
            if (c && c.id && defCarte(c.id)) return { id: c.id, rarete: defCarte(c.id).rarete };
            return null;
        }).filter(c => c !== null);
    });

    const decksPersonnalises = mesDecks.filter(d => !d.base);
    const decksPreconstruitsActuels = decksPreconstruits
        .filter(dp => !profil.decksSupprimes.includes(dp.nom))
        .map(dp => ({ nom: dp.nom, cartes: dp.cartes.map(c => ({ ...c })), base: true }));
    mesDecks.length = 0;
    mesDecks.push(...decksPersonnalises, ...decksPreconstruitsActuels);
}

function chargerProgression(email) {
    if (email === 'nassim57132@gmail.com') profil.coins = 9999999;
    try {
        const cle = 'ftcg_save_' + (typeof monId !== 'undefined' && monId ? monId : 'local');
        const brut = localStorage.getItem(cle);
        if (brut) {
            const data = JSON.parse(brut);
            if (data.profil) profil = Object.assign(profil, data.profil);
            if (data.collectionJoueur) collectionJoueur = data.collectionJoueur;
            if (data.mesDecks) mesDecks = data.mesDecks;
        }
    } catch (e) { console.error("Erreur chargement save", e); }

    sanitizeSave();

    if (email === 'nassim57132@gmail.com') {
        profil.coins = 9999999;
        dbCartes.forEach(c => {
            initColl(c.id);
            collectionJoueur[c.id].commune = 10;
            collectionJoueur[c.id].rare = 10;
            collectionJoueur[c.id].epique = 10;
            collectionJoueur[c.id].legendaire = 10;
        });
    }

    verifierResetQuetes();

    const maintenant = Date.now();
    if (maintenant - profil.lastLogin > 86400000) {
        if (email !== 'nassim57132@gmail.com') profil.coins += ECO.bonusQuotidien;
        profil.lastLogin = maintenant;
        flashInfo("🎁 Bonus quotidien : +" + ECO.bonusQuotidien + " 💰 !");
    }

    if (!profil.deckStart && email !== 'nassim57132@gmail.com') {
        setTimeout(() => ouvrirChoixStarter(), 600);
    }

    if (!profil.deckParDefaut) {
        const complet = mesDecks.findIndex(d => calculerCartesPossedeesPourDeck(d.cartes) === 20);
        if (complet >= 0) profil.deckParDefaut = mesDecks[complet].nom;
    }

    sauvegarderProgression();
    majTopBarCoins();
    majTutoUI();
    majProfilUI();
    verifierConnexionJournaliere();
}

function sauvegarderProgression() {
    sanitizeSave();
    const data = { profil: profil, collectionJoueur: collectionJoueur, mesDecks: mesDecks };
    try { localStorage.setItem('ftcg_save_' + (typeof monId !== 'undefined' && monId ? monId : 'local'), JSON.stringify(data)); } catch (e) {}
    if (typeof fbDB !== 'undefined' && fbDB && typeof monId !== 'undefined' && monId) {
        try { fbDB.ref('profils/' + monId + '/save').set(data); } catch(e) {}
        try {
            fbDB.ref('profils/' + monId + '/public').set({
                pseudo: J.nom,
                pseudoNorm: (typeof monPseudo !== 'undefined' ? monPseudo : null) || (J.nom || '').toLowerCase(),
                codeAmi: profil.codeAmi,
                avatar: profil.avatar,
                niveau: profil.niveau,
                elo: profil.elo || 1000, titre: profil.titre || '',
                lastSeen: Date.now()
            });
        } catch(e) {}
    }
    majTopBarCoins();
}

/* ===========================================================
   STARTER
   =========================================================== */
function ouvrirChoixStarter() {
    const ov = document.getElementById('starter-overlay');
    if (ov) ov.classList.add('open');
}
/** Deck de départ : 20 cartes, UNIQUEMENT des communes (famille choisie, puis neutres, puis sorts peu coûteux). */
function construireDeckDeBase(famille) {
    const communes = dbCartes.filter(c => c.rarete === 'commune' && c.famille !== 'Terrain' && !/^cp\d/.test(c.id));
    const fam = communes.filter(c => c.famille === famille);
    const neutres = communes.filter(c => c.famille === 'Neutre');
    const sorts = communes.filter(c => c.famille === 'Sort').sort((x, y) => x.cout - y.cout);
    const deck = [], nb = {};
    const ajouter = c => { if ((nb[c.id] || 0) >= 2 || deck.length >= 20) return; nb[c.id] = (nb[c.id] || 0) + 1; deck.push(c.id); };
    [fam, neutres, sorts].forEach(liste => { for (let passe = 0; passe < 2; passe++) liste.forEach(ajouter); });
    return deck;
}
function choisirStarter(famille) {
    const ov = document.getElementById('starter-overlay');
    if (ov) ov.classList.remove('open');
    const famillesDeBase = ['Meridja', 'Marouf', 'Kerkache', 'Belgacemi'];
    let familleChoisie = famille;
    let auto = false;
    if (!familleChoisie) { familleChoisie = famillesDeBase[Math.floor(Math.random() * famillesDeBase.length)]; auto = true; }
    const ids = construireDeckDeBase(familleChoisie);
    const compte = {};
    ids.forEach(id => { compte[id] = (compte[id] || 0) + 1; });
    Object.entries(compte).forEach(([id, qte]) => {
        initColl(id);
        collectionJoueur[id].commune = (collectionJoueur[id].commune || 0) + qte;
    });
    const nomDeck = 'Départ ' + familleChoisie;
    mesDecks = mesDecks.filter(d => d.nom !== nomDeck);
    mesDecks.push({ nom: nomDeck, cartes: ids.map(id => ({ id: id, rarete: 'commune' })), base: false });
    profil.deckStart = true;
    profil.coins += ECO.deckDepart;
    profil.deckParDefaut = nomDeck;
    sauvegarderProgression();
    majTopBarCoins();
    setTimeout(() => { alert(`🎉 Tu as choisi la famille ${familleChoisie}${auto ? ' (choix aléatoire)' : ''} !\n\nTu as reçu un deck de 20 cartes communes + ${ECO.deckDepart} 💰.\nDeck par défaut : ${nomDeck}`); }, 200);
}

function calculerCartesPossedeesPourDeck(cartesDeck) {
    let owned = 0;
    let tempColl = {};
    for (let id in collectionJoueur) if (collectionJoueur[id] && typeof collectionJoueur[id] === 'object') tempColl[id] = { ...collectionJoueur[id] };
    cartesDeck.forEach(c => {
        const id = typeof c === 'string' ? c : c.id;
        if (!id || !defCarte(id)) return;
        initColl(id);
        const rDefaut = defCarte(id).rarete;
        const rDemande = (typeof c === 'string') ? rDefaut : (c.rarete || rDefaut);
        if (tempColl[id] && tempColl[id][rDemande] && tempColl[id][rDemande] > 0) { owned++; tempColl[id][rDemande]--; return; }
        const raretes = ['commune','rare','epique','legendaire'];
        for (const r of raretes) {
            if (tempColl[id] && tempColl[id][r] && tempColl[id][r] > 0) { owned++; tempColl[id][r]--; return; }
        }
    });
    return owned;
}

function nouveauCote(cle, nom) { return { cle:cle, nom:nom, patience:20, manaActuel:0, manaMax:0, main:[], plateau:[], deck:[], terrain:null, terrainTours:0, surcout:0, contreSort:false, voitMainAdverse:0, pioceBloquee:false, numTour:0, premier:false, cimetiere:[] }; }
var J = nouveauCote('J', 'Toi'), B = nouveauCote('B', 'Bot');

const autre = s => (s === J ? B : J);
const hasard = a => (a && a.length ? a[Math.floor(getSyncRandom() * a.length)] : null);
const pause = ms => new Promise(r => setTimeout(r, ms));
const atkTot = m => Math.max(0, m.atk + (m.auraAtk || 0));
const estChat = m => m.motsCles.includes('Chat');

function instancier(def, cle, jeton, overrideRarete) {
    if (!def) return null;
    return {
        uid:'u'+(uidSeq++),
        id:def.id,
        prenom:def.prenom,
        famille:def.famille,
        cout:def.cout,
        atk:def.atk,
        vie:def.vie,
        vieMax:def.vie,
        rarete: overrideRarete || def.rarete,
        desc:def.desc,
        emoji:def.emoji,
        motsCles:[...def.motsCles],
        cote:cle,
        auraAtk:0,
        auraVieAppliquee:0,
        aAttaque:false,
        malade:true,
        gele:0,
        silence:false,
        jeton:!!jeton,
        revele: !def.motsCles.includes('Bluff'),
        bluffVisible: false,
        bluffReveleSansEffet: false
    };
}

function recordCarteJouee(idCarte) {
    if (!idCarte) return;
    if (!profil.statsCartes) profil.statsCartes = {};
    profil.statsCartes[idCarte] = (profil.statsCartes[idCarte] || 0) + 1;
    progresserQuete('cartes_jouees', 1);
}
function recordDeckJoue(nomDeck) {
    if (!nomDeck) return;
    if (!profil.statsDecks) profil.statsDecks = {};
    profil.statsDecks[nomDeck] = (profil.statsDecks[nomDeck] || 0) + 1;
}
function enregistrerVictoire(nomDeck, gagne) {
    if (!nomDeck) return;
    if (!profil.deckStats) profil.deckStats = {};
    if (!profil.deckStats[nomDeck]) profil.deckStats[nomDeck] = { parties:0, victoires:0, defaites:0 };
    profil.deckStats[nomDeck].parties++;
    if (gagne) profil.deckStats[nomDeck].victoires++;
    else profil.deckStats[nomDeck].defaites++;
}

/* ===========================================================
   NAVIGATION
   =========================================================== */
function tenterChangerEcran(id) {
    const gs = document.getElementById('game-screen');
    const enPartie = gs && gs.classList.contains('active') && !partieFinie && !modeTuto;
    if (enPartie && id !== 'game-screen') {
        const ov = document.getElementById('confirm-exit-overlay');
        if (ov) ov.classList.add('open');
        window._ecranDemande = id;
        return;
    }
    changerEcran(id);
}
function confirmerSortie() {
    const ov = document.getElementById('confirm-exit-overlay');
    if (ov) ov.classList.remove('open');
    partieFinie = true; clearInterval(timer); annulerCiblage(); selection = null;
    enregistrerResultat(false, modeEnLigne ? 'multi' : 'bot');
    try { if (modeEnLigne) appliquerElo(false); } catch (e) {}
    window._modeSpecial = null;
    banniere('Forfait… Défaite');
    if (window.multiPartie && window.multiPartie.active && typeof signalerForfaitEnLigne === 'function') signalerForfaitEnLigne();
    const cible = window._ecranDemande || 'menu-screen';
    window._ecranDemande = null;
    setTimeout(() => { changerEcran(cible); }, 800);
}
function annulerSortie() {
    const ov = document.getElementById('confirm-exit-overlay');
    if (ov) ov.classList.remove('open');
    window._ecranDemande = null;
}
function changerEcran(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const cible = document.getElementById(id);
    if (cible) cible.classList.add('active');
    const nav = document.getElementById('main-nav');
    if (nav) { if(id !== 'login-screen') nav.classList.remove('hidden'); else nav.classList.add('hidden'); }
    
    const bfNav = document.getElementById('btn-forfait');
    if (bfNav) bfNav.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    
    const btnToggleNav = document.getElementById('btn-toggle-nav');
    if (btnToggleNav) btnToggleNav.classList.add('hidden');

    if (id === 'game-screen') {
        document.body.classList.add('game-in-progress');
    } else {
        document.body.classList.remove('game-in-progress');
        if (nav) nav.classList.remove('show-over-game');
    }

    if (id === 'deckbuilder-screen') chargerListeDecks();
    if (id === 'collection-screen') { afficherBoutique(triCourant); setTimeout(majCollectionHeader, 50); }
    if (id === 'menu-screen') { chargerDropdownDecks(); verifierResetQuetes(); }
    if (id === 'profil-screen') afficherProfil();
    if (id === 'tuto-screen') majTutoUI();
    if (id === 'multi-screen' && typeof rafraichirJoueurs === 'function') rafraichirJoueurs();
    if (id === 'admin-screen') adminTab('actions');
    if (id === 'spectateur-screen') rafraichirSpectateur();
    if (id === 'tournoi-screen') afficherEtatTournoi();

    document.querySelectorAll('#main-nav button[data-screen]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === id);
    });

    const links = document.querySelector('.nav-links');
    if (links) links.classList.remove('open');
}
function toggleNavMenu() {
    const links = document.querySelector('.nav-links');
    if (links) links.classList.toggle('open');
}
function toggleNavGame() {
    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.toggle('show-over-game');
}
function ouvrirAide() { const el = document.getElementById('aide-overlay'); if(el) el.classList.add('open'); }
function fermerAide() { const el = document.getElementById('aide-overlay'); if(el) el.classList.remove('open'); }

function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
        (el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || Promise.resolve()).catch(() => {});
    } else {
        (document.exitFullscreen?.() || document.webkitExitFullscreen?.() || Promise.resolve()).catch(() => {});
    }
}

/* ===========================================================
   RENDU CARTES
   =========================================================== */
function creerHTMLCarte(c, ctx, opts) {
    opts = opts || {};
    const w = document.createElement('div');
    w.className = 'card-wrapper';
    if (c.uid) w.dataset.uid = c.uid;

    const estCarteUnifiee = (c.id === 'u1');
    const displayRarete = opts.overrideRarete ? opts.overrideRarete : c.rarete;
    
    // Carte Bluff face cachée : on affiche le DOS
    const estBluffCache = (c.motsCles && c.motsCles.includes('Bluff') && c.revele === false && !c.bluffVisible && !c.bluffReveleSansEffet && ctx === 'jeu');
    
    if (estBluffCache) {
        w.classList.add('hidden-card');
        if (c.cote === 'J' && !c.poseCeTour) w.classList.add('retournable');
        w.innerHTML = '<div class="card-inner"><div class="card-back">?</div></div>';
        return w;
    }

    if (estCarteUnifiee) w.classList.add('unifiee');
    else if (displayRarete === 'legendaire') w.classList.add('legendaire');

    // Carte Bluff visible OU révélée sans effet : grisée
    const estBluffVisibleGrise = (c.motsCles && c.motsCles.includes('Bluff') && (c.bluffVisible === true || c.bluffReveleSansEffet === true) && !c.retourneVolontaire && ctx === 'jeu');
    if (estBluffVisibleGrise) {
        w.classList.add('bluff-visible-grise');
    }

    const enJeu = ctx === 'jeu' || ctx === 'main';
    const atk = c.auraAtk !== undefined ? atkTot(c) : c.atk;
    const pv = c.vieMax !== undefined ? c.vie : c.vie;
    const base = defCarte(c.id);
    const atkBuffe = base && atk > base.atk;
    const pvBuffe = base && c.vieMax !== undefined && c.vieMax > base.vie;
    const blesse = c.vieMax !== undefined && c.vie < c.vieMax;

    const mode = modePouvoir(c);
    const badge = mode ? `<div class="power-badge ${mode}">${mode === 'eclair' ? '⚡' : '♾️'}</div>` : '<div class="power-badge" style="opacity:0"></div>';

    const estSortOuTerrain = c.famille === 'Sort' || c.famille === 'Terrain';
    const pied = estSortOuTerrain
        ? `<div class="card-foot"><span class="kw">${c.famille === 'Sort' ? 'Sort' : 'Terrain'}</span></div>`
        : `<div class="card-foot"><span class="stat atk ${atkBuffe ? 'buffed' : ''}">${atk}</span><span class="stat hp ${blesse ? 'blesse' : (pvBuffe ? 'buffed' : '')}">${pv}</span></div>`;

    const rareteAffichee = estCarteUnifiee ? 'unifiee' : displayRarete;
    const rareteHtml = enJeu ? '' : `<div class="rarity-text ${rareteAffichee === 'unifiee' ? 'unifiee' : ''}">${rareteAffichee === 'unifiee' ? '✨ UNIFIÉE ✨' : displayRarete}</div>`;
    const clRarete = estCarteUnifiee ? 'unifiee' : displayRarete;

    const motsCles = c.motsCles.filter(k => k !== 'Chat');
    const kw = motsCles.length ? `<div class="keyword-row">${motsCles.map(k => `<span class="kw" data-kw="${k}">${k}</span>`).join('')}</div>` : '';
    const qty = (opts.qty !== undefined) ? `<div class="qty-badge">×${opts.qty}</div>` : '';
    const loupe = (ctx === 'collection' || ctx === 'booster') ? `<div class="zoom-btn" onclick="zoomCarte(event,'${c.id}')">🔍</div>` : '';
    const tagDeck = opts.enDeck ? `<div class="nouveau-tag">Dans le deck ×${opts.enDeck}</div>` : '';
    const tagNeuf = opts.nouveau ? '<div class="nouveau-tag">Nouvelle</div>' : '';
    const coutAffiche = opts.cout !== undefined ? opts.cout : c.cout;
    const classeTexte = (POUVOIRS[c.id] || (c.motsCles && c.motsCles.includes('Bluff'))) ? 'pouvoir' : 'lore';
    const clFamille = c.famille === 'Nouvelle famille' ? 'Nouvelle' : (c.famille === 'Famille Unifiée' ? 'Unifiee' : c.famille);

    const gemHtml = enJeu ? '' : `<div class="rarity-gem ${clRarete}">${displayRarete.charAt(0).toUpperCase()}</div>`;

    w.innerHTML = `${gemHtml}${qty}${loupe}${tagDeck}${tagNeuf}<div class="card-inner"><div class="card bg-${clFamille} border-${clRarete}"><div class="card-head"><div class="mana-gem">${coutAffiche}</div><div class="card-name">${esc(c.prenom)}</div>${badge}</div><div class="card-art">${htmlIllustration(c)}</div><div class="faction-tag">${esc(c.famille)}</div><div class="card-text ${classeTexte}">${esc(c.desc)}</div>${kw}${pied}${rareteHtml}</div><div class="card-back">✦</div></div>`;

    if (opts.missing) {
        w.classList.add('missing');
        const b = document.createElement('div');
        b.className = 'missing-badge';
        b.textContent = 'MANQUANTE';
        w.appendChild(b);
    }
    if (opts.banned || carteEstBannie(c.id)) {
        w.classList.add('banned');
        const b = document.createElement('div');
        b.className = 'banned-badge';
        b.textContent = 'BANNIE';
        w.appendChild(b);
    }
    if (opts.inDeck) {
        w.classList.add('in-deck');
        const card = w.querySelector('.card');
        if (card) { card.style.boxShadow = "0 0 15px var(--menthe), 0 .5em 1.4em rgba(0,0,0,.6)"; card.style.filter = "saturate(1.2)"; }
    }
    return w;
}

function ajusterTextes(racine) {
    (racine || document).querySelectorAll('.card-text').forEach(el => {
        let taille = 0.62;
        el.style.fontSize = taille + 'em';
        let garde = 0;
        while (el.scrollHeight > el.clientHeight + 1 && taille > 0.34 && garde++ < 20) {
            taille -= 0.035;
            el.style.fontSize = taille.toFixed(3) + 'em';
        }
        el.style.overflow = 'hidden';
    });
}

function zoomCarte(event, id) {
    if (event) event.stopPropagation();
    const c = defCarte(id);
    if (!c) return;
    const box = document.getElementById('card-zoom-container');
    if (!box) return;
    box.innerHTML = '';
    box.appendChild(creerHTMLCarte(c, 'zoom', {overrideRarete: getHighRarity(id)}));
    const ov = document.getElementById('card-zoom-overlay');
    if (ov) ov.classList.add('open');
    ajusterTextes(box);
}
function fermerZoom() { const el = document.getElementById('card-zoom-overlay'); if(el) el.classList.remove('open'); }

/* ===========================================================
   BOUTIQUE
   =========================================================== */
function majCollectionHeader() {
    const el1 = document.getElementById('coll-total');
    const el2 = document.getElementById('coll-total-cards');
    const el3 = document.getElementById('coll-legendaires');
    if (el1) {
        let total = 0;
        Object.values(collectionJoueur).forEach(c => {
            total += (c.commune || 0) + (c.rare || 0) + (c.epique || 0) + (c.legendaire || 0);
        });
        el1.innerText = total;
    }
    if (el2) el2.innerText = dbCartesDispo().length;
    if (el3) {
        let leg = 0;
        dbCartesDispo().forEach(c => {
            if (c.rarete === 'legendaire' && collectionJoueur[c.id] && collectionJoueur[c.id].legendaire > 0) leg++;
        });
        el3.innerText = leg;
    }
}

function afficherBoutique(critere) {
    triCourant = critere;
    const ordreRarete = { legendaire:0, epique:1, rare:2, commune:3 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, 'Famille Unifiée':7, Neutre:8, Terrain:9, Sort:10 };
    const liste = dbCartesDispo().filter(c => !/^cp\d/.test(c.id));
    if (critere === 'nom') liste.sort((a, b) => a.prenom.localeCompare(b.prenom));
    if (critere === 'cout') liste.sort((a, b) => a.cout - b.cout || a.prenom.localeCompare(b.prenom));
    if (critere === 'rarete') liste.sort((a, b) => ordreRarete[a.rarete] - ordreRarete[b.rarete] || a.cout - b.cout);
    if (critere === 'famille') liste.sort((a, b) => (ordreFamille[a.famille]||99) - (ordreFamille[b.famille]||99) || a.cout - b.cout);
    const grid = document.getElementById('boutique-grid');
    if (!grid) return;
    grid.innerHTML = '';
    liste.forEach(c => {
        const total = getTot(c.id);
        const highestRarity = getHighRarity(c.id);
        const el = creerHTMLCarte(c, 'collection', { qty: total, overrideRarete: highestRarity });
        if (total === 0) { el.style.filter = "grayscale(1) brightness(0.4)"; el.style.opacity = "0.8"; }
        el.onclick = () => { ouvrirDetailCarte(c.id, false); };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
    majCollectionHeader();
}

/* ===========================================================
   DECKBUILDER
   =========================================================== */
function chargerListeDecks() {
    chargerProgression();
    const list = document.getElementById('liste-decks');
    if (!list) return;
    list.innerHTML = '';
    mesDecks.forEach((d, i) => {
        const owned = calculerCartesPossedeesPourDeck(d.cartes);
        const isComplete = owned === 20;
        const div = document.createElement('div');
        div.className = 'deck-item' + (deckEnEdition === i ? ' active' : '');
        const supprBtn = `<button class="del-btn" onclick="supprimerDeck(${i}, event)">✕</button>`;
        const baseTag = d.base ? '<span class="base-tag">Officiel</span>' : '';
        const warnTag = isComplete ? '<span class="deck-ok">✓</span>' : `<span class="deck-warn">${owned}/20</span>`;
        const isDefault = profil.deckParDefaut === d.nom ? '<span style="color:var(--laiton);font-size:14px;">⭐</span>' : '';
        div.innerHTML = `<span class="di-texte">${esc(d.nom)}</span>${isDefault}${warnTag}${baseTag}${supprBtn}`;
        div.onclick = () => editerDeck(i);
        list.appendChild(div);
    });
    if (deckEnEdition === null && mesDecks.length) editerDeck(0);
    else { trierDeckbuilder(triCourant); afficherDeckEnCours(); }
}
function creerNouveauDeck() { mesDecks.push({ nom:'Nouveau deck perso', cartes:[], base:false }); editerDeck(mesDecks.length - 1); }
function supprimerDeck(i, event) {
    if (event) event.stopPropagation();
    const deck = mesDecks[i];
    if (!deck) return;
    const message = deck.base ? `⚠️ Ce deck est un deck OFFICIEL.\n\nLe supprimer définitivement ?` : `Supprimer le deck « ${deck.nom} » ?`;
    if (!confirm(message)) return;
    if (deck.base) {
        if (!Array.isArray(profil.decksSupprimes)) profil.decksSupprimes = [];
        if (!profil.decksSupprimes.includes(deck.nom)) profil.decksSupprimes.push(deck.nom);
    }
    if (profil.deckParDefaut === deck.nom) profil.deckParDefaut = null;
    mesDecks.splice(i, 1);
    if (deckEnEdition === i) deckEnEdition = null;
    else if (deckEnEdition !== null && deckEnEdition > i) deckEnEdition--;
    chargerListeDecks();
    sauvegarderProgression();
    flashInfo(`Deck « ${deck.nom} » supprimé.`);
}
function restaurerDecksOfficiels() {
    const dejaPresents = mesDecks.filter(d => d.base).map(d => d.nom);
    const manquants = decksPreconstruits.filter(dp => !dejaPresents.includes(dp.nom));
    if (manquants.length === 0) return flashInfo('Tous les decks officiels sont déjà présents.');
    if (!confirm(`Restaurer ${manquants.length} deck(s) officiel(s) ?`)) return;
    if (!Array.isArray(profil.decksSupprimes)) profil.decksSupprimes = [];
    manquants.forEach(dp => {
        profil.decksSupprimes = profil.decksSupprimes.filter(n => n !== dp.nom);
        mesDecks.push({ nom: dp.nom, cartes: dp.cartes.map(c => ({ ...c })), base: true });
    });
    sauvegarderProgression();
    chargerListeDecks();
    flashInfo(`${manquants.length} deck(s) restauré(s).`);
}
function editerDeck(i) {
    deckEnEdition = i;
    tempDeckCartes = [...mesDecks[i].cartes];
    const inp = document.getElementById('deck-name-input');
    if (inp) inp.value = mesDecks[i].nom;
    const list = document.getElementById('liste-decks');
    if (list) [...list.children].forEach((el, k) => el.classList.toggle('active', k === i));
    const btnDef = document.getElementById('btn-set-default');
    if (btnDef) {
        if (profil.deckParDefaut === mesDecks[i].nom) { btnDef.innerText = '⭐ Déjà par défaut'; btnDef.disabled = true; }
        else { btnDef.innerText = '⭐ Définir par défaut'; btnDef.disabled = false; }
    }
    trierDeckbuilder(triCourant);
    afficherDeckEnCours();
}
function trierDeckbuilder(critere) {
    triCourant = critere;
    const ordreRarete = { legendaire:0, epique:1, rare:2, commune:3 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, 'Famille Unifiée':7, Neutre:8, Terrain:9, Sort:10 };
    const deckCourant = (deckEnEdition !== null && mesDecks[deckEnEdition]) ? mesDecks[deckEnEdition] : null;
    const estDeckOfficiel = deckCourant && deckCourant.base === true;
    const titre = document.getElementById('deckbuilder-title');
    if (titre) titre.innerText = estDeckOfficiel ? 'Cartes du deck officiel' : 'Cartes du jeu';
    let liste;
    if (estDeckOfficiel) {
        const idsUniques = [];
        deckCourant.cartes.forEach(c => { const id = typeof c === 'string' ? c : c.id; if (!idsUniques.includes(id)) idsUniques.push(id); });
        liste = idsUniques.map(id => defCarte(id)).filter(Boolean);
    } else liste = dbCartesDispo();
    if (critere === 'nom') liste.sort((a, b) => a.prenom.localeCompare(b.prenom));
    if (critere === 'cout') liste.sort((a, b) => a.cout - b.cout || a.prenom.localeCompare(b.prenom));
    if (critere === 'rarete') liste.sort((a, b) => ordreRarete[a.rarete] - ordreRarete[b.rarete] || a.cout - b.cout);
    if (critere === 'famille') liste.sort((a, b) => (ordreFamille[a.famille]||99) - (ordreFamille[b.famille]||99) || a.cout - b.cout);
    const grid = document.getElementById('deckbuilder-grid');
    if (!grid) return;
    grid.innerHTML = '';
    liste.forEach(c => {
        const total = getTot(c.id);
        const dansDeck = tempDeckCartes.filter(x => x.id === c.id).length;
        const highestRarity = getHighRarity(c.id);
        const dispo = total - dansDeck;
        const manquante = total === 0;
        const el = creerHTMLCarte(c, 'collection', { qty: total, overrideRarete: highestRarity, inDeck: dansDeck > 0, missing: manquante });
        if (!manquante && dispo <= 0 && dansDeck === 0) el.style.filter = "grayscale(0.7) brightness(0.7)";
        el.onclick = () => { ouvrirDetailCarte(c.id, true); };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}
function ouvrirDetailCarte(idCarte, modeDeckbuilder) {
    const c = defCarte(idCarte);
    if (!c) return;
    const content = document.getElementById('card-detail-content');
    if (!content) return;
    function render() {
        initColl(idCarte);
        const coll = collectionJoueur[idCarte];
        const highestRarity = getHighRarity(idCarte);
        const wrapTmp = document.createElement('div');
        wrapTmp.appendChild(creerHTMLCarte(c, 'collection', { overrideRarete: highestRarity }));
        const rList = ['commune','rare','epique','legendaire'];
        const rPrices = { commune: ECO.prixCommune, rare: ECO.prixRare, epique: ECO.prixEpique, legendaire: ECO.prixLegendaire };
        const totalDansDeck = tempDeckCartes.filter(x => x.id === idCarte).length;
        const maxDansDeck = 3;
        let rowsHtml = rList.map(r => {
            const possede = coll[r];
            const maxCopies = (r === 'legendaire' || r === 'epique') ? 1 : 2;
            const prix = rPrices[r];
            const prixV = Math.floor(prix * ECO.ratioVente);
            const dansDeck = modeDeckbuilder ? tempDeckCartes.filter(x => x.id === idCarte && x.rarete === r).length : 0;
            let deckBtns = '';
            if(modeDeckbuilder && deckEnEdition !== null) {
                const canAdd = totalDansDeck < maxDansDeck && dansDeck < possede && dansDeck < maxCopies && tempDeckCartes.length < 20;
                deckBtns = `<button onclick="window.ajouterAuDeck('${idCarte}', '${r}')" ${canAdd ? '' : 'disabled'}>+ Deck</button>
                            <button onclick="window.retirerDuDeck('${idCarte}', '${r}')" ${dansDeck <= 0 ? 'disabled' : ''}>- Deck</button>`;
            }
            return `<div class="rarity-row"><div><div class="r-name ${r}">${r.toUpperCase()}</div>
                <div style="font-size:12px; color:var(--texte-doux)">Possédé : ${possede} ${modeDeckbuilder && dansDeck>0 ? `(Dans deck: ${dansDeck})` : ''}</div></div>
                <div class="r-actions-col"><div class="r-actions">
                    <button onclick="window.acheterCarte('${idCarte}','${r}', ${prix})" ${profil.coins < prix || possede >= maxCopies ? 'disabled' : ''}>Acheter (-${prix}💰)</button>
                    <button class="btn-sell" onclick="window.vendreCarte('${idCarte}','${r}', ${prixV})" ${possede <= 0 ? 'disabled' : ''}>Vendre (+${prixV}💰)</button>
                </div>${deckBtns ? `<div class="r-actions" style="margin-top:4px;">${deckBtns}</div>` : ''}</div></div>`;
        }).join('');
        const infoLimite = modeDeckbuilder ? `<div style="text-align:center;font-size:12px;color:var(--texte-doux);margin-bottom:8px;">Dans le deck : ${totalDansDeck}/3</div>` : '';
        content.innerHTML = `<div class="detail-panel-left" style="pointer-events:none;">${wrapTmp.innerHTML}</div>
            <div class="detail-panel-right"><h3>${c.prenom}</h3>
            ${modeDeckbuilder && deckEnEdition !== null ? `<h4 style="text-align:center; color:var(--laiton-clair); margin:0 0 10px;">Édition : ${mesDecks[deckEnEdition].nom} (${tempDeckCartes.length}/20)</h4>` : ''}
            ${infoLimite}${rowsHtml}</div>`;
        ajusterTextes(content);
    }
    window.acheterCarte = function(id, r, prix) {
        if (profil.coins >= prix) {
            profil.coins -= prix; collectionJoueur[id][r]++; sauvegarderProgression(); render();
            if(modeDeckbuilder) trierDeckbuilder(triCourant); else afficherBoutique(triCourant);
        }
    };
    window.vendreCarte = function(id, r, prix) {
        if (collectionJoueur[id][r] > 0) {
            const inDeckCount = tempDeckCartes.filter(x => x.id === id && x.rarete === r).length;
            if (inDeckCount > 0 && collectionJoueur[id][r] <= inDeckCount) {
                if(!confirm("Cette carte est dans ton deck actif. Continuer ?")) return;
                window.retirerDuDeck(id, r);
            }
            collectionJoueur[id][r]--; profil.coins += prix; sauvegarderProgression(); render();
            if(modeDeckbuilder) trierDeckbuilder(triCourant); else afficherBoutique(triCourant);
        }
    };
    window.ajouterAuDeck = function(id, r) {
        if (tempDeckCartes.length >= 20) return;
        const totalDansDeck = tempDeckCartes.filter(x => x.id === id).length;
        if (totalDansDeck >= 3) { flashInfo('Max 3 par carte.'); return; }
        tempDeckCartes.push({id: id, rarete: r});
        render(); afficherDeckEnCours(); trierDeckbuilder(triCourant);
    };
    window.retirerDuDeck = function(id, r) {
        const idx = tempDeckCartes.map(x=>x.id+'_'+x.rarete).lastIndexOf(id+'_'+r);
        if (idx >= 0) { tempDeckCartes.splice(idx, 1); render(); afficherDeckEnCours(); trierDeckbuilder(triCourant); }
    };
    render();
    const ov = document.getElementById('card-detail-overlay');
    if (ov) ov.classList.add('open');
}
function fermerDetailCarte() { const m = document.getElementById('card-detail-overlay'); if (m) m.classList.remove('open'); }
window.fermerDetailCarte = fermerDetailCarte;
function afficherDeckEnCours() {
    const grid = document.getElementById('deck-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const cnt = document.getElementById('deck-count');
    if (cnt) cnt.innerText = tempDeckCartes.length;
    const compte = {};
    tempDeckCartes.forEach(c => { const key = c.id + '_' + c.rarete; compte[key] = (compte[key] || 0) + 1; });
    Object.keys(compte).sort((k1, k2) => {
        let c1 = defCarte(k1.split('_')[0]), c2 = defCarte(k2.split('_')[0]);
        if (!c1 || !c2) return 0;
        return c1.cout - c2.cout || c1.prenom.localeCompare(c2.prenom);
    }).forEach(key => {
        const id = key.split('_')[0], r = key.split('_')[1];
        const c = defCarte(id);
        if (!c) return;
        const div = document.createElement('div');
        div.className = 'mini-card';
        div.style.borderLeftColor = `var(--r-${r})`;
        const possede = collectionJoueur[id] ? collectionJoueur[id][r] : 0;
        const checkPossede = possede >= compte[key];
        const clTextColor = checkPossede ? '' : 'color:var(--braise);';
        div.innerHTML = `<span class="mc-cost">${c.cout}</span><span class="mc-name" style="${clTextColor}">${esc(c.prenom)} (${r.charAt(0).toUpperCase()})</span><span class="mc-qty">×${compte[key]}</span>`;
        div.onclick = () => { window.retirerDuDeck(id, r); };
        grid.appendChild(div);
    });
    const curve = document.getElementById('mana-curve');
    if (curve) {
        const seuils = [0,1,2,3,4,5,6,7,8];
        const vals = seuils.map(s => tempDeckCartes.filter(c => (s === 8 ? defCarte(c.id).cout >= 8 : defCarte(c.id).cout === s)).length);
        const max = Math.max(1, ...vals);
        curve.innerHTML = seuils.map((s, i) => `<div class="curve-col"><div class="curve-bar" style="height:${(vals[i] / max) * 38}px"></div>${s === 8 ? '8+' : s}</div>`).join('');
    }
}
function sauvegarderDeck() {
    if (deckEnEdition === null) return;
    const inp = document.getElementById('deck-name-input');
    const ancienNom = mesDecks[deckEnEdition].nom;
    const nouveauNom = (inp && inp.value.trim()) || 'Sans nom';
    mesDecks[deckEnEdition].nom = nouveauNom;
    mesDecks[deckEnEdition].cartes = [...tempDeckCartes];
    if (profil.deckParDefaut === ancienNom) profil.deckParDefaut = nouveauNom;
    sauvegarderProgression();
    chargerListeDecks();
    flashInfo(tempDeckCartes.length === 20 ? 'Deck enregistré.' : `Deck incomplet (${tempDeckCartes.length}/20).`);
}
function definirDeckParDefaut() {
    if (deckEnEdition === null) return;
    const deck = mesDecks[deckEnEdition];
    profil.deckParDefaut = deck.nom;
    sauvegarderProgression();
    chargerListeDecks();
    flashInfo(`⭐ Deck « ${deck.nom} » défini par défaut.`);
}
function toggleDeckStats() {
    const panel = document.getElementById('deck-stats-panel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) { panel.classList.remove('hidden'); afficherDeckStats(); }
    else panel.classList.add('hidden');
}
function afficherDeckStats() {
    const panel = document.getElementById('deck-stats-panel');
    if (!panel) return;
    const stats = profil.deckStats || {};
    let html = '<h4>📊 Statistiques par deck</h4>';
    const noms = Object.keys(stats).sort((a, b) => stats[b].parties - stats[a].parties);
    if (noms.length === 0) html += '<p class="hint">Aucune partie jouée pour l\'instant.</p>';
    else {
        noms.forEach(nom => {
            const s = stats[nom];
            const ratio = s.parties > 0 ? Math.round((s.victoires / s.parties) * 100) : 0;
            html += `<div class="deck-stats-row"><span>${nom}</span><span>${s.victoires}V / ${s.defaites}D — ${ratio}%</span></div>`;
        });
    }
    panel.innerHTML = html;
}
function chargerDropdownDecks() {
    const sel = document.getElementById('deck-select');
    if (!sel) return;
    sel.innerHTML = '';
    let indexDefaut = -1;
    mesDecks.forEach((d, i) => {
        const owned = calculerCartesPossedeesPourDeck(d.cartes);
        const o = document.createElement('option');
        o.value = i;
        o.innerText = d.nom + (owned !== 20 ? ` — (Incomplète : ${owned}/20)` : '');
        if(owned !== 20) o.disabled = true;
        else if (d.nom === profil.deckParDefaut) indexDefaut = i;
        sel.appendChild(o);
    });
    if (indexDefaut >= 0) sel.value = indexDefaut;
}
function flashInfo(txt) {
    const d = document.createElement('div');
    d.className = 'fx-banniere';
    d.style.fontSize = '18px';
    d.style.top = '14%';
    d.textContent = txt;
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.remove(), 1500); }
}
function afficherGainRecompense(titre, coins, carteId) {
    const ov = document.getElementById('reward-overlay');
    if (!ov) return;
    const titreEl = document.getElementById('reward-titre');
    if (titreEl) titreEl.innerText = titre;
    const coinsEl = document.getElementById('reward-coins');
    if (coinsEl) coinsEl.innerText = '+' + coins + ' 💰';
    const cardsEl = document.getElementById('reward-cards');
    if (cardsEl) {
        cardsEl.innerHTML = '';
        if (carteId) {
            const c = defCarte(carteId);
            if (c) { const el = creerHTMLCarte(c, 'zoom', { overrideRarete: getHighRarity(carteId), nouveau: true }); cardsEl.appendChild(el); ajusterTextes(cardsEl); }
        }
    }
    ov.classList.add('open');
}
function fermerReward() { const ov = document.getElementById('reward-overlay'); if (ov) ov.classList.remove('open'); }
function afficherGainArgent(montant) {
    const d = document.createElement('div');
    d.className = 'fx-nombre argent';
    d.textContent = '+' + montant + ' 💰';
    d.style.left = '50%';
    d.style.top = '30%';
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.remove(), 1000); }
}

/* ===========================================================
   BOOSTERS
   =========================================================== */
function preparerBooster() {
    if (profil.coins < ECO.prixBooster) { alert("Il te faut " + ECO.prixBooster + " 💰 pour ouvrir un booster. Tu en as " + profil.coins + "."); return; }
    profil.coins -= ECO.prixBooster;
    sauvegarderProgression();
    const pack = document.getElementById('pack'), res = document.getElementById('booster-results'), btn = document.getElementById('btn-again');
    if (!pack || !res || !btn) return;
    btn.classList.add('hidden'); res.innerHTML = '';
    pack.classList.add('opening');
    setTimeout(() => {
        pack.classList.remove('opening'); pack.classList.add('hidden');
        for (let i = 0; i < 5; i++) {
            const r = Math.random();
            let pool;
            if (r > 0.965) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.id === 'u1');
            else if (r > 0.93) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'legendaire' && c.id !== 'u1');
            else if (r > 0.82) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'epique');
            else if (r > 0.58) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'rare');
            else pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'commune');
            const carte = hasard(pool);
            if (!carte) continue;
            initColl(carte.id);
            const vraieRarete = carte.rarete;
            const nouveau = collectionJoueur[carte.id][vraieRarete] === 0;
            collectionJoueur[carte.id][vraieRarete]++;
            const el = creerHTMLCarte(carte, 'booster', { nouveau });
            el.classList.add('flipped');
            el.style.animationDelay = (i * 0.16) + 's';
            el.onclick = () => {
                if (el.classList.contains('flipped')) {
                    el.classList.remove('flipped');
                    if (vraieRarete === 'legendaire' || vraieRarete === 'epique') {
                        el.classList.add('reveal-' + vraieRarete);
                        const r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, vraieRarete === 'legendaire' ? 60 : 30);
                        try { navigator.vibrate && navigator.vibrate(vraieRarete === 'legendaire' ? [40, 30, 80] : 30); } catch (e) {}
                        SFX.jouer(vraieRarete === 'legendaire' ? 880 : 660, .35, 'triangle', .07, 400);
                    }
                    if (res.querySelectorAll('.flipped').length === 0) btn.classList.remove('hidden');
                } else zoomCarte(null, carte.id);
            };
            res.appendChild(el);
        }
        sauvegarderProgression();
        ajouterXP(5);
        progresserQuete('boosters', 1);
        ajusterTextes(res);
    }, 520);
}

/* ===========================================================
   LANCEMENT DE PARTIE
   =========================================================== */
function initialiserPartie(botStart) {
    partieFinie = false; selection = null; ciblage = null;
    J.manaMax = 0; J.manaActuel = 0; J.numTour = 0; J.cimetiere = []; J.terrainTours = 0;
    B.manaMax = 0; B.manaActuel = 0; B.numTour = 0; B.cimetiere = []; B.terrainTours = 0;
    const log = document.getElementById('action-log');
    if (log) log.innerHTML = '';
    J.premier = !botStart; B.premier = botStart;
    tourActuel = botStart ? 'bot' : 'joueur';
    for (let k = 0; k < 4; k++) piocher(B, 1);
    for (let k = 0; k < 4; k++) if (J.deck.length) J.main.push(J.deck.shift());
    if (modeEnLigne) { const ic = document.getElementById('ingame-chat'); if (ic) ic.classList.add('open'); }
}
function lancerPartie() {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false; modeTournoi = false; modeChallenge = false;
    const sel = document.getElementById('deck-select');
    const i = sel ? sel.value : null;
    if (i === null || !mesDecks[i] || calculerCartesPossedeesPourDeck(mesDecks[i].cartes) !== 20) return flashInfo('Choisis un deck complet.');
    J = nouveauCote('J', J.nom || 'Toi');
    B = nouveauCote('B', 'Bot');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = J.nom;
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = 'Bot';
    _deckUtiliseEnCours = mesDecks[i].nom;
    recordDeckJoue(_deckUtiliseEnCours);
    J.deck = mesDecks[i].cartes.map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = defCarte(id) ? defCarte(id).rarete : 'commune';
        return instancier(defCarte(id), 'J', false, rarete);
    }).filter(x => x);
    melanger(J.deck);
    B.deck = construireDeckBot().map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = defCarte(id) ? defCarte(id).rarete : 'commune';
        return instancier(defCarte(id), 'B', false, rarete);
    }).filter(x => x);
    melanger(B.deck);
    initialiserPartie(Math.random() > 0.5);
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
    progresserQuete('parties_bot', 1);
    jouerSon('click');
}
function lancerPartieMultijoueur(pseudoAdversaire, monDeckIds, advDeckIds, ts) {
    modeEnLigne = true; modeAttente = false; mulliganValide = false; modeTuto = false;
    _dernierIdTraite = 0; _compteurAction = 0; _replayEnCours = false;
    J = nouveauCote('J', J.nom || 'Toi');
    B = nouveauCote('B', pseudoAdversaire || 'Adversaire');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = J.nom;
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = pseudoAdversaire || 'Adversaire';
    _deckUtiliseEnCours = window._deckMultiEnCours || profil.deckParDefaut || 'Inconnu';
    recordDeckJoue(_deckUtiliseEnCours);
    J.deck = monDeckIds.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'J', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(J.deck);
    const deckAdv = (Array.isArray(advDeckIds) && advDeckIds.length === 20) ? advDeckIds : hasard(decksPreconstruits).cartes;
    B.deck = deckAdv.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'B', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(B.deck);
    initialiserPartie(false);
    tourActuel = 'attente';
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
    progresserQuete('parties_multi', 1);
    jouerSon('click');
}

/* ===========================================================
   TUTO
   =========================================================== */
var TUTO_ETAPES = {
    0: {
        titre: "Bienvenue dans la Famille",
        etapes: [
            { txt: `📜 <b>Bienvenue dans la Famille !</b><br><br>Aujourd'hui, c'est le grand repas de famille. Ta tante a préparé son couscous légendaire... et ton cousin <b>Bot</b> a osé dire qu'il était meilleur que celui de ta mère. 😱<br><br>La guerre est déclarée !<br><br><b>🎯 Ton objectif :</b> baisser la <b>patience</b> de ton adversaire de 20 à 0 en jouant tes cartes.`, cible: null, appris: ["Bienvenue dans Famille TCG", "L'objectif : mettre la patience adverse à 0"] },
            { txt: `Voici ton <b>héros</b> 🧑 (en bas à gauche). C'est <b>toi</b>.<br><br>Tu as <b>20 points de patience</b> ❤. Si tu tombes à 0, tu perds la partie.`, cible: ".hero-panel.you", appris: ["Ton héros a 20 points de patience", "Si tu tombes à 0, tu perds"] },
            { txt: `En face, ton cousin <b>Bot</b> 🤖 a lui aussi 20 patience.<br><br><b>Ton objectif</b> : le faire descendre à 0 avant qu'il ne te fasse pareil !`, cible: ".hero-panel.opp", appris: ["L'adversaire a aussi 20 patience", "Le premier à 0 perd"] },
            { txt: `Parfait ! Tu es prêt à défendre l'honneur de ta mère. 🥘<br><br>Prêt pour l'étape suivante ?`, cible: null, appris: ["Tu peux passer à l'étape 1 : découvrir le plateau"] }
        ]
    },
    1: {
        titre: "Découvrir le plateau",
        etapes: [
            { txt: `Les <b>cristaux bleus</b> 💧 sous ton héros représentent ton <b>mana</b>.<br><br>Chaque carte coûte du mana (chiffre bleu en haut à gauche).`, cible: "#crystals", appris: ["Le mana est ta ressource principale", "Il augmente à chaque tour"] },
            { txt: `Tes cartes sont en bas : c'est ta <b>main</b>.<br><br>Chaque carte affiche son coût en mana, sa <b>force ⚔</b> et sa <b>vie ❤</b>.`, cible: "#player-hand", appris: ["Tu joues les cartes depuis ta main", "Chaque carte a coût/force/vie"] },
            { txt: `Le <b>cimetière</b> 💀 contient les cartes détruites ou jouées.<br><br>À côté, tu vois le nombre de cartes restantes dans ta <b>pioche</b> 📚.`, cible: "#player-grave-btn", appris: ["Le cimetière garde l'historique", "Ta pioche a un nombre limité de cartes"] }
        ]
    },
    2: {
        titre: "Anatomie d'une carte",
        etapes: [
            { txt: `Regardons la carte <b>Bachira</b> de plus près. Clique sur le bouton ci-dessous pour voir ses différents éléments.`, cible: null, action: 'anatomie', appris: ["Les cartes ont plusieurs éléments à connaître"] }
        ]
    },
    3: {
        titre: "Poser une carte",
        etapes: [
            { txt: `Tu as <b>3 mana</b>. Regarde tes 2 cartes : l'une coûte 3, l'autre 4.<br><br>❌ Impossible de poser celle à 4 (grisée).<br>✅ Clique sur celle à 3 mana !`, cible: "#player-hand", attendre: () => J.plateau.length > 0, appris: ["On ne peut pas poser une carte trop chère", "Les cartes injouables sont grisées"] },
            { txt: `Parfait ! Ta créature est sur le plateau. 🎉<br><br>Elle a une attaque ⚔ et des points de vie ❤. Les cristaux utilisés sont épuisés.`, cible: "#player-board", appris: ["La carte arrive sur le plateau", "Les cristaux utilisés deviennent gris"] }
        ]
    },
    4: {
        titre: "Attaquer",
        etapes: [
            { txt: `⚠️ Une créature <b>fraîchement posée</b> ne peut PAS attaquer ce tour !<br><br>Il faut attendre le tour suivant (sauf avec Charge ⚡).`, cible: "#player-board", appris: ["Une créature a le mal du tour", "Elle ne peut pas attaquer immédiatement"] },
            { txt: `Je vais passer ton tour pour simuler l'attente.<br><br>Clique sur <b>« Fin du tour »</b> pour continuer.`, cible: "#btn-endturn", attendre: () => tourActuel === 'joueur' && J.numTour >= 2, appris: ["Finir son tour fait passer au tour adverse", "Puis le tien recommence"] },
            { txt: `C'est reparti ! Ta créature n'est plus fatiguée : elle brille ✨.<br><br>Clique dessus, puis choisis une cible :<br>• une <b>créature ennemie</b><br>• ou le <b>héros adverse</b> !`, cible: "#player-board", attendre: () => B.patience < 30 || B.plateau.length < 1, appris: ["On peut attaquer une créature ou le héros", "Clique attaquant puis cible"] }
        ]
    },
    5: {
        titre: "La Charge ⚡",
        etapes: [
            { txt: `Le mot-clé <b>Charge ⚡</b> permet d'attaquer <b>dès l'invocation</b>, sans attendre un tour.<br><br>C'est indiqué par le badge bleu sur la carte.`, cible: "#player-hand", appris: ["Charge = attaque immédiate", "Pas besoin d'attendre un tour"] },
            { txt: `Invoque cette créature avec Charge en cliquant dessus !`, cible: "#player-hand", attendre: () => J.plateau.some(m => m.motsCles.includes('Charge')), appris: ["On invoque une carte en cliquant dessus"] },
            { txt: `Elle brille immédiatement : clique dessus puis sur le héros adverse !`, cible: "#opp-portrait", attendre: () => B.patience < 30, appris: ["Une créature avec Charge attaque dès son arrivée"] }
        ]
    },
    6: {
        titre: "La Provocation 🛡️",
        etapes: [
            { txt: `L'adversaire a une créature avec <b>Provocation 🛡️</b>.<br><br>Tu ne peux <b>PAS</b> attaquer son héros tant qu'elle est en vie !`, cible: "#opponent-board", appris: ["Provocation force à attaquer cette créature", "Elle protège le héros"] },
            { txt: `Utilise ton sort <b>« Machine à laver »</b> :<br>clique dessus puis sur la créature pour la détruire.`, cible: "#player-hand", attendre: () => B.plateau.length === 0, appris: ["Un sort peut cibler une créature", "Certains sorts infligent des dégâts directs"] },
            { txt: `Bien joué ! La voie est libre, tu peux attaquer le héros.`, cible: "#opp-portrait", attendre: () => B.patience < 30, appris: ["Sans Provocation, on peut taper le héros"] }
        ]
    },
    7: {
        titre: "Le Bluff",
        etapes: [
            { txt: `Certaines cartes ont le mot-clé <b>Bluff 🎭</b>. Elles peuvent être posées face cachée (dos violet).`, cible: "#player-hand", appris: ["Les cartes Bluff peuvent être posées face cachée", "Elles coûtent le même prix"] },
            { txt: `Une carte Bluff face cachée ne peut pas attaquer et prend une place de créature.<br><br>Pour la révéler, retourne-la toi-même dès le tour suivant (touche-la, puis confirme) ou utilise un sort comme <b>Cache-cache</b> ou <b>Surprise !</b>`, cible: "#player-board", appris: ["Une carte Bluff cachée ne fait rien", "Un sort la révèle et déclenche son effet"] },
            { txt: `Pose une carte Bluff face cachée en cliquant dessus !`, cible: "#player-hand", attendre: () => J.plateau.some(m => m.motsCles.includes('Bluff') && !m.revele), appris: ["On pose une carte Bluff face cachée"] }
        ]
    },
    8: {
        titre: "Pioche & Cimetière",
        etapes: [
            { txt: `Regarde en bas à droite de ton héros : le nombre restant dans ta <b>pioche</b> 📚.<br><br>Chaque tour, tu pioches automatiquement 1 carte.`, cible: "#player-deck", appris: ["Tu pioches 1 carte par tour", "Le chiffre descend à chaque pioche"] },
            { txt: `⚠️ Si ta pioche est <b>vide</b>, tu perds <b>3 patience</b> à chaque pioche ratée.<br><br>C'est la <b>règle de fatigue</b> !`, cible: "#player-deck", appris: ["Pioche vide = 3 dégâts par tour", "Une partie peut se perdre par épuisement"] },
            { txt: `Le <b>cimetière</b> 💀 (à côté) garde toutes les cartes jouées et détruites.<br><br>Clique dessus pour voir ce qui s'y trouve.`, cible: "#player-grave-btn", appris: ["Cimetière = cartes utilisées", "Utile pour se souvenir de ce qui a été joué"] }
        ]
    },
    9: {
        titre: "Terrains & Fusion",
        etapes: [
            { txt: `Un <b>terrain</b> 🏡 modifie les règles de la partie.<br><br>Cherchell : « Tes créatures Cousins coûtent 1 mana de moins. »`, cible: "#player-hand", appris: ["Les terrains modifient les règles", "Ils changent aussi le fond du plateau"] },
            { txt: `⚠️ Un terrain reste actif <b>3 tours</b>, puis disparaît !<br><br>Pose-le au bon moment pour maximiser son effet.`, cible: "#player-hand", attendre: () => J.terrain !== null, appris: ["Un terrain dure 3 tours", "Le timer s'affiche sous la carte"] },
            { txt: `Enfin, la <b>FUSION</b> 💑 :<br><br>Avec <b>Naila</b> et <b>Nassim</b> sur le plateau, tu peux jouer <b>« Naila x Nassim »</b> pour créer une carte ultra-puissante !`, cible: "#player-hand", appris: ["La Fusion consomme 2 créatures", "Le résultat est plus puissant que ses composants"] },
            { txt: `Clique sur la carte Fusion dans ta main pour l'essayer !`, cible: "#player-hand", attendre: () => J.plateau.some(m => m.motsCles.includes('Fusion')), appris: ["La Fusion est jouable si les 2 composants sont là"] },
            { txt: `✨ FUSION RÉUSSIE ! 4 dégâts ennemis. Bravo, tu maîtrises maintenant toutes les bases !`, cible: "#player-board", appris: ["Tu sais jouer à Famille TCG !"] }
        ]
    }
};

var TUTO_QUIZ = [
    { q: "Que fait le mot-clé Charge ⚡ ?", options: [
        { txt: "Attaque immédiatement à l'invocation", correct: true },
        { txt: "Inflige 3 dégâts en arrivant", correct: false },
        { txt: "Soigne ton héros de 2 PV", correct: false }
    ]},
    { q: "Combien de mana as-tu au tour 1 ?", options: [
        { txt: "1 mana", correct: false },
        { txt: "2 mana", correct: true },
        { txt: "5 mana", correct: false }
    ]},
    { q: "Que se passe-t-il si ton deck est vide ?", options: [
        { txt: "Tu gagnes immédiatement", correct: false },
        { txt: "Tu pioches depuis ta main", correct: false },
        { txt: "Tu perds 3 patience par pioche", correct: true }
    ]},
    { q: "Que fait la Provocation 🛡️ ?", options: [
        { txt: "Force l'adversaire à attaquer cette créature", correct: true },
        { txt: "Donne +2 en vie", correct: false },
        { txt: "Attaque dès l'invocation", correct: false }
    ]},
    { q: "Comment révèle-t-on une carte Bluff 🎭 ?", options: [
        { txt: "En attendant 2 tours", correct: false },
        { txt: "En jouant un sort spécifique comme Cache-cache", correct: true },
        { txt: "En payant 3 mana", correct: false }
    ]},
    { q: "Que se passe-t-il quand on joue un Terrain 🏡 ?", options: [
        { txt: "Il reste actif 3 tours", correct: true },
        { txt: "Il reste actif toute la partie", correct: false },
        { txt: "Il détruit une créature", correct: false }
    ]},
    { q: "Que fait le mot-clé Rage 🔥 ?", options: [
        { txt: "Déclenche un effet quand la créature est blessée", correct: true },
        { txt: "Donne +2 en attaque", correct: false },
        { txt: "Détruit une créature", correct: false }
    ]},
    { q: "Que fait le mot-clé Destruction 💀 ?", options: [
        { txt: "Déclenche un effet quand la créature meurt", correct: true },
        { txt: "Détruit une carte dans la main", correct: false },
        { txt: "Inflige 3 dégâts au héros", correct: false }
    ]}
];
var _quizReponses = {};

function majTutoUI() {
    let completes = 0;
    let currentFound = false;
    for (let lvl = 0; lvl <= 9; lvl++) {
        const btn = document.getElementById('btn-tuto-' + lvl);
        if (btn) {
            btn.classList.remove('done', 'current', 'locked');
            if (profil['tuto_' + lvl]) {
                btn.classList.add('done');
                completes++;
            } else if (!currentFound) {
                btn.classList.add('current');
                currentFound = true;
            } else {
                btn.classList.add('locked');
            }
        }
    }
    const fill = document.getElementById('tuto-progress-fill');
    const txt = document.getElementById('tuto-progress-text');
    const pct = (completes / 10) * 100;
    if (fill) fill.style.width = pct + '%';
    if (txt) txt.innerText = `${completes} / 10 étapes complétées`;
    if (completes === 10 && !profil.tutoComplet) {
        profil.tutoComplet = true;
        sauvegarderProgression();
        setTimeout(() => afficherTutoFinal(), 800);
    }
}

function lancerTuto(niveau) {
    modeEnLigne = false; modeAttente = false; mulliganValide = true; modeTuto = true;
    currentTutoLevel = niveau; etapeTuto = 0;
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    if (_tutoSuccessInterval) { clearInterval(_tutoSuccessInterval); _tutoSuccessInterval = null; }

    J = nouveauCote('J', 'Toi');
    B = nouveauCote('B', 'Prof. Tuto');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = 'Toi';
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = 'Cousin Bot';
    partieFinie = false; selection = null; ciblage = null;
    const log = document.getElementById('action-log');
    if (log) log.innerHTML = '';

    J.premier = true; B.premier = false;
    J.manaMax = 3; J.manaActuel = 3; J.numTour = 1; J.cimetiere = [];
    B.manaMax = 10; B.manaActuel = 0; B.numTour = 0; B.cimetiere = [];
    B.patience = 30;
    tourActuel = 'joueur';

    if (niveau === 0) {}
    else if (niveau === 1) { const c1 = instancier(defCarte('m6'), 'J'); if (c1) { c1.cout = 3; J.main.push(c1); } }
    else if (niveau === 2) { }
    else if (niveau === 3) {
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) { c1.cout = 3; J.main.push(c1); }
        const c2 = instancier(defCarte('m1'), 'J'); if (c2) { c2.cout = 4; J.main.push(c2); }
    } else if (niveau === 4) {
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) J.plateau.push(c1);
        if (c1) c1.malade = true;
        J.manaMax = 5; J.manaActuel = 5;
    } else if (niveau === 5) { const c = instancier(defCarte('m8'), 'J'); if (c) J.main.push(c); }
    else if (niveau === 6) {
        const c1 = instancier(defCarte('n6'), 'B'); if (c1) B.plateau.push(c1);
        const c2 = instancier(defCarte('s22'), 'J'); if (c2) J.main.push(c2);
        const c3 = instancier(defCarte('m5'), 'J'); if (c3) J.main.push(c3);
    } else if (niveau === 7) {
        const c1 = instancier(defCarte('tb1'), 'J'); if (c1) J.main.push(c1);
        const c2 = instancier(defCarte('sb1'), 'J'); if (c2) J.main.push(c2);
        J.manaMax = 5; J.manaActuel = 5;
    } else if (niveau === 8) {
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) J.main.push(c1);
        J.manaMax = 5; J.manaActuel = 5;
    } else if (niveau === 9) {
        const c1 = instancier(defCarte('ka5'), 'J'); if (c1) J.plateau.push(c1);
        const c2 = instancier(defCarte('ka6'), 'J'); if (c2) J.plateau.push(c2);
        const c3 = instancier(defCarte('f1'), 'J'); if (c3) J.main.push(c3);
        const c4 = instancier(defCarte('c12'), 'J'); if (c4) J.main.push(c4);
        J.manaMax = 10; J.manaActuel = 10;
    }

    changerEcran('game-screen');
    rafraichirJeu();
    setTimeout(() => afficherEtapeTuto(), 400);
    jouerSon('click');
}

function afficherEtapeTuto() {
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    if (_tutoSuccessInterval) { clearInterval(_tutoSuccessInterval); _tutoSuccessInterval = null; }

    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    const etape = config.etapes[etapeTuto];
    if (!etape) { terminerEtapeTuto(); return; }

    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    if (etape.cible) {
        const el = document.querySelector(etape.cible);
        if (el) el.classList.add('tuto-highlight');
    }

    const tutoIcon = document.querySelector('.tuto-icon');
    const etapeLabel = document.getElementById('tuto-etape-label');
    const tutoTitre = document.getElementById('tuto-titre');
    const miniFill = document.getElementById('tuto-mini-fill');
    const icones = ['📜','🔍','🎴','⚔️','⚡','🛡️','💪','🎭','📚','🏡'];
    if (tutoIcon) tutoIcon.textContent = icones[currentTutoLevel] || '🎓';
    if (etapeLabel) etapeLabel.textContent = `Étape ${etapeTuto + 1}/${config.etapes.length}`;
    if (tutoTitre) tutoTitre.textContent = config.titre;
    if (miniFill) miniFill.style.width = ((etapeTuto + 1) / config.etapes.length * 100) + '%';

    const bulle = document.getElementById('tuto-bubble');
    const txt = document.getElementById('tuto-text');
    const btn = document.getElementById('btn-tuto-next');
    const btnSkip = document.getElementById('btn-tuto-skip');
    if (!bulle || !txt || !btn) return;

    txt.innerHTML = etape.txt;
    bulle.classList.remove('hidden');
    btn.classList.remove('hidden', 'ready');
    btn.innerText = 'Continuer ▶';
    btn.onclick = () => { etapeTuto++; afficherEtapeTuto(); };
    if (btnSkip) {
        btnSkip.classList.remove('hidden');
        btnSkip.onclick = () => skipEtapeTuto();
    }

    if (etape.action === 'anatomie') {
        btn.innerText = "Voir la carte en grand 🔍";
        btn.classList.add('ready');
        btn.onclick = () => { ouvrirTutoCarteAnatomie(); };
        return;
    }

    if (etape.attendre) {
        _tutoInterval = setInterval(() => {
            if (partieFinie || !modeTuto) { clearInterval(_tutoInterval); _tutoInterval = null; return; }
            let ok = false;
            try { ok = etape.attendre(); } catch(e) { ok = false; }
            if (ok) {
                clearInterval(_tutoInterval); _tutoInterval = null;
                if (btn) { btn.innerText = 'Continuer ▶ ✅'; btn.classList.add('ready'); }
            }
        }, 300);
    }
}
function etapeTutoSuivante() {
    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    const btn = document.getElementById('btn-tuto-next');
    if (btn) btn.classList.remove('ready');
    etapeTuto++;
    afficherEtapeTuto();
}
function skipEtapeTuto() {
    if (!modeTuto) return;
    if (!Array.isArray(profil.tutoSkipped)) profil.tutoSkipped = [];
    if (!profil.tutoSkipped.includes(currentTutoLevel)) profil.tutoSkipped.push(currentTutoLevel);
    etapeTuto++;
    afficherEtapeTuto();
}
function validerEtapeTuto() {}

function animerReussiteEtape() {
    const burst = document.createElement('div');
    burst.className = 'tuto-success-burst';
    burst.textContent = '✨ BRAVO !';
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 1000);
    creerParticules(window.innerWidth / 2, window.innerHeight / 2, '#3ddc97', 30);
    jouerSon('tutoDone');
}

function terminerEtapeTuto() {
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    if (!profil['tuto_' + currentTutoLevel]) profil['tuto_' + currentTutoLevel] = true;
    modeTuto = false;
    const bulle = document.getElementById('tuto-bubble');
    if (bulle) bulle.classList.add('hidden');
    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));

    const apprisSet = new Set();
    config.etapes.forEach(e => { if (e.appris) e.appris.forEach(a => apprisSet.add(a)); });

    const gain = ECO.tutoEtape;
    const carteId = carteRecompenseTuto(currentTutoLevel);

    if (!profil['tutoReward_' + currentTutoLevel]) {
        profil.coins += gain;
        profil.tutoCoinsGagnes = (profil.tutoCoinsGagnes || 0) + gain;
        if (carteId) {
            initColl(carteId);
            const r = defCarte(carteId).rarete;
            collectionJoueur[carteId][r] = (collectionJoueur[carteId][r] || 0) + 1;
            if (!Array.isArray(profil.tutoCartesGagnees)) profil.tutoCartesGagnees = [];
            profil.tutoCartesGagnees.push(carteId);
        }
        profil['tutoReward_' + currentTutoLevel] = true;
        ajouterXP(30);
        progresserQuete('tutos', 1);
    }
    sauvegarderProgression();

    animerReussiteEtape();
    afficherResumeEtape(currentTutoLevel, Array.from(apprisSet), gain, carteId);
}

function afficherResumeEtape(niveau, appris, gain, carteId) {
    const ov = document.getElementById('tuto-resume-overlay');
    if (!ov) return;
    const titre = document.getElementById('tuto-resume-titre');
    if (titre) titre.innerText = `✅ Étape ${niveau} terminée !`;
    const apprisEl = document.getElementById('tuto-resume-appris');
    if (apprisEl) apprisEl.innerHTML = '<ul>' + appris.map(a => `<li>${a}</li>`).join('') + '</ul>';
    const gainEl = document.getElementById('tuto-resume-gain');
    if (gainEl) gainEl.innerText = `+${gain} 💰`;
    const carteEl = document.getElementById('tuto-resume-carte');
    if (carteEl) {
        carteEl.innerHTML = '';
        if (carteId) {
            const c = defCarte(carteId);
            if (c) { const el = creerHTMLCarte(c, 'zoom', { overrideRarete: getHighRarity(carteId), nouveau: true }); carteEl.appendChild(el); ajusterTextes(carteEl); }
        }
    }
    const btnNext = document.getElementById('btn-tuto-resume-next');
    if (btnNext) {
        if (niveau < 9) btnNext.innerText = `Étape ${niveau + 1} ▶`;
        else btnNext.innerText = '🎓 Voir le récap final';
    }
    ov.classList.add('open');
    jouerSon('coin');
}

function fermerTutoResumeEtSuivant() {
    const ov = document.getElementById('tuto-resume-overlay');
    if (ov) ov.classList.remove('open');
    majTutoUI();
    if (currentTutoLevel < 9) setTimeout(() => lancerTuto(currentTutoLevel + 1), 400);
    else setTimeout(() => afficherTutoFinal(), 400);
}
function fermerTutoResumeEtMenu() {
    const ov = document.getElementById('tuto-resume-overlay');
    if (ov) ov.classList.remove('open');
    changerEcran('tuto-screen');
    majTutoUI();
}

function afficherTutoFinal() {
    const ov = document.getElementById('tuto-final-overlay');
    if (!ov) return;
    const comps = [
        "Invoquer une carte", "Comprendre le mana", "Attaquer",
        "Gérer Provocation & Charge", "Déclencher des effets",
        "Comprendre la pioche & le cimetière", "Comprendre le mana progressif",
        "Utiliser Terrains & Fusion", "Maîtriser le Bluff"
    ];
    const compsEl = document.getElementById('tuto-final-competences');
    if (compsEl) compsEl.innerHTML = comps.map(c => `<div>${c}</div>`).join('');
    const coinsEl = document.getElementById('tuto-final-coins');
    if (coinsEl) coinsEl.innerText = formatCoins(profil.tutoCoinsGagnes || 0);
    const cartesEl = document.getElementById('tuto-final-cartes');
    if (cartesEl) cartesEl.innerText = (profil.tutoCartesGagnees || []).length;
    const niveauEl = document.getElementById('tuto-final-niveau');
    if (niveauEl) niveauEl.innerText = profil.niveau;
    ov.classList.add('open');
    jouerSon('victory');
}
function fermerTutoFinal() {
    const ov = document.getElementById('tuto-final-overlay');
    if (ov) ov.classList.remove('open');
    changerEcran('menu-screen');
    setTimeout(() => ouvrirChallengeTuto(), 600);
}

function carteRecompenseTuto(niveau) {
    const cartesFixes = { 0:'m6', 1:'m6', 2:'m7', 3:'m4', 4:'m8', 5:'s9', 6:'s22', 7:'tb1', 8:'s23', 9:'ka5' };
    const idFix = cartesFixes[niveau];
    if (idFix && getTot(idFix) === 0) return idFix;
    const nonPossedees = dbCartesDispo().filter(c => getTot(c.id) === 0);
    if (nonPossedees.length) return hasard(nonPossedees).id;
    const pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'commune');
    return pool.length ? hasard(pool).id : 'm6';
}

function ouvrirTutoExpress() {
    const ov = document.getElementById('tuto-express-overlay');
    if (!ov) return;
    _quizReponses = {};
    const zone = document.getElementById('tuto-express-quiz');
    if (!zone) return;
    zone.innerHTML = '';
    TUTO_QUIZ.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'quiz-question';
        let opts = q.options.map((o, j) => `<button class="quiz-option" onclick="choisirQuizReponse(${i}, ${j}, this)">${o.txt}</button>`).join('');
        div.innerHTML = `<div class="q-intitule">${i+1}. ${q.q}</div>${opts}`;
        zone.appendChild(div);
    });
    ov.classList.add('open');
}
function choisirQuizReponse(i, j, el) {
    _quizReponses[i] = j;
    const parent = el.parentElement;
    parent.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
}
function fermerTutoExpress() {
    const ov = document.getElementById('tuto-express-overlay');
    if (ov) ov.classList.remove('open');
}
function validerTutoExpress() {
    let bonnes = 0;
    TUTO_QUIZ.forEach((q, i) => {
        if (_quizReponses[i] !== undefined && q.options[_quizReponses[i]].correct) bonnes++;
    });
    fermerTutoExpress();
    if (bonnes === TUTO_QUIZ.length) {
        for (let lvl = 0; lvl <= 9; lvl++) {
            if (!profil['tuto_' + lvl]) {
                profil['tuto_' + lvl] = true;
                profil.coins += ECO.tutoEtape;
                profil.tutoCoinsGagnes = (profil.tutoCoinsGagnes || 0) + ECO.tutoEtape;
                const carteId = carteRecompenseTuto(lvl);
                if (carteId) {
                    initColl(carteId);
                    const r = defCarte(carteId).rarete;
                    collectionJoueur[carteId][r] = (collectionJoueur[carteId][r] || 0) + 1;
                    if (!Array.isArray(profil.tutoCartesGagnees)) profil.tutoCartesGagnees = [];
                    profil.tutoCartesGagnees.push(carteId);
                }
                profil['tutoReward_' + lvl] = true;
            }
        }
        profil.tutoExpressReussi = true;
        profil.tutoComplet = true;
        ajouterXP(300);
        sauvegarderProgression();
        majTutoUI();
        jouerSon('victory');
        alert('🎓 Quiz parfait ! Tu débloques toutes les récompenses du tuto.');
        setTimeout(() => afficherTutoFinal(), 500);
    } else {
        alert(`❌ ${bonnes}/${TUTO_QUIZ.length} bonnes réponses. Il faut 100% de réussite pour valider.`);
    }
}

/* ===========================================================
   TUTO ANATOMIE — Points ajustés (Force et Vie séparés)
   =========================================================== */
function ouvrirTutoCarteAnatomie() {
    const ov = document.getElementById('tuto-carte-zoom');
    if (!ov) return;
    const display = document.getElementById('tuto-carte-display');
    const list = document.getElementById('tuto-carte-legend-list');
    if (!display || !list) return;

    const carteExemple = defCarte('m2'); // Bachira
    display.innerHTML = '';
    
    const carteEl = creerHTMLCarte(carteExemple, 'zoom');
    carteEl.style.position = 'relative';
    
    const dots = [
        { n: 1, txt: "Coût en mana", top: "8%", left: "8%" },
        { n: 2, txt: "Nom de la carte", top: "8%", left: "50%", transform: "translateX(-50%)" },
        { n: 3, txt: "Illustration / Emoji", top: "28%", left: "50%", transform: "translateX(-50%)" },
        { n: 4, txt: "Famille / Type", top: "53%", left: "50%", transform: "translateX(-50%)" },
        { n: 5, txt: "Description / Effet", top: "68%", left: "8%" },
        { n: 6, txt: "Mots-clés (Provocation)", top: "82%", left: "50%", transform: "translateX(-50%)" },
        { n: 7, txt: "Force (ATK)", top: "95%", left: "12%" },
        { n: 8, txt: "Vie (HP)", top: "95%", left: "88%" }
    ];

    dots.forEach(d => {
        const dot = document.createElement('div');
        dot.className = 'legend-dot';
        dot.innerText = d.n;
        dot.style.top = d.top;
        dot.style.left = d.left;
        if (d.transform) dot.style.transform = d.transform;
        carteEl.appendChild(dot);
    });
    
    display.appendChild(carteEl);

    list.innerHTML = dots.map(d => `<li><span class="lg-num">${d.n}</span> ${d.txt}</li>`).join('');

    ov.classList.remove('hidden');
    ajusterTextes(display);
    requestAnimationFrame(() => placerPointsAnatomie(carteEl));
}

function fermerTutoCarteZoom() {
    const ov = document.getElementById('tuto-carte-zoom');
    if (ov) ov.classList.add('hidden');
}

function ouvrirTutoMap() {
    const ov = document.getElementById('tuto-map-overlay');
    if (!ov) return;
    const content = document.getElementById('tuto-map-content');
    if (!content) return;
    content.innerHTML = '';
    const titres = [
        '📜 Bienvenue dans la Famille', '🔍 Découvrir le plateau',
        '🎴 Anatomie d\'une carte', '⚔️ Poser et attaquer', '⚡ La Charge',
        '🛡️ La Provocation', '💪 Les Effets — Boost',
        '🎭 Le Bluff', '📚 Pioche & Cimetière', '🏡 Terrains & Fusion'
    ];
    let currentFound = false;
    for (let lvl = 0; lvl <= 9; lvl++) {
        const done = !!profil['tuto_' + lvl];
        const isCurrent = !done && !currentFound;
        if (isCurrent) currentFound = true;
        const div = document.createElement('div');
        div.className = 'tuto-map-node' + (done ? ' done' : '') + (isCurrent ? ' current' : '');
        div.innerHTML = `<div class="tuto-map-icon">${done ? '✓' : (lvl)}</div>
            <div class="tuto-map-titre">${titres[lvl]}</div>
            <div class="tuto-map-statut">${done ? 'TERMINÉ' : (isCurrent ? 'À FAIRE' : 'VERROUILLÉ')}</div>`;
        div.onclick = () => { if (done || isCurrent) { fermerTutoMap(); lancerTuto(lvl); } };
        div.style.cursor = (done || isCurrent) ? 'pointer' : 'not-allowed';
        content.appendChild(div);
    }
    ov.classList.add('open');
}
function fermerTutoMap() {
    const ov = document.getElementById('tuto-map-overlay');
    if (ov) ov.classList.remove('open');
}

function ouvrirChallengeTuto() {
    const ov = document.getElementById('tuto-challenge-overlay');
    const txt = document.getElementById('tuto-challenge-text');
    if (txt) txt.innerText = 'Bats le bot en 5 tours ou moins !';
    if (ov) ov.classList.add('open');
}
function accepterChallengeTuto() {
    fermerChallengeTuto();
    modeChallenge = true;
    lancerPartieChallenge();
}
function refuserChallengeTuto() {
    fermerChallengeTuto();
    flashInfo('Peut-être plus tard !');
}
function fermerChallengeTuto() {
    const ov = document.getElementById('tuto-challenge-overlay');
    if (ov) ov.classList.remove('open');
}
function lancerPartieChallenge() {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false; modeTournoi = false;
    const completIdx = mesDecks.findIndex(d => calculerCartesPossedeesPourDeck(d.cartes) === 20);
    if (completIdx < 0) { flashInfo('Aucun deck complet pour le challenge.'); return; }
    const i = completIdx;
    J = nouveauCote('J', J.nom || 'Toi');
    B = nouveauCote('B', 'Bot');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = J.nom;
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = 'Bot (Défi)';
    _deckUtiliseEnCours = mesDecks[i].nom;
    recordDeckJoue(_deckUtiliseEnCours);
    J.deck = mesDecks[i].cartes.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'J', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(J.deck);
    B.deck = hasard(decksPreconstruits).cartes.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'B', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(B.deck);
    initialiserPartie(Math.random() > 0.5);
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
    flashInfo('🎯 Défi : gagne en 5 tours max !');
}

/* ===========================================================
   MULLIGAN
   =========================================================== */
function ouvrirMulligan() {
    if(modeTuto) return;
    const zone = document.getElementById('mulligan-cards');
    if (!zone) return;
    zone.innerHTML = '';
    J.main.forEach(c => {
        const el = creerHTMLCarte(c, 'main');
        el.onclick = () => el.classList.toggle('rejetee');
        zone.appendChild(el);
    });
    ajusterTextes(zone);
    const ov = document.getElementById('mulligan-overlay');
    if (ov) ov.classList.add('open');
    clearTimeout(_timerMulligan);
}
function validerMulligan(auto) {
    clearTimeout(_timerMulligan);
    const zone = document.getElementById('mulligan-cards');
    if (!zone) return;
    const cartes = [...zone.children];
    const indices = auto ? [] : cartes.map((el, i) => el.classList.contains('rejetee') ? i : -1).filter(i => i >= 0);
    const rejetees = indices.map(i => J.main[i]);
    const remplacantes = [];
    for (let k = 0; k < indices.length; k++) if (J.deck.length) remplacantes.push(J.deck.shift());
    indices.slice().reverse().forEach(i => J.main.splice(i, 1));
    J.main.push(...remplacantes);
    J.deck.push(...rejetees);
    melanger(J.deck);
    const ov = document.getElementById('mulligan-overlay');
    if (ov) ov.classList.remove('open');
    if (modeEnLigne) {
        mulliganValide = true;
        info('En attente de l\'adversaire…');
        if (typeof signalerMulliganPret === 'function') signalerMulliganPret();
        return;
    }
    if (modeTuto) return;
    if (tourActuel === 'joueur') debutTourJoueur();
    else jouerTourBot();
}
function afficherAttente(titre) {
    const ov = document.getElementById('attente-overlay');
    const t = document.getElementById('attente-titre');
    if (t) t.innerText = titre || 'En attente…';
    if (ov) ov.classList.add('open');
}
function fermerAttente() { const ov = document.getElementById('attente-overlay'); if (ov) ov.classList.remove('open'); }
function melanger(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(getSyncRandom() * (i + 1));
        const temp = a[i]; a[i] = a[j]; a[j] = temp;
    }
}

/* ===========================================================
   FX HELPERS
   =========================================================== */
function elOf(uid) {
    // on cherche d'abord sur le plateau, puis dans la main : jamais dans les copies masquées (mulligan, visionneuse…)
    return document.querySelector(`.board-area [data-uid="${uid}"]`)
        || document.querySelector(`.hand-area [data-uid="${uid}"]`)
        || document.querySelector(`#game-screen [data-uid="${uid}"]:not(#mulligan-overlay *)`);
}
function elHero(side) { return document.querySelector(side === J ? '.hero-panel.you' : '.hero-panel.opp'); }
function fxDepuisRect(rect, texte, type) {
    if (!rect || (!rect.width && !rect.height)) return;   // élément masqué : pas d'effet fantôme en haut d'écran
    const d = document.createElement('div');
    d.className = 'fx-nombre ' + type;
    d.textContent = texte;
    d.style.left = (rect.left + rect.width / 2) + 'px';
    d.style.top = (rect.top + rect.height / 3) + 'px';
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.remove(), 1000); }
}
function fxSur(m, texte, type) { const el = elOf(m.uid); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function fxSurHero(side, texte, type) { const el = elHero(side); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function banniere(texte) {
    const d = document.createElement('div');
    d.className = 'fx-banniere';
    d.textContent = texte;
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.remove(), 1500); }
}
function secouer(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function coteDe(m) { return m.cote === 'J' ? J : B; }
function buff(m, a, v) { m.atk += a; m.vie += v; m.vieMax += v; fxSur(m, `+${a}/+${v}`, 'buff'); }
function fraper(cible, n) { if (!cible) return; if (cible.uid) appliquerDegatsCreature(cible, n); else degatsHero(cible, n); }

function appliquerDegatsCreature(m, n) {
    m.vie -= n;
    fxSur(m, '-' + Math.min(n, 99), 'degat');
    const el = elOf(m.uid);
    secouer(el);
    if (el) {
        const rect = el.getBoundingClientRect();
        creerSlash(rect.left + rect.width/2, rect.top + rect.height/2);
        creerParticules(rect.left + rect.width/2, rect.top + rect.height/2, '#ff5c47', 8);
    }
    jouerSon('hurt');
    const p = POUVOIRS[m.id];
    if (p && p.blesse && !m.silence && m.vie > 0) p.blesse({ moi: coteDe(m), ennemi: autre(coteDe(m)), source: m });
    validerEtapeTuto();
}
function degatsHero(side, n) {
    side.patience -= n;
    fxSurHero(side, '-' + n, 'degat');
    secouer(elHero(side));
    const f = document.createElement('div');
    f.className = 'hit-flash';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 460);
    jouerSon('hurt');
}
function soinHero(side, n) { const avant = side.patience; side.patience = Math.min(30, side.patience + n); if (side.patience > avant) fxSurHero(side, '+' + (side.patience - avant), 'soin'); }
function soigner(cible, n) { if (!cible) return; if (cible.uid) soinCreature(cible, n); else soinHero(cible, n); }
function transformerEn(m, nom, atk, vie, emoji, motsCles) { m.prenom = nom; m.emoji = emoji; m.atk = atk; m.vie = vie; m.vieMax = vie; m.motsCles = motsCles || []; m.silence = true; m.auraAtk = 0; m.desc = 'Transformé.'; fxSur(m, emoji, 'buff'); }
function lancerDe() { const v = 1 + Math.floor(getSyncRandom() * 6); afficherDe(v); return v; }
function lancerPileOuFace() { const pile = getSyncRandom() < 0.5; afficherPiece(pile); return pile; }
const FACES_DE = ['⚀','⚁','⚂','⚃','⚄','⚅'];
function afficherDe(v) {
    const d = document.createElement('div');
    d.className = 'fx-de';
    d.innerHTML = `<span class="de-face">${FACES_DE[v - 1]}</span><span class="de-valeur">Résultat : ${v}</span>`;
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.classList.add('disparait'), 1000); setTimeout(() => d.remove(), 1500); }
}
function afficherPiece(pile) {
    const d = document.createElement('div');
    d.className = 'fx-de';
    d.innerHTML = `<span class="de-face">💰</span><span class="de-valeur">${pile ? 'Pile !' : 'Face…'}</span>`;
    const layer = document.getElementById('fx-layer');
    if (layer) { layer.appendChild(d); setTimeout(() => d.classList.add('disparait'), 1000); setTimeout(() => d.remove(), 1500); }
}
function soinCreature(m, n) { const avant = m.vie; m.vie = Math.min(m.vieMax, m.vie + n); if (m.vie > avant) fxSur(m, '+' + (m.vie - avant), 'soin'); }
function invoquerJeton(side, nom, atk, vie, emoji, motsCles) {
    if (side.plateau.length >= 5) return;
    const faux = { id:'jeton_' + nom, prenom:nom, famille:'Neutre', cout:0, atk, vie, rarete:'commune', desc:'Jeton invoqué.', motsCles:motsCles || [], emoji };
    const inst = instancier(faux, side.cle, true);
    if (inst) {
        inst.malade = true;
        side.plateau.push(inst);
        setTimeout(() => {
            const el = elOf(inst.uid);
            if (el) { const r = el.getBoundingClientRect(); creerParticules(r.left + r.width/2, r.top + r.height/2, '#d9a441', 10); }
        }, 80);
        jouerSon('summon');
    }
}
function piocher(side, n) {
    for (let i = 0; i < n; i++) {
        if (side.pioceBloquee) { side.pioceBloquee = false; fxSurHero(side, 'Pioche bloquée', 'degat'); continue; }
        if (!side.deck.length) { degatsHero(side, 3); continue; }
        if (side.main.length >= 8) { side.deck.shift(); continue; }
        side.main.push(side.deck.shift());
    }
}
function piocherType(side, famille) { const i = side.deck.findIndex(c => c.famille === famille); if (i >= 0 && side.main.length < 8) side.main.push(side.deck.splice(i, 1)[0]); }
function piocherAleatoire(side) { if (!side.deck.length || side.main.length >= 8) return; const i = Math.floor(getSyncRandom() * side.deck.length); side.main.push(side.deck.splice(i, 1)[0]); }
function defausseAleatoire(side) { if (!side.main.length) return; const i = Math.floor(getSyncRandom() * side.main.length); side.main.splice(i, 1); }
function renvoyerEnMain(m, proprio) { proprio.plateau = proprio.plateau.filter(x => x !== m); if (proprio.main.length < 8 && !m.jeton) { const n = instancier(defCarte(m.id), proprio.cle); if (n) proprio.main.push(n); } }
function silencer(m) { m.silence = true; m.motsCles = []; m.desc = 'Réduit au silence.'; m.auraAtk = 0; fxSur(m, 'Silence', 'buff'); }
function transformer(m) { transformerEn(m, 'Paire de chaussettes', 1, 1, '🧦', []); m.desc = 'Ce n\'était vraiment pas le cadeau espéré.'; }
function echangeDegats(a, b) { appliquerDegatsCreature(b, atkTot(a)); appliquerDegatsCreature(a, atkTot(b)); }

/* Carte Bluff révélée : elle perd son effet (sans effet) */
function revelerBluff(m, effets) {
    if (m.revele) return;
    m.revele = true;
    m.bluffVisible = false;
    m.bluffReveleSansEffet = true;
    m.silence = true;
    if (!m.desc.includes('(révélée : pas d\'effet)')) {
        m.desc = m.desc + " (révélée : pas d'effet)";
    }
    fxSur(m, 'Révélée (sans effet)', 'buff');
    jouerSon('summon');
    setTimeout(() => rafraichirJeu(), 100);
}

function recalcAuras() {
    [J, B].forEach(side => {
        const ennemi = autre(side);
        side.plateau.forEach(m => {
            let bonusAtk = 0, bonusVie = 0;
            if (!m.silence) {
                if (m.id === 'm3') { const n = ennemi.plateau.filter(x => x.famille === 'Marouf').length; bonusAtk += n; bonusVie += n; }
                if (m.motsCles.includes('Bluff') && !m.revele) { }
            }
            const t = side.terrain;
            if (t) {
                if (t.id === 't1' && estChat(m)) { bonusAtk += 1; bonusVie += 1; }
                if (t.id === 't2' && m.motsCles.includes('Provocation')) bonusVie += 2;
                if (t.id === 't4' && ['Meridja','Marouf','Kerkache','Belgacemi'].includes(m.famille)) bonusAtk += 1;
                if (t.id === 't9' && m.motsCles.includes('Bluff')) bonusAtk += 1;
            }
            m.auraAtk = bonusAtk;
            const delta = bonusVie - m.auraVieAppliquee;
            if (delta !== 0) { m.vie += delta; m.vieMax += delta; m.auraVieAppliquee = bonusVie; }
        });
    });
}
function coutEffectif(side, c) { 
    let cout = c.cout; 
    if (side.terrain) {
        if (side.terrain.id === 't1' && estChat(c)) cout -= 1; 
        if (side.terrain.id === 'c12' && c.famille === 'Cousins') cout -= 1; 
        if (side.terrain.id === 't9' && c.motsCles.includes('Bluff')) cout -= 1;
    }
    cout += side.surcout; 
    return Math.max(0, cout); 
}

function nettoyerMorts() {
    [J, B].forEach(side => {
        side.plateau.filter(m => m.vie <= 0).forEach(m => {
            const el = elOf(m.uid);
            if (el) {
                const r = el.getBoundingClientRect();
                creerDeathBurst(r.left + r.width/2, r.top + r.height/2);
                creerParticules(r.left + r.width/2, r.top + r.height/2, '#ff4b6e', 14);
                el.classList.add('meurt');
            }
            ajouterLog(m.emoji, `Mort : ${m.prenom}`, side);
            side.cimetiere.push({id: m.id, rarete: m.rarete});
            const p = POUVOIRS[m.id];
            if (p && p.destruction && !m.silence) p.destruction({ moi:side, ennemi:autre(side), source:m });
        });
        side.plateau = side.plateau.filter(m => m.vie > 0);
    });
}

function fusionsPossibles(side, carteEnMain) {
    const recettes = FUSION_DE[carteEnMain.id];
    if (!recettes) return [];
    return recettes.filter(r => {
        const compos = FUSIONS[r.fusion];
        return compos.every(id => side.plateau.some(m => m.id === id) || side.main.some(m => m.id === id && m !== carteEnMain));
    }).map(r => r.fusion);
}
function sacrifierPourFusion(side, fusionId) {
    const compos = FUSIONS[fusionId];
    if (!compos) return;
    compos.forEach(id => {
        const idxPlat = side.plateau.findIndex(m => m.id === id);
        if (idxPlat >= 0) side.plateau.splice(idxPlat, 1);
        else { const idxMain = side.main.findIndex(m => m.id === id); if (idxMain >= 0) side.main.splice(idxMain, 1); }
    });
}

function pousserAction(action) {
    if (!modeEnLigne || !window.multiPartie || !window.multiPartie.active || !monRole || typeof fbDB === 'undefined' || !fbDB) return;
    _compteurAction++;
    const id = Date.now() * 1000 + _compteurAction;
    try { fbDB.ref('salles/' + window.multiPartie.partieId + '/queue/' + id).set({ id: id, par: monPseudo, role: monRole, action: action, ts: Date.now() }); } catch(e) {}
}

/* ===========================================================
   CLICS PLATEAU
   =========================================================== */
function clicCarteMain(index) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur' && !modeEnLigne && !modeTuto) return;
    if (ciblage) return;

    const c = J.main[index];
    if (!c) return;

    // SUR MOBILE : on ouvre la visionneuse au lieu de jouer directement
    const estMobile = document.body.classList.contains('is-mobile')
        || ('ontouchstart' in window && window.innerWidth <= 1024);
    if (estMobile && !modeTuto) {
        ouvrirVisionneuse(index);
        return;
    }

    // Sinon (PC) : comportement direct
    _jouerCarteMainDirect(index);
}

/* ===========================================================
   VISIONNEUSE DE CARTE (mobile)
   =========================================================== */
var _visionneuseIndex = null;

function ouvrirVisionneuse(index) {
    const c = J.main[index];
    if (!c) return;
    _visionneuseIndex = index;

    const display = document.getElementById('card-viewer-display');
    const overlay = document.getElementById('card-viewer-overlay');
    const btnPlay = document.getElementById('card-viewer-play');
    if (!display || !overlay) return;

    display.innerHTML = '';
    const cout = coutEffectif(J, c);
    const el = creerHTMLCarte(c, 'main', { cout });
    display.appendChild(el);
    ajusterTextes(display);

    // Détermine si la carte est jouable
    const peutJouer = tourActuel === 'joueur' && !modeAttente && J.manaActuel >= cout;
    let placePlateau = c.famille === 'Sort' || c.famille === 'Terrain' || J.plateau.length < 5;
    if (c.motsCles.includes('Fusion')) placePlateau = J.plateau.length >= 2 && fusionsPossibles(J, c).length > 0;

    if (btnPlay) {
        btnPlay.disabled = !(peutJouer && placePlateau);
        if (tourActuel !== 'joueur' || modeAttente) {
            btnPlay.innerText = '⏳ Tour de l\'adversaire';
        } else if (!peutJouer) {
            btnPlay.innerText = '💧 Pas assez de mana';
        } else if (!placePlateau) {
            btnPlay.innerText = '🚫 Plateau plein';
        } else {
            btnPlay.innerText = '▶ Jouer cette carte';
        }
    }

    overlay.classList.add('open');
}

function fermerVisionneuse() {
    const overlay = document.getElementById('card-viewer-overlay');
    if (overlay) overlay.classList.remove('open');
    _visionneuseIndex = null;
}

function jouerCarteDepuisVisionneuse() {
    if (_visionneuseIndex === null) return;
    const index = _visionneuseIndex;
    fermerVisionneuse();
    _jouerCarteMainDirect(index);
}

// Version "directe" du clic qui joue la carte sans passer par la visionneuse
function _jouerCarteMainDirect(index) {
    const c = J.main[index];
    if (!c) return;

    if (modeTuto) {
        const coutEff = coutEffectif(J, c);
        if (c.motsCles.includes('Fusion') && fusionsPossibles(J, c).length === 0) {
            afficherErreurTuto('Tu ne réunis pas les 2 composants requis pour cette Fusion.');
            return;
        }
        if (J.manaActuel < coutEff) {
            afficherErreurTuto(`💧 Cette carte coûte ${coutEff} mana, tu n'en as que ${J.manaActuel} !`);
            return;
        }
        if (c.famille !== 'Sort' && c.famille !== 'Terrain' && J.plateau.length >= 5) {
            afficherErreurTuto('🎴 Ton plateau est plein (5 créatures maximum).');
            return;
        }
    }

    if (c.motsCles.includes('Fusion')) {
        const dispo = fusionsPossibles(J, c);
        if (!dispo.length) return info('Cartes requises manquantes.');
        if (J.manaActuel < coutEffectif(J, c)) return info('Pas assez de mana.');
        if (J.plateau.length < 2) return info('Pas de place sur le terrain.');
        pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null });
        const wrapper = document.querySelectorAll('#player-hand .card-wrapper')[index];
        if (wrapper) wrapper.classList.add('fusion-anim');
        jouerSon('summon');
        setTimeout(() => {
            if (wrapper) wrapper.classList.remove('fusion-anim');
            sacrifierPourFusion(J, c.id);
            jouerCarte(J, index, null);
        }, 600);
        return;
    }

    const cout = coutEffectif(J, c);
    if (J.manaActuel < cout) return info('Pas assez de mana.');
    if (c.famille !== 'Sort' && c.famille !== 'Terrain' && J.plateau.length >= 5) return info('Ton plateau est plein.');

    if (c.motsCles.includes('Bluff') && c.famille !== 'Sort' && c.famille !== 'Terrain') {
        const p = POUVOIRS[c.id];
        if (p && p.cible) {
            const cibles = ciblesValides(J, p.cible);
            if (cibles.length) {
                demarrerCiblage(p.cible, cibles, cible => {
                    demanderModeBluff(index, cible);
                });
                return;
            }
        }
        demanderModeBluff(index, null);
        return;
    }

    const p = POUVOIRS[c.id];
    if (p && p.cible) {
        const cibles = ciblesValides(J, p.cible);
        if (cibles.length) {
            demarrerCiblage(p.cible, cibles, cible => {
                let idxCible = null, campCible = null;
                if (cible && cible.uid) { campCible = cible.cote; idxCible = coteDe(cible).plateau.indexOf(cible); }
                pousserAction({ type:'jouer', id:c.id, idxCible, campCible, cibleHero: (cible===J||cible===B)?cible.cle:null });
                jouerCarte(J, index, cible);
            });
            return;
        }
    }

    pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null });
    jouerCarte(J, index, null);
}

function demanderModeBluff(index, cible) {
    _bluffPending = { index, cible };
    const ov = document.getElementById('bluff-choix-overlay');
    if (ov) ov.classList.add('open');
}

function confirmerModeBluff(cache) {
    const ov = document.getElementById('bluff-choix-overlay');
    if (ov) ov.classList.remove('open');
    if (!_bluffPending) return;
    const { index, cible } = _bluffPending;
    _bluffPending = null;
    poserCarteBluff(index, cible, cache);
}

function annulerChoixBluff() {
    const ov = document.getElementById('bluff-choix-overlay');
    if (ov) ov.classList.remove('open');
    _bluffPending = null;
}

function poserCarteBluff(index, cible, cache) {
    const c = J.main[index];
    if (!c) return;
    const cout = coutEffectif(J, c);
    if (J.manaActuel < cout) return;

    c.bluffVisible = !cache;
    if (cache) {
        c.revele = false; c.poseCeTour = true;   // ne peut pas être retournée ce tour-ci
    } else {
        c.revele = true;
        c.silence = true;
        if (!c.desc.includes('(posée visible')) {
            c.desc = c.desc + " (posée visible : pas d'effet)";
        }
    }

    pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null, bluffVisible: !cache });

    J.manaActuel -= cout;
    J.main.splice(index, 1);
    ajouterLog(c.emoji, `${J.nom} joue ${c.prenom} ${cache ? '(face cachée)' : '(face visible)'}`, J);
    if (c.id && !c.id.startsWith('jeton_')) recordCarteJouee(c.id);

    c.malade = !c.motsCles.includes('Charge');
    c.aAttaque = false;
    J.plateau.push(c);

    if (!cache) {
        info(`${c.prenom} entre en jeu (face visible).`);
    } else {
        info(`${c.prenom} est posée face cachée. Utilise un sort de révélation pour la retourner !`);
    }

    setTimeout(() => {
        const el = elOf(c.uid);
        if (el) { const r = el.getBoundingClientRect(); creerParticules(r.left + r.width/2, r.top + r.height/2, cache ? '#a86bff' : '#93a3b4', 12); }
    }, 80);
    jouerSon('summon');

    recalcAuras();
    nettoyerMorts();
    setTimeout(() => { rafraichirJeu(); verifierFin(); validerEtapeTuto(); }, 60);
}

function afficherErreurTuto(msg) {
    const el = document.createElement('div');
    el.className = 'tuto-error-msg';
    el.textContent = msg;
    document.body.appendChild(el);
    jouerSon('error');
    setTimeout(() => el.remove(), 2500);
}

function ciblesValides(side, spec) {
    const ennemi = autre(side);
    let liste = [];
    if (spec.camp === 'ennemi') liste = [...ennemi.plateau];
    else if (spec.camp === 'allie') liste = [...side.plateau];
    else liste = [...side.plateau, ...ennemi.plateau];
    liste = liste.filter(m => {
        if (coteDe(m) === side) return true;
        const pl = coteDe(m).plateau, i = pl.indexOf(m);
        const protege = [pl[i - 1], pl[i + 1]].some(v => v && v.id === 'k1' && !v.silence);
        return !protege;
    });
    if (spec.filtre) liste = liste.filter(spec.filtre);
    if (spec.hero) liste.push(spec.camp === 'allie' ? side : ennemi);
    return liste;
}
function demarrerCiblage(spec, cibles, resoudre) {
    ciblage = { spec, cibles, resoudre };
    const el = document.getElementById('targeting-banner');
    if (el) {
        el.classList.add('open');
        if (el.firstChild) el.firstChild.textContent = (spec.texte || 'Choisis une cible') + ' ';
    }
    rafraichirJeu();
}
function annulerCiblage() { if (!ciblage) return; ciblage = null; const el = document.getElementById('targeting-banner'); if (el) el.classList.remove('open'); rafraichirJeu(); }
function choisirCible(cible) { if (!ciblage) return; if (!ciblage.cibles.includes(cible)) return; const r = ciblage.resoudre; ciblage = null; const el = document.getElementById('targeting-banner'); if (el) el.classList.remove('open'); r(cible); }

function jouerCarte(side, index, cible) {
    const c = side.main[index];
    if (!c) return;
    const cout = coutEffectif(side, c);
    if (side.manaActuel < cout) return;
    side.manaActuel -= cout;
    side.main.splice(index, 1);
    ajouterLog(c.emoji, `${side.nom} joue ${c.prenom}`, side);
    if (side === J && c.id && !c.id.startsWith('jeton_')) recordCarteJouee(c.id);
    const ennemi = autre(side), p = POUVOIRS[c.id];
    if (c.famille === 'Sort') {
        animerSort(c, () => {});
        if (ennemi.contreSort) { ennemi.contreSort = false; info(`${c.prenom} est annulé par Islem !`); banniere('Sort annulé'); }
        else if (p && p.jouer) { p.jouer({ moi:side, ennemi, source:c, cible }); info(`${c.prenom} lancé.`); }
        side.cimetiere.push({id: c.id, rarete: c.rarete});
    } else if (c.famille === 'Terrain') {
        if(side.terrain) side.cimetiere.push({id: side.terrain.id, rarete: side.terrain.rarete});
        side.terrain = c;
        side.terrainTours = 3;
        if (p && p.jouer) p.jouer({ moi:side, ennemi, source:c, cible });
        info(`Terrain ${c.prenom} en jeu (3 tours).`);
        const gs = document.getElementById('game-screen');
        if (gs) {
            dbCartes.filter(x => x.famille === 'Terrain').forEach(x => gs.classList.remove('terrain-' + x.id));
            gs.classList.add('terrain-' + c.id);
        }
    } else {
        c.malade = !c.motsCles.includes('Charge');
        c.aAttaque = false;
        if (c.motsCles.includes('Bluff') && !c.bluffVisible && c.revele !== true) {
            c.revele = false; c.poseCeTour = true;
            info(`${c.prenom} est posée face cachée (Bluff).`);
        } else if (c.motsCles.includes('Bluff') && c.bluffVisible) {
            info(`${c.prenom} est posée face visible (pas d'effet).`);
        } else {
            c.revele = true;
            info(`${c.prenom} entre en jeu.`);
        }
        side.plateau.push(c);
        const nePasDeclencher = c.motsCles.includes('Bluff') && (!c.revele || c.bluffVisible);
        if (!nePasDeclencher && p && p.jouer) p.jouer({ moi:side, ennemi, source:c, cible });

        setTimeout(() => {
            const el = elOf(c.uid);
            if (el) { const r = el.getBoundingClientRect(); creerParticules(r.left + r.width/2, r.top + r.height/2, '#d9a441', 12); }
        }, 80);
        jouerSon('summon');
    }
    recalcAuras();
    nettoyerMorts();
    setTimeout(() => { rafraichirJeu(); verifierFin(); validerEtapeTuto(); }, 60);
}

function animerSort(c, apres) {
    const el = creerHTMLCarte(c, 'jeu');
    el.style.position = 'fixed'; el.style.left = '50%'; el.style.top = '42%';
    el.style.transform = 'translate(-50%,-50%) scale(1.1)';
    el.style.zIndex = 960; el.style.transition = 'opacity .5s, transform .5s'; el.style.pointerEvents = 'none';
    const layer = document.getElementById('fx-layer');
    if (layer) {
        layer.appendChild(el); ajusterTextes(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(1.5) rotate(8deg)'; }, 420);
        setTimeout(() => { el.remove(); if (apres) apres(); }, 950);
    }
}

function clicCreatureAlliee(m) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur' && !modeEnLigne && !modeTuto) return;
    if (ciblage) return choisirCible(m);
    if (m.gele > 0) return info(`${m.prenom} est endormi.`);
    if (m.motsCles.includes('Bluff') && !m.revele && !m.bluffVisible && !m.bluffReveleSansEffet) return tenterRetournerBluff(m);
    if (m.malade) return info(`${m.prenom} ne peut pas encore attaquer.`);
    if (m.aAttaque) return info(`${m.prenom} a déjà attaqué.`);
    if (atkTot(m) <= 0) return info(`${m.prenom} n'a pas d'attaque.`);
    selection = (selection === m) ? null : m;
    info(selection ? `${m.prenom} prêt : choisis une cible.` : 'Sélection annulée.');
    rafraichirJeu();
    jouerSon('click');
}
function clicCreatureEnnemie(m) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(m);
    if (tourActuel !== 'joueur' || !selection) return;
    const provocations = B.plateau.filter(x => x.motsCles.includes('Provocation'));
    if (provocations.length && !m.motsCles.includes('Provocation')) {
        if (modeTuto) afficherErreurTuto('🛡️ Tu dois d\'abord détruire la Provocation.');
        return info('Tu dois d\'abord attaquer une Provocation.');
    }
    attaquer(selection, m);
}
function clicHeroAdverse() {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(B);
    if (tourActuel !== 'joueur' || !selection) return;
    if (B.plateau.some(x => x.motsCles.includes('Provocation'))) {
        if (modeTuto) afficherErreurTuto('🛡️ Une Provocation protège l\'adversaire !');
        return info('Une Provocation protège l\'adversaire.');
    }
    attaquer(selection, B);
}

async function attaquer(attaquant, cible) {
    if (modeEnLigne && attaquant.cote === 'J' && !attaquant._replay) {
        let idxCible = null, campCible = null;
        if (cible.uid) { campCible = cible.cote; idxCible = coteDe(cible).plateau.indexOf(cible); }
        pousserAction({ type:'attaque', idxAttaquant: J.plateau.indexOf(attaquant), idxCible, campCible, cibleHero: cible.uid ? null : cible.cle });
    }
    ajouterLog('⚔', `${attaquant.prenom} attaque`, coteDe(attaquant));
    const elA = elOf(attaquant.uid), elC = cible.uid ? elOf(cible.uid) : elHero(cible);
    selection = null;

    // Calcul des positions AVANT toute modification du DOM
    let positions = null;
    if (elA && elC) {
        const a = elA.getBoundingClientRect(), b = elC.getBoundingClientRect();
        positions = {
            ax: a.left + a.width / 2,
            ay: a.top + a.height / 2,
            bx: b.left + b.width / 2,
            by: b.top + b.height / 2,
            dx: (b.left + b.width / 2) - (a.left + a.width / 2),
            dy: (b.top + b.height / 2) - (a.top + a.height / 2)
        };
    }

    // Animation d'attaque : SEULEMENT visuelle
    if (positions) {
        creerTrail(positions.ax, positions.ay, positions.bx, positions.by);
        jouerSon('attack');
        if (elA) {
            elA.style.transition = 'transform .16s cubic-bezier(.4,0,.6,1)';
            elA.style.zIndex = 60;
            elA.style.transform = `translate(${positions.dx * 0.55}px, ${positions.dy * 0.55}px) scale(1.05)`;
        }
        await pause(170);
    }

    // Appliquer les dégâts
    if (cible.uid) {
        echangeDegats(attaquant, cible);
    } else {
        degatsHero(cible, atkTot(attaquant));
    }
    attaquant.aAttaque = true;

    // Ramener l'attaquant à sa place
    if (elA) {
        elA.style.transform = '';
        await pause(140);
    }

    recalcAuras();
    nettoyerMorts();
    await pause(260);

    rafraichirJeu();
    verifierFin();
    validerEtapeTuto();
}

/* ===========================================================
   TOURS
   =========================================================== */
function prochainManaMax(side) {
    side.numTour++;
    if (side.numTour === 1) side.manaMax = side.premier ? 2 : 3;
    else side.manaMax = Math.min(10, side.manaMax + 2);
    side.manaActuel = side.manaMax;
}
function decrementerTerrains() {
    [J, B].forEach(side => {
        if (side.terrain && side.terrainTours > 0) {
            side.terrainTours--;
            if (side.terrainTours <= 0) {
                ajouterLog('🌍', `Terrain ${side.terrain.prenom} disparaît`, side);
                fxSurHero(side, 'Terrain terminé', 'buff');
                side.cimetiere.push({ id: side.terrain.id, rarete: side.terrain.rarete });
                side.terrain = null;
                const gs = document.getElementById('game-screen');
                if (gs) dbCartes.filter(x => x.famille === 'Terrain').forEach(x => gs.classList.remove('terrain-' + x.id));
            }
        }
    });
}
function debutTourJoueur() {
    if (partieFinie) return;
    if (modeTuto) return;
    tourActuel = 'joueur'; modeAttente = false; selection = null; fermerAttente();
    const ti = document.getElementById('tour-indicateur');
    if (ti) ti.innerText = 'Ton tour';
    const tp = document.querySelector('.turn-pill');
    if (tp) tp.classList.remove('bot');
    const be = document.getElementById('btn-endturn');
    if (be) be.classList.remove('inactif');
    prochainManaMax(J);
    J.plateau.forEach(m => {
        m.poseCeTour = false;
        m.aAttaque = false;
        m.malade = false;
        if (m.gele > 0) m.gele--;
    });
    piocher(J, 1);
    banniere('À toi de jouer');
    if (!modeEnLigne && !modeTuto) demarrerTimer();
    recalcAuras();
    rafraichirJeu();
    verifierFin();
}
function finDeTour() {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur') return;
    annulerCiblage();
    clearInterval(timer);
    appliquerFinDeTour(J);
    if (partieFinie) return;
    J.surcout = 0;
    if (J.voitMainAdverse > 0) J.voitMainAdverse--;
    decrementerTerrains();
    if (modeEnLigne) {
        pousserAction({ type: 'fin' });
        modeAttente = true; tourActuel = 'bot';
        const ti = document.getElementById('tour-indicateur');
        if (ti) ti.innerText = 'Tour adverse';
        const tp = document.querySelector('.turn-pill');
        if (tp) tp.classList.add('bot');
        const be = document.getElementById('btn-endturn');
        if (be) be.classList.add('inactif');
        info('L\'adversaire réfléchit...');
        prochainManaMax(B);
        B.plateau.forEach(m => {
            m.aAttaque = false;
            m.malade = false;
            if (m.gele > 0) m.gele--;
        });
        piocher(B, 1);
        rafraichirJeu();
    } else if (!modeTuto) jouerTourBot();
}
function appliquerFinDeTour(side) {
    side.plateau.forEach(m => {
        const p = POUVOIRS[m.id];
        if (p && p.finTour && !m.silence) p.finTour({ moi:side, ennemi:autre(side), source:m });
    });
    [J, B].forEach(s => { if (s.terrain) { const p = POUVOIRS[s.terrain.id]; if (p && p.finTourGlobal) p.finTourGlobal(); } });
    recalcAuras();
    nettoyerMorts();
    rafraichirJeu();
    verifierFin();
}
function demarrerTimer() {
    if (modeEnLigne || modeTuto) return;
    tempsRestant = 60; clearInterval(timer); majTimer();
    timer = setInterval(() => {
        tempsRestant--; majTimer();
        if (tempsRestant <= 0) { clearInterval(timer); finDeTour(); }
    }, 1000);
}
function majTimer() {
    const tc = document.getElementById('timer-count');
    const tf = document.getElementById('timer-fill');
    const tm = document.querySelector('.timer');
    if (tc) tc.innerText = tempsRestant + 's';
    if (tf) tf.style.width = (tempsRestant / 60 * 100) + '%';
    if (tm) tm.classList.toggle('urgent', tempsRestant <= 10);
}

/* ===========================================================
   BOT INTELLIGENT
   =========================================================== */
function choisirCibleBotIntelligent(spec, cibles, carteSource, side) {
    if (!cibles.length) return null;
    const estSortAllie = spec.camp === 'allie';
    const estSortEnnemi = spec.camp === 'ennemi';

    if (estSortAllie) {
        const creatures = cibles.filter(c => c.uid);
        if (creatures.length === 0) return cibles[0];
        if (carteSource.desc.toLowerCase().includes('attaque') || carteSource.desc.toLowerCase().includes('force')) {
            const pretes = creatures.filter(c => !c.aAttaque && !c.malade && c.gele === 0);
            if (pretes.length) return pretes.sort((a, b) => atkTot(b) - atkTot(a))[0];
            return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0];
        }
        if (carteSource.desc.toLowerCase().includes('soign') || carteSource.desc.toLowerCase().includes('vie')) {
            const blessees = creatures.filter(c => c.vie < c.vieMax);
            if (blessees.length) return blessees.sort((a, b) => (a.vie / a.vieMax) - (b.vie / b.vieMax))[0];
            return creatures.sort((a, b) => b.vieMax - a.vieMax)[0];
        }
        return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0] || cibles[0];
    }

    if (estSortEnnemi) {
        const creatures = cibles.filter(c => c.uid);
        if (carteSource.desc.toLowerCase().includes('détruit') || carteSource.desc.toLowerCase().includes('destruction')) {
            if (creatures.length) return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0];
            return cibles.includes(J) ? J : null;
        }
        if (carteSource.desc.toLowerCase().includes('dégât') || carteSource.desc.toLowerCase().includes('inflige')) {
            const degats = parseInt((carteSource.desc.match(/\d+/) || [2])[0]);
            const tuables = creatures.filter(c => c.vie <= degats);
            if (tuables.length) return tuables.sort((a, b) => atkTot(b) - atkTot(a))[0];
            if (creatures.length) return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0];
            return cibles.includes(J) ? J : null;
        }
        if (creatures.length) return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0];
        return cibles.includes(J) ? J : null;
    }
    return cibles[0];
}

function choisirCibleAttaqueBot(attaquant, coteAdverse) {
    const creaturesAdverses = coteAdverse.plateau;
    const heroAdverse = coteAdverse;
    if (creaturesAdverses.length === 0) return heroAdverse;

    const atk = atkTot(attaquant);
    const vie = attaquant.vie;
    const ciblesTuables = creaturesAdverses.filter(c => c.vie <= atk);

    if (ciblesTuables.length > 0) {
        const meilleureCible = [...ciblesTuables].sort((a, b) => atkTot(b) - atkTot(a))[0];
        if (atkTot(meilleureCible) < vie) return meilleureCible;
        return [...ciblesTuables].sort((a, b) => atkTot(a) - atkTot(b))[0];
    }
    if (vie > 4 && Math.random() < 0.35) {
        return [...creaturesAdverses].sort((a, b) => atkTot(b) - atkTot(a))[0];
    }
    return heroAdverse;
}

async function jouerTourBot() {
    if (modeEnLigne || modeTuto) return;
    if (partieFinie) return;
    if (!B.deck || B.deck.length === 0) {
        const banned = window.cartesBannies || [];
        B.deck = hasard(decksPreconstruits).cartes.filter(c => !banned.includes(typeof c === 'string' ? c : c.id))
            .map(c => { const id = typeof c === 'string' ? c : c.id; return instancier(defCarte(id), 'B'); }).filter(x => x);
        melanger(B.deck);
    }
    tourActuel = 'bot'; selection = null; clearInterval(timer);
    const ti = document.getElementById('tour-indicateur');
    if (ti) ti.innerText = 'Tour du bot';
    const tp = document.querySelector('.turn-pill');
    if (tp) tp.classList.add('bot');
    const be = document.getElementById('btn-endturn');
    if (be) be.classList.add('inactif');
    banniere('Tour du bot');
    prochainManaMax(B);
    B.plateau.forEach(m => {
        m.aAttaque = false;
        m.malade = false;
        if (m.gele > 0) m.gele--;
    });
    piocher(B, 1);
    rafraichirJeu();
    await pause(700);

    // PHASE 1 : Révéler ses cartes Bluff cachées (30%)
    for (const m of [...B.plateau]) {
        if (partieFinie) break;
        if (m.motsCles.includes('Bluff') && !m.revele && !m.bluffVisible && !m.bluffReveleSansEffet) {
            if (Math.random() < 0.3) {
                await pause(300);
                revelerBluff(m, null);
                info(`Le bot révèle ${m.prenom} !`);
            }
        }
    }

    // PHASE 2 : Jouer des cartes
    let action = true, securite = 0;
    while (action && !partieFinie && securite < 20) {
        securite++; action = false;
        const jouables = B.main.map((c, i) => ({ c, i })).filter(o => {
            if (o.c.motsCles.includes('Fusion')) return fusionsPossibles(B, o.c).length > 0 && coutEffectif(B, o.c) <= B.manaActuel;
            return coutEffectif(B, o.c) <= B.manaActuel && (o.c.famille === 'Sort' || o.c.famille === 'Terrain' || B.plateau.length < 5);
        }).sort((a, b) => b.c.cout - a.c.cout);

        if (jouables.length) {
            const choix = jouables[0];
            if (choix.c.motsCles.includes('Fusion')) {
                sacrifierPourFusion(B, choix.c.id);
                jouerCarte(B, choix.i, null);
            } else {
                const p = POUVOIRS[choix.c.id];
                let cible = null;
                if (p && p.cible) {
                    cible = choisirCibleBotIntelligent(p.cible, ciblesValides(B, p.cible), choix.c, B);
                }
                if (choix.c.motsCles.includes('Bluff') && choix.c.famille !== 'Sort' && choix.c.famille !== 'Terrain') {
                    choix.c.bluffVisible = false;
                    choix.c.revele = false;
                    jouerCarte(B, choix.i, cible);
                } else {
                    jouerCarte(B, choix.i, cible);
                }
            }
            action = true;
            await pause(750);
        }
    }

    // PHASE 3 : Attaquer
    await pause(300);
    for (const m of [...B.plateau]) {
        if (partieFinie) break;
        if (m.aAttaque || m.malade || m.gele > 0 || atkTot(m) <= 0) continue;
        if (m.motsCles.includes('Bluff') && !m.revele && !m.bluffVisible) continue;

        const provocations = J.plateau.filter(x => x.motsCles.includes('Provocation'));
        let cible;
        if (provocations.length) {
            cible = [...provocations].sort((a, b) => atkTot(b) - atkTot(a))[0];
        } else {
            cible = choisirCibleAttaqueBot(m, J);
        }
        if (cible) {
            await attaquer(m, cible);
            await pause(280);
        }
    }

    if (partieFinie) return;
    appliquerFinDeTour(B);
    B.surcout = 0;
    if (B.voitMainAdverse > 0) B.voitMainAdverse--;
    decrementerTerrains();
    if (partieFinie) return;
    const be2 = document.getElementById('btn-endturn');
    if (be2) be2.classList.remove('inactif');
    await pause(400);
    debutTourJoueur();
}
function choisirCibleBot(spec, cibles) {
    if (!cibles.length) return null;
    const creatures = cibles.filter(c => c.uid);
    if (spec.camp === 'allie') return creatures.sort((a, b) => (b.vieMax - b.vie) - (a.vieMax - a.vie) || atkTot(b) - atkTot(a))[0] || cibles[0];
    if (creatures.length) return creatures.sort((a, b) => atkTot(b) - atkTot(a))[0];
    return cibles[0];
}

function verifierFin() {
    if (partieFinie) return;
    if (J.patience <= 0 || B.patience <= 0) {
        partieFinie = true;
        clearInterval(timer);
        const gagne = B.patience <= 0 && J.patience > 0;
        const mode = modeEnLigne ? 'multi' : (modeTournoi ? 'tournoi' : (modeChallenge ? 'challenge' : 'bot'));
        enregistrerResultat(gagne, mode);
        try { evenementSucces('fin', { gagne, mode, pv: J.patience }); if (mode === 'multi') appliquerElo(gagne); } catch (e) { console.warn(e); }
        banniere(gagne ? 'Victoire !' : 'Défaite…');
        jouerSon(gagne ? 'victory' : 'defeat');
        const bfNav = document.getElementById('btn-forfait');
        if (bfNav) bfNav.hidden = true;
        const attente = document.getElementById('attente-overlay');
        if (attente) attente.classList.remove('open');
        let gain = 0;
        if (mode === 'bot') gain = gagne ? ECO.gainBotVictoire : ECO.gainBotDefaite;
        else if (mode === 'multi') gain = gagne ? ECO.gainMultiVictoire : ECO.gainMultiDefaite;
        else if (mode === 'tournoi') gain = gagne ? ECO.gainTournoiPartieV : ECO.gainTournoiPartieD;
        else if (mode === 'challenge') gain = gagne ? ECO.gainChallengeVictoire : 0;
        profil.coins += gain;
        sauvegarderProgression();
        majTopBarCoins();
        if (gain > 0) afficherGainArgent(gain);
        if (gagne) {
            ajouterXP(mode === 'multi' ? ECO.xpMulti : (mode === 'tournoi' ? ECO.xpTournoi : ECO.xpBot));
            if (mode === 'bot') progresserQuete('victoires_bot', 1);
            if (mode === 'multi') progresserQuete('victoires_multi', 1);
        } else ajouterXP(10);
        if (_deckUtiliseEnCours) enregistrerVictoire(_deckUtiliseEnCours, gagne);
        if (!Array.isArray(profil.historique)) profil.historique = [];
        profil.historique.unshift({ date: Date.now(), adversaire: modeEnLigne ? (B.nom || 'Adversaire') : (modeTournoi ? 'Tournoi' : 'Bot'), deck: _deckUtiliseEnCours || '—', gagne: gagne, mode: mode });
        profil.historique = profil.historique.slice(0, 20);
        sauvegarderProgression();
        if (window._modeSpecial && traiterFinSpeciale(gagne)) return;
        if (modeTournoi && gagne) { setTimeout(() => avancerTournoi(true), 2000); return; }
        else if (modeTournoi && !gagne) { setTimeout(() => avancerTournoi(false), 2000); return; }
        if (modeChallenge) { modeChallenge = false; setTimeout(() => { if (gagne) alert('🏆 DÉFI RÉUSSI ! Tu es un vrai membre de la Famille !'); changerEcran('menu-screen'); }, 2200); return; }
        if (window._forfaitAdverse) { const nomF = window._forfaitAdverse; window._forfaitAdverse = null; afficherVictoireForfait(nomF, gain, ECO.xpMulti); return; }
        setTimeout(() => { changerEcran('menu-screen'); }, 2200);
    }
}
function info(txt) { const el = document.getElementById('combat-info'); if (el) el.innerText = txt; }
function enregistrerResultat(gagne, mode) {
    if (gagne !== null && gagne !== undefined) { stats.parties++; if (gagne) stats.victoires++; else stats.defaites++; }
    const ratio = stats.parties > 0 ? Math.round(stats.victoires / stats.parties * 100) : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('stat-parties', stats.parties);
    set('stat-victoires', stats.victoires);
    set('stat-defaites', stats.defaites);
    set('stat-ratio', ratio + '%');
    let bestDeck = '—', bestDeckN = 0;
    if (profil.statsDecks) Object.entries(profil.statsDecks).forEach(([nom, n]) => { if (n > bestDeckN) { bestDeckN = n; bestDeck = nom; } });
    set('stat-deck-fav', bestDeck);
    set('stat-deck-fav-count', bestDeckN);
    let bestCarte = '—', bestCarteN = 0;
    if (profil.statsCartes) Object.entries(profil.statsCartes).forEach(([id, n]) => { if (n > bestCarteN) { bestCarteN = n; const c = defCarte(id); bestCarte = c ? c.prenom : id; } });
    set('stat-carte-fav', bestCarte);
    set('stat-carte-fav-count', bestCarteN);
}

/* ===========================================================
   TOURNOI
   =========================================================== */
var _timerTournoi = null;
var _tournoiTimerSecondes = 90;

function afficherEtatTournoi() {
    const el = document.getElementById('tournoi-etat');
    if (!el) return;
    if (!tournoiEnCours) {
        el.innerHTML = '<p class="hint">Aucun tournoi en cours.</p>';
        const timerEl = document.getElementById('tournoi-timer');
        if (timerEl) timerEl.classList.add('hidden');
        return;
    }
    const t = tournoiEnCours;
    let html = `<h3>Tournoi ${t.taille} joueurs — Match ${t.tourActuel + 1}/${t.matchs.length}</h3>`;
    html += '<div class="tournoi-bracket">';
    t.matchs.forEach((m, i) => {
        if (m.joue) {
            const jeSuisGagnant = m.gagnant === 'Vous';
            html += `<div class="tournoi-match ${jeSuisGagnant ? 'win' : 'lose'}">
                <div class="tournoi-joueur ${m.gagnant === 'Vous' ? 'winner' : ''}"><span>Vous</span><span>${m.gagnant === 'Vous' ? '✓' : '✗'}</span></div>
                <div class="tournoi-joueur ${m.gagnant !== 'Vous' ? 'winner' : ''}"><span>${m.adversaire}</span><span>${m.gagnant !== 'Vous' ? '✓' : '✗'}</span></div>
            </div>`;
        } else if (i === t.tourActuel) {
            html += `<div class="tournoi-match">
                <div class="tournoi-joueur">Vous (à jouer)</div>
                <div class="tournoi-joueur">${m.adversaire || '?'}</div>
            </div>`;
        } else {
            html += `<div class="tournoi-match" style="opacity:.4;"><div class="tournoi-joueur">?</div><div class="tournoi-joueur">?</div></div>`;
        }
    });
    html += '</div>';
    if (t.gainTotal) html += `<p style="color:var(--menthe);font-weight:700;margin-top:12px;">Gains : ${t.gainTotal} 💰</p>`;
    el.innerHTML = html;
}

function demarrerTournoi(taille) {
    const cout = taille === 4 ? ECO.tournoi4Cout : ECO.tournoi8Cout;
    if (profil.coins < cout) return flashInfo(`Il te faut ${cout} 💰 pour ce tournoi.`);
    if (!confirm(`Payer ${cout} 💰 pour rejoindre le tournoi ${taille} joueurs ?`)) return;
    profil.coins -= cout;
    sauvegarderProgression();
    majTopBarCoins();

    const nomsBots = ['Alfred', 'Bernard', 'Charles', 'Dimitri', 'Eugène', 'Fernand', 'Gaston', 'Henri', 'Isidore', 'Jules', 'Kléber', 'Léon', 'Marcel', 'Napoléon', 'Oscar', 'Pascal', 'Quentin', 'Raoul', 'Sébastien', 'Théodore', 'Ulysse', 'Victor', 'Wilfried', 'Xavier', 'Yves', 'Zacharie'];
    const nomsMelanges = nomsBots.sort(() => Math.random() - 0.5);
    const adversaires = nomsMelanges.slice(0, taille - 1);
    const matchs = [];
    for (let i = 0; i < taille - 1; i++) {
        matchs.push({ adversaire: adversaires[i] || ('Bot ' + (i+1)), joue: false, gagnant: undefined });
    }
    tournoiEnCours = { taille, matchs, tourActuel: 0, gainTotal: 0, cout, botsDisponibles: nomsMelanges.slice(taille - 1) };
    afficherEtatTournoi();

    _tournoiTimerSecondes = 90;
    const timerEl = document.getElementById('tournoi-timer');
    const timerTxt = document.getElementById('tournoi-timer-txt');
    if (timerEl) timerEl.classList.remove('hidden');
    if (timerTxt) timerTxt.innerText = `En attente de joueurs... ${_tournoiTimerSecondes}s`;

    if (_timerTournoi) clearInterval(_timerTournoi);
    _timerTournoi = setInterval(() => {
        _tournoiTimerSecondes--;
        if (timerTxt) timerTxt.innerText = `En attente de joueurs... ${_tournoiTimerSecondes}s`;
        if (_tournoiTimerSecondes % 5 === 0 && _tournoiTimerSecondes > 0) flashInfo(`Un joueur a rejoint le tournoi !`);
        if (_tournoiTimerSecondes <= 0) {
            clearInterval(_timerTournoi);
            _timerTournoi = null;
            if (timerEl) timerEl.classList.add('hidden');
            flashInfo('Le tournoi commence ! Les places restantes sont remplies par des bots.');
            setTimeout(() => lancerProchainMatchTournoi(), 1000);
        }
    }, 1000);
    flashInfo(`🏆 Tournoi lancé ! ${matchs.length} matchs à gagner.`);
}

function forcerTournoi() {
    if (!tournoiEnCours) return;
    if (_timerTournoi) { clearInterval(_timerTournoi); _timerTournoi = null; }
    const timerEl = document.getElementById('tournoi-timer');
    if (timerEl) timerEl.classList.add('hidden');
    flashInfo('Ajout des bots... Le tournoi commence !');
    setTimeout(() => lancerProchainMatchTournoi(), 800);
}

function lancerProchainMatchTournoi() {
    if (!tournoiEnCours) return;
    const t = tournoiEnCours;
    if (t.tourActuel >= t.matchs.length) {
        const bonus = t.taille === 8 ? ECO.tournoi8Bonus : ECO.tournoi4Bonus;
        profil.coins += bonus;
        sauvegarderProgression();
        majTopBarCoins();
        jouerSon('victory');
        alert(`🏆 TOURNOI GAGNÉ !\n\n+${bonus} 💰 bonus !`);
        tournoiEnCours = null;
        changerEcran('menu-screen');
        return;
    }
    const m = t.matchs[t.tourActuel];
    modeTournoi = true;
    lancerPartieTournoi(m.adversaire);
}
function lancerPartieTournoi(nomAdversaire) {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false;
    const sel = document.getElementById('deck-select');
    let i = sel ? parseInt(sel.value) : 0;
    if (!mesDecks[i] || calculerCartesPossedeesPourDeck(mesDecks[i].cartes) !== 20) {
        const complet = mesDecks.findIndex(d => calculerCartesPossedeesPourDeck(d.cartes) === 20);
        if (complet < 0) { alert('Aucun deck complet ! Tournoi annulé.'); tournoiEnCours = null; changerEcran('menu-screen'); return; }
        i = complet;
    }
    J = nouveauCote('J', J.nom || 'Toi');
    B = nouveauCote('B', nomAdversaire || 'Bot');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = J.nom;
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = nomAdversaire || 'Bot';
    _deckUtiliseEnCours = mesDecks[i].nom;
    recordDeckJoue(_deckUtiliseEnCours);
    J.deck = mesDecks[i].cartes.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'J', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(J.deck);
    B.deck = hasard(decksPreconstruits).cartes.map(c => instancier(defCarte(typeof c === 'string' ? c : c.id), 'B', false, defCarte(typeof c === 'string' ? c : c.id).rarete)).filter(x => x);
    melanger(B.deck);
    initialiserPartie(Math.random() > 0.5);
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
    flashInfo(`⚔ Match ${tournoiEnCours.tourActuel + 1}/${tournoiEnCours.matchs.length}`);
}
function avancerTournoi(gagne) {
    if (!tournoiEnCours) return;
    const t = tournoiEnCours;
    const m = t.matchs[t.tourActuel];
    m.joue = true;
    m.gagnant = gagne ? 'Vous' : m.adversaire;
    if (gagne) t.gainTotal += (t.taille === 8 ? ECO.tournoi8Match : ECO.tournoi4Match);
    t.tourActuel++;
    afficherEtatTournoi();
    changerEcran('tournoi-screen');
    if (gagne) setTimeout(() => lancerProchainMatchTournoi(), 1500);
    else setTimeout(() => {
        alert(`❌ Éliminé du tournoi. Gains conservés : ${t.gainTotal} 💰`);
        profil.coins += t.gainTotal;
        sauvegarderProgression();
        majTopBarCoins();
        tournoiEnCours = null;
        changerEcran('menu-screen');
    }, 500);
}
function fermerTournoi() { const ov = document.getElementById('tournoi-overlay'); if (ov) ov.classList.remove('open'); }

/* ===========================================================
   SPECTATEUR
   =========================================================== */
function rafraichirSpectateur() {
    const el = document.getElementById('spectateur-liste');
    if (!el) return;
    if (typeof fbDB === 'undefined' || !fbDB) { el.innerHTML = '<p class="hint">Firebase non connecté.</p>'; return; }
    el.innerHTML = '<p class="hint">Recherche de parties…</p>';
    fbDB.ref('salles').once('value').then(snap => {
        const salles = snap.val() || {};
        const enCours = Object.entries(salles).filter(([id, s]) => s && s.joueurs && Object.keys(s.joueurs).length === 2);
        if (enCours.length === 0) { el.innerHTML = '<p class="hint">Aucune partie en cours actuellement.</p>'; return; }
        el.innerHTML = '';
        enCours.forEach(([id, s]) => {
            const joueurs = Object.keys(s.joueurs);
            const div = document.createElement('div');
            div.className = 'spectateur-item';
            div.innerHTML = `<div><div style="font-weight:700;color:var(--laiton-clair);">${joueurs[0]} vs ${joueurs[1]}</div>
                <div class="hint" style="font-size:11px;">Salle ${id.slice(0, 12)}...</div></div>
                <button onclick="rejoindreSpectateur('${id}')">👀 Regarder</button>`;
            el.appendChild(div);
        });
    }).catch(() => el.innerHTML = '<p class="hint">Erreur.</p>');
}
function rejoindreSpectateur(partieId) {
    alert("Le mode spectateur est simplifié dans cette version.\nTu vas observer la salle " + partieId + " sans interagir.");
}

/* ===========================================================
   CHAT INGAME
   =========================================================== */
function toggleIngameChat() { const ic = document.getElementById('ingame-chat'); if (ic) ic.classList.toggle('open'); }
function envoyerIngameChat() {
    const inp = document.getElementById('ingame-chat-input');
    if (!inp) return;
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    afficherMsgIngame(txt, true);
    if (modeEnLigne && window.multiPartie && window.multiPartie.active) pousserAction({ type:'chat', text: txt });
    else {
        setTimeout(() => {
            const reponses = ['Bien joué !', 'Oula...', 'On verra !', 'GG', '😅', 'Tu m\'as eu'];
            afficherMsgIngame(reponses[Math.floor(Math.random()*reponses.length)], false);
        }, 1200);
    }
}
function afficherMsgIngame(txt, moi) {
    const el = document.getElementById('ingame-chat-messages');
    if (!el) return;
    const d = document.createElement('div');
    d.className = 'msg ' + (moi ? 'moi' : 'autre');
    d.textContent = txt;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
}

/* ===========================================================
   PROFIL
   =========================================================== */
var AVATARS_DISPO = ['🧑','👨🏻','👩🏻','🧔🏽','👵🏻','👴🏽','👦🏻','👧🏽','🧕','🐈'];
function toggleAvatarPicker() {
    const p = document.getElementById('avatar-picker');
    if (!p) return;
    p.classList.toggle('hidden');
    if (!p.classList.contains('hidden')) {
        p.innerHTML = '';
        AVATARS_DISPO.forEach(e => {
            const d = document.createElement('div');
            d.className = 'avatar-choice' + (profil.avatar === e ? ' selected' : '');
            d.textContent = e;
            d.onclick = () => {
                profil.avatar = e;
                sauvegarderProgression();
                afficherProfil();
                const h = document.getElementById('player-portrait');
                if (h) h.innerText = e;
                toggleAvatarPicker();
                flashInfo('Avatar mis à jour !');
            };
            p.appendChild(d);
        });
    }
}
function copierCodeAmi() {
    const code = profil.codeAmi;
    if (!code) return;
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => flashInfo('Code copié ! 📋')).catch(() => prompt('Copie ce code :', code));
    else prompt('Copie ce code :', code);
}
function afficherProfil() {
    const p = document.getElementById('profil-pseudo');
    if (p) p.innerText = J.nom || 'Joueur';
    const codeEl = document.getElementById('profil-code');
    if (codeEl) codeEl.innerText = 'Code ami : ' + (profil.codeAmi || '—') + ' 📋';
    const av = document.getElementById('profil-avatar-big');
    if (av) av.innerText = profil.avatar || '🧑';
    majProfilUI();
    enregistrerResultat(null);
    afficherDemandesAmis();
    afficherAmis();
}
function afficherDemandesAmis() {
    const box = document.getElementById('demandes-ami-liste');
    if (!box) return;
    box.innerHTML = '';
    const demandes = profil.demandesAmisRecues || [];
    if (demandes.length === 0) return;
    const titre = document.createElement('div');
    titre.innerHTML = '<h4 style="color:var(--laiton-clair);margin:10px 0 6px;">Demandes reçues</h4>';
    box.appendChild(titre);
    demandes.forEach(d => {
        const div = document.createElement('div');
        div.className = 'demande-ami-item';
        div.innerHTML = `<span class="nom">${esc(d.pseudo || d.code || 'Inconnu')}</span>
            <div style="display:flex;gap:6px;">
                <button onclick="accepterDemandeAmiPar('${d.code}')">Accepter</button>
                <button class="refuse" onclick="refuserDemandeAmiPar('${d.code}')">Refuser</button>
            </div>`;
        box.appendChild(div);
    });
}
function accepterDemandeAmiPar(code) {
    if (!Array.isArray(profil.amis)) profil.amis = [];
    if (!profil.amis.includes(code)) profil.amis.push(code);
    profil.demandesAmisRecues = (profil.demandesAmisRecues || []).filter(d => d.code !== code);
    sauvegarderProgression();
    if (typeof fbDB !== 'undefined' && fbDB && monId) try { fbDB.ref('demandesAmis/' + monId).remove(); } catch(e) {}
    afficherProfil();
    flashInfo('Ami accepté !');
}
function refuserDemandeAmiPar(code) {
    profil.demandesAmisRecues = (profil.demandesAmisRecues || []).filter(d => d.code !== code);
    sauvegarderProgression();
    if (typeof fbDB !== 'undefined' && fbDB && monId) try { fbDB.ref('demandesAmis/' + monId).remove(); } catch(e) {}
    afficherDemandesAmis();
}
function afficherAmis() {
    const liste = document.getElementById('amis-liste');
    if (!liste) return;
    liste.innerHTML = '';
    const amis = profil.amis || [];
    if (amis.length === 0) { liste.innerHTML = '<p class="hint">Aucun ami pour l\'instant.</p>'; return; }
    amis.forEach((codeAmi) => {
        const div = document.createElement('div');
        div.className = 'ami-item';
        div.innerHTML = `<div class="ami-info"><div class="ami-avatar">🧑</div>
            <div><div class="ami-nom">${codeAmi}</div>
            <div class="ami-etat" id="ami-etat-${codeAmi.replace(/[^a-zA-Z0-9]/g,'_')}">Chargement…</div></div></div>
            <div class="ami-actions">
                <button onclick="ouvrirChat('${codeAmi}')">💬</button>
                <button class="sec" onclick="retirerAmi('${codeAmi}')">✕</button>
            </div>`;
        liste.appendChild(div);
        chargerFicheAmi(codeAmi);
    });
}
function ajouterAmi() {
    const inp = document.getElementById('friend-code-input');
    if (!inp) return;
    const code = (inp.value || '').trim().toUpperCase();
    if (!code || code === profil.codeAmi) return flashInfo('Code invalide.');
    if (typeof fbDB === 'undefined' || !fbDB) return flashInfo('Impossible (hors-ligne).');
    fbDB.ref('profils').orderByChild('public/codeAmi').equalTo(code).once('value').then(snap => {
        const data = snap.val();
        if (!data) return flashInfo('Code introuvable.');
        const uid = Object.keys(data)[0];
        const pub = data[uid].public || {};
        fbDB.ref('demandesAmis/' + uid).push({ deCode: profil.codeAmi, dePseudo: J.nom, deUid: monId, ts: Date.now() });
        inp.value = '';
        flashInfo(`Demande envoyée à ${pub.pseudo || code} !`);
    }).catch(() => flashInfo('Erreur de recherche.'));
}
function retirerAmi(code) {
    if (!confirm('Retirer cet ami ?')) return;
    profil.amis = (profil.amis || []).filter(c => c !== code);
    sauvegarderProgression();
    afficherAmis();
}
function chargerFicheAmi(codeAmi) {
    if (typeof fbDB === 'undefined' || !fbDB) return;
    fbDB.ref('profils').orderByChild('public/codeAmi').equalTo(codeAmi).once('value').then(snap => {
        const data = snap.val();
        const el = document.getElementById('ami-etat-' + codeAmi.replace(/[^a-zA-Z0-9]/g,'_'));
        if (!el) return;
        if (data) {
            const uid = Object.keys(data)[0];
            const pub = data[uid].public || {};
            const nom = pub.pseudo || 'Inconnu';
            const av = pub.avatar || '🧑';
            const online = pub.lastSeen && (Date.now() - pub.lastSeen < 60000);
            el.innerHTML = `${esc(av)} ${esc(nom)} <span style="color:${online ? 'var(--menthe)' : 'var(--texte-doux)'}">●</span>`;
            el.classList.toggle('on', online);
            const avEl = el.parentElement.parentElement.querySelector('.ami-avatar');
            if (avEl) avEl.innerText = av;
        } else el.innerText = 'Inconnu';
    }).catch(() => {
        const el = document.getElementById('ami-etat-' + codeAmi.replace(/[^a-zA-Z0-9]/g,'_'));
        if (el) el.innerText = 'Inconnu';
    });
}
function ouvrirChat(codeAmi) {
    window._amiChatEnCours = codeAmi;
    const t = document.getElementById('chat-title');
    if (t) t.innerText = 'Chat avec ' + codeAmi;
    const ov = document.getElementById('chat-overlay');
    if (ov) ov.classList.add('open');
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.innerHTML = '';
    if (typeof fbDB !== 'undefined' && fbDB) {
        const cle = [profil.codeAmi, codeAmi].sort().join('_');
        fbDB.ref('messagesPrives/' + cle).off();
        fbDB.ref('messagesPrives/' + cle).on('value', snap => {
            const data = snap.val() || {};
            const msgsEl = document.getElementById('chat-messages');
            if (!msgsEl) return;
            msgsEl.innerHTML = '';
            Object.values(data).sort((a,b) => a.ts - b.ts).forEach(m => {
                const d = document.createElement('div');
                d.className = 'chat-msg ' + (m.de === profil.codeAmi ? 'moi' : 'autre');
                d.textContent = m.texte;
                msgsEl.appendChild(d);
            });
            msgsEl.scrollTop = msgsEl.scrollHeight;
        });
    }
}
function fermerChat() { const ov = document.getElementById('chat-overlay'); if (ov) ov.classList.remove('open'); window._amiChatEnCours = null; }
function envoyerMessageChat() {
    const inp = document.getElementById('chat-input');
    const code = window._amiChatEnCours;
    if (!inp || !code) return;
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    if (typeof fbDB === 'undefined' || !fbDB) return flashInfo('Impossible (hors-ligne).');
    const cle = [profil.codeAmi, code].sort().join('_');
    fbDB.ref('messagesPrives/' + cle).push({ de: profil.codeAmi, texte: txt, ts: Date.now() });
}
function ecouterDemandesAmis() {
    if (typeof fbDB === 'undefined' || !fbDB || !monId) return;
    fbDB.ref('demandesAmis/' + monId).on('value', snap => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([k, v]) => ({ id: k, code: v.deCode, pseudo: v.dePseudo }));
        profil.demandesAmisRecues = arr;
        if (arr.length > 0 && document.getElementById('profil-screen').classList.contains('active')) afficherProfil();
        else if (arr.length > 0) flashInfo(`👋 ${arr.length} demande(s) d'ami !`);
    });
}

/* ===========================================================
   CIMETIÈRE, LOGS, EMOTES
   =========================================================== */
function voirCimetiere(cle) {
    const side = cle === 'J' ? J : B;
    const ov = document.getElementById('graveyard-overlay');
    const cards = document.getElementById('graveyard-cards');
    const title = document.getElementById('graveyard-title');
    if (!ov || !cards) return;
    if (title) title.innerText = 'Cimetière — ' + side.nom;
    cards.innerHTML = '';
    side.cimetiere.forEach(c => { const def = defCarte(c.id); if (def) cards.appendChild(creerHTMLCarte(def, 'collection')); });
    ajusterTextes(cards);
    ov.classList.add('open');
}
function fermerCimetiere() { const ov = document.getElementById('graveyard-overlay'); if (ov) ov.classList.remove('open'); }
function ajouterLog(emoji, txt, side) {
    const log = document.getElementById('action-log');
    if (!log) return;
    const d = document.createElement('div');
    d.className = 'log-item ' + (side === J ? 'moi' : 'adv');
    d.textContent = emoji; d.title = txt;
    log.appendChild(d);
    if (log.children.length > 6) log.firstChild.remove();
}
function toggleEmotes(cle) { const menu = document.getElementById('emotes-' + cle); if (menu) menu.classList.toggle('hidden'); }
function jouerEmote(txt) {
    if (!modeEnLigne || !window.multiPartie || !window.multiPartie.active) { afficherEmote(J, txt); return; }
    pousserAction({ type:'emote', text: txt });
    afficherEmote(J, txt);
}
function afficherEmote(side, txt) {
    const el = elHero(side);
    if (!el) return;
    const b = document.createElement('div');
    b.className = 'emote-bubble';
    b.textContent = txt;
    el.appendChild(b);
    setTimeout(() => b.remove(), 3000);
}

/* ===========================================================
   RENDU PLATEAU
   =========================================================== */
function rafraichirJeu() {
    recalcAuras();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('player-mana', `${J.manaActuel}/${J.manaMax}`);
    set('player-health', J.patience);
    set('player-deck', J.deck.length);
    set('player-grave-count', J.cimetiere.length);
    set('opp-mana', `${B.manaActuel}/${B.manaMax}`);
    set('opp-health', B.patience);
    set('opp-deck', B.deck.length);
    set('opp-grave-count', B.cimetiere.length);
    const av = document.getElementById('player-portrait');
    if (av) av.innerText = profil.avatar || '🧑';
    const cr = document.getElementById('crystals');
    if (cr) {
        cr.innerHTML = '';
        for (let i = 0; i < Math.max(J.manaMax, J.manaActuel); i++) {
            const d = document.createElement('div');
            d.className = 'crystal' + (i < J.manaActuel ? ' plein' : '');
            cr.appendChild(d);
        }
    }
    const oh = document.getElementById('opp-hand-cards');
    if (oh) {
        oh.innerHTML = '';
        if (J.voitMainAdverse > 0) {
            B.main.forEach(c => { const el = creerHTMLCarte(c, 'jeu'); el.style.setProperty('--cw', '72px'); oh.appendChild(el); });
        } else {
            B.main.forEach(() => { const d = document.createElement('div'); d.className = 'mini-back'; oh.appendChild(d); });
        }
    }
    ['player-terrain', 'opp-terrain'].forEach((id, k) => {
        const zone = document.getElementById(id);
        if (!zone) return;
        zone.innerHTML = '';
        const side = k === 0 ? J : B;
        if (side.terrain) {
            const el = creerHTMLCarte(side.terrain, 'jeu');
            zone.appendChild(el);
            const timer = document.createElement('div');
            timer.className = 'terrain-timer';
            timer.textContent = `⏳ ${side.terrainTours}t`;
            zone.appendChild(timer);
        }
    });
    const pj = document.getElementById('player-board');
    if (pj) {
        pj.innerHTML = '';
        J.plateau.forEach(m => {
            const el = creerHTMLCarte(m, 'jeu');
            if (m === selection) el.classList.add('selection');
            else if (!m.malade && !m.aAttaque && m.gele === 0 && atkTot(m) > 0 && tourActuel === 'joueur' && (!m.motsCles.includes('Bluff') || m.revele || m.bluffVisible || m.bluffReveleSansEffet)) el.classList.add('pret');
            if (m.aAttaque || m.malade) el.classList.add('epuise');
            if (m.gele > 0) el.classList.add('gelee');
            if (m.silence) el.classList.add('silencieuse');
            if (ciblage && ciblage.cibles.includes(m)) el.classList.add('ciblable');
            el.onclick = () => clicCreatureAlliee(m);
            pj.appendChild(el);
        });
    }
    const pb = document.getElementById('opponent-board');
    if (pb) {
        pb.innerHTML = '';
        B.plateau.forEach(m => {
            const el = creerHTMLCarte(m, 'jeu');
            if (m.gele > 0) el.classList.add('gelee');
            if (m.silence) el.classList.add('silencieuse');
            if (ciblage && ciblage.cibles.includes(m)) el.classList.add('ciblable');
            else if (selection) el.classList.add('ciblable');
            el.onclick = () => clicCreatureEnnemie(m);
            pb.appendChild(el);
        });
    }
    const heroOpp = elHero(B);
    if (heroOpp) {
        heroOpp.classList.toggle('ciblable', !!(selection || (ciblage && ciblage.cibles.includes(B))));
        heroOpp.onclick = clicHeroAdverse;
    }
    const heroJ = elHero(J);
    if (heroJ) heroJ.onclick = () => { if (ciblage && ciblage.cibles.includes(J)) choisirCible(J); };
    const main = document.getElementById('player-hand');
    if (main) {
        main.innerHTML = '';
        J.main.forEach((c, i) => {
            const cout = coutEffectif(J, c);
            const el = creerHTMLCarte(c, 'main', { cout });
            let placePlateau = c.famille === 'Sort' || c.famille === 'Terrain' || J.plateau.length < 5;
            if (c.motsCles.includes('Fusion')) placePlateau = J.plateau.length >= 2 && fusionsPossibles(J, c).length > 0;
            const peutJouer = tourActuel === 'joueur' && !modeAttente;
            if (peutJouer && J.manaActuel >= cout && placePlateau) el.classList.add('jouable');
            else el.classList.add('injouable');
            el.onclick = (e) => {
                clicCarteMain(i);
            };
            main.appendChild(el);
        });
    }
    ajusterChevauchementMain();
    const gs = document.getElementById('game-screen');
    if (gs) ajusterTextes(gs);
}
function ajusterChevauchementMain() {
    const estTactile = window.matchMedia('(pointer: coarse)').matches;
    if (estTactile) {
        const main = document.getElementById('player-hand');
        if (main) main.style.setProperty('--chevauchement', '0px');
        return;
    }
    const rail = document.querySelector('.hand-rail'), main = document.getElementById('player-hand'), n = J.main.length;
    if (!rail || !main || n === 0) return;
    const cw = parseFloat(getComputedStyle(main.querySelector('.card-wrapper') || main).width) || 200;
    let marge = 12;
    if (n > 1) {
        const dispo = rail.clientWidth - 70;
        marge = (dispo - cw) / (n - 1) - cw;
        marge = Math.max(-cw * 0.46, Math.min(12, marge));
    }
    main.style.setProperty('--chevauchement', marge + 'px');
}
window.addEventListener('resize', () => {
    const gs = document.getElementById('game-screen');
    if (gs && gs.classList.contains('active')) ajusterChevauchementMain();
});
function declarerForfait() {
    if (partieFinie) return;
    const gs = document.getElementById('game-screen');
    if (!gs || !gs.classList.contains('active')) return flashInfo('Tu n\'es pas en combat.');
    if (!confirm('Déclarer forfait ?')) return;
    partieFinie = true;
    clearInterval(timer);
    annulerCiblage();
    selection = null;
    const mode = modeEnLigne ? 'multi' : (modeTournoi ? 'tournoi' : 'bot');
    enregistrerResultat(false, mode);
    try { if (mode === 'multi') appliquerElo(false); } catch (e) {}
    if (window._modeSpecial) { const ms = window._modeSpecial; banniere('Forfait… Défaite'); if (traiterFinSpeciale(false)) return; }
    banniere('Forfait… Défaite');
    const gain = mode === 'multi' ? ECO.forfaitMulti : ECO.forfaitBot;
    profil.coins += gain;
    sauvegarderProgression();
    majTopBarCoins();
    afficherGainArgent(gain);
    if (modeEnLigne && window.multiPartie && window.multiPartie.active && typeof signalerForfaitEnLigne === 'function') signalerForfaitEnLigne();
    if (modeTournoi) { avancerTournoi(false); return; }
    const bfNav = document.getElementById('btn-forfait');
    if (bfNav) bfNav.hidden = true;
    const attente = document.getElementById('attente-overlay');
    if (attente) attente.classList.remove('open');
    setTimeout(() => { changerEcran('menu-screen'); }, 2000);
}

/* ===========================================================
   ADMIN
   =========================================================== */
var EMOJIS_DISPO = [
    '🃏','🎴','🀄','🎲','🎯','👨🏻','👩🏻','🧑','👦🏻','👧🏻',
    '👨🏽','👩🏽','🧔🏽','👦🏽','👧🏽','👨🏼','👩🏼','🧔🏻','👦🏼','👧🏼',
    '👴🏽','👵🏻','👨‍🦳','👩‍🦳','🧓','🧕','👳‍♂️','🧑‍🦱','👩‍🦰','👨‍🦰',
    '🐈','🐱','🐶','🐕','🐰','🐇','🦜','🕊️','🐦','🦊',
    '🐺','🦁','🐯','🐻','🐼','🎭','👑','💎','⚡','🔥',
    '💀','💢','🍲','🧹','🧸','🏺','🎁','🚗','📺','📱',
    '💻','📸','🍵','☕','🌍','🏙️','🏡','🌳','🛫','🌴',
    '🚇','😴','😂','🤼','👫','👬','👭','💑','👨‍👩‍👧‍👦','🧑‍🍼'
];
function adminInitEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    const hidden = document.getElementById('new-card-emoji');
    if (!picker) return;
    picker.innerHTML = '';
    EMOJIS_DISPO.forEach(e => {
        const b = document.createElement('div');
        b.className = 'emoji-btn' + (hidden && hidden.value === e ? ' selected' : '');
        b.textContent = e;
        b.onclick = () => {
            if (hidden) hidden.value = e;
            picker.querySelectorAll('.emoji-btn').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
        };
        picker.appendChild(b);
    });
}
function adminTab(tab) {
    ['actions','cartes','creation','stats','bannir','bonus','annonces','economie'].forEach(t => {
        const el = document.getElementById('admin-tab-' + t);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'cartes') adminAfficherToutesCartes();
    if (tab === 'stats') adminAfficherStats();
    if (tab === 'bannir') adminAfficherCartesBannies();
    if (tab === 'creation') adminInitEmojiPicker();
    if (tab === 'bonus') adminAfficherBonus();
    if (tab === 'economie') adminAfficherEco();
}
function adminAfficherToutesCartes() {
    const grid = document.getElementById('admin-cartes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    dbCartes.forEach(c => {
        const el = creerHTMLCarte(c, 'collection', { qty: getTot(c.id) });
        el.onclick = () => {
            initColl(c.id);
            collectionJoueur[c.id].commune += 1;
            collectionJoueur[c.id].rare += 1;
            collectionJoueur[c.id].epique += 1;
            collectionJoueur[c.id].legendaire += 1;
            sauvegarderProgression();
            adminAfficherToutesCartes();
        };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}
function adminAfficherStats() {
    const el = document.getElementById('admin-stats-content');
    if (!el) return;
    el.innerHTML = '<p>Chargement…</p>';
    if (typeof fbDB === 'undefined' || !fbDB) { el.innerHTML = '<p class="hint">Firebase non connecté.</p>'; return; }
    fbDB.ref('joueurs').once('value').then(snap => {
        const joueurs = snap.val() || {};
        const total = Object.keys(joueurs).length;
        const enLigne = Object.values(joueurs).filter(j => Date.now() - (j.dernierPing || 0) < 120000).length;
        const enCombat = Object.values(joueurs).filter(j => j.etat === 'en_combat').length;
        let totalParties = 0;
        const joueursActifs = [];
        const refs = [];
        Object.keys(joueurs).forEach(uid => {
            refs.push(fbDB.ref('profils/' + uid + '/save').once('value').then(s => {
                const v = s.val() || {};
                const pseudo = joueurs[uid].pseudo || (v.profil && v.profil.pseudo) || 'Inconnu';
                const parties = (v.profil && v.profil.statsDecks) ? Object.values(v.profil.statsDecks).reduce((a, b) => a + b, 0) : 0;
                totalParties += parties;
                joueursActifs.push({ pseudo, parties, niveau: (v.profil && v.profil.niveau) || 1 });
            }).catch(() => {}));
        });
        Promise.all(refs).then(() => {
            joueursActifs.sort((a, b) => b.parties - a.parties);
            let html = `<div class="admin-stat-grid">
                <div class="admin-stat-card"><div class="num">${total}</div><div class="label">Comptes</div></div>
                <div class="admin-stat-card"><div class="num">${enLigne}</div><div class="label">En ligne</div></div>
                <div class="admin-stat-card"><div class="num">${enCombat}</div><div class="label">En combat</div></div>
            </div><div class="admin-stat-grid">
                <div class="admin-stat-card"><div class="num">${totalParties}</div><div class="label">Parties (total)</div></div>
            </div>
            <h4 style="color:var(--laiton-clair); margin-top:20px;">Joueurs actifs</h4>
            <table><tr><th>Pseudo</th><th>Niv.</th><th>Parties</th></tr>
            ${joueursActifs.slice(0, 30).map(j => `<tr><td>${j.pseudo}</td><td>${j.niveau}</td><td>${j.parties}</td></tr>`).join('')}</table>`;
            el.innerHTML = html;
        });
    }).catch(() => el.innerHTML = '<p class="hint">Erreur.</p>');
}
function adminAfficherCartesBannies() {
    const grid = document.getElementById('admin-ban-grid');
    if (!grid) return;
    grid.innerHTML = '';
    dbCartes.forEach(c => {
        const banned = carteEstBannie(c.id);
        const el = creerHTMLCarte(c, 'collection', { qty: getTot(c.id), banned: banned });
        el.onclick = () => {
            if (banned) {
                if (!confirm(`Débannir « ${c.prenom} » ?`)) return;
                window.cartesBannies = (window.cartesBannies || []).filter(x => x !== c.id);
            } else {
                if (!confirm(`Bannir « ${c.prenom} » ?`)) return;
                if (!Array.isArray(window.cartesBannies)) window.cartesBannies = [];
                window.cartesBannies.push(c.id);
            }
            if (typeof fbDB !== 'undefined' && fbDB) try { fbDB.ref('cartesBannies').set(window.cartesBannies || []); } catch(e) {}
            adminAfficherCartesBannies();
        };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}
function adminDonnerBonusTemporaire() {
    const code = (document.getElementById('bonus-code-ami')?.value || '').trim().toUpperCase();
    const duree = parseInt(document.getElementById('bonus-duree')?.value || '30');
    if (!code) return alert('Code ami requis.');
    if (typeof fbDB === 'undefined' || !fbDB) return alert('Firebase non connecté.');
    fbDB.ref('profils').orderByChild('public/codeAmi').equalTo(code).once('value').then(snap => {
        const data = snap.val();
        if (!data) return alert('Code introuvable.');
        const uid = Object.keys(data)[0];
        const expireAt = Date.now() + duree * 60000;
        fbDB.ref('profils/' + uid + '/bonusTemporaire').set({ expireAt, duree });
        alert(`✅ Bonus donné à ${code} pour ${duree} min !`);
        adminAfficherBonus();
    }).catch(() => alert('Erreur.'));
}
function adminAfficherBonus() {
    const el = document.getElementById('admin-bonus-liste');
    if (!el) return;
    el.innerHTML = '<p class="hint">Recherche…</p>';
    if (typeof fbDB === 'undefined' || !fbDB) return el.innerHTML = '<p class="hint">Firebase non connecté.</p>';
    fbDB.ref('profils').once('value').then(snap => {
        const data = snap.val() || {};
        const actifs = Object.entries(data).filter(([uid, p]) => p.bonusTemporaire && p.bonusTemporaire.expireAt > Date.now());
        if (actifs.length === 0) { el.innerHTML = '<p class="hint">Aucun bonus actif.</p>'; return; }
        el.innerHTML = '<h4 style="color:var(--laiton-clair);">Bonus actifs</h4>';
        actifs.forEach(([uid, p]) => {
            const reste = Math.ceil((p.bonusTemporaire.expireAt - Date.now()) / 60000);
            const div = document.createElement('div');
            div.className = 'bonus-item';
            div.innerHTML = `<span>${esc(p.public?.codeAmi || '?')} — ${esc(p.pseudo || 'Inconnu')} (${reste} min)</span>
                <button onclick="adminRetirerBonus('${uid}')">Retirer</button>`;
            el.appendChild(div);
        });
    });
}
function adminRetirerBonus(uid) {
    if (typeof fbDB === 'undefined' || !fbDB) return;
    fbDB.ref('profils/' + uid + '/bonusTemporaire').remove();
    adminAfficherBonus();
}
function adminToutDebloquer(n) {
    dbCartes.forEach(c => {
        initColl(c.id);
        collectionJoueur[c.id].commune = n;
        collectionJoueur[c.id].rare = n;
        collectionJoueur[c.id].epique = n;
        collectionJoueur[c.id].legendaire = n;
    });
    sauvegarderProgression();
    alert(`✅ ${n} de chaque carte ajouté !`);
}
function adminMaxCoins() {
    profil.coins = 9999999;
    sauvegarderProgression();
    majTopBarCoins();
    alert("💰 Coins au max !");
}
function adminCreerCarte() {
    const prenom = document.getElementById('new-card-prenom').value.trim();
    if (!prenom) return alert("Prénom requis");
    const famille = document.getElementById('new-card-famille').value;
    const cout = parseInt(document.getElementById('new-card-cout').value) || 0;
    const atk = parseInt(document.getElementById('new-card-atk').value) || 0;
    const vie = parseInt(document.getElementById('new-card-vie').value) || 0;
    const rarete = document.getElementById('new-card-rarete').value;
    const emoji = document.getElementById('new-card-emoji').value || '🃏';
    const desc = document.getElementById('new-card-desc').value || '';

    const selectMotsCles = document.getElementById('new-card-motscles-select');
    let motsCles = [];
    if (selectMotsCles) {
        for (let i = 0; i < selectMotsCles.options.length; i++) {
            if (selectMotsCles.options[i].selected) motsCles.push(selectMotsCles.options[i].value);
        }
    }
    const customMotsCles = document.getElementById('new-card-motscles-custom').value.split(',').map(s=>s.trim()).filter(Boolean);
    motsCles = motsCles.concat(customMotsCles);

    const selectPouvoir = document.getElementById('new-card-pouvoir');
    const pouvoirType = selectPouvoir ? selectPouvoir.value : 'aucun';
    const param1 = document.getElementById('new-card-pouvoir-param1')?.value || '';
    const param2 = document.getElementById('new-card-pouvoir-param2')?.value || '';

    const id = 'custom_' + Date.now();
    const nouvelleCarte = C(id, prenom, famille, cout, atk, vie, rarete, desc, motsCles, emoji);

    if (pouvoirType !== 'aucun') {
        nouvelleCarte.pouvoirCustom = { type: pouvoirType, param1: param1, param2: param2 };

        if (pouvoirType === 'buff_allie') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'allie',texte:'Choisis une créature'}, jouer:({cible})=>{ if(cible) buff(cible, parseInt(param1)||1, parseInt(param2)||1); } };
        } else if (pouvoirType === 'degats_cible') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'ennemi',hero:true,texte:'Choisis une cible'}, jouer:({cible})=>{ if(cible) fraper(cible, parseInt(param1)||2); } };
        } else if (pouvoirType === 'soin_allie') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'allie',hero:true,texte:'Choisis une cible'}, jouer:({cible})=>{ if(cible) soigner(cible, parseInt(param1)||2); } };
        } else if (pouvoirType === 'pioche') {
            POUVOIRS[id] = { mode:'eclair', jouer:({moi})=>{ piocher(moi, parseInt(param1)||1); } };
        } else if (pouvoirType === 'invocation') {
            POUVOIRS[id] = { mode:'eclair', jouer:({moi})=>{ invoquerJeton(moi, 'Jeton', parseInt(param1)||1, parseInt(param2)||1, '🃏', []); } };
        } else if (pouvoirType === 'destruction') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'ennemi',texte:'Détruit une créature'}, jouer:({cible})=>{ if(cible) fraper(cible, 999); } };
        } else if (pouvoirType === 'vol_vie') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'ennemi',hero:true,texte:'Choisis une cible'}, jouer:({cible,moi})=>{ if(cible){ const d = parseInt(param1)||2; fraper(cible, d); soinHero(moi, d); } } };
        } else if (pouvoirType === 'bouclier') {
            POUVOIRS[id] = { mode:'eclair', cible:{camp:'allie',texte:'Choisis une créature'}, jouer:({cible})=>{ if(cible) buff(cible, 0, parseInt(param1)||3); } };
        }
    }

    dbCartes.push(nouvelleCarte);
    parId[id] = nouvelleCarte;
    initColl(id);
    collectionJoueur[id][rarete] = 10;
    sauvegarderProgression();
    alert(`✨ Carte "${prenom}" créée !`);
    document.getElementById('new-card-prenom').value = '';
    document.getElementById('new-card-desc').value = '';
    adminTab('cartes');
}
function deconnexion() {
    try { if (typeof fbUserRef !== 'undefined' && fbUserRef) fbUserRef.remove(); } catch (e) {}
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => location.reload()).catch(() => location.reload());
        } else location.reload();
    } catch(e) { location.reload(); }
}

/* ===========================================================
   FEEDBACK TACTILE + CLIC DROIT
   =========================================================== */
function initTouchFeedback() {
    const estTactile = window.matchMedia('(pointer: coarse)').matches;
    if (!estTactile) return;

    document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('button, .card-wrapper, .badge.deck');
        if (target && navigator.vibrate) navigator.vibrate(10);
    }, { passive: true });

    let localTimer = null;
    let localMoved = false;

    document.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.card-wrapper');
        if (!card) return;
        localMoved = false;
        localTimer = setTimeout(() => {
            if (localMoved) return;
            const name = card.querySelector('.card-name')?.textContent?.trim();
            const def = dbCartes.find(c => c.prenom === name);
            if (def && navigator.vibrate) navigator.vibrate(20);
            if (def) zoomCarte(null, def.id);
        }, 500);
    }, { passive: true });

    document.addEventListener('touchmove', () => {
        localMoved = true;
        clearTimeout(localTimer);
    }, { passive: true });

    document.addEventListener('touchend', () => {
        clearTimeout(localTimer);
    }, { passive: true });
}

function initClicDroitZoom() {
    document.addEventListener('contextmenu', (e) => {
        const cardWrapper = e.target.closest('.card-wrapper');
        if (!cardWrapper) return;
        e.preventDefault();
        let cardId = null;
        const cardName = cardWrapper.querySelector('.card-name');
        if (cardName) {
            const prenom = cardName.textContent.trim();
            const def = dbCartes.find(c => c.prenom === prenom);
            if (def) cardId = def.id;
        }
        if (!cardId && cardWrapper.dataset.uid) {
            const uid = cardWrapper.dataset.uid;
            [J, B].forEach(side => {
                if (cardId) return;
                const found = side.plateau.find(m => m.uid === uid)
                    || side.main.find(m => m.uid === uid)
                    || side.deck.find(m => m.uid === uid);
                if (found) cardId = found.id;
            });
        }
        if (cardId) zoomCarte(null, cardId);
    });
    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            const zoomOv = document.getElementById('card-zoom-overlay');
            if (zoomOv && zoomOv.classList.contains('open') && e.target.closest('#card-zoom-overlay')) {
                e.preventDefault();
                fermerZoom();
            }
        }
    });
}

/* ===========================================================
   HELPERS ADMIN Firebase
   =========================================================== */
function adminNettoyerSalles() {
    if (typeof fbDB === 'undefined' || !fbDB) return alert("Firebase non connecté.");
    fbDB.ref('salles').once('value').then(snap => {
        const salles = snap.val();
        if(!salles) return alert("Aucune salle.");
        let count = 0;
        Object.keys(salles).forEach(id => { fbDB.ref('salles/' + id).remove(); count++; });
        alert(count + " salle(s) nettoyée(s).");
    });
}
function adminEnvoyerMotd() {
    if (typeof fbDB === 'undefined' || !fbDB) return alert("Firebase non connecté.");
    const el = document.getElementById('admin-motd');
    if (!el) return;
    const msg = el.value.trim();
    if(msg === "") { fbDB.ref('motd').remove(); alert("Effacé"); }
    else { fbDB.ref('motd').set(msg); alert("Diffusé !"); }
}

/* ===========================================================
   DÉMARRAGE
   =========================================================== */
document.addEventListener('DOMContentLoaded', function() {
    // Sécurité : on retire toujours game-in-progress au démarrage
    document.body.classList.remove('game-in-progress');

    // Détection mobile (tenue à jour à chaque rotation / redimensionnement)
    majClasseMobile();
    window.addEventListener('resize', debounce(majClasseMobile, 150));
    window.addEventListener('orientationchange', majClasseMobile);

    try {
        const zone = document.getElementById('login-cards');
        if (zone) {
            ['m1','ma2','k1','ka1','f1','u1'].forEach((id, index) => {
                const c = defCarte(id);
                if (c) {
                    const el = creerHTMLCarte(c, 'zoom');
                    el.style.animation = `cardAppear 0.5s ease-out ${index * 0.1}s both`;
                    zone.appendChild(el);
                }
            });
            ajusterTextes(zone);
        }
    } catch(e) { console.error("Erreur decor", e); }

    if (document.getElementById('boutique-grid')) majCollectionHeader();

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-nav');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    initTouchFeedback();
    initClicDroitZoom();

    window.appPret = true;
    if (typeof window.onAppPret === 'function') window.onAppPret();

    window.addEventListener('beforeunload', (e) => {
        const gs = document.getElementById('game-screen');
        if (gs && gs.classList.contains('active') && !partieFinie && !modeTuto) {
            e.preventDefault(); e.returnValue = '';
        }
    });

    setTimeout(() => { if (typeof ecouterDemandesAmis === 'function') ecouterDemandesAmis(); }, 2000);
});

/* ===========================================================
   v21 — Navigation à icônes + effets sonores (WebAudio, sans fichier)
   =========================================================== */
const NAV_ICONS = {
    'tuto-screen':['🎓','Académie'], 'menu-screen':['⚔️','Arène'], 'tournoi-screen':['🏆','Tournoi'],
    'collection-screen':['🃏','Collection'], 'deckbuilder-screen':['📚','Decks'], 'booster-screen':['🎁','Boosters'],
    'multi-screen':['🌐','En ligne'], 'spectateur-screen':['👀','Spectateur'], 'profil-screen':['👤','Profil'], 'admin-screen':['👑','Admin']
};
function construireNavIcones() {
    $$('#main-nav .nav-links button[data-screen]').forEach((b) => {
        const m = NAV_ICONS[b.dataset.screen];
        if (!m || b.dataset.ok) return;
        b.innerHTML = `<span class="ni" aria-hidden="true">${m[0]}</span><span class="nl">${m[1]}</span>`;
        b.dataset.ok = '1';
    });
}
const SFX = {
    on: (() => { try { return localStorage.getItem('sfx') !== '0'; } catch (e) { return true; } })(),
    ctx: null,
    jouer(freq = 440, dur = .09, type = 'sine', vol = .05, glisse = 0) {
        if (!this.on) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
            const c = getAudioCtx(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
            o.type = type; o.frequency.setValueAtTime(freq, t);
            if (glisse) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glisse), t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
            o.connect(g).connect((typeof _bus === 'function' && _bus('fx')) || c.destination); o.start(t); o.stop(t + dur);
        } catch (e) {}
    },
    bascule() {
        this.on = !this.on;
        try { localStorage.setItem('sfx', this.on ? '1' : '0'); } catch (e) {}
        const b = $('#btn-sfx'); if (b) b.textContent = this.on ? '🔊' : '🔇';
        this.jouer(700, .08);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    construireNavIcones();
    const pseudo = $('.nav-pseudo');
    if (pseudo && !$('#btn-sfx')) {
        const b = document.createElement('span');
        b.id = 'btn-sfx'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.title = 'Son';
        b.textContent = SFX.on ? '🔊' : '🔇'; b.onclick = () => SFX.bascule();
        pseudo.prepend(b);
    }
    document.addEventListener('click', (e) => { if (e.target.closest('button') && e.target.id !== 'btn-sfx') SFX.jouer(620, .05, 'triangle', .03); });
    // Habillage sonore des actions de jeu (aucune règle modifiée : on enveloppe simplement les fonctions)
    const envelopper = (nom, son) => {
        const f = window[nom]; if (typeof f !== 'function') return;
        window[nom] = function (...a) { son(a); return f.apply(this, a); };
    };
    envelopper('_jouerCarteMainDirect', () => SFX.jouer(520, .18, 'sine', .07, 380));
    envelopper('finDeTour', () => SFX.jouer(300, .16, 'triangle', .05, -120));
    envelopper('fxSur', (a) => { const t = a[2]; if (t === 'degat') SFX.jouer(180, .16, 'sawtooth', .05, -100); else if (t === 'soin') SFX.jouer(660, .16, 'sine', .04, 220); });
});



/* ===========================================================
   v22 — Ambiance, confettis, salut personnalisé
   =========================================================== */
function confetti(x, y, n = 26) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || (typeof AUDIO !== 'undefined' && (!AUDIO.particules || AUDIO.eco))) return;
    const couleurs = ['#ffb84d', '#ff6f61', '#5fd6a0', '#5cc8ff', '#c79bff', '#fff3e0'];
    for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        p.className = 'confetti';
        p.style.cssText = `left:${x}px;top:${y}px;background:${couleurs[i % couleurs.length]}`;
        document.body.appendChild(p);
        const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
        p.animate([
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 90}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
}
function creerAmbiance() {
    if ($('#ambiance')) return;
    const calque = document.createElement('div');
    calque.id = 'ambiance'; calque.setAttribute('aria-hidden', 'true');
    const emojis = ['🃏', '🎲', '⭐', '🎈', '✨', '🧩', '🍬'];
    for (let i = 0; i < 14; i++) {
        const s = document.createElement('span');
        s.textContent = emojis[i % emojis.length];
        s.style.cssText = `left:${(i * 7 + Math.random() * 6) % 100}%;font-size:${16 + Math.random() * 22}px;animation-duration:${14 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`;
        calque.appendChild(s);
    }
    document.body.prepend(calque);
}
document.addEventListener('DOMContentLoaded', () => {
    creerAmbiance();
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-play')) confetti(e.clientX, e.clientY, 14);
    });
    const envelopper = (nom, fn) => {
        const f = window[nom]; if (typeof f !== 'function') return;
        window[nom] = function (...a) { fn(a); return f.apply(this, a); };
    };
    envelopper('_jouerCarteMainDirect', () => confetti(innerWidth / 2, innerHeight * 0.5, 16));
    envelopper('afficherGainRecompense', () => confetti(innerWidth / 2, innerHeight * 0.4, 50));
    envelopper('afficherLevelUp', () => confetti(innerWidth / 2, innerHeight * 0.4, 60));
    envelopper('changerEcran', (a) => {
        if (a[0] !== 'menu-screen') return;
        try { remplirChoixDeckBot(); } catch (e) {}
        const nom = ($('#profil-pseudo')?.textContent || '').trim() || (typeof monPseudo !== 'undefined' && monPseudo) || '';
        const el = $('#accueil-salut'); if (el) el.textContent = nom ? `Bonjour ${nom} ! 👋` : 'Bonjour ! 👋';
    });
});


/* ===========================================================
   v23 — BLUFF : retournement volontaire (ta carte face cachée, pas le tour de la pose)
   - 1er appui : « Touche encore pour la retourner » ; 2e appui (≤ 3 s) : elle se retourne.
   - Retournée : sans bonus de sort, MAIS son propre texte « Quand révélé : … » s'applique.
   =========================================================== */
const EFFETS_BLUFF_RETOURNE = {
    tb1:  ({ ennemi }) => { const c = hasard(ennemi.plateau); if (c) fraper(c, 2); },
    tb2:  ({ moi }) => piocher(moi, 1),
    tb3:  ({ source }) => buff(source, 2, 2),
    tb4:  ({ ennemi }) => [...ennemi.plateau].forEach((c) => fraper(c, 1)),
    tb5:  ({ source }) => { if (!source.motsCles.includes('Charge')) source.motsCles.push('Charge'); source.malade = false; fxSur(source, 'Charge', 'buff'); },
    tb6:  ({ moi }) => soinHero(moi, 3),
    tb7:  ({ ennemi }) => { const c = hasard(ennemi.plateau); if (c) { c.atk = Math.max(0, c.atk - 2); fxSur(c, '-2 ATQ', 'buff'); } },
    tb8:  ({ moi }) => { const c = hasard(moi.plateau.filter((x) => x.revele !== false)); if (c) { if (!c.motsCles.includes('Charge')) c.motsCles.push('Charge'); c.malade = false; fxSur(c, 'Charge', 'buff'); } },
    tb9:  ({ moi }) => { moi.contreSort = true; },
    tb10: ({ source }) => { buff(source, 0, 3); if (!source.motsCles.includes('Provocation')) source.motsCles.push('Provocation'); }
};
function retournerBluff(m, proprio) {
    if (!m || m.revele || m.bluffVisible || m.bluffReveleSansEffet) return false;
    m.revele = true; m.bluffReveleSansEffet = true; m.retourneVolontaire = true; m.silence = true;
    fxSur(m, 'Retournée !', 'buff');
    jouerSon('summon');
    const effet = EFFETS_BLUFF_RETOURNE[m.id];
    if (effet) { try { effet({ moi: proprio, ennemi: autre(proprio), source: m }); } catch (e) { console.warn('effet bluff', e); } }
    nettoyerMorts(); recalcAuras();
    setTimeout(() => rafraichirJeu(), 100);
    return true;
}
function fermerConfirmBluff() { const o = document.getElementById('bluff-confirm'); if (o) o.remove(); }
function confirmerRetournerBluff(m) {
    fermerConfirmBluff();
    const ov = document.createElement('div');
    ov.id = 'bluff-confirm'; ov.className = 'card-viewer-overlay open';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<p class="bc-titre">Retourner cette carte ?</p>
        <div class="card-viewer-display"></div>
        <p class="bc-texte">Elle sera visible par tout le monde. Seul son texte « Quand révélé » s'applique.</p>
        <div class="card-viewer-actions">
            <button class="cv-close" type="button">Non</button>
            <button class="cv-play" type="button">✅ Oui, retourner</button>
        </div>`;
    const copie = { ...m, revele: true, bluffVisible: false, bluffReveleSansEffet: false };
    ov.querySelector('.card-viewer-display').appendChild(creerHTMLCarte(copie, 'main'));
    ov.querySelector('.cv-close').onclick = fermerConfirmBluff;
    ov.querySelector('.cv-play').onclick = () => {
        fermerConfirmBluff();
        if (!J.plateau.includes(m) || m.revele) return;
        pousserAction({ type: 'retourner', idx: J.plateau.indexOf(m) });
        retournerBluff(m, J);
    };
    document.body.appendChild(ov);
    ajusterTextes(ov);
}
function tenterRetournerBluff(m) {
    if (!J.plateau.includes(m)) return info(`${m.prenom} est face cachée.`);
    if (m.poseCeTour) return info(`${m.prenom} vient d'être posée : tu pourras la retourner au prochain tour.`);
    confirmerRetournerBluff(m);
}


/* ===========================================================
   v24 — Deck du bot au choix • points d'anatomie • aperçu de la main (PC) • BOOSTER ANIMÉ
   =========================================================== */

/* ---------- Deck du bot ---------- */
const _idsDeck = (d) => d.cartes.map((c) => (typeof c === 'string' ? c : c.id));
function construireDeckBot(forceChoix) {
    const bans = window.cartesBannies || [];
    const ok = (id) => defCarte(id) && !bans.includes(id);
    const choix = forceChoix || ($('#bot-deck-select') || {}).value || 'alea-precon';
    const precons = decksPreconstruits.filter((d) => _idsDeck(d).filter(ok).length >= 20);
    if (choix.startsWith('precon:')) {
        const d = decksPreconstruits[+choix.slice(7)];
        if (d && _idsDeck(d).filter(ok).length >= 20) return _idsDeck(d).filter(ok);
    } else if (choix.startsWith('mien:')) {
        const d = mesDecks[+choix.slice(5)];
        if (d && _idsDeck(d).filter(ok).length >= 20) return _idsDeck(d).filter(ok).slice(0, 20);
    } else if (choix === 'alea-total') {
        const pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.id && !String(c.id).startsWith('jeton') && !/^cp\d/.test(c.id) && ok(c.id));
        melanger(pool);
        const lim = { legendaire: 2, epique: 4 }, pris = {}, deck = [];
        let terrains = 0;
        for (const c of pool) {
            if (deck.length >= 20) break;
            if (lim[c.rarete] !== undefined && (pris[c.rarete] || 0) >= lim[c.rarete]) continue;
            if (c.famille === 'Terrain') { if (terrains >= 1) continue; terrains++; }
            pris[c.rarete] = (pris[c.rarete] || 0) + 1; deck.push(c.id);
        }
        if (deck.length === 20) return deck;
    }
    const d = hasard(precons.length ? precons : decksPreconstruits);
    return _idsDeck(d);
}
function remplirChoixDeckBot() {
    const sel = $('#bot-deck-select'); if (!sel) return;
    let memo = ''; try { memo = localStorage.getItem('botDeck') || ''; } catch (e) {}
    const actuel = sel.value || memo;
    const noms = decksPreconstruits.map((d) => d.nom);
    const perso = (typeof mesDecks !== 'undefined' ? mesDecks : []).map((d, i) => ({ d, i }))
        .filter(({ d }) => !noms.includes(d.nom) && d.cartes && d.cartes.length === 20);
    sel.innerHTML =
        `<optgroup label="Aléatoire"><option value="alea-precon">🎲 Deck pré-construit au hasard</option><option value="alea-total">🃏 Deck 100 % aléatoire</option></optgroup>` +
        `<optgroup label="Decks pré-construits">${decksPreconstruits.map((d, i) => `<option value="precon:${i}">📦 ${esc(d.nom)}</option>`).join('')}</optgroup>` +
        (perso.length ? `<optgroup label="Mes decks">${perso.map(({ d, i }) => `<option value="mien:${i}">⭐ ${esc(d.nom)}</option>`).join('')}</optgroup>` : '');
    if ([...sel.options].some((o) => o.value === actuel)) sel.value = actuel;
    sel.onchange = () => { try { localStorage.setItem('botDeck', sel.value); } catch (e) {} };
}

/* ---------- Anatomie d'une carte : points posés sur les vrais éléments ---------- */
function placerPointsAnatomie(carteEl) {
    const base = carteEl.getBoundingClientRect(); if (!base.width) return;
    const cibles = {
        1: ['.mana-gem', 'nw'], 2: ['.card-name', 'c'], 3: ['.card-art', 'c'], 4: ['.faction-tag', 'c'],
        5: ['.card-text', 'w'], 6: ['.keyword-row', 'c'], 7: ['.stat.atk', 'sw'], 8: ['.stat.hp', 'se']
    };
    $$('.legend-dot', carteEl).forEach((dot) => {
        const [sel, ancre] = cibles[dot.textContent] || [];
        const el = sel && $(sel, carteEl); if (!el) { dot.style.display = 'none'; return; }
        const r = el.getBoundingClientRect();
        let x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (ancre === 'nw') { x = r.left; y = r.top; }
        if (ancre === 'sw') { x = r.left; y = r.bottom; }
        if (ancre === 'se') { x = r.right; y = r.bottom; }
        if (ancre === 'w') { x = r.left + 10; }
        dot.style.left = (x - base.left) + 'px'; dot.style.top = (y - base.top) + 'px';
        dot.style.transform = 'translate(-50%,-50%)';
    });
}

/* ---------- La carte de la main survolée s'agrandit (×2,1) sur place, sans être rognée ---------- */
(() => {
    const souris = window.matchMedia('(hover: hover) and (pointer: fine)');
    let apercu = null;
    const cacher = () => { if (apercu) { apercu.remove(); apercu = null; } };
    document.addEventListener('mouseover', (e) => {
        if (!souris.matches) return;
        const w = e.target.closest && e.target.closest('.hand-area .card-wrapper');
        if (!w || w.classList.contains('hidden-card')) return cacher();
        if (apercu && apercu._src === w) return;
        cacher();
        const r = w.getBoundingClientRect(), cw = r.width * 2.1, h = cw * 1.42;
        const clone = w.cloneNode(true);
        clone.className = 'card-wrapper apercu-carte'; clone.removeAttribute('style'); clone.removeAttribute('id'); clone.removeAttribute('data-uid');
        $$('[data-uid]', clone).forEach((n) => n.removeAttribute('data-uid'));
        apercu = document.createElement('div'); apercu.id = 'hand-preview'; apercu._src = w;
        apercu.style.setProperty('--cw', cw + 'px');
        clone.style.setProperty('--cw', cw + 'px', 'important');
        apercu.style.left = Math.max(8, Math.min(innerWidth - cw - 8, r.left + r.width / 2 - cw / 2)) + 'px';
        apercu.style.top = Math.max(8, r.bottom - h) + 'px';
        apercu.appendChild(clone); document.body.appendChild(apercu);
        ajusterTextes(apercu);
    });
    document.addEventListener('mouseout', (e) => {
        const w = e.target.closest && e.target.closest('.hand-area .card-wrapper');
        if (w && !w.contains(e.relatedTarget)) cacher();
    });
    setInterval(() => { if (apercu && !document.contains(apercu._src)) cacher(); }, 250);
})();

/* ===========================================================
   BOOSTER ANIMÉ : paquet → déchirure → 5 cartes cachées (halo = rareté) → révélation
   Épique / Légendaire : la carte vient au centre, rayons + nom de rareté, puis retourne à sa place.
   =========================================================== */
const BA_RAR = {
    commune:    { nom: 'COMMUNE',    couleur: 'rgba(201,211,223,.9)' },
    rare:       { nom: 'RARE',       couleur: 'rgba(92,200,255,.95)' },
    epique:     { nom: 'ÉPIQUE',     couleur: 'rgba(199,155,255,.95)' },
    legendaire: { nom: 'LÉGENDAIRE', couleur: 'rgba(255,184,77,1)' }
};
function tirerCartesBooster() {
    const sortie = [];
    for (let i = 0; i < 5; i++) {
        const r = Math.random(); let pool;
        if (r > 0.965) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.id === 'u1');
        else if (r > 0.93) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'legendaire' && c.id !== 'u1');
        else if (r > 0.82) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'epique');
        else if (r > 0.58) pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'rare');
        else pool = dbCartesDispo().filter(c => !/^cp\d/.test(c.id)).filter((c) => c.rarete === 'commune');
        const carte = hasard(pool); if (!carte) continue;
        initColl(carte.id);
        const nouveau = collectionJoueur[carte.id][carte.rarete] === 0;
        collectionJoueur[carte.id][carte.rarete]++;
        sortie.push({ carte, rar: carte.rarete, nouveau, unifiee: carte.id === 'u1' });
    }
    return sortie;
}
function preparerBooster() {
    if (document.getElementById('booster-anim')) return;
    if (profil.coins < ECO.prixBooster) { alert("Il te faut " + ECO.prixBooster + " 💰 pour ouvrir un booster. Tu en as " + profil.coins + "."); return; }
    profil.coins -= ECO.prixBooster;
    const entrees = tirerCartesBooster();
    sauvegarderProgression(); ajouterXP(ECO.xpBooster); progresserQuete('boosters', 1);
    try { majTopBarCoins(); } catch (e) {}
    lancerAnimationBooster(entrees);
}
function lancerAnimationBooster(entrees) {
    const ov = document.createElement('div');
    ov.id = 'booster-anim'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Ouverture de booster');
    ov.innerHTML = `<div class="ba-bg"></div>
        <div class="ba-stage-pack">
            <div class="ba-pack" role="button" tabindex="0" aria-label="Ouvrir le booster">
                <div class="ba-pack-top"></div>
                <div class="ba-pack-body"><span class="ba-shine"></span>
                    <div class="ba-logo">Famille<b>TCG</b></div><div class="ba-emblem">🃏</div><div class="ba-sub">BOOSTER · 5 CARTES</div></div>
                <div class="ba-pack-bottom"></div>
            </div>
        </div>
        <div class="ba-grid"></div>
        <p class="ba-hint2">Touche une carte pour la révéler</p>
        <div class="ba-actions"><button class="btn-action ba-skip" type="button">✨ Tout révéler</button></div>
        <div class="ba-final"><button class="btn-large btn-play ba-again" type="button"><span class="btn-icon">🎁</span><span class="btn-label"><span class="btn-title">Ouvrir un autre</span><span class="btn-sub"><span data-eco="prixBooster">50</span> 💰</span></span></button>
            <button class="btn-action ba-close" type="button">Terminer</button></div>`;
    document.body.appendChild(ov);
    const grille = $('.ba-grid', ov), pack = $('.ba-pack', ov);
    const etat = { faits: 0, occupe: false, ouvert: false };
    const total = entrees.length, attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const fin = () => ov.classList.add('termine');
    const vibre = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

    const front = (e, taille) => {
        const el = creerHTMLCarte(e.carte, 'booster', { nouveau: e.nouveau });
        el.classList.remove('flipped'); el.style.setProperty('--cw', taille); el.style.animation = 'none';
        return el;
    };
    const flipper = (fl, milieu) => new Promise((res) => {
        fl.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
            milieu();
            fl.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 200, easing: 'ease-out', fill: 'forwards' }).onfinish = res;
        };
    });
    const centre = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

    const revelerSurPlace = async (i, rapide) => {
        const s = grille.children[i]; if (!s || s.classList.contains('vu')) return;
        s.classList.add('vu'); etat.faits++;
        const e = entrees[i];
        await flipper($('.ba-flip', s), () => { $('.ba-back', s).style.display = 'none'; $('.ba-front', s).style.display = 'block'; });
        s.insertAdjacentHTML('beforeend', '<span class="ba-flash"></span>');
        SFX.jouer(e.rar === 'rare' ? 620 : 480, .14, 'triangle', .05, 180);
        if (e.rar === 'rare' && !rapide) { const [x, y] = centre(s); confetti(x, y, 18); vibre(20); }
        if (etat.faits >= total) fin();
    };

    const cinematique = async (i) => {
        const s = grille.children[i], e = entrees[i], rar = BA_RAR[e.rar] || BA_RAR.commune;
        etat.occupe = true; s.classList.add('vu'); etat.faits++;
        const zw = Math.min(innerWidth * 0.68, 300, (innerHeight - 210) / 1.42);
        const couche = document.createElement('div');
        couche.className = 'ba-zoom ' + e.rar; couche.style.setProperty('--rc', rar.couleur); couche.style.setProperty('--zw', zw + 'px');
        couche.innerHTML = `<div class="ba-aura"></div><div class="ba-rtext">${e.unifiee ? 'UNIFIÉE' : rar.nom}</div>
            <div class="ba-zcard" style="width:${zw}px;height:${zw * 1.42}px"><div class="ba-zflip"><div class="ba-back"><span>🃏</span><small>FamilleTCG</small></div></div></div>
            <p class="ba-tap">Touche pour continuer</p>`;
        ov.appendChild(couche);
        const zc = $('.ba-zcard', couche), zf = $('.ba-zflip', couche);
        const r0 = s.getBoundingClientRect(), r1 = zc.getBoundingClientRect();
        const dx = r0.left + r0.width / 2 - (r1.left + r1.width / 2), dy = r0.top + r0.height / 2 - (r1.top + r1.height / 2), k = r0.width / r1.width;
        s.style.visibility = 'hidden';
        SFX.jouer(300, .4, 'sawtooth', .05, 500); vibre(25);
        await zc.animate([{ transform: `translate(${dx}px,${dy}px) scale(${k})` }, { transform: 'translate(0,0) scale(1)' }],
            { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'both' }).finished;
        zc.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-1.5deg)' }, { transform: 'translateX(6px) rotate(1.5deg)' }, { transform: 'translateX(0)' }],
            { duration: 320, iterations: 2 });
        await attendre(560);
        await flipper(zf, () => {
            $('.ba-back', zf).remove(); const f = front(e, zw + 'px'); f.classList.add('ba-zface'); zf.appendChild(f); ajusterTextes(zf);
        });
        couche.classList.add('vu');
        const [cx, cy] = centre(zc);
        confetti(cx, cy, e.rar === 'legendaire' ? 90 : 55); vibre(e.rar === 'legendaire' ? [40, 40, 90] : [30, 30, 40]);
        SFX.jouer(e.rar === 'legendaire' ? 880 : 660, .5, 'triangle', .08, 500); setTimeout(() => SFX.jouer(1100, .4, 'sine', .05, 300), 160);
        if (e.rar === 'legendaire') ov.insertAdjacentHTML('beforeend', '<span class="ba-whiteflash"></span>');
        await attendre(650);
        await new Promise((res) => { couche.onclick = res; $('.ba-tap', couche).classList.add('on'); });
        couche.onclick = null;
        const r2 = s.getBoundingClientRect(), r3 = zc.getBoundingClientRect();
        couche.classList.add('sort');
        await zc.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${r2.left + r2.width / 2 - (r3.left + r3.width / 2)}px,${r2.top + r2.height / 2 - (r3.top + r3.height / 2)}px) scale(${r2.width / r3.width})` }],
            { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
        $('.ba-back', s).style.display = 'none'; $('.ba-front', s).style.display = 'block'; s.style.visibility = '';
        couche.remove(); etat.occupe = false;
        if (etat.faits >= total) fin();
    };

    const reveler = (i) => {
        if (etat.occupe || !etat.ouvert) return;
        const s = grille.children[i]; if (!s || s.classList.contains('vu')) return;
        const rar = entrees[i].rar;
        (rar === 'epique' || rar === 'legendaire') ? cinematique(i) : revelerSurPlace(i, false);
    };
    const construireGrille = () => {
        entrees.forEach((e, i) => {
            const s = document.createElement('div');
            s.className = 'ba-slot'; s.dataset.r = e.rar; s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'Carte ' + (i + 1));
            s.style.setProperty('--i', i); s.style.setProperty('--rot', (i % 2 ? 6 : -6) + 'deg');
            s.innerHTML = `<div class="ba-flip"><div class="ba-back"><span>🃏</span><small>FamilleTCG</small></div><div class="ba-front" style="display:none"></div></div>`;
            const f = front(e, 'var(--sw)'); $('.ba-front', s).appendChild(f);
            s.onclick = () => reveler(i);
            s.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); reveler(i); } };
            grille.appendChild(s);
        });
        ajusterTextes(grille);
    };
    const ouvrirPaquet = async () => {
        if (etat.ouvert || pack.classList.contains('tear')) return;
        pack.classList.add('shake'); SFX.jouer(240, .25, 'square', .03, 80); vibre(20);
        await attendre(320);
        pack.classList.remove('shake'); pack.classList.add('tear');
        SFX.jouer(1200, .3, 'sawtooth', .05, -900); vibre(35);
        const [x, y] = centre(pack); confetti(x, y - 60, 40);
        await attendre(650);
        pack.classList.add('leave');
        construireGrille(); ov.classList.add('cartes');
        await attendre(500 + total * 110);
        etat.ouvert = true;
    };
    pack.onclick = ouvrirPaquet;
    setTimeout(ouvrirPaquet, 550);   // le clic sur le paquet du menu ouvre directement
    pack.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ouvrirPaquet(); } };
    $('.ba-skip', ov).onclick = async () => {
        if (etat.occupe || !etat.ouvert) return;
        for (let i = 0; i < total; i++) { if (!grille.children[i].classList.contains('vu')) { revelerSurPlace(i, true); await attendre(140); } }
    };
    const quitter = () => ov.remove();
    $('.ba-close', ov).onclick = () => { quitter(); try { majCollectionHeader(); } catch (e) {} };
    $('.ba-again', ov).onclick = () => { quitter(); preparerBooster(); };
}


/* ===========================================================
   v25 — Pastille des objectifs • Parties en cours (spectateur) dans « En ligne »
   =========================================================== */
function majPastilleQuetes() {
    const b = $('#badge-quetes'); if (!b) return;
    let n = 0;
    try { n = (profil.quetes || []).filter((q) => !q.claimed && (q.progress || 0) >= q.cible).length; } catch (e) {}
    b.textContent = n; b.hidden = !n;
    const nav = $('#nav-quetes'); if (nav) nav.setAttribute('aria-label', n ? `${n} objectif(s) à récupérer` : 'Objectifs');
}
function rafraichirSpecMulti() {
    const el = $('#multi-spec-liste'); if (!el) return;
    if (typeof fbDB === 'undefined' || !fbDB) { el.innerHTML = '<p class="hint">Connexion en ligne indisponible.</p>'; return; }
    fbDB.ref('salles').once('value').then((snap) => {
        const salles = snap.val() || {};
        const enCours = Object.entries(salles).filter(([, s]) => s && s.joueurs && Object.keys(s.joueurs).length === 2);
        if (!enCours.length) { el.innerHTML = '<p class="hint">Aucune partie en cours pour le moment.</p>'; return; }
        el.innerHTML = '';
        enCours.forEach(([id, s]) => {
            const [a, b] = Object.keys(s.joueurs);
            const ligne = document.createElement('div');
            ligne.className = 'spec-ligne';
            ligne.innerHTML = `<div class="spec-noms"><span>${esc(a)}</span><b>VS</b><span>${esc(b)}</span></div>
                <button type="button" class="btn-chip">👀 Regarder</button>`;
            $('button', ligne).onclick = () => rejoindreSpectateur(id);
            el.appendChild(ligne);
        });
    }).catch(() => { el.innerHTML = '<p class="hint">Impossible de charger les parties.</p>'; });
}
document.addEventListener('DOMContentLoaded', () => {
    const envelopper = (nom, fn) => { const f = window[nom]; if (typeof f !== 'function') return; window[nom] = function (...a) { const r = f.apply(this, a); try { fn(a); } catch (e) {} return r; }; };
    ['progresserQuete', 'recupererQuete', 'afficherQuetes'].forEach((n) => envelopper(n, majPastilleQuetes));
    envelopper('changerEcran', (a) => { majPastilleQuetes(); if (a[0] === 'multi-screen') rafraichirSpecMulti(); });
    setInterval(() => { majPastilleQuetes(); if ($('#multi-screen.active')) rafraichirSpecMulti(); }, 20000);
    setTimeout(majPastilleQuetes, 1500);
});


/* ===========================================================
   v26 — Correctifs (chat, forfait, deck de départ, messages) + Réglages, Dos, Succès,
   Classement ELO, Draft/Survie, Campagne
   =========================================================== */

/* ---------- Outils communs ---------- */
function ouvrirPanneau(id, titre, contenu) {
    const ancien = document.getElementById(id); if (ancien) ancien.remove();
    const ov = document.createElement('div');
    ov.id = id; ov.className = 'card-viewer-overlay open panneau-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="panneau"><div class="panneau-tete"><h3>${titre}</h3><button type="button" class="panneau-x" aria-label="Fermer">✕</button></div>${contenu}</div>`;
    ov.querySelector('.panneau-x').onclick = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return ov;
}
function ecranResultat({ titre, lignes = [], html = '', bouton = 'Retour au menu', onClose }) {
    const ancien = document.getElementById('ecran-resultat'); if (ancien) ancien.remove();
    const ov = document.createElement('div');
    const chat = document.getElementById('ingame-chat'); if (chat) chat.classList.remove('open');
    ov.id = 'ecran-resultat'; ov.className = 'card-viewer-overlay open';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<p class="bc-titre">${titre}</p>${html}<ul class="res-lignes">${lignes.map((l) => `<li>${l}</li>`).join('')}</ul>
        <div class="card-viewer-actions"><button class="cv-play" type="button">${bouton}</button></div>`;
    ov.querySelector('button').onclick = () => { ov.remove(); (onClose || (() => changerEcran('menu-screen')))(); };
    document.body.appendChild(ov);
    confetti(innerWidth / 2, innerHeight * 0.3, 60);
}
const _avant = (nom, fn) => { const f = window[nom]; if (typeof f !== 'function') return; window[nom] = function (...a) { try { fn(a); } catch (e) { console.warn(nom, e); } return f.apply(this, a); }; };
const _apres = (nom, fn) => { const f = window[nom]; if (typeof f !== 'function') return; window[nom] = function (...a) { const r = f.apply(this, a); try { fn(a, r); } catch (e) { console.warn(nom, e); } return r; }; };

/* ---------- 9. Réglages : musique, effets, particules, vibrations, économie ---------- */
const AUDIO = (() => {
    const defaut = { musique: 0.35, effets: 0.8, particules: true, vibrations: true, eco: false };
    try { return { ...defaut, ...JSON.parse(localStorage.getItem('ftcg_reglages') || '{}') }; } catch (e) { return defaut; }
})();
function sauverReglages() { try { localStorage.setItem('ftcg_reglages', JSON.stringify(AUDIO)); } catch (e) {} appliquerReglages(); }
function _bus(nom) {
    const ctx = getAudioCtx(); if (!ctx) return null;
    window._busAudio = window._busAudio || {};
    if (!_busAudio[nom]) { const g = ctx.createGain(); g.connect(ctx.destination); _busAudio[nom] = g; }
    _busAudio[nom].gain.value = nom === 'fx' ? AUDIO.effets : AUDIO.musique * 0.5;
    return _busAudio[nom];
}
const MUSIQUE = {
    timer: null, pas: 0,
    demarrer() { if (this.timer || AUDIO.musique <= 0) return; this.timer = setInterval(() => this.note(), 540); },
    arreter() { clearInterval(this.timer); this.timer = null; },
    note() {
        const ctx = getAudioCtx(); if (!ctx || document.hidden || AUDIO.musique <= 0 || ctx.state !== 'running') return;
        const gamme = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], motif = [0, 2, 4, 2, 5, 4, 3, 1, 0, 3, 4, 5, 4, 2, 1, 2];
        const f = gamme[motif[this.pas % motif.length]] * (Math.floor(this.pas / 16) % 2 ? 0.75 : 1); this.pas++;
        const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(g); g.connect(_bus('music') || ctx.destination); o.start(t); o.stop(t + 1.15);
    }
};
function appliquerReglages() {
    document.body.classList.toggle('eco', !!AUDIO.eco);
    document.body.classList.toggle('no-particules', !AUDIO.particules || AUDIO.eco);
    if (window._busAudio) { if (_busAudio.fx) _busAudio.fx.gain.value = AUDIO.effets; if (_busAudio.music) _busAudio.music.gain.value = AUDIO.musique * 0.5; }
    SFX.on = AUDIO.effets > 0;
    AUDIO.musique > 0 ? MUSIQUE.demarrer() : MUSIQUE.arreter();
}
function ouvrirParametres() {
    const ov = ouvrirPanneau('panneau-reglages', '⚙️ Réglages', `
        <label class="reglage"><span>🎵 Musique <b id="rg-mus">${Math.round(AUDIO.musique * 100)}%</b></span><input type="range" id="rg-musique" min="0" max="100" value="${Math.round(AUDIO.musique * 100)}"></label>
        <label class="reglage"><span>🔊 Effets sonores <b id="rg-fx">${Math.round(AUDIO.effets * 100)}%</b></span><input type="range" id="rg-effets" min="0" max="100" value="${Math.round(AUDIO.effets * 100)}"></label>
        <label class="reglage inter"><span>✨ Particules et confettis</span><input type="checkbox" id="rg-part" ${AUDIO.particules ? 'checked' : ''}></label>
        <label class="reglage inter"><span>📳 Vibrations</span><input type="checkbox" id="rg-vib" ${AUDIO.vibrations ? 'checked' : ''}></label>
        <label class="reglage inter"><span>🔋 Économie de batterie<small>Coupe les animations et les particules</small></span><input type="checkbox" id="rg-eco" ${AUDIO.eco ? 'checked' : ''}></label>
        <div class="reglage-actions"><button class="btn-chip" type="button" id="rg-dos">🎴 Dos de cartes</button><button class="btn-chip" type="button" id="rg-succes">🏆 Succès</button></div>`);
    const lier = (id, cle, fmt, cible) => { const el = $(id, ov); el.oninput = () => { AUDIO[cle] = fmt(el); $(cible, ov) && ($(cible, ov).textContent = Math.round(AUDIO[cle] * 100) + '%'); sauverReglages(); if (cle === 'effets') SFX.jouer(660, .08); }; };
    lier('#rg-musique', 'musique', (e) => e.value / 100, '#rg-mus'); lier('#rg-effets', 'effets', (e) => e.value / 100, '#rg-fx');
    $('#rg-part', ov).onchange = (e) => { AUDIO.particules = e.target.checked; sauverReglages(); };
    $('#rg-vib', ov).onchange = (e) => { AUDIO.vibrations = e.target.checked; sauverReglages(); };
    $('#rg-eco', ov).onchange = (e) => { AUDIO.eco = e.target.checked; sauverReglages(); };
    $('#rg-dos', ov).onclick = () => { ov.remove(); ouvrirDos(); };
    $('#rg-succes', ov).onclick = () => { ov.remove(); ouvrirSucces(); };
}
(() => { const v = navigator.vibrate && navigator.vibrate.bind(navigator); if (v) navigator.vibrate = (p) => (AUDIO.vibrations && !AUDIO.eco) ? v(p) : false; })();
document.addEventListener('pointerdown', () => { const c = getAudioCtx(); if (c && c.state === 'suspended') c.resume(); if (AUDIO.musique > 0) MUSIQUE.demarrer(); }, { once: false, passive: true });

/* ---------- 10. Dos de cartes ---------- */
const DOS = [
    { id: 'classique', nom: 'Classique', prix: 0, fond: 'repeating-linear-gradient(45deg,#7a4b2a 0 10px,#6b4226 10px 20px)', bord: '#ffb84d' },
    { id: 'meridja', nom: 'Meridja', get prix() { return ECO.prixDosTheme; }, fond: 'repeating-linear-gradient(45deg,#e2483a 0 10px,#b8322a 10px 20px)', bord: '#ffb3a8' },
    { id: 'marouf', nom: 'Marouf', get prix() { return ECO.prixDosTheme; }, fond: 'repeating-linear-gradient(45deg,#3b8fe0 0 10px,#2b6fb8 10px 20px)', bord: '#b5dcff' },
    { id: 'kerkache', nom: 'Kerkache', get prix() { return ECO.prixDosTheme; }, fond: 'repeating-linear-gradient(45deg,#2fbf8a 0 10px,#1f9a6d 10px 20px)', bord: '#b6f3d9' },
    { id: 'belgacemi', nom: 'Belgacemi', get prix() { return ECO.prixDosTheme; }, fond: 'repeating-linear-gradient(45deg,#f4b53b 0 10px,#d99418 10px 20px)', bord: '#fff0b8' },
    { id: 'etoile', nom: 'Étoilé ✨ animé', get prix() { return ECO.prixDosEtoile; }, fond: 'radial-gradient(circle at 30% 30%,#ffffff55 0 2px,transparent 3px) 0 0/22px 22px,radial-gradient(circle at 70% 70%,#ffffff44 0 2px,transparent 3px) 0 0/30px 30px,linear-gradient(160deg,#2a1b5e,#5b2a86)', bord: '#d2b4ff', anim: 'dosEtoile' },
    { id: 'arcenciel', nom: 'Arc-en-ciel 🌈 animé', get prix() { return ECO.prixDosArc; }, fond: 'linear-gradient(120deg,#ff6f61,#ffb84d,#5fd6a0,#5cc8ff,#c79bff,#ff6f61) 0 0/300% 100%', bord: '#ffffff', anim: 'dosArc' }
];
function dosActif() { const id = (profil.dosActif) || 'classique'; return DOS.find((d) => d.id === id) || DOS[0]; }
function appliquerDos() {
    const d = dosActif(), s = document.body.style;
    s.setProperty('--dos-fond', d.fond); s.setProperty('--dos-bord', d.bord);
    DOS.forEach((x) => document.body.classList.remove('dos-' + x.id)); document.body.classList.add('dos-' + d.id);
    document.body.classList.toggle('dos-anime', !!d.anim);
}
function ouvrirDos() {
    if (!Array.isArray(profil.dosPossedes)) profil.dosPossedes = ['classique'];
    const rendre = () => DOS.map((d) => {
        const poss = profil.dosPossedes.includes(d.id), actif = dosActif().id === d.id;
        return `<div class="dos-item ${actif ? 'actif' : ''}"><div class="dos-apercu ${d.anim || ''}" style="background:${d.fond};border-color:${d.bord}"><span>🃏</span></div>
            <b>${d.nom}</b><button class="btn-chip" data-id="${d.id}" type="button" ${actif ? 'disabled' : ''}>${actif ? '✅ Équipé' : poss ? 'Équiper' : `Acheter ${d.prix} 💰`}</button></div>`;
    }).join('');
    const ov = ouvrirPanneau('panneau-dos', '🎴 Dos de cartes', `<p class="hint">Visible sur tes cartes cachées, dans ta main et à l'ouverture des boosters.</p><div class="dos-grille" id="dos-grille">${rendre()}</div>`);
    ov.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        const d = DOS.find((x) => x.id === b.dataset.id); if (!d) return;
        if (!profil.dosPossedes.includes(d.id)) {
            if (profil.coins < d.prix) return flashInfo(`Il te manque ${d.prix - profil.coins} 💰.`);
            profil.coins -= d.prix; profil.dosPossedes.push(d.id); majTopBarCoins();
        }
        profil.dosActif = d.id; sauvegarderProgression(); appliquerDos(); $('#dos-grille', ov).innerHTML = rendre(); SFX.jouer(660, .12);
    });
}

/* ---------- 11. Succès et titres ---------- */
const SUCCES = [
    { id: 'premiere', nom: 'Première victoire', desc: 'Gagner une partie', titre: 'Recrue', ok: (c, e) => e.type === 'fin' && e.gagne },
    { id: 'pv1', nom: 'Sur le fil', desc: 'Gagner avec exactement 1 PV', titre: 'Le Survivant', ok: (c, e) => e.type === 'fin' && e.gagne && e.pv === 1 },
    { id: 'intact', nom: 'Sans une égratignure', desc: 'Gagner avec 20 PV', titre: "L'Invincible", ok: (c, e) => e.type === 'fin' && e.gagne && e.pv >= 20 },
    { id: 'deg20', nom: 'Coup dévastateur', desc: 'Infliger 20 dégâts en un seul tour', titre: 'Le Dévastateur', ok: (c, e) => e.type === 'degats' && e.total >= 20 },
    { id: 'vet10', nom: 'Vétéran', desc: 'Gagner 10 parties', titre: 'Le Vétéran', ok: (c) => c.victoires >= 10 },
    { id: 'multi5', nom: 'Champion en ligne', desc: 'Gagner 5 parties en ligne', titre: 'Champion', ok: (c) => c.victoiresMulti >= 5 },
    { id: 'boost10', nom: 'Collectionneur', desc: 'Ouvrir 10 boosters', titre: 'Le Collectionneur', ok: (c) => c.boosters >= 10 },
    { id: 'legende', nom: 'Chance insolente', desc: 'Obtenir une légendaire dans un booster', titre: 'Le Chanceux', ok: (c, e) => e.type === 'carte' && (e.rarete === 'legendaire') },
    { id: 'bluff3', nom: 'Maître du bluff', desc: 'Retourner 3 cartes Bluff', titre: 'Le Bluffeur', ok: (c) => c.bluffs >= 3 },
    { id: 'draft5', nom: 'Stratège', desc: 'Gagner 5 combats dans un même run de Draft', titre: 'Le Stratège', ok: (c, e) => e.type === 'draft' && e.victoires >= 5 },
    { id: 'campagne', nom: 'Héros de la Famille', desc: 'Terminer la campagne', titre: 'Héros de la Famille', ok: (c, e) => e.type === 'campagne' && e.fini },
    { id: 'elo1400', nom: 'Élite', desc: 'Atteindre 1400 ELO', titre: "L'Élite", ok: (c, e) => e.type === 'elo' && e.elo >= 1400 }
];
function evenementSucces(type, e = {}) {
    if (typeof profil === 'undefined') return;
    if (!profil.succes) profil.succes = {};
    const c = profil.compteurs = profil.compteurs || { victoires: 0, victoiresMulti: 0, boosters: 0, bluffs: 0 };
    e.type = type;
    if (type === 'fin' && e.gagne) { c.victoires++; if (e.mode === 'multi') c.victoiresMulti++; }
    if (type === 'booster') c.boosters++;
    if (type === 'bluff') c.bluffs++;
    let nouveau = false;
    SUCCES.forEach((s) => {
        if (profil.succes[s.id]) return;
        let ok = false; try { ok = s.ok(c, e); } catch (x) {}
        if (!ok) return;
        profil.succes[s.id] = Date.now(); nouveau = true;
        setTimeout(() => { flashInfo(`🏆 Succès : ${s.nom} — titre « ${s.titre} » débloqué !`); confetti(innerWidth / 2, innerHeight * 0.3, 40); SFX.jouer(880, .4, 'triangle', .07, 300); }, 600);
    });
    if (nouveau) sauvegarderProgression();
}
function ouvrirSucces() {
    const fait = profil.succes || {};
    const titres = SUCCES.filter((s) => fait[s.id]);
    const ov = ouvrirPanneau('panneau-succes', '🏆 Succès et titres', `
        <label class="reglage"><span>Titre affiché à côté de ton pseudo</span>
        <select id="sel-titre" class="deck-dropdown"><option value="">— Aucun —</option>${titres.map((s) => `<option value="${esc(s.titre)}" ${profil.titre === s.titre ? 'selected' : ''}>${esc(s.titre)}</option>`).join('')}</select></label>
        <p class="hint">${titres.length} / ${SUCCES.length} débloqués</p>
        <div class="succes-liste">${SUCCES.map((s) => `<div class="succes ${fait[s.id] ? 'ok' : ''}"><span class="succes-ico">${fait[s.id] ? '🏆' : '🔒'}</span><div><b>${s.nom}</b><small>${s.desc}</small><em>Titre : ${esc(s.titre)}</em></div></div>`).join('')}</div>`);
    $('#sel-titre', ov).onchange = (e) => { profil.titre = e.target.value; sauvegarderProgression(); publierClassement(); majProfilRang(); };
}

/* ---------- 6. Classé : ELO et ligues ---------- */
const LIGUES = [
    { nom: 'Bronze', min: 0, ico: '🥉' }, { nom: 'Argent', min: 1000, ico: '🥈' }, { nom: 'Or', min: 1200, ico: '🥇' },
    { nom: 'Platine', min: 1400, ico: '💠' }, { nom: 'Diamant', min: 1600, ico: '💎' }, { nom: 'Maître', min: 1800, ico: '👑' }
];
const ligueDe = (elo) => [...LIGUES].reverse().find((l) => (elo || 1000) >= l.min) || LIGUES[0];
function appliquerElo(gagne) {
    if (typeof profil.elo !== 'number') profil.elo = 1000;
    const adv = typeof window._eloAdverse === 'number' ? window._eloAdverse : 1000;
    const attendu = 1 / (1 + Math.pow(10, (adv - profil.elo) / 400));
    const delta = Math.round(ECO.eloK * ((gagne ? 1 : 0) - attendu));
    const avantLigue = ligueDe(profil.elo).nom;
    profil.elo = Math.max(0, profil.elo + delta);
    window._dernierElo = { delta, elo: profil.elo, ligue: ligueDe(profil.elo), montee: ligueDe(profil.elo).nom !== avantLigue && delta > 0 };
    window._eloAdverse = undefined;
    evenementSucces('elo', { elo: profil.elo });
    sauvegarderProgression(); publierClassement();
    const d = window._dernierElo;
    setTimeout(() => flashInfo(`${d.ligue.ico} Classement : ${d.delta >= 0 ? '+' : ''}${d.delta} ELO → ${d.elo} (${d.ligue.nom})${d.montee ? ' — Nouvelle ligue !' : ''}`), 900);
}
function publierClassement() {
    if (typeof fbDB === 'undefined' || !fbDB || typeof monId === 'undefined' || !monId) return;
    const l = ligueDe(profil.elo);
    try { fbDB.ref('joueurs/' + monId).update({ elo: profil.elo || 1000, titre: profil.titre || '' }); } catch (e) {}
    try { fbDB.ref('profils/' + monId + '/public').update({ elo: profil.elo || 1000, titre: profil.titre || '', ligue: l.nom }); } catch (e) {}
}
function afficherVictoireForfait(nom, gain, xp) {
    const elo = window._dernierElo;
    ecranResultat({
        titre: '🏆 Victoire par forfait !',
        html: `<p class="bc-texte"><b>${esc(nom)}</b> a abandonné la partie.</p>`,
        lignes: [`+${gain} 💰`, xp ? `+${xp} XP` : '', elo ? `${elo.ligue.ico} ${elo.delta >= 0 ? '+' : ''}${elo.delta} ELO → ${elo.elo} (${elo.ligue.nom})` : ''].filter(Boolean)
    });
}
function majProfilRang() {
    const box = $('#profil-screen .profil-box'); if (!box) return;
    let bloc = $('#profil-rang', box);
    if (!bloc) { bloc = document.createElement('div'); bloc.id = 'profil-rang'; bloc.className = 'profil-rang'; const ref = $('#avatar-picker', box); ref ? ref.insertAdjacentElement('afterend', bloc) : box.appendChild(bloc); }
    const elo = profil.elo || 1000, l = ligueDe(elo), suiv = LIGUES.find((x) => x.min > elo);
    bloc.innerHTML = `<div class="rang-ico">${l.ico}</div><div><b>Ligue ${l.nom}</b> — ${elo} ELO${profil.titre ? ` · <em class="titre-joueur">${esc(profil.titre)}</em>` : ''}
        <small>${suiv ? `Encore ${suiv.min - elo} pour ${suiv.ico} ${suiv.nom}` : 'Ligue maximale !'}</small></div>
        <div class="rang-actions"><button class="btn-chip" type="button" id="pr-succes">🏆 Succès</button><button class="btn-chip" type="button" id="pr-dos">🎴 Dos</button></div>`;
    $('#pr-succes', bloc).onclick = ouvrirSucces; $('#pr-dos', bloc).onclick = ouvrirDos;
}
function rafraichirClassement() {
    const el = $('#multi-classement-liste'); if (!el) return;
    const moi = `<div class="rang-ligne moi"><span>${ligueDe(profil.elo).ico}</span><b>${esc(J.nom)}</b><span>${profil.elo || 1000} ELO</span></div>`;
    if (typeof fbDB === 'undefined' || !fbDB) { el.innerHTML = moi; return; }
    fbDB.ref('joueurs').once('value').then((snap) => {
        const liste = Object.values(snap.val() || {}).filter((j) => j && j.pseudo && typeof j.elo === 'number').sort((a, b) => b.elo - a.elo).slice(0, 8);
        el.innerHTML = moi + liste.map((j) => `<div class="rang-ligne"><span>${ligueDe(j.elo).ico}</span><b>${esc(j.pseudo)}${j.titre ? ` <em class="titre-joueur">${esc(j.titre)}</em>` : ''}</b><span>${j.elo}</span></div>`).join('');
    }).catch(() => { el.innerHTML = moi; });
}

/* ---------- Partie spéciale (Draft / Campagne) ---------- */
function lancerPartieSpeciale({ deckJ, deckB, nomAdv }) {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false; modeTournoi = false; modeChallenge = false;
    J = nouveauCote('J', J.nom || 'Toi'); B = nouveauCote('B', nomAdv || 'Bot');
    const h = $('#hero-name'); if (h) h.innerText = J.nom;
    const o = $('#opp-name'); if (o) o.innerText = B.nom;
    _deckUtiliseEnCours = null;
    const creer = (ids, cle) => ids.map((id) => { const d = defCarte(id); return d ? instancier(d, cle, false, d.rarete) : null; }).filter(Boolean);
    J.deck = creer(deckJ, 'J'); melanger(J.deck); B.deck = creer(deckB, 'B'); melanger(B.deck);
    initialiserPartie(Math.random() > 0.5);
    changerEcran('game-screen'); rafraichirJeu(); ouvrirMulligan(); jouerSon('click');
}
function traiterFinSpeciale(gagne) {
    const m = window._modeSpecial; if (!m) return false;
    if (m.type === 'draft') {
        if (gagne) m.victoires++; else m.vies--;
        evenementSucces('draft', { victoires: m.victoires });
        const fini = m.vies <= 0;
        const gainFin = m.victoires * ECO.draftVictoire;
        if (fini) {
            profil.coins += gainFin; profil.recordDraft = Math.max(profil.recordDraft || 0, m.victoires); sauvegarderProgression(); majTopBarCoins();
            window._modeSpecial = null;
        }
        ecranResultat({
            titre: fini ? '🎴 Fin du run' : (gagne ? '✅ Combat gagné !' : '💔 Combat perdu'),
            lignes: [`Victoires : ${m.victoires}`, `Vies restantes : ${'❤️'.repeat(Math.max(0, m.vies)) || '—'}`, fini ? `Récompense : +${gainFin} 💰 (record : ${profil.recordDraft})` : 'Ton deck reste le même pour le combat suivant.'],
            bouton: fini ? 'Retour au menu' : 'Combat suivant ▶',
            onClose: fini ? undefined : () => lancerPartieSpeciale({ deckJ: m.deck, deckB: construireDeckBot(hasard(['alea-precon', 'alea-total'])), nomAdv: 'Adversaire du run' })
        });
        return true;
    }
    if (m.type === 'campagne') {
        window._modeSpecial = null;
        const etape = CAMPAGNE[m.index];
        if (!gagne) { ecranResultat({ titre: `💔 ${esc(etape.boss)} t'a battu`, lignes: ['Réessaie avec un autre deck !'], bouton: 'Retour à la campagne', onClose: ouvrirCampagne }); return true; }
        const premiere = (profil.campagne.etape || 0) === m.index;
        const lignes = [];
        if (premiere) {
            profil.campagne.etape = m.index + 1;
            initColl(etape.carte.id); collectionJoueur[etape.carte.id].legendaire = Math.max(1, collectionJoueur[etape.carte.id].legendaire || 0);
            profil.coins += ECO.campagneBoss; majTopBarCoins();
            lignes.push('+' + ECO.campagneBoss + ' 💰', `Carte unique débloquée : ${esc(etape.carte.prenom)}`);
        } else lignes.push('Étape déjà terminée.');
        sauvegarderProgression();
        if (premiere && m.index === CAMPAGNE.length - 1) evenementSucces('campagne', { fini: true });
        ecranResultat({ titre: `🏆 ${esc(etape.boss)} est vaincu !`, html: premiere ? `<div class="card-viewer-display" id="res-carte"></div>` : '', lignes, bouton: 'Retour à la campagne', onClose: ouvrirCampagne });
        if (premiere) { const z = $('#res-carte'); if (z) { const w = creerHTMLCarte(instancier(defCarte(etape.carte.id), 'J', false, 'legendaire'), 'main'); w.style.setProperty('--cw', 'min(44vw,170px)'); z.appendChild(w); ajusterTextes(z); } }
        return true;
    }
    return false;
}

/* ---------- 7. Draft / Survie ---------- */
function choixDraft(deck) {
    const pool = dbCartesDispo().filter((c) => c.id && !String(c.id).startsWith('cp') && !String(c.id).startsWith('jeton'));
    const compte = (id) => deck.filter((x) => x === id).length, limite = (c) => (c.rarete === 'epique' || c.rarete === 'legendaire') ? 1 : 2;
    const terrainPris = deck.some((x) => defCarte(x).famille === 'Terrain');
    const tirage = () => { const r = Math.random(); return r < 0.6 ? 'commune' : r < 0.88 ? 'rare' : r < 0.97 ? 'epique' : 'legendaire'; };
    const sortie = []; let essais = 0;
    while (sortie.length < 3 && essais++ < 300) {
        const r = tirage();
        const c = hasard(pool.filter((x) => x.rarete === r && compte(x.id) < limite(x) && !sortie.some((o) => o.id === x.id) && !(x.famille === 'Terrain' && terrainPris)));
        if (c) sortie.push(c);
    }
    return sortie;
}
function ouvrirDraft() {
    const deck = [];
    const ov = ouvrirPanneau('panneau-draft', '🎴 Draft / Survie', '<div id="draft-corps"></div>');
    const corps = $('#draft-corps', ov);
    const etape = () => {
        if (deck.length >= 20) {
            corps.innerHTML = `<p class="bc-texte">Deck prêt ! Tu as <b>3 ❤️</b> : chaque défaite en coûte une. Gagne un maximum de combats (+${ECO.draftVictoire} 💰 par victoire à la fin du run).</p>
                <button class="btn-large btn-play" type="button" id="draft-go"><span class="btn-icon">⚔️</span><span class="btn-label"><span class="btn-title">Lancer la survie</span><span class="btn-sub">Record actuel : ${profil.recordDraft || 0} victoire(s)</span></span></button>`;
            $('#draft-go', corps).onclick = () => {
                ov.remove(); window._modeSpecial = { type: 'draft', deck: [...deck], vies: 3, victoires: 0 };
                lancerPartieSpeciale({ deckJ: deck, deckB: construireDeckBot('alea-precon'), nomAdv: 'Adversaire du run' });
            };
            return;
        }
        const choix = choixDraft(deck);
        corps.innerHTML = `<p class="hint">Choisis 1 carte sur 3 — <b>${deck.length} / 20</b>. Ta collection n'est pas utilisée.</p><div class="draft-cartes"></div>`;
        const zone = $('.draft-cartes', corps);
        choix.forEach((c) => {
            const w = creerHTMLCarte(instancier(c, 'J', false, c.rarete), 'main');
            w.style.setProperty('--cw', 'min(28vw,140px)'); w.classList.add('draft-choix'); w.tabIndex = 0; w.setAttribute('role', 'button');
            const prendre = () => { deck.push(c.id); SFX.jouer(560, .1, 'triangle', .06, 200); etape(); };
            w.onclick = prendre; w.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prendre(); } };
            zone.appendChild(w);
        });
        ajusterTextes(zone);
    };
    etape();
}

/* ---------- 8. Campagne solo ---------- */
const CAMPAGNE = [
    { boss: 'Gardien des Meridja', deck: 'precon:0', emoji: '🔥', texte: "« Personne ne passe sans battre la famille Meridja ! »", carte: { id: 'cp1', prenom: 'Gardien Meridja', cout: 5, atk: 4, vie: 6, desc: 'Un protecteur loyal de la famille Meridja.', mots: ['Provocation'], emoji: '🛡️' } },
    { boss: 'Gardien des Marouf', deck: 'precon:1', emoji: '🌊', texte: "« Les Marouf ne s'énervent jamais… jusqu'à aujourd'hui. »", carte: { id: 'cp2', prenom: 'Gardien Marouf', cout: 6, atk: 5, vie: 6, desc: 'Calme, patient et redoutable.', mots: ['Provocation'], emoji: '🧿' } },
    { boss: 'Gardien des Kerkache', deck: 'precon:2', emoji: '🍃', texte: "« Mon mur est impossible à percer ! »", carte: { id: 'cp3', prenom: 'Gardien Kerkache', cout: 6, atk: 4, vie: 8, desc: 'Un mur vivant.', mots: ['Provocation'], emoji: '🏰' } },
    { boss: 'Gardien des Belgacemi', deck: 'precon:3', emoji: '☀️', texte: "« Ensemble, nous sommes invincibles ! »", carte: { id: 'cp4', prenom: 'Gardien Belgacemi', cout: 7, atk: 6, vie: 6, desc: 'Fonce sans attendre.', mots: ['Charge'], emoji: '⚡' } },
    { boss: 'Le Grand Patriarche', deck: 'alea-total', emoji: '👑', texte: "« Montre-moi que tu es digne de la Famille. »", carte: { id: 'cp5', prenom: 'Le Grand Patriarche', cout: 8, atk: 7, vie: 9, desc: 'Le chef de toute la famille.', mots: ['Provocation', 'Charge'], emoji: '👑' } }
];
CAMPAGNE.forEach((e) => {
    const c = C(e.carte.id, e.carte.prenom, 'Neutre', e.carte.cout, e.carte.atk, e.carte.vie, 'legendaire', e.carte.desc, e.carte.mots, e.carte.emoji);
    if (!parId[c.id]) { dbCartes.push(c); parId[c.id] = c; }
    e.carte = c;
});
function ouvrirCampagne() {
    if (!profil.campagne) profil.campagne = { etape: 0 };
    const decks = mesDecks.map((d, i) => ({ d, i })).filter(({ d }) => calculerCartesPossedeesPourDeck(d.cartes) === 20);
    if (!decks.length) return flashInfo('Il te faut un deck complet pour la campagne.');
    const cur = profil.campagne.etape || 0;
    const ov = ouvrirPanneau('panneau-campagne', '🗺️ Campagne de la Famille', `
        <label class="reglage"><span>Ton deck</span><select id="camp-deck" class="deck-dropdown">${decks.map(({ d, i }) => `<option value="${i}">${esc(d.nom)}</option>`).join('')}</select></label>
        <div class="camp-liste">${CAMPAGNE.map((e, i) => `<div class="camp-etape ${i < cur ? 'fait' : i === cur ? 'courant' : 'verrou'}">
            <span class="camp-ico">${i < cur ? '✅' : i > cur ? '🔒' : e.emoji}</span>
            <div><b>${i + 1}. ${e.boss}</b><small>${i > cur ? 'Bats le boss précédent' : e.texte}</small><em>Récompense : carte unique « ${esc(e.carte.prenom)} »</em></div>
            <button class="btn-chip" type="button" data-i="${i}" ${i > cur ? 'disabled' : ''}>${i < cur ? 'Rejouer' : 'Combattre'}</button></div>`).join('')}</div>`);
    ov.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-i]'); if (!b) return;
        const i = +b.dataset.i, e = CAMPAGNE[i], d = mesDecks[+$('#camp-deck', ov).value];
        ov.remove();
        ecranResultat({
            titre: `${e.emoji} ${e.boss}`, html: `<p class="bc-texte">${e.texte}</p>`, bouton: '⚔️ Combattre',
            onClose: () => {
                window._modeSpecial = { type: 'campagne', index: i };
                lancerPartieSpeciale({ deckJ: d.cartes.map((c) => (typeof c === 'string' ? c : c.id)), deckB: construireDeckBot(e.deck), nomAdv: e.boss });
            }
        });
    });
}

/* ---------- 4 + 1. Messages privés : pastilles • Chat de partie : bulle ---------- */
const MSG = { nonLus: {}, lus: (() => { try { return JSON.parse(localStorage.getItem('ftcg_msg_lus') || '{}'); } catch (e) { return {}; } })(), ecoutes: {} };
const cleConv = (code) => [profil.codeAmi, code].sort().join('_');
function majPastillesMessages() {
    const total = Object.values(MSG.nonLus).reduce((a, b) => a + b, 0);
    const nav = $('#main-nav .nav-links button[data-screen="profil-screen"]');
    if (nav) { let p = $('.pastille-msg', nav); if (!p) { nav.insertAdjacentHTML('beforeend', '<span class="pastille pastille-msg" hidden>0</span>'); p = $('.pastille-msg', nav); } p.textContent = total; p.hidden = !total; }
    const top = $('#main-nav .nav-pseudo');
    if (top) { let p = $('.pastille-top', top); if (!p) { top.style.position = 'relative'; top.insertAdjacentHTML('beforeend', '<span class="pastille pastille-top" hidden>0</span>'); p = $('.pastille-top', top); } p.textContent = '💬 ' + total; p.hidden = !total; }
    $$('#amis-liste .ami-item').forEach((it) => {
        const code = ($('.ami-nom', it) || {}).textContent; if (!code) return;
        const btn = $('.ami-actions button', it); if (!btn) return;
        let p = $('.pastille', btn); const n = MSG.nonLus[cleConv(code.trim())] || 0;
        if (!p) { btn.style.position = 'relative'; btn.insertAdjacentHTML('beforeend', '<span class="pastille" hidden>0</span>'); p = $('.pastille', btn); }
        p.textContent = n; p.hidden = !n;
    });
}
function marquerConvLue(code) {
    const cle = cleConv(code); MSG.lus[cle] = Date.now(); MSG.nonLus[cle] = 0;
    try { localStorage.setItem('ftcg_msg_lus', JSON.stringify(MSG.lus)); } catch (e) {}
    majPastillesMessages();
}
function surveillerMessagesPrives() {
    if (typeof fbDB === 'undefined' || !fbDB || !profil.codeAmi) return;
    (profil.amis || []).forEach((code) => {
        const cle = cleConv(code); if (MSG.ecoutes[cle]) return; MSG.ecoutes[cle] = true;
        fbDB.ref('messagesPrives/' + cle).limitToLast(30).on('child_added', (snap) => {
            const m = snap.val(); if (!m || m.de === profil.codeAmi) return;
            if ((m.ts || 0) <= (MSG.lus[cle] || 0)) return;
            if (window._amiChatEnCours === code) { MSG.lus[cle] = m.ts; return; }
            MSG.nonLus[cle] = (MSG.nonLus[cle] || 0) + 1;
            if (Date.now() - (m.ts || 0) < 15000) { flashInfo(`💬 Nouveau message de ${code} !`); SFX.jouer(740, .12, 'triangle', .06, 200); }
            majPastillesMessages();
        });
    });
}
// l'ancienne écoute téléchargeait TOUTES les conversations et ne notifiait jamais : remplacée

function toggleIngameChat() {
    const ic = $('#ingame-chat'); if (!ic) return;
    ic.classList.toggle('open');
    if (ic.classList.contains('open')) { window._chatNonLus = 0; majBulleChat(); const m = $('#ingame-chat-messages'); if (m) m.scrollTop = m.scrollHeight; const i = $('#ingame-chat-input'); if (i && !window.matchMedia('(pointer:coarse)').matches) i.focus(); }
}
function majBulleChat() {
    const b = $('#ingame-chat-bubble'); if (!b) return;
    const p = $('.pastille', b), n = window._chatNonLus || 0; p.textContent = n; p.hidden = !n;
    b.classList.toggle('nouveau', n > 0);
}
_apres('afficherMsgIngame', ([, moi]) => {
    const ic = $('#ingame-chat');
    if (!moi && ic && !ic.classList.contains('open')) { window._chatNonLus = (window._chatNonLus || 0) + 1; majBulleChat(); SFX.jouer(740, .1, 'triangle', .05, 150); }
});

/* ---------- Initialisation ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const btn = $('#btn-sfx'); if (btn) { btn.textContent = '⚙️'; btn.title = 'Réglages'; btn.onclick = ouvrirParametres; }
    const bulle = $('#ingame-chat-bubble'); if (bulle) bulle.onclick = toggleIngameChat;
    const tete = $('.ingame-chat-head'); if (tete) tete.onclick = (e) => { if (!e.target.closest('button')) toggleIngameChat(); };
    appliquerReglages(); appliquerDos();
    // dégâts par tour (succès « 20 dégâts en un tour »)
    _avant('debutTourJoueur', () => { window._degatsTour = 0; });
    const compter = (n) => { if (tourActuel !== 'joueur') return; window._degatsTour = (window._degatsTour || 0) + Math.max(0, n); if (window._degatsTour >= 20) evenementSucces('degats', { total: window._degatsTour }); };
    _avant('appliquerDegatsCreature', ([c, n]) => { if (c && B.plateau.includes(c)) compter(n); });
    _avant('degatsHero', ([side, n]) => { if (side === B) compter(n); });
    _avant('retournerBluff', ([m, p]) => { if (p === J && m && !m.revele) evenementSucces('bluff'); });
    _apres('preparerBooster', () => evenementSucces('booster'));
    _apres('lancerPartieMultijoueur', () => {
        window._eloAdverse = undefined;
        const id = window._idAdverseDeck;
        if (id && typeof fbDB !== 'undefined' && fbDB) fbDB.ref('joueurs/' + id + '/elo').once('value').then((s) => { if (typeof s.val() === 'number') window._eloAdverse = s.val(); }).catch(() => {});
    });
    _apres('afficherAmis', () => { surveillerMessagesPrives(); majPastillesMessages(); });
    _apres('ouvrirChat', ([code]) => marquerConvLue(code));
    _apres('changerEcran', ([id]) => {
        if (id === 'profil-screen') majProfilRang();
        if (id === 'multi-screen') rafraichirClassement();
        if (id !== 'game-screen') { const ic = $('#ingame-chat'); if (ic) ic.classList.remove('open'); }
        surveillerMessagesPrives(); majPastillesMessages();
    });
    const spec = $('.multi-spec');
    if (spec && !$('#multi-classement-liste')) spec.insertAdjacentHTML('beforebegin', `<div class="multi-spec classement"><h3>🏅 Classement</h3><p class="subtitle">Chaque duel en ligne fait évoluer ton ELO et ta ligue.</p><div id="multi-classement-liste"></div></div>`);
    setInterval(() => { surveillerMessagesPrives(); }, 15000);
    setTimeout(() => { surveillerMessagesPrives(); publierClassement(); }, 3000);
});


/* ===========================================================
   v27 — Économie réglable par l'admin • Cartes légendaires « full art »
   =========================================================== */

/* ---------- Économie : ECO (valeurs en cours) ---------- */
const ECO_GROUPES = [
    { titre: '⚔️ Parties contre le bot', champs: [['gainBotVictoire', 'Gain victoire (💰)'], ['gainBotDefaite', 'Gain défaite (💰)'], ['xpBot', 'XP victoire'], ['forfaitBot', 'Gain en cas de forfait (💰)']] },
    { titre: '🌐 Parties en ligne', champs: [['gainMultiVictoire', 'Gain victoire (💰)'], ['gainMultiDefaite', 'Gain défaite (💰)'], ['xpMulti', 'XP victoire'], ['forfaitMulti', 'Gain en cas de forfait (💰)'], ['eloK', 'Facteur ELO (K)']] },
    { titre: '🏆 Tournois', champs: [['tournoi4Cout', 'Inscription tournoi 4 (💰)'], ['tournoi4Bonus', 'Bonus final tournoi 4 (💰)'], ['tournoi4Match', 'Cumul par match gagné, 4 joueurs (💰)'], ['tournoi8Cout', 'Inscription tournoi 8 (💰)'], ['tournoi8Bonus', 'Bonus final tournoi 8 (💰)'], ['tournoi8Match', 'Cumul par match gagné, 8 joueurs (💰)'], ['gainTournoiPartieV', 'Gain par partie gagnée (💰)'], ['gainTournoiPartieD', 'Gain par partie perdue (💰)'], ['xpTournoi', 'XP victoire'], ['gainChallengeVictoire', 'Défi : gain victoire (💰)']] },
    { titre: '🎁 Boosters', champs: [['prixBooster', 'Prix d\'un booster (💰)'], ['xpBooster', 'XP par ouverture']] },
    { titre: '🛒 Boutique : achat et vente de cartes', champs: [['prixCommune', 'Prix commune (💰)'], ['prixRare', 'Prix rare (💰)'], ['prixEpique', 'Prix épique (💰)'], ['prixLegendaire', 'Prix légendaire (💰)'], ['ratioVentePct', 'Prix de vente (% du prix d\'achat)']] },
    { titre: '🎉 Bonus et progression', champs: [['bonusQuotidien', 'Bonus quotidien de base (💰)'], ['bonusSerie', 'Bonus par jour de série (💰)'], ['niveauGain', 'Gain à chaque niveau (💰)'], ['niveauGain5', 'Gain tous les 5 niveaux (💰)'], ['deckDepart', 'Bonus du deck de départ (💰)'], ['tutoEtape', 'Gain par étape de l\'Académie (💰)'], ['multQuetes', 'Récompenses de quêtes (% des valeurs d\'origine)']] },
    { titre: '🎴 Modes spéciaux et dos de cartes', champs: [['draftVictoire', 'Draft : gain par victoire (💰)'], ['campagneBoss', 'Campagne : gain par boss (💰)'], ['prixDosTheme', 'Dos thématique (💰)'], ['prixDosEtoile', 'Dos étoilé animé (💰)'], ['prixDosArc', 'Dos arc-en-ciel animé (💰)']] }
];
function economieSauvegardeLocale() { try { return JSON.parse(localStorage.getItem('ftcg_economie') || '{}'); } catch (e) { return {}; } }
function fusionnerEco(src) {
    Object.keys(ECO_DEFAUT).forEach((k) => {
        const v = src && Number(src[k]);
        ECO[k] = (Number.isFinite(v) && v >= 0 && v <= 10000000) ? Math.round(v) : ECO_DEFAUT[k];
    });
    ECO.ratioVente = Math.min(1, ECO.ratioVentePct / 100);
}
function majTextesEco() {
    document.querySelectorAll('[data-eco]').forEach((el) => { const v = ECO[el.dataset.eco]; if (v !== undefined) el.textContent = v; });
    try { if (typeof majBoosterTextes === 'function') majBoosterTextes(); } catch (e) {}
}
function ecouterEconomie(essais = 0) {
    if (window._ecoEcoute) return;
    if (typeof fbDB === 'undefined' || !fbDB) { if (essais < 15) setTimeout(() => ecouterEconomie(essais + 1), 2000); return; }
    window._ecoEcoute = true;
    fbDB.ref('config/economie').on('value', (snap) => {
        const v = snap.val();
        if (v) { fusionnerEco(v); try { localStorage.setItem('ftcg_economie', JSON.stringify(v)); } catch (e) {} majTextesEco(); }
    }, () => {});
}
function adminAfficherEco() {
    const zone = document.getElementById('admin-tab-economie'); if (!zone) return;
    zone.innerHTML = `<h3>💰 Économie du jeu</h3>
        <p class="hint">Ces valeurs s'appliquent à <b>tous les joueurs</b> dès l'enregistrement (stockées en ligne dans <code>config/economie</code>).</p>
        ${ECO_GROUPES.map((g) => `<fieldset class="eco-groupe"><legend>${g.titre}</legend><div class="eco-grille">${g.champs.map(([k, lib]) =>
            `<label class="eco-champ"><span>${lib}</span><input type="number" min="0" max="10000000" step="1" data-eco-champ="${k}" value="${ECO[k]}"><small>défaut : ${ECO_DEFAUT[k]}</small></label>`).join('')}</div></fieldset>`).join('')}
        <div class="eco-actions"><button class="btn-large btn-play" type="button" id="eco-save"><span class="btn-icon">💾</span><span class="btn-label"><span class="btn-title">Enregistrer pour tous</span><span class="btn-sub">Application immédiate</span></span></button>
        <button class="btn-action" type="button" id="eco-reset">↺ Valeurs par défaut</button></div><p id="eco-msg" class="hint"></p>`;
    const lire = () => { const o = {}; zone.querySelectorAll('[data-eco-champ]').forEach((i) => { o[i.dataset.ecoChamp] = Math.max(0, Math.round(Number(i.value) || 0)); }); return o; };
    const dire = (t) => { const m = document.getElementById('eco-msg'); if (m) m.textContent = t; flashInfo(t); };
    const appliquer = (vals) => {
        fusionnerEco(vals); try { localStorage.setItem('ftcg_economie', JSON.stringify(vals)); } catch (e) {} majTextesEco();
        if (typeof fbDB !== 'undefined' && fbDB) fbDB.ref('config/economie').set(vals).then(() => dire('✅ Économie enregistrée pour tous les joueurs.')).catch(() => dire('⚠️ Enregistré sur cet appareil seulement : les règles Firebase refusent l\'écriture.'));
        else dire('✅ Enregistré sur cet appareil (hors ligne).');
    };
    document.getElementById('eco-save').onclick = () => { if (confirm('Appliquer ces valeurs à tous les joueurs ?')) appliquer(lire()); };
    document.getElementById('eco-reset').onclick = () => { if (confirm('Revenir aux valeurs par défaut ?')) { appliquer({ ...ECO_DEFAUT }); adminAfficherEco(); } };
}
document.addEventListener('DOMContentLoaded', () => { majTextesEco(); ecouterEconomie(); });

/* ---------- Illustrations de cartes : full art légendaire + illustration normale ---------- */
/* Pour une légendaire : tente <id>_fullart.ext puis <id>.ext puis emoji.
   Pour les autres raretés : tente <id>.ext puis emoji.
   L'illustration affichée suit la rareté AFFICHÉE (celle du haut de pile de la collection). */
const ILLUSTRATIONS = {};   // clé = `${id}|${rareteAffichee}` -> url | false (absent) | undefined (pas encore testé)

function _chargerImage(urls, onOk) {
    if (!urls.length) return;
    let i = 0;
    const img = new Image();
    const suivant = () => { if (i >= urls.length) return onOk(null); img.src = urls[i++]; };
    img.onload = () => onOk(img.src);
    img.onerror = suivant;
    suivant();
}

function sondeIllustration(id, rareteAffichee) {
    const cle = id + '|' + rareteAffichee;
    if (cle in ILLUSTRATIONS) return;
    ILLUSTRATIONS[cle] = false;

    const estLegendaire = (rareteAffichee === 'legendaire');
    const urls = [];
    if (estLegendaire) IMG_CARTES_EXTS.forEach(ext => urls.push(IMG_CARTES_DIR + id + '_fullart' + ext));
    IMG_CARTES_EXTS.forEach(ext => urls.push(IMG_CARTES_DIR + id + ext));

    _chargerImage(urls, (trouvee) => {
        ILLUSTRATIONS[cle] = trouvee || false;
        if (trouvee) majIllustrationDOM(id, rareteAffichee);
    });
}

function appliquerIllustration(w, url, estFullArt) {
    const card = w.querySelector('.card'); if (!card) return;
    const art = card.querySelector('.card-art'); if (!art) return;
    if (estFullArt) {
        card.classList.add('fullart');
        card.style.setProperty('--fa', `url("${url}")`);
    } else {
        // Illustration normale : on remplace l'<img> ou l'emoji par la bonne image
        art.innerHTML = `<img class="card-img" src="${url}" alt="" onerror="repliIllustration(this)" data-emoji="${esc(w.dataset.emoji || '🃏')}">`;
    }
}

function majIllustrationDOM(id, rareteAffichee) {
    const cle = id + '|' + rareteAffichee;
    const url = ILLUSTRATIONS[cle]; if (!url) return;
    const estFullArt = (rareteAffichee === 'legendaire');
    document.querySelectorAll(`.card-wrapper[data-cid="${id}"][data-crar="${rareteAffichee}"]`)
        .forEach((w) => appliquerIllustration(w, url, estFullArt));
}

(() => {
    const original = window.creerHTMLCarte; if (typeof original !== 'function') return;
    window.creerHTMLCarte = function (c, ctx, opts) {
        const w = original.apply(this, arguments);
        try {
            if (!c || !c.id) return w;
            const rareteAffichee = (opts && opts.overrideRarete) ? opts.overrideRarete : c.rarete;
            // on ne touche qu'aux emplacements "spectateurs" de la carte (collection, booster, zoom, main, jeu)
            if (!['collection','booster','zoom','main','jeu'].includes(ctx)) return w;
            // mémorise pour retrouver la bonne illustration au chargement async
            w.dataset.cid = c.id;
            w.dataset.crar = rareteAffichee;
            if (c.emoji) w.dataset.emoji = c.emoji;

            const cle = c.id + '|' + rareteAffichee;
            if (ILLUSTRATIONS[cle]) {
                appliquerIllustration(w, ILLUSTRATIONS[cle], rareteAffichee === 'legendaire');
            } else if (!(cle in ILLUSTRATIONS)) {
                sondeIllustration(c.id, rareteAffichee);
            }
        } catch (e) {}
        return w;
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // pré-chargement discret : pour chaque carte, toutes les raretés possibles
    const lancer = () => {
        const raretes = ['commune','rare','epique','legendaire'];
        dbCartes.forEach((c) => raretes.forEach((r) => sondeIllustration(c.id, r)));
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(lancer);
});
