/* ===========================================================
   FAMILLE TCG — moteur de jeu (Édition Ultime : Tuto & Admin)
   =========================================================== */

var collectionJoueur = {}; 
var mesDecks = [];
var profil = { coins: 0, deckStart: false, lastLogin: 0 };
var deckEnEdition = null, tempDeckCartes = [], triCourant = 'famille';

var tourActuel = 'joueur', timer = null, tempsRestant = 60, selection = null, ciblage = null, partieFinie = false, uidSeq = 1;
var modeEnLigne = false, modeAttente = false, mulliganValide = false;
var modeTuto = false, etapeTuto = 0, currentTutoLevel = 0;
var stats = { parties:0, victoires:0, defaites:0 };
var _timerMulligan = null;
var _syncSeed = 12345;

var J = { cle:'J', nom:'Toi', patience:20, manaActuel:0, manaMax:0, main:[], plateau:[], deck:[], terrain:null, surcout:0, contreSort:false, voitMainAdverse:0, pioceBloquee:false, numTour:0, premier:false, cimetiere:[] };
var B = { cle:'B', nom:'Bot', patience:20, manaActuel:0, manaMax:0, main:[], plateau:[], deck:[], terrain:null, surcout:0, contreSort:false, voitMainAdverse:0, pioceBloquee:false, numTour:0, premier:false, cimetiere:[] };

function C(id, prenom, famille, cout, atk, vie, rarete, desc, motsCles, emoji) {
    return { id: id, prenom: prenom, famille: famille, cout: cout, atk: atk, vie: vie, rarete: rarete, desc: desc, motsCles: motsCles || [], emoji: emoji };
}

var dbCartes = [
    C('m1','Farid','Meridja',6,5,6,'legendaire','Cri de guerre : donne +2/+2 aux autres Meridja alliés.',[],'👨🏻'),
    C('m2','Bachira','Meridja',6,4,7,'legendaire','Quand elle subit des dégâts, rend 3 patience à son héros.',['Provocation'],'👩🏻'),
    C('m3','Meriem','Meridja',4,4,4,'epique','Gagne +1/+1 pour chaque Marouf adverse en jeu.',[],'👱‍♀️'),
    C('m4','Amina','Meridja',4,3,5,'rare','Cri de guerre : +2 attaque si Marouane est en jeu.',[],'👩🏽'),
    C('m5','Marouane','Meridja',4,4,2,'rare','Attaque dès son arrivée.',['Charge'],'🧔🏽‍♂️'),
    C('m6','Anness','Meridja',2,3,2,'commune','Cri de guerre : +1 attaque à une créature alliée.',[],'👦🏻'),
    C('m7','Abder','Meridja',2,3,2,'commune','Cri de guerre : +0/+1 à une créature alliée.',[],'👦🏽'),
    C('m8','Channel','Meridja',2,2,1,'commune','Agilité féline : attaque dès son arrivée.',['Charge','Chat'],'🐈'),
    C('m11','Imran','Meridja',2,2,2,'commune','Cri de guerre : lance un dé. Pair, pioche une carte. Impair, gagne 1 mana ce tour.',[],'👦🏽'),

    C('ma1','Nourdinne','Marouf',6,4,6,'legendaire','Cri de guerre : -2 attaque à toutes les créatures ennemies.',[],'👨🏽‍🦳'),
    C('ma2','Karima','Marouf',6,3,8,'legendaire','À la fin de ton tour, pioche une carte.',['Provocation'],'🧕'),
    C('ma3','Islem','Marouf',4,4,5,'epique','Annule le prochain sort lancé par l\'adversaire.',[],'🧑🏽'),
    C('ma4','Inès','Marouf',4,3,6,'epique','Cri de guerre : invoque un Chat protecteur 2/1 avec Provocation.',[],'👩🏽‍🦱'),
    C('ma5','Nesrine','Marouf',4,4,4,'rare','Cri de guerre : +1/+1 à une créature alliée.',[],'👧🏽'),
    C('ma8','Zahida','Marouf',2,2,4,'commune','Cri de guerre : rend 2 points de vie à une créature alliée.',[],'👵🏽'),

    C('k1','Sid Ali','Kerkache',7,5,7,'legendaire','Les créatures alliées adjacentes ne peuvent pas être ciblées par les sorts.',['Provocation'],'👴🏽'),
    C('k2','Samia','Kerkache',6,4,8,'legendaire','À la fin de ton tour, rend 3 patience à ton héros.',[],'👵🏻'),
    C('k3','Farid K.','Kerkache',5,5,6,'epique','Tant qu\'il est blessé, gagne +3 en attaque.',[],'👨🏽'),
    C('k6','Malek','Kerkache',4,4,4,'rare','Charge foudroyante : attaque dès son arrivée.',['Charge'],'👦🏽'),
    C('k7','Pina','Kerkache',2,1,2,'commune','Oiseau ultra rapide : attaque dès son arrivée.',['Charge'],'🦜'),

    C('ka1','Khaled','Belgacemi',6,5,5,'legendaire','Cri de guerre : donne +2/+2 aux autres Belgacemi alliés.',[],'👨🏽'),
    C('ka2','Hanifa','Belgacemi',6,3,6,'legendaire','Cri de guerre : invoque un Bon repas 3/3.',[],'🧕'),
    C('ka3','Safya','Belgacemi',4,4,4,'epique','Cri de guerre : double l\'attaque de Saad s\'il est en jeu.',[],'👩🏽'),
    C('ka4','Saad','Belgacemi',4,4,4,'epique','Cri de guerre : +4 en vie si Safya est en jeu.',[],'🧔🏻'),
    C('ka5','Naila','Belgacemi',3,3,4,'rare','Cri de guerre : pioche un sort de ton deck.',[],'👩🏻'),
    C('ka6','Nassim','Belgacemi',3,4,3,'rare','Cri de guerre : inflige 2 dégâts à une cible ennemie.',[],'🧑🏽'),

    C('n1','Mima','Neutre',8,4,8,'legendaire','À la fin de ton tour, soigne entièrement tes créatures.',['Provocation'],'👵🏻'),
    C('n2','Sidou','Neutre',6,6,6,'legendaire','Cri de guerre : endort une créature ennemie pendant 2 tours.',[],'👴🏻'),
    C('n4','Femme de ménage','Neutre',3,2,4,'commune','Cri de guerre : détruit le terrain adverse.',[],'🧹'),
    C('n6','Le voisin relou','Neutre',2,1,4,'commune','Provocation.',['Provocation'],'👨‍🦰'),

    C('t1','Moeurs Verdey','Terrain',4,0,0,'commune','Tes chats coûtent 1 mana de moins.',[],'🌍'),

    C('s1','Va ranger ta chambre !','Sort',2,0,0,'commune','Renvoie une créature ennemie dans la main de son propriétaire.',[],'🧹'),
    C('s2','Qui a touché au thermostat ?','Sort',4,0,0,'epique','Inflige 2 dégâts à toutes les créatures.',[],'🌡️'),
    C('s22','Machine à laver qui déborde','Sort',3,0,0,'rare','Inflige 3 dégâts à une créature ennemie ciblée.',[],'🌊'),

    C('f1','Naila x Nassim','Nouvelle famille',8,7,7,'fusion','Fusion : nécessite Naila et Nassim. Cri de guerre : inflige 4 dégâts.',[],'💑'),

    C('c2','Malek x Kamel','Cousins',5,5,5,'epique','Rage : Gagne Charge et +2 en attaque.',['Rage'],'👬'),
    C('c9','Bagarre de cousins','Sort',2,0,0,'commune','Inflige 1 dégât à toutes tes créatures (déclenche la Rage). Pioche 2 cartes.',[],'🤼')
];

var parId = {};
function indexerCartes() { parId = {}; dbCartes.forEach(function(c) { parId[c.id] = c; }); }
indexerCartes();
function defCarte(id) { return parId[id]; }

function getSyncRandom() {
    if (!modeEnLigne) return Math.random();
    _syncSeed = (_syncSeed * 9301 + 49297) % 233280;
    return _syncSeed / 233280;
}

var FUSIONS = { 'f1': ['ka5','ka6'] };
var FUSION_DE = {};
Object.entries(FUSIONS).forEach(function(entry) {
    var fid = entry[0], compo = entry[1];
    FUSION_DE[compo[0]] = FUSION_DE[compo[0]] || []; FUSION_DE[compo[1]] = FUSION_DE[compo[1]] || [];
    FUSION_DE[compo[0]].push({fusion:fid, autre:compo[1]}); FUSION_DE[compo[1]].push({fusion:fid, autre:compo[0]});
});

var autre = function(s) { return s === J ? B : J; };
var hasard = function(a) { return (a && a.length ? a[Math.floor(getSyncRandom() * a.length)] : null); };
var pause = function(ms) { return new Promise(r => setTimeout(r, ms)); };
var atkTot = function(m) { return Math.max(0, m.atk + m.auraAtk); };
var estChat = function(m) { return m.motsCles.includes('Chat'); };

var POUVOIRS = {
    m1:{mode:'eclair',jouer:function(o){o.moi.plateau.filter(function(m){return m!==o.source&&m.famille==='Meridja'}).forEach(function(m){buff(m,2,2)});}},
    m2:{mode:'infini',blesse:function(o){soinHero(o.moi,3);}}, m3:{mode:'infini',aura:true},
    m4:{mode:'eclair',jouer:function(o){if(o.moi.plateau.some(function(m){return m.id==='m5'}))buff(o.source,2,0);}}, m5:{mode:'infini',aura:true},
    m6:{mode:'eclair',jouer:function(o){var c=o.moi.plateau.find(function(m){return m.id!=='m6'&&!m.jeton});if(c)buff(c,1,0);}},
    m11:{mode:'eclair',jouer:function(o){var v=lancerDe();if(v%2===0)piocher(o.moi,1);else o.moi.manaActuel+=1;}},

    ma1:{mode:'eclair',jouer:function(o){o.ennemi.plateau.forEach(function(m){m.atk=Math.max(0,m.atk-2);fxSur(m,'-2 ⚔','degat');});}},
    ma2:{mode:'infini',finTour:function(o){piocher(o.moi,1);fxSurHero(o.moi,'Pioche','buff');}}, ma3:{mode:'infini',jouer:function(o){o.moi.contreSort=true;}},
    ma4:{mode:'eclair',jouer:function(o){invoquerJeton(o.moi,'Chat protecteur',2,1,'🐈',['Provocation','Chat']);}},
    ma5:{mode:'eclair',jouer:function(o){var c=o.moi.plateau.find(function(m){return m.id!=='ma5'&&!m.jeton});if(c)buff(c,1,1);}},
    ma8:{mode:'eclair',cible:{camp:'allie',texte:'Soigne une créature alliée'},jouer:function(o){if(o.cible)soinCreature(o.cible,2);}},

    k1:{mode:'infini',aura:true}, k2:{mode:'infini',finTour:function(o){soinHero(o.moi,3);}}, k3:{mode:'infini',aura:true},
    k6:{mode:'infini',aura:true},

    ka1:{mode:'eclair',jouer:function(o){o.moi.plateau.filter(function(m){return m!==o.source&&m.famille==='Belgacemi'}).forEach(function(m){buff(m,2,2)});}},
    ka2:{mode:'eclair',jouer:function(o){invoquerJeton(o.moi,'Bon repas',3,3,'🍲',[]);}},
    ka3:{mode:'eclair',jouer:function(o){var s=o.moi.plateau.find(function(m){return m.id==='ka4'});if(s)buff(s,s.atk,0);}},
    ka4:{mode:'eclair',jouer:function(o){if(o.moi.plateau.some(function(m){return m.id==='ka3'}))buff(o.source,0,4);}},
    ka5:{mode:'eclair',jouer:function(o){piocherType(o.moi,'Sort');}},
    ka6:{mode:'eclair',cible:{camp:'ennemi',hero:true,texte:'Inflige 2 dégâts'},jouer:function(o){if(o.cible)fraper(o.cible,2);}},

    n1:{mode:'infini',finTour:function(o){o.moi.plateau.forEach(function(m){soinCreature(m,99);});}},
    n2:{mode:'eclair',cible:{camp:'ennemi',texte:'Endors une créature ennemie'},jouer:function(o){if(o.cible){o.cible.gele=2;fxSur(o.cible,'💤','buff');}}},
    n4:{mode:'eclair',jouer:function(o){if(o.ennemi.terrain)o.ennemi.terrain=null;}},
    n6:{mode:'infini',aura:true},

    t1:{mode:'infini',aura:true},

    s1:{mode:'eclair',cible:{camp:'ennemi',texte:'Renvoie une créature en main'},jouer:function(o){if(o.cible)renvoyerEnMain(o.cible,o.ennemi);}},
    s2:{mode:'eclair',jouer:function(o){o.moi.plateau.concat(o.ennemi.plateau).forEach(function(m){fraper(m,2);});}},
    s22:{mode:'eclair',cible:{camp:'ennemi',texte:'Inflige 3 dégâts'},jouer:function(o){if(o.cible)fraper(o.cible,3);}},

    f1:{mode:'eclair',jouer:function(o){for(var i=0;i<4;i++){var c=hasard(o.ennemi.plateau);if(c)fraper(c,1);else degatsHero(o.ennemi,1);}}},

    c2: { mode:'infini', blesse: function(o){ if(!o.source.motsCles.includes('Charge')){ o.source.motsCles.push('Charge'); o.source.malade = false; fxSur(o.source, 'Charge !', 'buff'); } buff(o.source, 2, 0); }},
    c9: { mode:'eclair', jouer: function(o){ o.moi.plateau.forEach(function(m){fraper(m, 1);}); piocher(o.moi, 2); }}
};

dbCartes.forEach(function(c) {
    if (!POUVOIRS[c.id] && c.motsCles.some(function(k){return k==='Charge'||k==='Provocation'})) POUVOIRS[c.id] = { mode:'infini', aura:true };
    if ((c.motsCles.includes('Rage') || c.motsCles.includes('Destruction')) && !POUVOIRS[c.id]) POUVOIRS[c.id] = { mode:'infini' };
});

function modePouvoir(carte) { var p = POUVOIRS[carte.id]; if (!p) return null; return p.mode; }

var decksPreconstruitsBrut = [
    { nom:'Meridja Aggro',   cartes:['m1','m2','m3','m4','m4','m5','m5','m6','m6','m7','m7','m8','m8','m11','m11','m11','n1','n2','m11','m12'] },
    { nom:'Marouf Contrôle', cartes:['ma1','ma2','ma3','ma4','ma5','ma5','ma6','ma6','ma8','ma8','ma9','ma9','n1','n2','s1','ma1'] },
    { nom:'Kerkache Défense',cartes:['k1','k2','k3','k4','k4','k5','k5','k6','k6','k7','k7','k8','k8','n1','n2','s2','s22','s22'] },
    { nom:'Belgacemi Synergie', cartes:['ka1','ka2','ka3','ka4','ka5','ka5','ka6','ka6','ka7','ka7','n1','n2'] },
    { nom:'Alliance Cousins', cartes:['c2','c2','c9','c9','ka5','ka6'] }
];

var decksPreconstruits = decksPreconstruitsBrut.map(function(d) {
    return {
        nom: d.nom,
        cartes: d.cartes.map(function(id) { 
            var def = defCarte(id);
            return def ? { id: id, rarete: def.rarete } : null; 
        }).filter(function(x) { return x !== null; })
    };
});

/* --- Admin Création Carte --- */
function chargerCartesCustom() {
    try {
        var str = localStorage.getItem('ftcg_custom_cards');
        if(str) {
            var customCards = JSON.parse(str);
            customCards.forEach(function(c) {
                dbCartes.push(c);
            });
            indexerCartes();
        }
    } catch(e){}
}
chargerCartesCustom();

function creerCarteAdmin() {
    var nom = document.getElementById('cc-nom').value;
    var fam = document.getElementById('cc-famille').value;
    var cout = parseInt(document.getElementById('cc-cout').value) || 0;
    var atk = parseInt(document.getElementById('cc-atk').value) || 0;
    var vie = parseInt(document.getElementById('cc-vie').value) || 1;
    var rarete = document.getElementById('cc-rarete').value;
    var emoji = document.getElementById('cc-emoji').value || '❓';
    var desc = document.getElementById('cc-desc').value || '';
    
    if(!nom) return alert("Le nom est obligatoire !");
    
    var id = 'custom_' + Date.now();
    var newCard = C(id, nom, fam, cout, atk, vie, rarete, desc, [], emoji);
    dbCartes.push(newCard);
    indexerCartes();
    
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem('ftcg_custom_cards')) || []; } catch(e){}
    saved.push(newCard);
    localStorage.setItem('ftcg_custom_cards', JSON.stringify(saved));
    
    initColl(id);
    collectionJoueur[id][rarete] = 10;
    sauvegarderProgression();
    
    alert("Carte " + nom + " créée avec succès ! Elle est dans ta collection.");
    document.getElementById('cc-nom').value = '';
    document.getElementById('cc-desc').value = '';
}

function adminToutDebloquer() {
    dbCartes.forEach(function(c) {
        initColl(c.id);
        ['commune','rare','epique','legendaire','fusion'].forEach(function(r) {
            collectionJoueur[c.id][r] = 10;
        });
    });
    profil.coins = 999999;
    sauvegarderProgression();
    alert("TOUT EST DÉBLOQUÉ ! (+10 copies de chaque rareté pour chaque carte).");
    if(document.getElementById('collection-screen').classList.contains('active')) afficherBoutique(triCourant);
}

/* --- Helpers Collection Multi-Raretés --- */
function initColl(id) {
    if (!collectionJoueur[id] || typeof collectionJoueur[id] === 'number') {
        var cDef = defCarte(id);
        var defR = cDef ? cDef.rarete : 'commune';
        var oldQty = typeof collectionJoueur[id] === 'number' ? collectionJoueur[id] : 0;
        collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0 };
        collectionJoueur[id][defR] = oldQty;
    }
}

function getTot(id) {
    initColl(id);
    return collectionJoueur[id].commune + collectionJoueur[id].rare + collectionJoueur[id].epique + collectionJoueur[id].legendaire + collectionJoueur[id].fusion;
}

function getHighRarity(id) {
    initColl(id);
    var o = ['fusion','legendaire','epique','rare','commune'];
    for (var i = 0; i < o.length; i++) { if (collectionJoueur[id][o[i]] > 0) return o[i]; }
    var cDef = defCarte(id);
    return cDef ? cDef.rarete : 'commune';
}

function formatCoins(c) { return c >= 999999 ? '∞' : c; }

function majTopBarCoins() {
    var el = document.getElementById('nav-coins');
    if(el) el.innerText = formatCoins(profil.coins) + " 💰";
}

/* ANTI-PLANTAGE SAUVEGARDE & VERIFICATION DES DECKS */
function sanitizeSave() {
    try {
        if (typeof collectionJoueur === 'object' && collectionJoueur !== null) {
            for (var id in collectionJoueur) {
                if (typeof collectionJoueur[id] === 'number') {
                    var oldVal = collectionJoueur[id];
                    var cDef = defCarte(id);
                    var defR = cDef ? cDef.rarete : 'commune';
                    collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0 };
                    collectionJoueur[id][defR] = oldVal;
                }
            }
        } else {
            collectionJoueur = {};
        }

        if (!Array.isArray(mesDecks)) mesDecks = [];
        mesDecks.forEach(function(d) {
            if (!d.cartes) d.cartes = [];
            d.cartes = d.cartes.map(function(c) {
                if (typeof c === 'string') {
                    var def = defCarte(c);
                    return def ? { id: c, rarete: def.rarete } : null;
                }
                if (c && c.id && defCarte(c.id)) {
                    if (!c.rarete) c.rarete = defCarte(c.id).rarete;
                    return c;
                }
                return null;
            }).filter(function(c) { return c !== null; });
        });

        decksPreconstruits.forEach(function(dp) {
            if (!mesDecks.some(function(md) { return md.nom === dp.nom && md.base === true; })) {
                mesDecks.push({ nom: dp.nom, cartes: JSON.parse(JSON.stringify(dp.cartes)), base: true });
            }
        });
    } catch(e) {
        console.error("SanitizeSave Error:", e);
    }
}

function chargerProgression(email) {
    if (email === 'nassim57132@gmail.com') profil.coins = 999999;
    
    try {
        var brut = localStorage.getItem('ftcg_save_local');
        if (brut) {
            var data = JSON.parse(brut);
            if (data.profil) profil = data.profil;
            if (data.collectionJoueur) collectionJoueur = data.collectionJoueur;
            if (data.mesDecks) mesDecks = data.mesDecks;
        }
    } catch (e) {}

    sanitizeSave();

    if (email === 'nassim57132@gmail.com') {
        profil.coins = 999999;
        if(!profil.adminUnlocked) {
            dbCartes.forEach(function(c) {
                initColl(c.id);
                collectionJoueur[c.id][c.rarete] = 10;
            });
            profil.adminUnlocked = true;
        }
    }

    var maintenant = Date.now();
    if (maintenant - profil.lastLogin > 86400000) { 
        if (email !== 'nassim57132@gmail.com') profil.coins += 50;
        profil.lastLogin = maintenant;
        flashInfo("🎁 Bonus quotidien : +50 💰 !");
    }

    if (!profil.deckStart && email !== 'nassim57132@gmail.com') {
        attribuerDeckDepart();
    } else {
        sauvegarderProgression();
        majTopBarCoins();
        majTutoUI();
        if(document.getElementById('deckbuilder-screen') && document.getElementById('deckbuilder-screen').classList.contains('active')) chargerListeDecks();
        if(document.getElementById('menu-screen') && document.getElementById('menu-screen').classList.contains('active')) chargerDropdownDecks();
        animerCartesConnexion();
    }
}

function sauvegarderProgression() {
    sanitizeSave();
    var data = { profil: profil, collectionJoueur: collectionJoueur, mesDecks: mesDecks };
    try { localStorage.setItem('ftcg_save_local', JSON.stringify(data)); } catch (e) {}
    majTopBarCoins();
}

function attribuerDeckDepart() {
    var famillesDeBase = ['Meridja', 'Marouf', 'Kerkache', 'Belgacemi'];
    var familleChoisie = famillesDeBase[Math.floor(Math.random() * famillesDeBase.length)];
    var precon = decksPreconstruits.find(function(d) { return d.nom.includes(familleChoisie); });
    
    if(precon) {
        precon.cartes.forEach(function(c) {
            initColl(c.id);
            collectionJoueur[c.id][c.rarete] = (collectionJoueur[c.id][c.rarete] || 0) + 1;
        });
    }

    dbCartes.forEach(function(c) {
        if (c.famille === familleChoisie && c.rarete === 'commune') {
            initColl(c.id);
            collectionJoueur[c.id].commune += 2; 
        }
    });

    profil.deckStart = true;
    profil.coins += 100;
    sauvegarderProgression();
    
    alert("🎉 La famille " + familleChoisie + " t'adopte !\nTu as débloqué son deck complet et reçu 100 💰 en cadeau !");
    majTopBarCoins();
    majTutoUI();
    chargerListeDecks();
    chargerDropdownDecks();
}

function calculerCartesPossedeesPourDeck(cartesDeck) {
    var owned = 0; 
    var tempColl = JSON.parse(JSON.stringify(collectionJoueur));
    cartesDeck.forEach(function(c) { 
        var id = typeof c === 'string' ? c : c.id;
        var r = typeof c === 'string' ? defCarte(id).rarete : c.rarete;
        
        if (!tempColl[id]) {
            tempColl[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0 };
        }
        
        if (tempColl[id][r] > 0) { 
            owned++; 
            tempColl[id][r]--; 
        } 
    });
    return owned;
}

/* ---------- 5. Navigation & UI globales ---------- */
function changerEcran(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    
    if(id !== 'login-screen') document.getElementById('main-nav').classList.remove('hidden');
    else document.getElementById('main-nav').classList.add('hidden');

    var bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
    if (bfNav) bfNav.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    if (bfIn) bfIn.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    
    if (id === 'deckbuilder-screen') { chargerListeDecks(); }
    if (id === 'collection-screen') { afficherBoutique(triCourant); }
    if (id === 'menu-screen') chargerDropdownDecks();
    if (id === 'profil-screen') afficherProfil();
    if (id === 'tuto-screen') majTutoUI();
    if (id === 'multi-screen' && typeof rafraichirJoueurs === 'function') rafraichirJoueurs();
}

function ouvrirAide() { document.getElementById('aide-overlay').classList.add('open'); }
function fermerAide() { document.getElementById('aide-overlay').classList.remove('open'); }

function afficherProfil() {
    document.getElementById('profil-pseudo').innerText = J.nom ? "Statistiques de " + J.nom : 'Statistiques';
    document.getElementById('stat-parties').innerText = stats.parties;
    document.getElementById('stat-victoires').innerText = stats.victoires;
    document.getElementById('stat-defaites').innerText = stats.defaites;
    document.getElementById('stat-ratio').innerText = stats.parties ? Math.round(stats.victoires / stats.parties * 100) + '%' : '—';
}

function ajouterLog(emoji, text, side) {
    var log = document.getElementById('action-log'); if (!log) return;
    var div = document.createElement('div'); div.className = 'log-item ' + (side === J ? 'moi' : 'adv'); div.innerHTML = emoji; div.title = text; log.prepend(div);
    if (log.children.length > 5) log.lastChild.remove();
}

function voirCimetiere(cle) {
    var arr = cle === 'J' ? J.cimetiere : B.cimetiere;
    var grid = document.getElementById('graveyard-cards'); grid.innerHTML = '';
    document.getElementById('graveyard-title').innerText = "Cimetière (" + arr.length + ")";
    arr.forEach(function(cObj) { grid.appendChild(creerHTMLCarte(defCarte(cObj.id), 'collection', { overrideRarete: cObj.rarete })); }); 
    ajusterTextes(grid); document.getElementById('graveyard-overlay').classList.add('open');
}
function fermerCimetiere() { document.getElementById('graveyard-overlay').classList.remove('open'); }
function toggleEmotes(cle) { if (cle !== 'J') return; var el = document.getElementById('emotes-J'); if (el) el.classList.toggle('hidden'); }
function jouerEmote(text) { document.getElementById('emotes-J').classList.add('hidden'); afficherEmote(J, text); if (modeEnLigne && typeof pousserAction === 'function') pousserAction({ type:'emote', text:text }); }
function afficherEmote(side, text) { var el = elHero(side); var bulle = document.createElement('div'); bulle.className = 'emote-bubble'; bulle.innerText = text; el.appendChild(bulle); setTimeout(function() { bulle.remove(); }, 3000); }

/* ---------- 6. Rendu cartes ---------- */
function creerHTMLCarte(c, ctx, opts) {
    opts = opts || {}; var w = document.createElement('div'); w.className = 'card-wrapper'; if (c.uid) w.dataset.uid = c.uid;
    var enJeu = ctx === 'jeu' || ctx === 'main', atk = c.auraAtk !== undefined ? atkTot(c) : c.atk, pv = c.vieMax !== undefined ? c.vie : c.vie, base = defCarte(c.id);
    var atkBuffe = base && atk > base.atk, pvBuffe = base && c.vieMax !== undefined && c.vieMax > base.vie, blesse = c.vieMax !== undefined && c.vie < c.vieMax;
    var mode = modePouvoir(c), badge = mode ? '<div class="power-badge ' + mode + '">' + (mode === 'eclair' ? '⚡' : '♾️') + '</div>' : '<div class="power-badge" style="opacity:0"></div>';
    var estSortOuTerrain = c.famille === 'Sort' || c.famille === 'Terrain';
    var pied = estSortOuTerrain ? '<div class="card-foot"><span class="kw">' + (c.famille === 'Sort' ? 'Sort' : 'Terrain') + '</span></div>' : '<div class="card-foot"><span class="stat atk ' + (atkBuffe ? 'buffed' : '') + '">' + atk + '</span><span class="stat hp ' + (blesse ? 'blesse' : (pvBuffe ? 'buffed' : '')) + '">' + pv + '</span></div>';
    
    var displayRarete = opts.overrideRarete ? opts.overrideRarete : c.rarete;
    var rareteHtml = enJeu ? '' : '<div class="rarity-text">' + displayRarete + '</div>';
    var clRarete = displayRarete === 'fusion' ? 'fusion' : displayRarete;

    var motsCles = c.motsCles.filter(function(k){return k !== 'Chat';}), kw = motsCles.length ? '<div class="keyword-row">' + motsCles.map(function(k){return '<span class="kw">' + k + '</span>'}).join('') + '</div>' : '';
    var qty = (opts.qty !== undefined) ? '<div class="qty-badge">×' + opts.qty + '</div>' : '', loupe = (ctx === 'collection' || ctx === 'booster') ? '<div class="zoom-btn" onclick="zoomCarte(event,\'' + c.id + '\')">🔍</div>' : '';
    var tagDeck = opts.enDeck ? '<div class="nouveau-tag">Dans le deck ×' + opts.enDeck + '</div>' : '', tagNeuf = opts.nouveau ? '<div class="nouveau-tag">Nouvelle</div>' : '';
    var coutAffiche = opts.cout !== undefined ? opts.cout : c.cout, classeTexte = POUVOIRS[c.id] ? 'pouvoir' : 'lore', clFamille = c.famille === 'Nouvelle famille' ? 'Nouvelle' : c.famille;
    
    w.innerHTML = qty + loupe + tagDeck + tagNeuf + '<div class="card-inner"><div class="card bg-' + clFamille + ' border-' + clRarete + '"><div class="card-head"><div class="mana-gem">' + coutAffiche + '</div><div class="card-name">' + c.prenom + '</div>' + badge + '</div><div class="card-art">' + c.emoji + '</div><div class="faction-tag">' + c.famille + '</div><div class="card-text ' + classeTexte + '">' + c.desc + '</div>' + kw + pied + rareteHtml + '</div><div class="card-back">✦</div></div>';
    
    if (opts.missing) { w.classList.add('manquante'); }
    if (opts.inDeck) { var cd = w.querySelector('.card'); if(cd) { cd.style.boxShadow = "0 0 15px var(--menthe), 0 .5em 1.4em rgba(0,0,0,.6)"; cd.style.filter = "saturate(1.2)"; } }

    return w;
}

function ajusterTextes(racine) { (racine || document).querySelectorAll('.card-text').forEach(function(el) { var taille = 0.62; el.style.fontSize = taille + 'em'; var garde = 0; while (el.scrollHeight > el.clientHeight + 1 && taille > 0.34 && garde++ < 20) { taille -= 0.035; el.style.fontSize = taille.toFixed(3) + 'em'; } }); }
function zoomCarte(event, id) { if (event) event.stopPropagation(); var c = defCarte(id); if (!c) return; var box = document.getElementById('card-zoom-container'); box.innerHTML = ''; box.appendChild(creerHTMLCarte(c, 'zoom', {overrideRarete: getHighRarity(id)})); document.getElementById('card-zoom-overlay').classList.add('open'); ajusterTextes(box); }
function fermerZoom() { document.getElementById('card-zoom-overlay').classList.remove('open'); }

/* --- Décoration Animée Connexion --- */
function animerCartesConnexion() {
    var bg = document.getElementById('login-cards-bg');
    if (!bg) return;
    bg.innerHTML = '';
    var cartesDecor = ['m1','ma2','k1','ka1','f1','s6'];
    cartesDecor.forEach(function(id, index) {
        var el = creerHTMLCarte(defCarte(id), 'zoom');
        el.style.left = (Math.random() * 80) + '%';
        el.style.animationDelay = (index * -4) + 's';
        bg.appendChild(el);
    });
}

/* ---------- 7. DECKBUILDER & BOUTIQUE ---------- */
function afficherBoutique(critere) {
    triCourant = critere;
    var ordreRarete = { fusion:0, legendaire:1, epique:2, rare:3, commune:4 }, ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, Neutre:7, Terrain:8, Sort:9 };
    var liste = dbCartes.slice();
    if (critere === 'nom') liste.sort(function(a, b) { return a.prenom.localeCompare(b.prenom); }); if (critere === 'cout') liste.sort(function(a, b) { return a.cout - b.cout || a.prenom.localeCompare(b.prenom); });
    if (critere === 'rarete') liste.sort(function(a, b) { return ordreRarete[a.rarete] - ordreRarete[b.rarete] || a.cout - b.cout; }); if (critere === 'famille') liste.sort(function(a, b) { return ordreFamille[a.famille] - ordreFamille[b.famille] || a.cout - b.cout; });
    
    var grid = document.getElementById('boutique-grid'); 
    if(!grid) return;
    grid.innerHTML = '';
    
    liste.forEach(function(c) {
        var total = getTot(c.id);
        var el = creerHTMLCarte(c, 'collection', { qty: total, overrideRarete: getHighRarity(c.id), missing: total === 0 });
        el.onclick = function() { ouvrirDetailCarte(c.id, false); };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}

function chargerListeDecks() {
    var list = document.getElementById('liste-decks'); 
    if(!list) return;
    list.innerHTML = '';
    
    mesDecks.forEach(function(d, i) {
        var owned = calculerCartesPossedeesPourDeck(d.cartes);
        var isComplete = owned >= d.cartes.length && d.cartes.length > 0;
        
        var div = document.createElement('div'); 
        div.className = 'deck-item' + (deckEnEdition === i ? ' active' : '') + (!isComplete ? ' incomplete' : '');
        
        var supprBtn = d.base ? '<span class="base-tag">Officiel</span>' : '<button class="del-btn" onclick="supprimerDeck(' + i + ', event)">✕</button>';
        var warnTag = isComplete ? '' : '<span style="color:var(--braise);font-size:10px;margin-left:5px;">(' + owned + '/20)</span>';
        
        div.innerHTML = '<span class="di-texte">' + d.nom + warnTag + '</span>' + supprBtn;
        div.onclick = function() { editerDeck(i); }; 
        list.appendChild(div);
    });
    
    if (deckEnEdition === null && mesDecks.length) editerDeck(0); 
    else { trierDeckbuilder(triCourant); afficherDeckEnCours(); }
}

function creerNouveauDeck() { mesDecks.push({ nom:'Nouveau deck perso', cartes:[], base:false }); editerDeck(mesDecks.length - 1); }

function supprimerDeck(i, event) {
    if (event) event.stopPropagation(); if (mesDecks[i].base) return; if (!confirm("Supprimer le deck « " + mesDecks[i].nom + " » ?")) return;
    mesDecks.splice(i, 1); if (deckEnEdition === i) deckEnEdition = null; else if (deckEnEdition !== null && deckEnEdition > i) deckEnEdition--; 
    chargerListeDecks(); sauvegarderProgression();
}

function editerDeck(i) {
    deckEnEdition = i; tempDeckCartes = mesDecks[i].cartes.slice(); 
    document.getElementById('deck-name-input').value = mesDecks[i].nom;
    var list = document.getElementById('liste-decks'); 
    Array.from(list.children).forEach(function(el, k) { el.classList.toggle('active', k === i); });
    trierDeckbuilder(triCourant); afficherDeckEnCours();
}

function trierDeckbuilder(critere) {
    triCourant = critere;
    var ordreRarete = { fusion:0, legendaire:1, epique:2, rare:3, commune:4 }, ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, Neutre:7, Terrain:8, Sort:9 };
    var liste = dbCartes.slice();
    if (critere === 'nom') liste.sort(function(a, b) { return a.prenom.localeCompare(b.prenom); }); if (critere === 'cout') liste.sort(function(a, b) { return a.cout - b.cout || a.prenom.localeCompare(b.prenom); });
    if (critere === 'rarete') liste.sort(function(a, b) { return ordreRarete[a.rarete] - ordreRarete[b.rarete] || a.cout - b.cout; }); if (critere === 'famille') liste.sort(function(a, b) { return ordreFamille[a.famille] - ordreFamille[b.famille] || a.cout - b.cout; });
    
    var grid = document.getElementById('deckbuilder-grid'); 
    if(!grid) return;
    grid.innerHTML = '';
    
    var isBaseDeck = mesDecks[deckEnEdition] && mesDecks[deckEnEdition].base;

    liste.forEach(function(c) {
        var total = getTot(c.id);
        var dansDeck = tempDeckCartes.filter(function(x) { return x.id === c.id; }).length;
        
        if(total <= 0 && (!isBaseDeck || dansDeck === 0)) return; 

        var highestRarity = getHighRarity(c.id);
        var el = creerHTMLCarte(c, 'collection', { qty:total, overrideRarete: highestRarity, inDeck: dansDeck > 0, missing: (total - dansDeck < 0) });
        
        el.onclick = function() { ouvrirDetailCarte(c.id, true); };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}

function ouvrirDetailCarte(idCarte, modeDeckbuilder) {
    var c = defCarte(idCarte);
    var content = document.getElementById('card-detail-content');
    
    function render() {
        initColl(idCarte);
        var coll = collectionJoueur[idCarte];
        var highestRarity = getHighRarity(idCarte);
        
        var wrapTmp = document.createElement('div');
        wrapTmp.appendChild(creerHTMLCarte(c, 'collection', { overrideRarete: highestRarity }));
        
        var rList = ['commune','rare','epique','legendaire','fusion'];
        var rPrices = { commune: 10, rare: 50, epique: 200, legendaire: 1000, fusion: 2000 };

        var rowsHtml = rList.map(function(r) {
            var possede = coll[r];
            var maxCopies = (r === 'legendaire' || r === 'epique' || r === 'fusion') ? 1 : 2;
            var prix = rPrices[r];
            var prixV = prix / 2;
            var dansDeck = modeDeckbuilder ? tempDeckCartes.filter(function(x) { return x.id === idCarte && x.rarete === r; }).length : 0;
            
            var deckBtns = '';
            if(modeDeckbuilder && deckEnEdition !== null) {
                deckBtns = '<button onclick="window.ajouterAuDeck(\'' + idCarte + '\', \'' + r + '\')" ' + (dansDeck >= possede || dansDeck >= maxCopies || tempDeckCartes.length >= 20 ? 'disabled' : '') + '>+ Deck</button>' +
                           '<button onclick="window.retirerDuDeck(\'' + idCarte + '\', \'' + r + '\')" ' + (dansDeck <= 0 ? 'disabled' : '') + '>- Deck</button>';
            }

            return '<div class="rarity-row">' +
                '<div>' +
                    '<div class="r-name ' + r + '">' + r.toUpperCase() + '</div>' +
                    '<div style="font-size:12px; color:var(--texte-doux)">Possédé : ' + possede + ' ' + (modeDeckbuilder && dansDeck>0 ? '(Dans deck: ' + dansDeck + ')' : '') + '</div>' +
                '</div>' +
                '<div class="r-actions-col">' +
                    '<div class="r-actions">' +
                        '<button onclick="window.acheterCarte(\'' + idCarte + '\',\'' + r + '\', ' + prix + ')" ' + (profil.coins < prix || possede >= maxCopies ? 'disabled' : '') + '>Acheter (-' + prix + '💰)</button>' +
                        '<button class="btn-sell" onclick="window.vendreCarte(\'' + idCarte + '\',\'' + r + '\', ' + prixV + ')" ' + (possede <= 0 ? 'disabled' : '') + '>Vendre (+' + prixV + '💰)</button>' +
                    '</div>' +
                    (deckBtns ? '<div class="r-actions" style="margin-top:4px;">' + deckBtns + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join('');

        content.innerHTML = '<div class="detail-panel-left" style="pointer-events:none;">' + wrapTmp.innerHTML + '</div>' +
            '<div class="detail-panel-right">' +
                '<h3 style="font-size:24px; text-align:center; color:var(--laiton-clair); margin-top:0;">' + c.prenom + '</h3>' +
                (modeDeckbuilder && deckEnEdition !== null ? '<h4 style="text-align:center; color:var(--laiton-clair); margin:0 0 10px;">Édition de : ' + mesDecks[deckEnEdition].nom + ' (' + tempDeckCartes.length + '/20)</h4>' : '') +
                rowsHtml +
            '</div>';
        ajusterTextes(content);
    }
    
    window.acheterCarte = function(id, r, prix) {
        if (profil.coins >= prix) {
            profil.coins -= prix; 
            collectionJoueur[id][r]++;
            sauvegarderProgression(); render(); 
            if(modeDeckbuilder) trierDeckbuilder(triCourant); 
            else afficherBoutique(triCourant);
            afficherDeckEnCours();
        }
    };
    
    window.vendreCarte = function(id, r, prix) {
        if (collectionJoueur[id][r] > 0) {
            var inDeckCount = tempDeckCartes.filter(function(x) { return x.id === id && x.rarete === r; }).length;
            if (inDeckCount > 0 && collectionJoueur[id][r] <= inDeckCount) {
                if(!confirm("Cette carte est dans ton deck actif. La vendre la retirera du deck. Continuer ?")) return;
                window.retirerDuDeck(id, r);
            }
            collectionJoueur[id][r]--; profil.coins += prix;
            sauvegarderProgression(); render(); 
            if(modeDeckbuilder) trierDeckbuilder(triCourant); 
            else afficherBoutique(triCourant);
            afficherDeckEnCours();
        }
    };
    
    window.ajouterAuDeck = function(id, r) {
        if (tempDeckCartes.length < 20) {
            tempDeckCartes.push({id: id, rarete: r}); 
            render(); afficherDeckEnCours(); trierDeckbuilder(triCourant);
        }
    };
    
    window.retirerDuDeck = function(id, r) {
        var idx = tempDeckCartes.map(function(x) { return x.id+'_'+x.rarete; }).lastIndexOf(id+'_'+r);
        if (idx >= 0) {
            tempDeckCartes.splice(idx, 1); render(); afficherDeckEnCours(); trierDeckbuilder(triCourant);
        }
    };

    render();
    var modal = document.getElementById('card-detail-overlay');
    if(modal) modal.classList.add('open');
}

function fermerDetailCarte() { 
    var m = document.getElementById('card-detail-overlay');
    if (m) m.classList.remove('open');
}

function afficherDeckEnCours() {
    var grid = document.getElementById('deck-grid'); grid.innerHTML = ''; document.getElementById('deck-count').innerText = tempDeckCartes.length;
    
    var compte = {}; 
    tempDeckCartes.forEach(function(c) {
        var key = c.id + '_' + c.rarete;
        compte[key] = (compte[key] || 0) + 1;
    });

    Object.keys(compte).sort(function(k1, k2) {
        var c1 = defCarte(k1.split('_')[0]), c2 = defCarte(k2.split('_')[0]);
        return c1.cout - c2.cout || c1.prenom.localeCompare(c2.prenom);
    }).forEach(function(key) {
        var id = key.split('_')[0], r = key.split('_')[1];
        var c = defCarte(id);
        var div = document.createElement('div'); div.className = 'mini-card'; 
        div.style.borderLeftColor = 'var(--r-' + (r === 'fusion' ? 'fusion' : r) + ')';
        
        var possede = collectionJoueur[id] ? collectionJoueur[id][r] : 0;
        var checkPossede = possede >= compte[key];
        
        if(!checkPossede) {
            div.classList.add('manquante');
        }

        div.innerHTML = '<span class="mc-cost">' + c.cout + '</span><span class="mc-name">' + c.prenom + ' (' + r.charAt(0).toUpperCase() + ')</span><span class="mc-qty">×' + compte[key] + '</span>';
        div.onclick = function() { window.retirerDuDeck(id, r); }; 
        grid.appendChild(div);
    });
    var curve = document.getElementById('mana-curve'), seuils = [0,1,2,3,4,5,6,7,8];
    var vals = seuils.map(function(s) { return tempDeckCartes.filter(function(c) { return (s === 8 ? defCarte(c.id).cout >= 8 : defCarte(c.id).cout === s); }).length; });
    var max = Math.max.apply(null, [1].concat(vals));
    if(curve) curve.innerHTML = seuils.map(function(s, i) { return '<div class="curve-col"><div class="curve-bar" style="height:' + ((vals[i] / max) * 38) + 'px"></div>' + (s === 8 ? '8+' : s) + '</div>'; }).join('');
}

function sauvegarderDeck() {
    if (deckEnEdition === null) return;
    mesDecks[deckEnEdition].nom = document.getElementById('deck-name-input').value.trim() || 'Sans nom'; 
    mesDecks[deckEnEdition].cartes = tempDeckCartes.slice();
    sauvegarderProgression(); chargerListeDecks(); 
    flashInfo(tempDeckCartes.length === 20 ? 'Deck enregistré.' : 'Deck incomplet (' + tempDeckCartes.length + '/20).');
}

function chargerDropdownDecks() {
    var sel = document.getElementById('deck-select'); 
    if(!sel) return;
    sel.innerHTML = '';
    mesDecks.forEach(function(d, i) { 
        var owned = calculerCartesPossedeesPourDeck(d.cartes);
        var isComplete = owned >= 20;
        if(isComplete) {
            var o = document.createElement('option'); o.value = i; 
            o.innerText = d.nom;
            sel.appendChild(o); 
        }
    });
}

function flashInfo(txt) {
    var d = document.createElement('div'); d.className = 'fx-banniere'; d.style.fontSize = '18px'; d.style.top = '14%'; d.textContent = txt; document.getElementById('fx-layer').appendChild(d); setTimeout(function() { d.remove(); }, 1500);
}

/* ---------- 8. Boosters ---------- */
function preparerBooster() {
    if (profil.coins < 50) { alert("Il te faut 50 💰 pour ouvrir un booster. Tu en as " + profil.coins + "."); return; }
    profil.coins -= 50; sauvegarderProgression();
    var pack = document.getElementById('pack'), res = document.getElementById('booster-results'), btn = document.getElementById('btn-again');
    btn.classList.add('hidden'); res.innerHTML = ''; pack.classList.add('opening');
    setTimeout(function() {
        pack.classList.remove('opening'); pack.classList.add('hidden');
        for (var i = 0; i < 5; i++) {
            var r = Math.random(); var rarete;
            if (r > 0.98) rarete = 'fusion'; else if (r > 0.93) rarete = 'legendaire'; else if (r > 0.82) rarete = 'epique'; else if (r > 0.58) rarete = 'rare'; else rarete = 'commune';
            var pool = dbCartes.filter(function(c) { return c.rarete === rarete; }); var carte = hasard(pool); 
            initColl(carte.id);
            var nouveau = collectionJoueur[carte.id][rarete] === 0;
            collectionJoueur[carte.id][rarete]++;
            
            var el = creerHTMLCarte(carte, 'booster', { nouveau: nouveau, overrideRarete: rarete }); 
            el.classList.add('flipped'); el.style.animationDelay = (i * 0.07) + 's';
            el.onclick = (function(el, rarete, carte) {
                return function() {
                    if (el.classList.contains('flipped')) { el.classList.remove('flipped'); if (rarete === 'legendaire' || rarete === 'epique' || rarete === 'fusion') el.classList.add('reveal-' + (rarete === 'fusion' ? 'legendaire' : rarete)); if (res.querySelectorAll('.flipped').length === 0) btn.classList.remove('hidden'); }
                    else zoomCarte(null, carte.id);
                };
            })(el, rarete, carte);
            res.appendChild(el);
        }
        sauvegarderProgression(); ajusterTextes(res);
    }, 520);
}

/* ---------- 9. Lancement de partie ---------- */
function initialiserPartie(botStart) {
    partieFinie = false; selection = null; ciblage = null;
    J.manaMax = 0; J.manaActuel = 0; J.numTour = 0; J.cimetiere = [];
    B.manaMax = 0; B.manaActuel = 0; B.numTour = 0; B.cimetiere = [];
    document.getElementById('action-log').innerHTML = '';
    J.premier = !botStart; B.premier = botStart;
    tourActuel = botStart ? 'bot' : 'joueur';
    for (var k = 0; k < 4; k++) piocher(B, 1);
    for (var k = 0; k < 4; k++) if (J.deck.length) J.main.push(J.deck.shift());
}

function lancerPartie() {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false;
    var i = document.getElementById('deck-select').value;
    if(!i || !mesDecks[i]) return flashInfo("Aucun deck valide.");
    J = nouveauCote('J', J.nom || 'Toi'); B = nouveauCote('B', 'Bot');
    document.getElementById('hero-name').innerText = J.nom;
    var opp = document.getElementById('opp-name'); if (opp) opp.innerText = 'Bot';
    
    J.deck = mesDecks[i].cartes.map(function(c) {
        var id = typeof c === 'string' ? c : c.id;
        var rarete = typeof c === 'string' ? defCarte(id).rarete : c.rarete;
        return instancier(defCarte(id), 'J', false, rarete);
    }); melanger(J.deck);
    
    B.deck = hasard(decksPreconstruits).cartes.map(function(c) {
        var id = typeof c === 'string' ? c : c.id;
        var rarete = typeof c === 'string' ? defCarte(id).rarete : c.rarete;
        return instancier(defCarte(id), 'B', false, rarete);
    }); melanger(B.deck);
    
    initialiserPartie(Math.random() > 0.5); changerEcran('game-screen'); rafraichirJeu(); ouvrirMulligan();
}

function lancerPartieMultijoueur(pseudoAdversaire, monDeckIds, advDeckIds) {
    modeEnLigne = true; modeAttente = false; mulliganValide = false; modeTuto = false;
    _dernierIdTraite = 0; _compteurAction = 0; _replayEnCours = false;
    J = nouveauCote('J', J.nom || 'Toi'); B = nouveauCote('B', pseudoAdversaire || 'Adversaire');
    document.getElementById('hero-name').innerText = J.nom;
    var opp = document.getElementById('opp-name'); if (opp) opp.innerText = pseudoAdversaire || 'Adversaire';
    
    J.deck = monDeckIds.map(function(c) {
        var id = typeof c === 'string' ? c : c.id;
        var rarete = typeof c === 'string' ? defCarte(id).rarete : c.rarete;
        return instancier(defCarte(id), 'J', false, rarete);
    }); melanger(J.deck);
    
    var deckAdv = (Array.isArray(advDeckIds) && advDeckIds.length === 20) ? advDeckIds : hasard(decksPreconstruits).cartes;
    B.deck = deckAdv.map(function(c) {
        var id = typeof c === 'string' ? c : c.id;
        var rarete = typeof c === 'string' ? defCarte(id).rarete : c.rarete;
        return instancier(defCarte(id), 'B', false, rarete);
    }); melanger(B.deck);
    
    initialiserPartie(false); tourActuel = 'attente'; changerEcran('game-screen'); rafraichirJeu(); ouvrirMulligan();
}

/* ---------- 10. Tuto Interactif NOUVELLE VERSION ---------- */
function majTutoUI() {
    [1,2,3,4,5].forEach(function(lvl) {
        var btn = document.getElementById('btn-tuto-' + lvl);
        if (btn) {
            if(profil['tuto_' + lvl]) {
                btn.style.background = 'linear-gradient(180deg, var(--menthe), #1c8f60)';
                btn.innerText = btn.innerText.replace('Gain:', '✅ Fait - Gain:');
            }
        }
    });
}

function lancerTuto(niveau) {
    modeEnLigne = false; modeAttente = false; mulliganValide = true; modeTuto = true; 
    currentTutoLevel = niveau; etapeTuto = 0;
    
    J = nouveauCote('J', 'Toi'); B = nouveauCote('B', 'Prof. Tuto');
    document.getElementById('hero-name').innerText = 'Toi'; document.getElementById('opp-name').innerText = 'Professeur Tuto';
    partieFinie = false; selection = null; ciblage = null; document.getElementById('action-log').innerHTML = '';
    
    J.premier = true; B.premier = false;
    J.manaMax = 10; J.manaActuel = 10; J.numTour = 1; J.cimetiere = [];
    B.manaMax = 10; B.manaActuel = 0; B.numTour = 0; B.cimetiere = [];
    tourActuel = 'joueur';

    if(niveau === 1) { 
        J.manaMax = 3; J.manaActuel = 3;
        J.main.push(instancier(defCarte('m6'), 'J')); // Coute 2
        J.main.push(instancier(defCarte('m3'), 'J')); // Coute 4
        J.deck = ['s1'].map(function(id){return instancier(defCarte(id),'J')});
        B.deck = ['n4'].map(function(id){return instancier(defCarte(id),'B')});
        document.getElementById('player-mana').classList.add('mana-highlight-text');
        lancerBulleTuto("Étape 1 : Le Mana.\nRegarde ton Mana (en bleu). Tu as 3 Cristaux.\nTu ne peux pas jouer Meriem (Coût: 4).\n👉 Joue Anness (Coût: 2) sur le terrain !");
    } else if (niveau === 2) { 
        J.main.push(instancier(defCarte('m8'), 'J')); 
        J.deck = ['s1'].map(function(id){return instancier(defCarte(id),'J')});
        B.deck = ['n4'].map(function(id){return instancier(defCarte(id),'B')});
        lancerBulleTuto("Étape 2 : L'attaque & Charge.\nCertaines cartes ont 'Charge' et peuvent attaquer tout de suite.\n👉 Pose Channel, clique dessus, puis attaque le héros adverse !");
    } else if (niveau === 3) { 
        B.plateau.push(instancier(defCarte('n6'), 'B')); 
        J.main.push(instancier(defCarte('s22'), 'J')); 
        J.main.push(instancier(defCarte('m5'), 'J')); 
        J.deck = ['s1'].map(function(id){return instancier(defCarte(id),'J')});
        B.deck = ['n4'].map(function(id){return instancier(defCarte(id),'B')});
        lancerBulleTuto("Étape 3 : Provocation 🛡️.\nL'adversaire te bloque. \n👉 Utilise ton sort (Machine à laver) pour détruire sa carte, puis pose et attaque !");
    } else if (niveau === 4) {
        J.plateau.push(instancier(defCarte('c2'), 'J')); 
        J.main.push(instancier(defCarte('c9'), 'J')); 
        J.deck = ['s1'].map(function(id){return instancier(defCarte(id),'J')});
        B.deck = ['n4'].map(function(id){return instancier(defCarte(id),'B')});
        lancerBulleTuto("Étape 4 : Effets & Rage 🔥.\nLes cartes interagissent entre elles.\n👉 Joue 'Bagarre de cousins' pour blesser ta créature et déclencher sa Rage (+2 ATK, Charge). Puis attaque !");
    } else if (niveau === 5) {
        J.plateau.push(instancier(defCarte('ka5'), 'J')); 
        J.plateau.push(instancier(defCarte('ka6'), 'J')); 
        J.main.push(instancier(defCarte('f1'), 'J')); 
        J.deck = ['s1'].map(function(id){return instancier(defCarte(id),'J')});
        B.deck = ['n4'].map(function(id){return instancier(defCarte(id),'B')});
        lancerBulleTuto("Étape 5 : La Fusion Ultime 💑.\n👉 Tu as les 2 cartes requises sur le terrain.\nClique sur la carte Fusion 'Naila x Nassim' dans ta main !");
    }
    
    changerEcran('game-screen'); rafraichirJeu();
}

function lancerBulleTuto(texte, showBtn) {
    var bulle = document.getElementById('tuto-bubble');
    document.getElementById('tuto-text').innerText = texte;
    if(showBtn) {
        document.getElementById('btn-tuto-next').classList.remove('hidden');
    } else {
        document.getElementById('btn-tuto-next').classList.add('hidden');
    }
    bulle.classList.remove('hidden');
}

function etapeTutoSuivante() {
    if(etapeTuto === 99) { 
        document.getElementById('tuto-bubble').classList.add('hidden');
        changerEcran('tuto-screen');
    }
}

function validerEtapeTuto() {
    if(!modeTuto) return;
    if (currentTutoLevel === 1 && etapeTuto === 0 && J.plateau.length > 0) {
        etapeTuto = 1; terminerTuto(1, 500, "Parfait ! Tu as compris la gestion du Mana.");
    }
    if (currentTutoLevel === 2 && etapeTuto === 0 && J.plateau.length > 0) {
        etapeTuto = 1; lancerBulleTuto("Maintenant, clique dessus puis sur le héros adverse pour attaquer !", false);
    }
    if (currentTutoLevel === 2 && etapeTuto === 1 && B.patience < 20) {
        etapeTuto = 2; terminerTuto(2, 500, "BOOM ! C'est la base de l'attaque.");
    }
    if (currentTutoLevel === 3 && etapeTuto === 0 && B.plateau.length === 0) {
        etapeTuto = 1; lancerBulleTuto("La voie est libre ! Pose Marouane et attaque le héros adverse !", false);
    }
    if (currentTutoLevel === 3 && etapeTuto === 1 && B.patience < 20) {
        etapeTuto = 2; terminerTuto(3, 500, "Bien joué ! Toujours lire les effets des cartes ennemies.");
    }
    if (currentTutoLevel === 4 && etapeTuto === 0 && J.plateau.some(function(m){return m.id==='c2' && m.vie < m.vieMax})) {
        etapeTuto = 1; lancerBulleTuto("Regarde, ta carte s'est illuminée ! Frappe l'adversaire avec toute sa puissance !", false);
    }
    if (currentTutoLevel === 4 && etapeTuto === 1 && B.patience < 20) {
        etapeTuto = 2; terminerTuto(4, 500, "Excellent. C'est l'art des combos.");
    }
    if (currentTutoLevel === 5 && etapeTuto === 0 && J.plateau.some(function(m){return m.rarete==='fusion'})) {
        etapeTuto = 1; terminerTuto(5, 0, "Incroyable ! Tu maitrises la Fusion.", true);
    }
}

function terminerTuto(niveau, gainCoins, message, gainCarteSpeciale) {
    document.getElementById('player-mana').classList.remove('mana-highlight-text');
    var msgSupp = "";
    if (!profil['tuto_'+niveau]) {
        profil.coins += gainCoins;
        if(gainCarteSpeciale) {
            initColl('m1');
            collectionJoueur['m1']['legendaire']++;
            msgSupp = "\n🎁 Tu as gagné : 1x Farid (Légendaire) !";
        } else {
            msgSupp = "\n🪙 Tu as gagné : " + gainCoins + " 💰 !";
        }
        profil['tuto_'+niveau] = true;
        sauvegarderProgression();
    } else {
        msgSupp = "\n(Tu as déjà récupéré la récompense).";
    }
    
    etapeTuto = 99; 
    lancerBulleTuto(message + msgSupp, true);
}

/* ---------- Mulligan ---------- */
function ouvrirMulligan() {
    if(modeTuto) return;
    var zone = document.getElementById('mulligan-cards'); zone.innerHTML = '';
    J.main.forEach(function(c) { var el = creerHTMLCarte(c, 'main'); el.onclick = function() { el.classList.toggle('rejetee'); }; zone.appendChild(el); });
    ajusterTextes(zone); document.getElementById('mulligan-overlay').classList.add('open');
    clearTimeout(_timerMulligan);
}
function validerMulligan(auto) {
    clearTimeout(_timerMulligan);
    var zone = document.getElementById('mulligan-cards'), cartes = Array.from(zone.children);
    var indices = auto ? [] : cartes.map(function(el, i) { return el.classList.contains('rejetee') ? i : -1; }).filter(function(i) { return i >= 0; });
    var rejetees = indices.map(function(i) { return J.main[i]; }), remplacantes = [];
    for (var k = 0; k < indices.length; k++) if (J.deck.length) remplacantes.push(J.deck.shift());
    indices.slice().reverse().forEach(function(i) { J.main.splice(i, 1); }); J.main.push.apply(J.main, remplacantes); J.deck.push.apply(J.deck, rejetees); melanger(J.deck);
    document.getElementById('mulligan-overlay').classList.remove('open');
    if (modeEnLigne) { mulliganValide = true; info('En attente de l\'adversaire…'); if (typeof signalerMulliganPret === 'function') signalerMulliganPret(); return; }
    if (tourActuel === 'joueur') debutTourJoueur(); else jouerTourBot();
}

function afficherAttente(titre, texte) { var ov = document.getElementById('attente-overlay'), t = document.getElementById('attente-titre'), x = document.getElementById('attente-texte'); if (t) t.innerText = titre || 'En attente…'; if (x) x.innerText = texte || ''; if (ov) ov.classList.add('open'); }
function fermerAttente() { var ov = document.getElementById('attente-overlay'); if (ov) ov.classList.remove('open'); }
function melanger(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(getSyncRandom() * (i + 1)); var temp = a[i]; a[i] = a[j]; a[j] = temp; } }

/* ---------- Helpers ---------- */
function elOf(uid) { return document.querySelector('[data-uid="' + uid + '"]'); }
function elHero(side) { return document.querySelector(side === J ? '.hero-panel.you' : '.hero-panel.opp'); }
function fxDepuisRect(rect, texte, type) {
    if (!rect) return; var d = document.createElement('div'); d.className = 'fx-nombre ' + type; d.textContent = texte; d.style.left = (rect.left + rect.width / 2) + 'px'; d.style.top = (rect.top + rect.height / 3) + 'px';
    document.getElementById('fx-layer').appendChild(d); setTimeout(function() { d.remove(); }, 1000);
}
function fxSur(m, texte, type) { var el = elOf(m.uid); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function fxSurHero(side, texte, type) { var el = elHero(side); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function banniere(texte) { var d = document.createElement('div'); d.className = 'fx-banniere'; d.textContent = texte; document.getElementById('fx-layer').appendChild(d); setTimeout(function() { d.remove(); }, 1500); }
function secouer(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function buff(m, a, v) { m.atk += a; m.vie += v; m.vieMax += v; fxSur(m, '+' + a + '/+' + v, 'buff'); }
function fraper(cible, n) { if (!cible) return; if (cible.uid) appliquerDegatsCreature(cible, n); else degatsHero(cible, n); }

function appliquerDegatsCreature(m, n) {
    m.vie -= n; fxSur(m, '-' + Math.min(n, 99), 'degat'); secouer(elOf(m.uid));
    var p = POUVOIRS[m.id];
    if (p && p.blesse && !m.silence && m.vie > 0) p.blesse({ moi: m.cote === 'J' ? J : B, ennemi: m.cote === 'J' ? B : J, source: m });
}
function degatsHero(side, n) { side.patience -= n; fxSurHero(side, '-' + n, 'degat'); secouer(elHero(side)); var f = document.createElement('div'); f.className = 'hit-flash'; document.body.appendChild(f); setTimeout(function() { f.remove(); }, 460); }
function soinHero(side, n) { var avant = side.patience; side.patience = Math.min(30, side.patience + n); if (side.patience > avant) fxSurHero(side, '+' + (side.patience - avant), 'soin'); }
function soigner(cible, n) { if (!cible) return; if (cible.uid) soinCreature(cible, n); else soinHero(cible, n); }
function transformerEn(m, nom, atk, vie, emoji, motsCles) { m.prenom = nom; m.emoji = emoji; m.atk = atk; m.vie = vie; m.vieMax = vie; m.motsCles = motsCles || []; m.silence = true; m.auraAtk = 0; m.desc = 'Transformé.'; fxSur(m, emoji, 'buff'); }

function soinCreature(m, n) { var avant = m.vie; m.vie = Math.min(m.vieMax, m.vie + n); if (m.vie > avant) fxSur(m, '+' + (m.vie - avant), 'soin'); }
function invoquerJeton(side, nom, atk, vie, emoji, motsCles) { if (side.plateau.length >= 5) return; var faux = { id:'jeton_' + nom, prenom:nom, famille:'Neutre', cout:0, atk:atk, vie:vie, rarete:'commune', desc:'Jeton invoqué.', motsCles:motsCles || [], emoji:emoji }; var inst = instancier(faux, side.cle, true); inst.malade = true; side.plateau.push(inst); }
function piocher(side, n) { for (var i = 0; i < n; i++) { if (side.pioceBloquee) { side.pioceBloquee = false; fxSurHero(side, 'Pioche bloquée', 'degat'); continue; } if (!side.deck.length) { degatsHero(side, 3); continue; } if (side.main.length >= 8) { side.deck.shift(); continue; } side.main.push(side.deck.shift()); } }
function piocherType(side, famille) { var i = side.deck.findIndex(function(c) { return c.famille === famille; }); if (i >= 0 && side.main.length < 8) side.main.push(side.deck.splice(i, 1)[0]); }
function piocherAleatoire(side) { if (!side.deck.length || side.main.length >= 8) return; var i = Math.floor(getSyncRandom() * side.deck.length); side.main.push(side.deck.splice(i, 1)[0]); }
function defausseAleatoire(side) { if (!side.main.length) return; var i = Math.floor(getSyncRandom() * side.main.length); side.main.splice(i, 1); }
function renvoyerEnMain(m, proprio) { proprio.plateau = proprio.plateau.filter(function(x) { return x !== m; }); if (proprio.main.length < 8 && !m.jeton) proprio.main.push(instancier(defCarte(m.id), proprio.cle)); }
function silencer(m) { m.silence = true; m.motsCles = []; m.desc = 'Réduit au silence.'; m.auraAtk = 0; fxSur(m, 'Silence', 'buff'); }
function transformer(m) { transformerEn(m, 'Paire de chaussettes', 1, 1, '🧦', []); m.desc = 'Ce n\'était vraiment pas le cadeau espéré.'; }
function echangeDegats(a, b) { appliquerDegatsCreature(b, atkTot(a)); appliquerDegatsCreature(a, atkTot(b)); }

function recalcAuras() {
    [J, B].forEach(function(side) {
        var ennemi = side === J ? B : J;
        side.plateau.forEach(function(m) {
            var bonusAtk = 0, bonusVie = 0;
            if (!m.silence) {
                if (m.id === 'k3' && m.vie < m.vieMax) bonusAtk += 3;
                if (m.id === 'm3') { var n = ennemi.plateau.filter(function(x) { return x.famille === 'Marouf'; }).length; bonusAtk += n; bonusVie += n; }
            }
            var t = side.terrain;
            if (t) {
                if (t.id === 't1' && estChat(m)) { bonusAtk += 1; bonusVie += 1; }
                if (t.id === 't2' && m.motsCles.includes('Provocation')) bonusVie += 2;
                if (t.id === 't4' && ['Meridja','Marouf','Kerkache','Belgacemi'].includes(m.famille)) bonusAtk += 1;
            }
            m.auraAtk = bonusAtk; var delta = bonusVie - m.auraVieAppliquee;
            if (delta !== 0) { m.vie += delta; m.vieMax += delta; m.auraVieAppliquee = bonusVie; }
        });
    });
}
function coutEffectif(side, c) { var cout = c.cout; if (side.terrain && side.terrain.id === 't1' && estChat(c)) cout -= 1; if (side.terrain && side.terrain.id === 'c12' && c.famille === 'Cousins') cout -= 1; cout += side.surcout; return Math.max(0, cout); }

function nettoyerMorts() {
    [J, B].forEach(function(side) {
        side.plateau.filter(function(m) { return m.vie <= 0; }).forEach(function(m) {
            var el = elOf(m.uid); if (el) el.classList.add('meurt');
            ajouterLog(m.emoji, "Mort : " + m.prenom, side);
            side.cimetiere.push({id: m.id, rarete: m.rarete});
            var p = POUVOIRS[m.id]; if (p && p.destruction && !m.silence) p.destruction({ moi:side, ennemi:autre(side), source:m });
        });
        side.plateau = side.plateau.filter(function(m) { return m.vie > 0; });
    });
}

function fusionsPossibles(side, carteEnMain) {
    var recettes = FUSION_DE[carteEnMain.id]; if (!recettes) return [];
    return recettes.filter(function(r) {
        var compos = FUSIONS[r.fusion];
        return compos.every(function(id) { return side.plateau.some(function(m) { return m.id === id; }) || side.main.some(function(m) { return m.id === id && m !== carteEnMain; }); });
    }).map(function(r) { return r.fusion; });
}

function animerFusion(cartesSacrifiees) {
    var layer = document.getElementById('fx-layer');
    var vortex = document.createElement('div');
    vortex.className = 'fx-fusion-vortex';
    layer.appendChild(vortex);
    
    cartesSacrifiees.forEach(function(uid) {
        var el = elOf(uid);
        if(el) {
            el.style.transition = 'all 0.8s cubic-bezier(0.5, 0, 0.5, 1)';
            el.style.transform = 'translateY(-100px) scale(0) rotate(720deg)';
            el.style.opacity = '0';
        }
    });

    setTimeout(function() { vortex.remove(); }, 1500);
}

function sacrifierPourFusion(side, fusionId) {
    var compos = FUSIONS[fusionId];
    var uidsSacrifies = [];
    compos.forEach(function(id) {
        var idxPlat = side.plateau.findIndex(function(m) { return m.id === id; });
        if (idxPlat >= 0) { uidsSacrifies.push(side.plateau[idxPlat].uid); side.plateau.splice(idxPlat, 1); }
        else { var idxMain = side.main.findIndex(function(m) { return m.id === id; }); if (idxMain >= 0) { uidsSacrifies.push(side.main[idxMain].uid); side.main.splice(idxMain, 1); } }
    });
    return uidsSacrifies;
}

/* ---------- Envoi temps réel Firebase ---------- */
function pousserAction(action) {
    if (!modeEnLigne || !window.multiPartie || !window.multiPartie.active || !monRole || typeof fbDB === 'undefined' || !fbDB) return;
    _compteurAction++; var id = Date.now() * 1000 + _compteurAction;
    fbDB.ref('salles/' + window.multiPartie.partieId + '/queue/' + id).set({ id: id, par: monPseudo, role: monRole, action: action, ts: Date.now() });
}

/* ---------- Jouer une carte ---------- */
function clicCarteMain(index) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur' && !modeEnLigne && !modeTuto) return;
    if (ciblage) return;
    
    var c = J.main[index]; if (!c) return;

    if (modeTuto && currentTutoLevel === 1) {
        if(c.id === 'm6') validerEtapeTuto();
        else return flashInfo("Suis le tutoriel : Joue Anness !");
    }
    if (modeTuto && currentTutoLevel === 2 && c.id === 'm8') { validerEtapeTuto(); }

    if (c.rarete === 'fusion') {
        var dispo = fusionsPossibles(J, c);
        if (!dispo.length) return info('Cartes requises manquantes (plateau ou main).');
        if (J.manaActuel < coutEffectif(J, c)) return info('Pas assez de mana.');
        if (J.plateau.length < 2) return info('Pas de place sur le terrain.');
        pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null });
        var uids = sacrifierPourFusion(J, c.id); 
        animerFusion(uids);
        setTimeout(function(){ jouerCarte(J, index, null); }, 1000);
        return;
    }

    var cout = coutEffectif(J, c);
    if (J.manaActuel < cout) return info('Pas assez de mana.');
    if (c.famille !== 'Sort' && c.famille !== 'Terrain' && J.plateau.length >= 5) return info('Ton plateau est plein (5 créatures).');

    var p = POUVOIRS[c.id];
    if (p && p.cible) {
        var cibles = ciblesValides(J, p.cible);
        if (cibles.length) {
            demarrerCiblage(p.cible, cibles, function(cible) {
                var idxCible = null, campCible = null;
                if (cible && cible.uid) { campCible = cible.cote; idxCible = (cible.cote === 'J' ? J : B).plateau.indexOf(cible); }
                pousserAction({ type:'jouer', id:c.id, idxCible:idxCible, campCible:campCible, cibleHero: (cible===J||cible===B)?cible.cle:null }); jouerCarte(J, index, cible);
            });
            return;
        }
    }
    
    pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null }); jouerCarte(J, index, null);
}

function ciblesValides(side, spec) {
    var ennemi = side === J ? B : J; var liste = [];
    if (spec.camp === 'ennemi') liste = ennemi.plateau.slice(); else if (spec.camp === 'allie') liste = side.plateau.slice(); else liste = side.plateau.concat(ennemi.plateau);
    liste = liste.filter(function(m) { if ((m.cote === 'J' ? J : B) === side) return true; var pl = (m.cote === 'J' ? J : B).plateau, i = pl.indexOf(m), protege = [pl[i - 1], pl[i + 1]].some(function(v) { return v && v.id === 'k1' && !v.silence; }); return !protege; });
    if (spec.filtre) liste = liste.filter(spec.filtre); if (spec.hero) liste.push(spec.camp === 'allie' ? side : ennemi); return liste;
}
function demarrerCiblage(spec, cibles, resoudre) { ciblage = { spec:spec, cibles:cibles, resoudre:resoudre }; document.getElementById('targeting-banner').classList.add('open'); document.querySelector('#targeting-banner').firstChild.textContent = (spec.texte || 'Choisis une cible') + ' '; rafraichirJeu(); }
function annulerCiblage() { if (!ciblage) return; ciblage = null; document.getElementById('targeting-banner').classList.remove('open'); rafraichirJeu(); }
function choisirCible(cible) { if (!ciblage) return; if (!ciblage.cibles.includes(cible)) return; var r = ciblage.resoudre; ciblage = null; document.getElementById('targeting-banner').classList.remove('open'); r(cible); }

function jouerCarte(side, index, cible) {
    var c = side.main[index]; if (!c) return;
    var cout = coutEffectif(side, c); if (side.manaActuel < cout) return;
    side.manaActuel -= cout; side.main.splice(index, 1);
    
    ajouterLog(c.emoji, side.nom + " joue " + c.prenom, side);

    var ennemi = side === J ? B : J, p = POUVOIRS[c.id];
    if (c.famille === 'Sort') {
        animerSort(c, function() {});
        if (ennemi.contreSort) { ennemi.contreSort = false; info(c.prenom + " est annulé par Islem !"); banniere('Sort annulé'); }
        else if (p && p.jouer) { p.jouer({ moi:side, ennemi:ennemi, source:c, cible:cible }); info(c.prenom + " lancé."); }
        side.cimetiere.push({id: c.id, rarete: c.rarete});
    } else if (c.famille === 'Terrain') {
        if(side.terrain) side.cimetiere.push({id: side.terrain.id, rarete: side.terrain.rarete});
        side.terrain = c; if (p && p.jouer) p.jouer({ moi:side, ennemi:ennemi, source:c, cible:cible }); info("Terrain " + c.prenom + " en jeu.");
    } else {
        c.malade = !c.motsCles.includes('Charge'); c.aAttaque = false; side.plateau.push(c);
        if (p && p.jouer) p.jouer({ moi:side, ennemi:ennemi, source:c, cible:cible }); info(c.prenom + " entre en jeu.");
    }
    
    recalcAuras(); nettoyerMorts(); setTimeout(function() { rafraichirJeu(); verifierFin(); validerEtapeTuto(); }, 60);
}

function animerSort(c, apres) {
    var el = creerHTMLCarte(c, 'jeu');
    el.style.position = 'fixed'; el.style.left = '50%'; el.style.top = '42%'; el.style.transform = 'translate(-50%,-50%) scale(1.1)'; el.style.zIndex = 960; el.style.transition = 'opacity .5s, transform .5s'; el.style.pointerEvents = 'none';
    document.getElementById('fx-layer').appendChild(el); ajusterTextes(el);
    setTimeout(function() { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(1.5) rotate(8deg)'; }, 420); setTimeout(function() { el.remove(); if (apres) apres(); }, 950);
}

/* ---------- Combat ---------- */
function clicCreatureAlliee(m) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur' && !modeEnLigne && !modeTuto) return;
    if (ciblage) return choisirCible(m);
    
    if (m.gele > 0) return info(m.prenom + " est endormi."); if (m.malade) return info(m.prenom + " ne peut pas encore attaquer."); if (m.aAttaque) return info(m.prenom + " a déjà attaqué."); if (atkTot(m) <= 0) return info(m.prenom + " n'a pas d'attaque.");
    selection = (selection === m) ? null : m; info(selection ? m.prenom + " prêt : choisis une cible ennemie." : 'Sélection annulée.'); rafraichirJeu();
}
function clicCreatureEnnemie(m) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(m); if (tourActuel !== 'joueur' || !selection) return;
    var provocations = B.plateau.filter(function(x) { return x.motsCles.includes('Provocation'); }); if (provocations.length && !m.motsCles.includes('Provocation')) return info('Tu dois d\'abord attaquer une Provocation.');
    attaquer(selection, m);
}
function clicHeroAdverse() {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(B); if (tourActuel !== 'joueur' || !selection) return;
    if (B.plateau.some(function(x) { return x.motsCles.includes('Provocation'); })) return info('Une Provocation protège l\'adversaire.');
    attaquer(selection, B);
}

async function attaquer(attaquant, cible) {
    if (modeEnLigne && attaquant.cote === 'J' && !attaquant._replay) {
        var idxCible = null, campCible = null; if (cible.uid) { campCible = cible.cote; idxCible = (cible.cote === 'J' ? J : B).plateau.indexOf(cible); }
        pousserAction({ type:'attaque', idxAttaquant: J.plateau.indexOf(attaquant), idxCible:idxCible, campCible:campCible, cibleHero: cible.uid ? null : cible.cle });
    }

    ajouterLog('⚔', attaquant.prenom + " attaque", attaquant.cote === 'J' ? J : B);

    var elA = elOf(attaquant.uid), elC = cible.uid ? elOf(cible.uid) : elHero(cible); selection = null;
    if (elA && elC) {
        var a = elA.getBoundingClientRect(), b = elC.getBoundingClientRect(); var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        elA.style.transition = 'transform .16s cubic-bezier(.4,0,.6,1)'; elA.style.zIndex = 60; elA.style.transform = 'translate(' + (dx * 0.55) + 'px, ' + (dy * 0.55) + 'px) scale(1.05)'; await pause(170);
    }

    if (cible.uid) echangeDegats(attaquant, cible); else degatsHero(cible, atkTot(attaquant));
    attaquant.aAttaque = true;
    if (elA) { elA.style.transform = ''; await pause(140); }
    
    recalcAuras(); nettoyerMorts(); await pause(260); rafraichirJeu(); verifierFin(); validerEtapeTuto();
}

/* ---------- Tours ---------- */
function prochainManaMax(side) {
    side.numTour++; if (side.numTour === 1) side.manaMax = side.premier ? 2 : 3; else side.manaMax = Math.min(10, side.manaMax + 1); side.manaActuel = side.manaMax;
}
function debutTourJoueur() {
    if (partieFinie) return;
    tourActuel = 'joueur'; modeAttente = false; selection = null; fermerAttente();
    document.getElementById('tour-indicateur').innerText = 'Ton tour'; document.querySelector('.turn-pill').classList.remove('bot'); document.getElementById('btn-endturn').classList.remove('inactif');
    prochainManaMax(J); J.plateau.forEach(function(m) { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
    piocher(J, 1); banniere('À toi de jouer');
    if (!modeEnLigne && !modeTuto) demarrerTimer();
    recalcAuras(); rafraichirJeu(); verifierFin();
}
function finDeTour() {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur') return;
    
    if (modeTuto && etapeTuto === 3) etapeTutoSuivante();

    annulerCiblage(); clearInterval(timer); appliquerFinDeTour(J);
    if (partieFinie) return; J.surcout = 0; if (J.voitMainAdverse > 0) J.voitMainAdverse--;

    if (modeEnLigne) {
        pousserAction({ type: 'fin' }); modeAttente = true; tourActuel = 'bot';
        document.getElementById('tour-indicateur').innerText = 'Tour adverse'; document.querySelector('.turn-pill').classList.add('bot'); document.getElementById('btn-endturn').classList.add('inactif'); info('L\'adversaire réfléchit...');
        prochainManaMax(B); B.plateau.forEach(function(m) { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; }); piocher(B, 1); rafraichirJeu();
    } else if (!modeTuto) {
        jouerTourBot();
    }
}
function appliquerFinDeTour(side) {
    var ennemi = side === J ? B : J;
    side.plateau.forEach(function(m) { var p = POUVOIRS[m.id]; if (p && p.finTour && !m.silence) p.finTour({ moi:side, ennemi:ennemi, source:m }); });
    [J, B].forEach(function(s) { if (s.terrain) { var p = POUVOIRS[s.terrain.id]; if (p && p.finTourGlobal) p.finTourGlobal(); } });
    recalcAuras(); nettoyerMorts(); rafraichirJeu(); verifierFin();
}
function demarrerTimer() {
    if (modeEnLigne || modeTuto) return;
    tempsRestant = 60; clearInterval(timer); majTimer(); timer = setInterval(function() { tempsRestant--; majTimer(); if (tempsRestant <= 0) { clearInterval(timer); finDeTour(); } }, 1000);
}
function majTimer() { document.getElementById('timer-count').innerText = tempsRestant + 's'; document.getElementById('timer-fill').style.width = (tempsRestant / 60 * 100) + '%'; document.querySelector('.timer').classList.toggle('urgent', tempsRestant <= 10); }

async function jouerTourBot() {
    if (modeEnLigne || modeTuto) return;
    if (partieFinie) return;
    tourActuel = 'bot'; selection = null; clearInterval(timer);
    document.getElementById('tour-indicateur').innerText = 'Tour du bot'; document.querySelector('.turn-pill').classList.add('bot'); document.getElementById('btn-endturn').classList.add('inactif'); banniere('Tour du bot');

    prochainManaMax(B); B.plateau.forEach(function(m) { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; }); piocher(B, 1); rafraichirJeu(); await pause(700);

    var action = true;
    while (action && !partieFinie) {
        action = false;
        var jouables = B.main.map(function(c, i) { return { c: c, i: i }; }).filter(function(o) {
            if (o.c.rarete === 'fusion') return fusionsPossibles(B, o.c).length > 0 && coutEffectif(B, o.c) <= B.manaActuel;
            return coutEffectif(B, o.c) <= B.manaActuel && (o.c.famille === 'Sort' || o.c.famille === 'Terrain' || B.plateau.length < 5);
        }).sort(function(a, b) { return b.c.cout - a.c.cout; });
            
        if (jouables.length) {
            var choix = jouables[0];
            if (choix.c.rarete === 'fusion') { sacrifierPourFusion(B, choix.c.id); jouerCarte(B, choix.i, null); }
            else { var p = POUVOIRS[choix.c.id]; var cible = null; if (p && p.cible) cible = choisirCibleBot(p.cible, ciblesValides(B, p.cible)); jouerCarte(B, choix.i, cible); }
            action = true; await pause(750);
        }
    }
    await pause(300);
    for (var i = 0; i < B.plateau.length; i++) {
        var m = B.plateau[i];
        if (partieFinie) break;
        if (m.aAttaque || m.malade || m.gele > 0 || atkTot(m) <= 0) continue;
        var provocations = J.plateau.filter(function(x) { return x.motsCles.includes('Provocation'); }); var cibleAtk;
        if (provocations.length) cibleAtk = provocations[0]; else if (J.plateau.length && Math.random() > 0.45) cibleAtk = J.plateau.slice().sort(function(a, b) { return atkTot(b) - atkTot(a); })[0]; else cibleAtk = J;
        await attaquer(m, cibleAtk); await pause(280);
    }
    if (partieFinie) return;
    appliquerFinDeTour(B); B.surcout = 0; if (B.voitMainAdverse > 0) B.voitMainAdverse--;
    if (partieFinie) return; document.getElementById('btn-endturn').classList.remove('inactif'); await pause(400); debutTourJoueur();
}
function choisirCibleBot(spec, cibles) {
    if (!cibles.length) return null; var creatures = cibles.filter(function(c) { return c.uid; });
    if (spec.camp === 'allie') return creatures.sort(function(a, b) { return (b.vieMax - b.vie) - (a.vieMax - a.vie) || atkTot(b) - atkTot(a); })[0] || cibles[0];
    if (creatures.length) return creatures.sort(function(a, b) { return atkTot(b) - atkTot(a); })[0];
    return cibles[0];
}

function verifierFin() {
    if (partieFinie) return;
    if (J.patience <= 0 || B.patience <= 0) {
        partieFinie = true; clearInterval(timer);
        var gagne = B.patience <= 0 && J.patience > 0; enregistrerResultat(gagne); banniere(gagne ? 'Victoire !' : 'Défaite…');
        var bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
        if (bfNav) bfNav.hidden = true; if (bfIn) bfIn.hidden = true;
        var attente = document.getElementById('attente-overlay'); if (attente) attente.classList.remove('open');
        setTimeout(function() { changerEcran('menu-screen'); }, 2200);
    }
}
function info(txt) { document.getElementById('combat-info').innerText = txt; }

/* ---------- Rendu ---------- */
function rafraichirJeu() {
    recalcAuras();
    document.getElementById('player-mana').innerText = J.manaActuel + '/' + J.manaMax; document.getElementById('player-health').innerText = J.patience; document.getElementById('player-deck').innerText = J.deck.length; document.getElementById('player-grave-count').innerText = J.cimetiere.length;
    document.getElementById('opp-mana').innerText = B.manaActuel + '/' + B.manaMax; document.getElementById('opp-health').innerText = B.patience; document.getElementById('opp-hand').innerText = B.main.length; document.getElementById('opp-grave-count').innerText = B.cimetiere.length;

    var cr = document.getElementById('crystals'); cr.innerHTML = '';
    for (var i = 0; i < Math.max(J.manaMax, J.manaActuel); i++) { var d = document.createElement('div'); d.className = 'crystal' + (i < J.manaActuel ? ' plein' : ''); cr.appendChild(d); }

    var oh = document.getElementById('opp-hand-cards'); oh.innerHTML = '';
    if (J.voitMainAdverse > 0) { B.main.forEach(function(c) { var el = creerHTMLCarte(c, 'jeu'); el.style.setProperty('--cw', '72px'); el.oncontextmenu = function(e) { e.preventDefault(); zoomCarte(e, c.id); }; el.ondblclick = function(e) { e.stopPropagation(); zoomCarte(e, c.id); }; oh.appendChild(el); }); }
    else { B.main.forEach(function() { var d = document.createElement('div'); d.className = 'mini-back'; oh.appendChild(d); }); }

    ['player-terrain', 'opp-terrain'].forEach(function(id, k) {
        var zone = document.getElementById(id); zone.innerHTML = ''; var side = k === 0 ? J : B;
        if (side.terrain) { var el = creerHTMLCarte(side.terrain, 'jeu'); el.oncontextmenu = function(e) { e.preventDefault(); zoomCarte(e, side.terrain.id); }; el.ondblclick = function(e) { e.stopPropagation(); zoomCarte(e, side.terrain.id); }; zone.appendChild(el); }
    });

    var pj = document.getElementById('player-board'); pj.innerHTML = '';
    J.plateau.forEach(function(m) {
        var el = creerHTMLCarte(m, 'jeu');
        if (m === selection) el.classList.add('selection'); else if (!m.malade && !m.aAttaque && m.gele === 0 && atkTot(m) > 0 && tourActuel === 'joueur') el.classList.add('pret');
        if (m.aAttaque || m.malade) el.classList.add('epuise'); if (m.gele > 0) el.classList.add('gelee'); if (m.silence) el.classList.add('silencieuse'); if (ciblage && ciblage.cibles.includes(m)) el.classList.add('ciblable');
        el.onclick = function() { clicCreatureAlliee(m); }; el.oncontextmenu = function(e) { e.preventDefault(); if (!m.jeton) zoomCarte(e, m.id); }; el.ondblclick = function(e) { e.stopPropagation(); if (!m.jeton) zoomCarte(e, m.id); }; pj.appendChild(el);
    });

    var pb = document.getElementById('opponent-board'); pb.innerHTML = '';
    B.plateau.forEach(function(m) {
        var el = creerHTMLCarte(m, 'jeu');
        if (m.gele > 0) el.classList.add('gelee'); if (m.silence) el.classList.add('silencieuse'); if (ciblage && ciblage.cibles.includes(m)) el.classList.add('ciblable'); else if (selection) el.classList.add('ciblable');
        el.onclick = function() { clicCreatureEnnemie(m); }; el.oncontextmenu = function(e) { e.preventDefault(); if (!m.jeton) zoomCarte(e, m.id); }; el.ondblclick = function(e) { e.stopPropagation(); if (!m.jeton) zoomCarte(e, m.id); }; pb.appendChild(el);
    });

    var heroOpp = elHero(B); heroOpp.classList.toggle('ciblable', !!(selection || (ciblage && ciblage.cibles.includes(B)))); heroOpp.onclick = clicHeroAdverse;
    elHero(J).onclick = function() { if (ciblage && ciblage.cibles.includes(J)) choisirCible(J); };

    var main = document.getElementById('player-hand'); main.innerHTML = '';
    J.main.forEach(function(c, i) {
        var cout = coutEffectif(J, c); var el = creerHTMLCarte(c, 'main', { cout: cout });
        var placePlateau = c.famille === 'Sort' || c.famille === 'Terrain' || J.plateau.length < 5;
        if (c.rarete === 'fusion') placePlateau = J.plateau.length >= 2 && fusionsPossibles(J, c).length > 0;
        var peutJouer = tourActuel === 'joueur' && !modeAttente;
        if (peutJouer && J.manaActuel >= cout && placePlateau) el.classList.add('jouable'); else el.classList.add('injouable');
        el.onclick = function() { clicCarteMain(i); }; el.oncontextmenu = function(e) { e.preventDefault(); zoomCarte(e, c.id); }; el.ondblclick = function(e) { e.stopPropagation(); zoomCarte(e, c.id); }; main.appendChild(el);
    });
    ajusterChevauchementMain(); ajusterTextes(document.getElementById('game-screen'));
}

function ajusterChevauchementMain() {
    var rail = document.querySelector('.hand-rail'), main = document.getElementById('player-hand'), n = J.main.length; if (!rail || n === 0) return;
    var cw = parseFloat(getComputedStyle(main.querySelector('.card-wrapper') || main).width) || 200; var marge = 12;
    if (n > 1) { var dispo = rail.clientWidth - 70; marge = (dispo - cw) / (n - 1) - cw; marge = Math.max(-cw * 0.46, Math.min(12, marge)); } main.style.setProperty('--chevauchement', marge + 'px');
}
window.addEventListener('resize', function() { if (document.getElementById('game-screen').classList.contains('active')) ajusterChevauchementMain(); });

/* ---------- DÉMARRAGE SÉCURISÉ ---------- */
document.addEventListener('DOMContentLoaded', function() {
    try {
        var estMobile = ('ontouchstart' in window) && (navigator.maxTouchPoints > 0) && (window.matchMedia('(pointer: coarse)').matches) && (window.innerWidth <= 1366);
        if (estMobile) {
            var appliquerOrientation = function() { var enPortrait = window.matchMedia('(orientation: portrait)').matches; document.body.classList.toggle('force-portrait', enPortrait); if (!enPortrait) setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 200); };
            appliquerOrientation(); window.addEventListener('resize', appliquerOrientation); window.addEventListener('orientationchange', function() { setTimeout(appliquerOrientation, 200); }); setTimeout(appliquerOrientation, 500); setTimeout(appliquerOrientation, 1200);
            
            var timerAppui = null, dernierElement = null, deplacement = false, startX = 0, startY = 0, DUREE = 500, TOLERANCE = 12;
            var trouverIdCarte = function(cible) { if (!cible) return null; var wrapper = cible.closest && cible.closest('.card-wrapper'); if (wrapper) { var nom = wrapper.querySelector('.card-name'); if (nom) { var def = dbCartes.find(function(c) { return c.prenom === nom.textContent.trim(); }); if (def) return def.id; } } var zoomBtn = cible.closest && cible.closest('.zoom-btn'); if (zoomBtn) { var m = (zoomBtn.getAttribute('onclick') || '').match(/'([^']+)'/); if (m) return m[1]; } return null; };
            document.addEventListener('touchstart', function(e) { var t = e.touches[0]; if (!t) return; deplacement = false; startX = t.clientX; startY = t.clientY; dernierElement = e.target; clearTimeout(timerAppui); timerAppui = setTimeout(function() { if (deplacement) return; var id = trouverIdCarte(dernierElement); if (id) { if (navigator.vibrate) navigator.vibrate(15); zoomCarte(null, id); } }, DUREE); }, { passive: true });
            document.addEventListener('touchmove', function(e) { var t = e.touches[0]; if (!t) return; if (Math.abs(t.clientX - startX) > TOLERANCE || Math.abs(t.clientY - startY) > TOLERANCE) { deplacement = true; clearTimeout(timerAppui); } }, { passive: true });
            document.addEventListener('touchend', function() { clearTimeout(timerAppui); }, { passive: true }); document.addEventListener('touchcancel', function() { clearTimeout(timerAppui); }, { passive: true });
            document.addEventListener('contextmenu', function(e) { if (e.target && e.target.closest && e.target.closest('.card-wrapper')) e.preventDefault(); });
        }
    } catch(e) {}
});

function declarerForfait() {
    if (partieFinie) return; if (!document.getElementById('game-screen').classList.contains('active')) return flashInfo('Tu n\'es pas en combat.'); if (!confirm('Déclarer forfait ? Tu perdras cette partie.')) return;
    partieFinie = true; clearInterval(timer); annulerCiblage(); selection = null; enregistrerResultat(false); banniere('Forfait… Défaite'); info('Tu as déclaré forfait. Retour au menu…');
    if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    var bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame'); if (bfNav) bfNav.hidden = true; if (bfIn) bfIn.hidden = true;
    var attente = document.getElementById('attente-overlay'); if (attente) attente.classList.remove('open'); setTimeout(function() { changerEcran('menu-screen'); }, 2000);
}
