/* ===========================================================
   FAMILLE TCG — moteur de jeu (Édition Ultime v5)
   =========================================================== */

var collectionJoueur = {};
var mesDecks = [];
var profil = {
    coins: 0,
    deckStart: false,
    lastLogin: 0,
    tuto_1:false, tuto_2:false, tuto_3:false, tuto_4:false,
    tuto_5:false, tuto_6:false, tuto_7:false,
    avatar: '🧑',
    codeAmi: null,
    amis: [],
    demandesAmisRecues: [],
    demandesAmisEnvoyees: [],
    deckParDefaut: null,
    decksSupprimes: [],
    statsDecks: {},
    statsCartes: {},
    messagesAmi: {}
};
var deckEnEdition = null;
var tempDeckCartes = [];
var triCourant = 'famille';

var tourActuel = 'joueur', timer = null, tempsRestant = 60, selection = null, ciblage = null, partieFinie = false, uidSeq = 1;
var modeEnLigne = false, modeAttente = false, mulliganValide = false;
var modeTuto = false, etapeTuto = 0, currentTutoLevel = 0;
var _dernierIdTraite = 0, _compteurAction = 0, _replayEnCours = false;
var stats = { parties:0, victoires:0, defaites:0 };
var _timerMulligan = null;
var _syncSeed = 12345;
var _tutoInterval = null;
var _deckUtiliseEnCours = null;
var _sortieAutorisee = false;
window.appPret = false;

var cartesBannies = [];

/* ---------- 1. Base de cartes ---------- */
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
    C('k3','Farid K.','Kerkache',5,5,6,'epique','Tant qu\'il est blessé, gagne +3 en attaque.',[],'👨🏽'),
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

    C('f1','Naila x Nassim','Nouvelle famille',8,7,7,'fusion','Fusion : nécessite Naila et Nassim. Cri de guerre : inflige 4 dégâts.',[],'💑'),
    C('f2','Amina x Marouane','Nouvelle famille',8,6,8,'fusion','Fusion : nécessite Amina et Marouane. Cri de guerre : donne +3/+3 aux autres.',[],'💑'),
    C('f3','Ines x Islem','Nouvelle famille',9,8,8,'fusion','Fusion : nécessite Inès et Islem. Cri de guerre : annule le prochain sort.',[],'💑'),
    C('f4','Toufik x Manel','Nouvelle famille',7,5,9,'fusion','Fusion : nécessite Toufik et Manel. Provocation.',['Provocation'],'💑'),
    C('f5','Safya x Saad','Nouvelle famille',8,7,7,'fusion','Fusion : nécessite Safya et Saad. Cri de guerre : invoque Hanna.',[],'💑'),

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

    /* =========================================================
       CARTE ULTRA RARE — UNIFIÉE (4 familles, foil doré)
       Mana 1 / Force 1 / Vie 1 / Sans effet
       Drop 2× plus rare qu'une légendaire
       ========================================================= */
    C('u1','La Famille Unie','Famille Unifiée',1,1,1,'unifiee','L\'union sacrée des quatre familles. Une force minuscule, mais un symbole éternel.',[],'👨‍👩‍👧‍👦')
];

var parId = {};
dbCartes.forEach(function(c) { parId[c.id] = c; });
function defCarte(id) { return parId[id]; }

function getSyncRandom() {
    if (!modeEnLigne) return Math.random();
    _syncSeed = (_syncSeed * 9301 + 49297) % 233280;
    return _syncSeed / 233280;
}

var FUSIONS = { 'f1': ['ka5','ka6'], 'f2': ['m4','m5'], 'f3': ['ma3','ma4'], 'f4': ['ka7','ka8'], 'f5': ['ka3','ka4'] };
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

    k1:{mode:'infini',aura:true}, k2:{mode:'infini',finTour:({moi})=>soinHero(moi,3)}, k3:{mode:'infini',aura:true},
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

    f1:{mode:'eclair',jouer:({ennemi})=>{for(let i=0;i<4;i++){const c=hasard(ennemi.plateau);if(c)fraper(c,1);else degatsHero(ennemi,1);}}},
    f2:{mode:'eclair',jouer:({moi,source})=>moi.plateau.filter(m=>m!==source).forEach(m=>buff(m,3,3))},
    f3:{mode:'eclair',jouer:({moi})=>{moi.contreSort=true;piocher(moi,1);}},
    f4:{mode:'eclair',jouer:({moi})=>{soinHero(moi,5);}},
    f5:{mode:'eclair',jouer:({moi})=>{if(!moi.plateau.some(m=>m.id==='ka11'))invoquerJeton(moi,'Hanna',3,2,'👧🏻',[]);}},

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
    { nom:'Kerkache Défense',cartes:['k1','k2','k3','k4','k4','k5','k5','k6','k6','k7','k7','k8','k8','k9','k10','s2','s5','s6','s11','s18'] },
    { nom:'Belgacemi Synergie', cartes:['ka1','ka2','ka3','ka4','ka5','ka5','ka6','ka6','ka7','ka7','ka8','ka8','ka9','ka9','ka10','ka10','n1','n2','s15','ka11'] },
    { nom:'Les Infiltrés', cartes:['f1','f2','f3','f4','f5','ka5','ka6','m4','m5','ma3','ma4','ka7','ka8','ka3','ka4','m11','m12','ma11','ka11','n7'] },
    { nom:'Alliance des Cousins', cartes:['c7','c7','c4','c4','c9','c9','c3','c3','c12','c12','c6','c6','c5','c5','c10','c10','c2','c11','c8','c1'] }
];

var decksPreconstruits = decksPreconstruitsBrut.map(function(d) {
    return {
        nom: d.nom,
        cartes: d.cartes.map(function(id) { return { id: id, rarete: defCarte(id) ? defCarte(id).rarete : 'commune' }; })
    };
});

/* ---------- Helpers Collection ---------- */
function initColl(id) {
    if (!collectionJoueur[id] || typeof collectionJoueur[id] === 'number') {
        const defR = defCarte(id) ? defCarte(id).rarete : 'commune';
        const oldQty = typeof collectionJoueur[id] === 'number' ? collectionJoueur[id] : 0;
        collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0, unifiee:0 };
        collectionJoueur[id][defR] = oldQty;
    }
    if (collectionJoueur[id].unifiee === undefined) collectionJoueur[id].unifiee = 0;
}
function getTot(id) {
    initColl(id);
    const c = collectionJoueur[id];
    return c.commune + c.rare + c.epique + c.legendaire + c.fusion + c.unifiee;
}
function getHighRarity(id) {
    initColl(id);
    const o = ['unifiee','fusion','legendaire','epique','rare','commune'];
    for (let i = 0; i < o.length; i++) { if (collectionJoueur[id][o[i]] > 0) return o[i]; }
    return defCarte(id) ? defCarte(id).rarete : 'commune';
}

function formatCoins(c) { return c >= 999999 ? '∞' : c; }

function majTopBarCoins() {
    const el = document.getElementById('nav-coins');
    if (el) el.innerText = formatCoins(profil.coins) + " 💰";
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

/* ---------- Sauvegarde ---------- */
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

    if (typeof collectionJoueur === 'object' && collectionJoueur !== null) {
        for (let id in collectionJoueur) {
            if (typeof collectionJoueur[id] === 'number') {
                let oldVal = collectionJoueur[id];
                let defR = defCarte(id) ? defCarte(id).rarete : 'commune';
                collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0, unifiee:0 };
                collectionJoueur[id][defR] = oldVal;
            }
            if (collectionJoueur[id].unifiee === undefined) collectionJoueur[id].unifiee = 0;
        }
    } else {
        collectionJoueur = {};
    }

    if (!Array.isArray(mesDecks)) mesDecks = [];
    mesDecks.forEach(d => {
        if (!d.cartes) d.cartes = [];
        d.cartes = d.cartes.map(c => {
            if (typeof c === 'string') {
                let def = defCarte(c);
                return def ? { id: c, rarete: def.rarete } : null;
            }
            if (c && c.id && defCarte(c.id)) {
                if (!c.rarete) c.rarete = defCarte(c.id).rarete;
                return c;
            }
            return null;
        }).filter(c => c !== null);
    });

    const decksPersonnalises = mesDecks.filter(d => !d.base);
    const decksPreconstruitsActuels = decksPreconstruits
        .filter(dp => !profil.decksSupprimes.includes(dp.nom))
        .map(dp => ({
            nom: dp.nom,
            cartes: dp.cartes.map(c => ({ ...c })),
            base: true
        }));
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
            collectionJoueur[c.id].fusion = 10;
            collectionJoueur[c.id].unifiee = 10;
        });
    }

    const maintenant = Date.now();
    if (maintenant - profil.lastLogin > 86400000) {
        if (email !== 'nassim57132@gmail.com') profil.coins += 50;
        profil.lastLogin = maintenant;
        flashInfo("🎁 Bonus quotidien : +50 💰 !");
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
                lastSeen: Date.now()
            });
        } catch(e) {}
    }
    majTopBarCoins();
}

/* ---------- Choix starter ---------- */
function ouvrirChoixStarter() {
    const ov = document.getElementById('starter-overlay');
    if (ov) ov.classList.add('open');
}

function choisirStarter(famille) {
    const ov = document.getElementById('starter-overlay');
    if (ov) ov.classList.remove('open');

    const famillesDeBase = ['Meridja', 'Marouf', 'Kerkache', 'Belgacemi'];
    let familleChoisie = famille;
    let auto = false;
    if (!familleChoisie) {
        familleChoisie = famillesDeBase[Math.floor(Math.random() * famillesDeBase.length)];
        auto = true;
    }

    const precon = decksPreconstruits.find(d => d.nom.includes(familleChoisie));
    const compte = {};
    precon.cartes.forEach(c => {
        const id = typeof c === 'string' ? c : c.id;
        compte[id] = (compte[id] || 0) + 1;
    });
    Object.entries(compte).forEach(([id, qte]) => {
        initColl(id);
        const rarete = defCarte(id) ? defCarte(id).rarete : 'commune';
        collectionJoueur[id][rarete] = (collectionJoueur[id][rarete] || 0) + qte;
    });

    profil.deckStart = true;
    profil.coins += 100;
    if (!profil.deckParDefaut) profil.deckParDefaut = precon.nom;

    sauvegarderProgression();
    majTopBarCoins();
    setTimeout(() => {
        alert(`🎉 Tu as choisi la famille ${familleChoisie}${auto ? ' (choix aléatoire)' : ''} !\n\nTu as reçu son deck complet + 100 💰.\nDeck par défaut : ${precon.nom}`);
    }, 300);
}

function calculerCartesPossedeesPourDeck(cartesDeck) {
    let owned = 0;
    let tempColl = {};
    for (let id in collectionJoueur) {
        if (collectionJoueur[id] && typeof collectionJoueur[id] === 'object') {
            tempColl[id] = { ...collectionJoueur[id] };
        }
    }
    cartesDeck.forEach(c => {
        const id = typeof c === 'string' ? c : c.id;
        if (!id || !defCarte(id)) return;
        initColl(id);
        const rDefaut = defCarte(id).rarete;
        const rDemande = (typeof c === 'string') ? rDefaut : (c.rarete || rDefaut);
        if (tempColl[id] && tempColl[id][rDemande] && tempColl[id][rDemande] > 0) {
            owned++; tempColl[id][rDemande]--; return;
        }
        const raretes = ['commune','rare','epique','legendaire','fusion','unifiee'];
        for (const r of raretes) {
            if (tempColl[id] && tempColl[id][r] && tempColl[id][r] > 0) {
                owned++; tempColl[id][r]--; return;
            }
        }
    });
    return owned;
}

function nouveauCote(cle, nom) { return { cle:cle, nom:nom, patience:20, manaActuel:0, manaMax:0, main:[], plateau:[], deck:[], terrain:null, surcout:0, contreSort:false, voitMainAdverse:0, pioceBloquee:false, numTour:0, premier:false, cimetiere:[] }; }

var J = nouveauCote('J', 'Toi'), B = nouveauCote('B', 'Bot');

const autre = s => (s === J ? B : J);
const hasard = a => (a && a.length ? a[Math.floor(getSyncRandom() * a.length)] : null);
const pause = ms => new Promise(r => setTimeout(r, ms));
const atkTot = m => Math.max(0, m.atk + (m.auraAtk || 0));
const estChat = m => m.motsCles.includes('Chat');

function instancier(def, cle, jeton, overrideRarete) {
    if (!def) return null;
    return { uid:'u'+(uidSeq++), id:def.id, prenom:def.prenom, famille:def.famille, cout:def.cout, atk:def.atk, vie:def.vie, vieMax:def.vie, rarete: overrideRarete || def.rarete, desc:def.desc, emoji:def.emoji, motsCles:[...def.motsCles], cote:cle, auraAtk:0, auraVieAppliquee:0, aAttaque:false, malade:true, gele:0, silence:false, jeton:!!jeton };
}

function recordCarteJouee(idCarte) {
    if (!idCarte) return;
    if (!profil.statsCartes) profil.statsCartes = {};
    profil.statsCartes[idCarte] = (profil.statsCartes[idCarte] || 0) + 1;
}
function recordDeckJoue(nomDeck) {
    if (!nomDeck) return;
    if (!profil.statsDecks) profil.statsDecks = {};
    profil.statsDecks[nomDeck] = (profil.statsDecks[nomDeck] || 0) + 1;
}

/* ---------- Navigation sécurisée ---------- */
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
    partieFinie = true;
    clearInterval(timer);
    annulerCiblage();
    selection = null;
    enregistrerResultat(false, modeEnLigne ? 'multi' : 'bot');
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
    if (nav) {
        if(id !== 'login-screen') nav.classList.remove('hidden');
        else nav.classList.add('hidden');
    }

    const bfNav = document.getElementById('btn-forfait');
    if (bfNav) bfNav.hidden = (id !== 'game-screen' || partieFinie || modeTuto);

    if (id === 'deckbuilder-screen') { chargerListeDecks(); }
    if (id === 'collection-screen') { afficherBoutique(triCourant); }
    if (id === 'menu-screen') chargerDropdownDecks();
    if (id === 'profil-screen') afficherProfil();
    if (id === 'tuto-screen') majTutoUI();
    if (id === 'multi-screen' && typeof rafraichirJoueurs === 'function') rafraichirJoueurs();
    if (id === 'admin-screen') adminTab('actions');
}

function ouvrirAide() { const el = document.getElementById('aide-overlay'); if(el) el.classList.add('open'); }
function fermerAide() { const el = document.getElementById('aide-overlay'); if(el) el.classList.remove('open'); }

/* ---------- Rendu cartes ---------- */
function creerHTMLCarte(c, ctx, opts) {
    opts = opts || {};
    const w = document.createElement('div');
    w.className = 'card-wrapper';
    if (c.uid) w.dataset.uid = c.uid;
    if (c.rarete === 'unifiee') w.classList.add('unifiee');

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

    const displayRarete = opts.overrideRarete ? opts.overrideRarete : c.rarete;
    const rareteHtml = enJeu ? '' : `<div class="rarity-text ${displayRarete === 'unifiee' ? 'unifiee' : ''}">${displayRarete === 'unifiee' ? '✨ UNIFIÉE ✨' : displayRarete}</div>`;
    const clRarete = displayRarete === 'fusion' ? 'fusion' : (displayRarete === 'unifiee' ? 'unifiee' : displayRarete);

    const motsCles = c.motsCles.filter(k => k !== 'Chat');
    const kw = motsCles.length ? `<div class="keyword-row">${motsCles.map(k => `<span class="kw" data-kw="${k}">${k}</span>`).join('')}</div>` : '';
    const qty = (opts.qty !== undefined) ? `<div class="qty-badge">×${opts.qty}</div>` : '';
    const loupe = (ctx === 'collection' || ctx === 'booster') ? `<div class="zoom-btn" onclick="zoomCarte(event,'${c.id}')">🔍</div>` : '';
    const tagDeck = opts.enDeck ? `<div class="nouveau-tag">Dans le deck ×${opts.enDeck}</div>` : '';
    const tagNeuf = opts.nouveau ? '<div class="nouveau-tag">Nouvelle</div>' : '';
    const coutAffiche = opts.cout !== undefined ? opts.cout : c.cout;
    const classeTexte = POUVOIRS[c.id] ? 'pouvoir' : 'lore';
    const clFamille = c.famille === 'Nouvelle famille' ? 'Nouvelle' : (c.famille === 'Famille Unifiée' ? 'Unifiee' : c.famille);

    w.innerHTML = `${qty}${loupe}${tagDeck}${tagNeuf}<div class="card-inner"><div class="card bg-${clFamille} border-${clRarete}"><div class="card-head"><div class="mana-gem">${coutAffiche}</div><div class="card-name">${c.prenom}</div>${badge}</div><div class="card-art">${c.emoji}</div><div class="faction-tag">${c.famille}</div><div class="card-text ${classeTexte}">${c.desc}</div>${kw}${pied}${rareteHtml}</div><div class="card-back">✦</div></div>`;

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
        if (card) {
            card.style.boxShadow = "0 0 15px var(--menthe), 0 .5em 1.4em rgba(0,0,0,.6)";
            card.style.filter = "saturate(1.2)";
        }
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

/* ---------- Boutique ---------- */
function afficherBoutique(critere) {
    triCourant = critere;
    const ordreRarete = { unifiee:0, fusion:1, legendaire:2, epique:3, rare:4, commune:5 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, 'Famille Unifiée':7, Neutre:8, Terrain:9, Sort:10 };
    const liste = dbCartesDispo();
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
        if (total === 0) {
            el.style.filter = "grayscale(1) brightness(0.4)";
            el.style.opacity = "0.8";
        }
        el.onclick = () => { ouvrirDetailCarte(c.id, false); };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}

/* ---------- Deckbuilder ---------- */
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
        const warnTag = isComplete
            ? '<span class="deck-ok">✓</span>'
            : `<span class="deck-warn">${owned}/20</span>`;
        const isDefault = profil.deckParDefaut === d.nom ? '<span style="color:var(--laiton);font-size:14px;">⭐</span>' : '';

        div.innerHTML = `<span class="di-texte">${d.nom}</span>${isDefault}${warnTag}${baseTag}${supprBtn}`;
        div.onclick = () => editerDeck(i);
        list.appendChild(div);
    });

    if (deckEnEdition === null && mesDecks.length) editerDeck(0);
    else { trierDeckbuilder(triCourant); afficherDeckEnCours(); }
}

function creerNouveauDeck() {
    mesDecks.push({ nom:'Nouveau deck perso', cartes:[], base:false });
    editerDeck(mesDecks.length - 1);
}

function supprimerDeck(i, event) {
    if (event) event.stopPropagation();
    const deck = mesDecks[i];
    if (!deck) return;

    const message = deck.base
        ? `⚠️ Ce deck est un deck OFFICIEL.\n\nLe supprimer définitivement ? Tu pourras le restaurer via le bouton « ↺ Restaurer decks officiels ».\n\nContinuer ?`
        : `Supprimer le deck « ${deck.nom} » ?`;

    if (!confirm(message)) return;

    if (deck.base) {
        if (!Array.isArray(profil.decksSupprimes)) profil.decksSupprimes = [];
        if (!profil.decksSupprimes.includes(deck.nom)) {
            profil.decksSupprimes.push(deck.nom);
        }
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

    if (manquants.length === 0) {
        return flashInfo('Tous les decks officiels sont déjà présents.');
    }

    if (!confirm(`Restaurer ${manquants.length} deck(s) officiel(s) manquant(s) ?`)) return;

    if (!Array.isArray(profil.decksSupprimes)) profil.decksSupprimes = [];

    manquants.forEach(dp => {
        profil.decksSupprimes = profil.decksSupprimes.filter(n => n !== dp.nom);
        mesDecks.push({
            nom: dp.nom,
            cartes: dp.cartes.map(c => ({ ...c })),
            base: true
        });
    });
    sauvegarderProgression();
    chargerListeDecks();
    flashInfo(`${manquants.length} deck(s) officiel(s) restauré(s).`);
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
        if (profil.deckParDefaut === mesDecks[i].nom) {
            btnDef.innerText = '⭐ Déjà par défaut';
            btnDef.disabled = true;
        } else {
            btnDef.innerText = '⭐ Définir par défaut';
            btnDef.disabled = false;
        }
    }

    trierDeckbuilder(triCourant);
    afficherDeckEnCours();
}

function trierDeckbuilder(critere) {
    triCourant = critere;
    const ordreRarete = { unifiee:0, fusion:1, legendaire:2, epique:3, rare:4, commune:5 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, 'Famille Unifiée':7, Neutre:8, Terrain:9, Sort:10 };
    const deckCourant = (deckEnEdition !== null && mesDecks[deckEnEdition]) ? mesDecks[deckEnEdition] : null;
    const estDeckOfficiel = deckCourant && deckCourant.base === true;

    // Titre dynamique
    const titre = document.getElementById('deckbuilder-title');
    if (titre) {
        titre.innerText = estDeckOfficiel ? 'Cartes du deck officiel' : 'Cartes du jeu';
    }

    // Si deck officiel : n'affiche QUE les cartes du deck (avec manquantes)
    // Sinon : affiche toutes les cartes
    let liste;
    if (estDeckOfficiel) {
        const idsUniques = [];
        deckCourant.cartes.forEach(c => {
            const id = typeof c === 'string' ? c : c.id;
            if (!idsUniques.includes(id)) idsUniques.push(id);
        });
        liste = idsUniques.map(id => defCarte(id)).filter(Boolean);
    } else {
        liste = dbCartesDispo();
    }

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

        const el = creerHTMLCarte(c, 'collection', {
            qty: total,
            overrideRarete: highestRarity,
            inDeck: dansDeck > 0,
            missing: manquante
        });

        if (!manquante && dispo <= 0 && dansDeck === 0) {
            el.style.filter = "grayscale(0.7) brightness(0.7)";
        }

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

        const rList = ['commune','rare','epique','legendaire','fusion','unifiee'];
        const rPrices = { commune: 10, rare: 50, epique: 200, legendaire: 1000, fusion: 2000, unifiee: 5000 };

        const totalDansDeck = tempDeckCartes.filter(x => x.id === idCarte).length;
        const maxDansDeck = 3;

        let rowsHtml = rList.map(r => {
            const possede = coll[r];
            const maxCopies = (r === 'unifiee' || r === 'fusion' || r === 'legendaire' || r === 'epique') ? 1 : 2;
            const prix = rPrices[r];
            const prixV = prix / 2;
            const dansDeck = modeDeckbuilder ? tempDeckCartes.filter(x => x.id === idCarte && x.rarete === r).length : 0;

            let deckBtns = '';
            if(modeDeckbuilder && deckEnEdition !== null) {
                const canAdd = totalDansDeck < maxDansDeck && dansDeck < possede && dansDeck < maxCopies && tempDeckCartes.length < 20;
                deckBtns = `
                    <button onclick="window.ajouterAuDeck('${idCarte}', '${r}')" ${canAdd ? '' : 'disabled'}>+ Deck</button>
                    <button onclick="window.retirerDuDeck('${idCarte}', '${r}')" ${dansDeck <= 0 ? 'disabled' : ''}>- Deck</button>
                `;
            }

            return `
            <div class="rarity-row">
                <div>
                    <div class="r-name ${r}">${r.toUpperCase()}</div>
                    <div style="font-size:12px; color:var(--texte-doux)">Possédé : ${possede} ${modeDeckbuilder && dansDeck>0 ? `(Dans deck: ${dansDeck})` : ''}</div>
                </div>
                <div class="r-actions-col">
                    <div class="r-actions">
                        <button onclick="window.acheterCarte('${idCarte}','${r}', ${prix})" ${profil.coins < prix || possede >= maxCopies ? 'disabled' : ''}>Acheter (-${prix}💰)</button>
                        <button class="btn-sell" onclick="window.vendreCarte('${idCarte}','${r}', ${prixV})" ${possede <= 0 ? 'disabled' : ''}>Vendre (+${prixV}💰)</button>
                    </div>
                    ${deckBtns ? `<div class="r-actions" style="margin-top:4px;">${deckBtns}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        const infoLimite = modeDeckbuilder
            ? `<div style="text-align:center;font-size:12px;color:var(--texte-doux);margin-bottom:8px;">Dans le deck : ${totalDansDeck}/3 (max 3 par carte, toutes raretés confondues)</div>`
            : '';

        content.innerHTML = `
            <div class="detail-panel-left" style="pointer-events:none;">
                ${wrapTmp.innerHTML}
            </div>
            <div class="detail-panel-right">
                <h3>${c.prenom}</h3>
                ${modeDeckbuilder && deckEnEdition !== null ? `<h4 style="text-align:center; color:var(--laiton-clair); margin:0 0 10px;">Édition de : ${mesDecks[deckEnEdition].nom} (${tempDeckCartes.length}/20)</h4>` : ''}
                ${infoLimite}
                ${rowsHtml}
            </div>
        `;
        ajusterTextes(content);
    }

    window.acheterCarte = function(id, r, prix) {
        if (profil.coins >= prix) {
            profil.coins -= prix;
            collectionJoueur[id][r]++;
            sauvegarderProgression();
            render();
            if(modeDeckbuilder) trierDeckbuilder(triCourant);
            else afficherBoutique(triCourant);
        }
    };

    window.vendreCarte = function(id, r, prix) {
        if (collectionJoueur[id][r] > 0) {
            const inDeckCount = tempDeckCartes.filter(x => x.id === id && x.rarete === r).length;
            if (inDeckCount > 0 && collectionJoueur[id][r] <= inDeckCount) {
                if(!confirm("Cette carte est dans ton deck actif. La vendre la retirera du deck. Continuer ?")) return;
                window.retirerDuDeck(id, r);
            }
            collectionJoueur[id][r]--;
            profil.coins += prix;
            sauvegarderProgression();
            render();
            if(modeDeckbuilder) trierDeckbuilder(triCourant);
            else afficherBoutique(triCourant);
        }
    };

    window.ajouterAuDeck = function(id, r) {
        if (tempDeckCartes.length >= 20) return;
        const totalDansDeck = tempDeckCartes.filter(x => x.id === id).length;
        if (totalDansDeck >= 3) {
            flashInfo('Max 3 exemplaires par carte (toutes raretés confondues).');
            return;
        }
        tempDeckCartes.push({id: id, rarete: r});
        render();
        afficherDeckEnCours();
        trierDeckbuilder(triCourant);
    };

    window.retirerDuDeck = function(id, r) {
        const idx = tempDeckCartes.map(x=>x.id+'_'+x.rarete).lastIndexOf(id+'_'+r);
        if (idx >= 0) {
            tempDeckCartes.splice(idx, 1);
            render();
            afficherDeckEnCours();
            trierDeckbuilder(triCourant);
        }
    };

    render();
    const ov = document.getElementById('card-detail-overlay');
    if (ov) ov.classList.add('open');
}

function fermerDetailCarte() {
    const m = document.getElementById('card-detail-overlay');
    if (m) m.classList.remove('open');
}
window.fermerDetailCarte = fermerDetailCarte;

function afficherDeckEnCours() {
    const grid = document.getElementById('deck-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const cnt = document.getElementById('deck-count');
    if (cnt) cnt.innerText = tempDeckCartes.length;

    const compte = {};
    tempDeckCartes.forEach(c => {
        const key = c.id + '_' + c.rarete;
        compte[key] = (compte[key] || 0) + 1;
    });

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
        div.style.borderLeftColor = `var(--r-${r === 'fusion' ? 'fusion' : (r === 'unifiee' ? 'unifiee' : r)})`;

        const possede = collectionJoueur[id] ? collectionJoueur[id][r] : 0;
        const checkPossede = possede >= compte[key];
        const clTextColor = checkPossede ? '' : 'color:var(--braise);';

        div.innerHTML = `<span class="mc-cost">${c.cout}</span><span class="mc-name" style="${clTextColor}">${c.prenom} (${r.charAt(0).toUpperCase()})</span><span class="mc-qty">×${compte[key]}</span>`;
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
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1500);
    }
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
            if (c) {
                const el = creerHTMLCarte(c, 'zoom', { overrideRarete: getHighRarity(carteId), nouveau: true });
                cardsEl.appendChild(el);
                ajusterTextes(cardsEl);
            }
        }
    }
    ov.classList.add('open');
}

function fermerReward() {
    const ov = document.getElementById('reward-overlay');
    if (ov) ov.classList.remove('open');
}

function afficherGainArgent(montant) {
    const d = document.createElement('div');
    d.className = 'fx-nombre argent';
    d.textContent = '+' + montant + ' 💰';
    d.style.left = '50%';
    d.style.top = '30%';
    const layer = document.getElementById('fx-layer');
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1000);
    }
}

/* ---------- Boosters avec Unifiée (2x plus rare que légendaire) ---------- */
function preparerBooster() {
    if (profil.coins < 50) { alert("Il te faut 50 💰 pour ouvrir un booster. Tu en as " + profil.coins + "."); return; }
    profil.coins -= 50;
    sauvegarderProgression();
    const pack = document.getElementById('pack'), res = document.getElementById('booster-results'), btn = document.getElementById('btn-again');
    if (!pack || !res || !btn) return;
    btn.classList.add('hidden');
    res.innerHTML = '';
    pack.classList.add('opening');
    setTimeout(() => {
        pack.classList.remove('opening');
        pack.classList.add('hidden');
        for (let i = 0; i < 5; i++) {
            const r = Math.random();
            let rarete;
            // Unifiée : 2x plus rare que légendaire.
            // Légendaire = r > 0.93 (7%) → Unifiée = r > 0.965 (3.5%)
            if (r > 0.965) rarete = 'unifiee';
            else if (r > 0.93) rarete = 'legendaire';
            else if (r > 0.82) rarete = 'epique';
            else if (r > 0.58) rarete = 'rare';
            else rarete = 'commune';

            const pool = dbCartesDispo().filter(c => c.rarete === rarete);
            const carte = hasard(pool);
            if (!carte) continue;
            initColl(carte.id);
            const nouveau = collectionJoueur[carte.id][rarete] === 0;
            collectionJoueur[carte.id][rarete]++;

            const el = creerHTMLCarte(carte, 'booster', { nouveau, overrideRarete: rarete });
            el.classList.add('flipped');
            el.style.animationDelay = (i * 0.07) + 's';
            el.onclick = () => {
                if (el.classList.contains('flipped')) {
                    el.classList.remove('flipped');
                    if (rarete === 'unifiee') el.classList.add('reveal-legendaire');
                    else if (rarete === 'legendaire' || rarete === 'epique') el.classList.add('reveal-' + rarete);
                    if (res.querySelectorAll('.flipped').length === 0) btn.classList.remove('hidden');
                } else {
                    zoomCarte(null, carte.id);
                }
            };
            res.appendChild(el);
        }
        sauvegarderProgression();
        ajusterTextes(res);
    }, 520);
}

/* ---------- Lancement ---------- */
function initialiserPartie(botStart) {
    partieFinie = false; selection = null; ciblage = null;
    J.manaMax = 0; J.manaActuel = 0; J.numTour = 0; J.cimetiere = [];
    B.manaMax = 0; B.manaActuel = 0; B.numTour = 0; B.cimetiere = [];
    const log = document.getElementById('action-log');
    if (log) log.innerHTML = '';
    J.premier = !botStart; B.premier = botStart;
    tourActuel = botStart ? 'bot' : 'joueur';
    for (let k = 0; k < 4; k++) piocher(B, 1);
    for (let k = 0; k < 4; k++) if (J.deck.length) J.main.push(J.deck.shift());
}

function lancerPartie() {
    modeEnLigne = false; modeAttente = false; mulliganValide = false; modeTuto = false;
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
        const rarete = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        return instancier(defCarte(id), 'J', false, rarete);
    }).filter(x => x);
    melanger(J.deck);

    const banned = window.cartesBannies || [];
    const decksDispo = decksPreconstruits.map(dp => ({
        nom: dp.nom,
        cartes: dp.cartes.filter(c => !banned.includes(typeof c === 'string' ? c : c.id))
    })).filter(dp => dp.cartes.length >= 20);
    const deckBot = hasard(decksDispo);
    B.deck = (deckBot ? deckBot.cartes : hasard(decksPreconstruits).cartes).map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        return instancier(defCarte(id), 'B', false, rarete);
    }).filter(x => x);
    melanger(B.deck);

    initialiserPartie(Math.random() > 0.5);
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
}

function lancerPartieMultijoueur(pseudoAdversaire, monDeckIds, advDeckIds) {
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

    J.deck = monDeckIds.map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        return instancier(defCarte(id), 'J', false, rarete);
    }).filter(x => x);
    melanger(J.deck);

    const deckAdv = (Array.isArray(advDeckIds) && advDeckIds.length === 20) ? advDeckIds : hasard(decksPreconstruits).cartes;
    B.deck = deckAdv.map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        return instancier(defCarte(id), 'B', false, rarete);
    }).filter(x => x);
    melanger(B.deck);

    initialiserPartie(false);
    tourActuel = 'attente';
    changerEcran('game-screen');
    rafraichirJeu();
    ouvrirMulligan();
}

/* ===========================================================
   TUTORIEL v3 — 7 étapes interactives
   =========================================================== */
var TUTO_ETAPES = {
    1: {
        titre: "Découvrir le plateau",
        etapes: [
            { txt: "Bienvenue à l'Académie ! 🎓<br><br>Voici ton plateau. En haut : l'adversaire. En bas : toi.<br><br>Chaque côté a un <b>héros</b> avec ses <b>points de patience</b> ❤ (c'est ta vie).", cible: ".side.opponent", autoNext: true },
            { txt: "Les <b>cristaux bleus</b> 💧 sous ton héros représentent ton mana. Il augmente de 1 à chaque tour.", cible: "#crystals", autoNext: true },
            { txt: "Tes cartes sont en bas : c'est ta <b>main</b>. Chaque carte affiche son coût en mana (chiffre bleu en haut à gauche), sa <b>force ⚔</b> et sa <b>vie ❤</b> en bas.", cible: "#player-hand", autoNext: true },
            { txt: "Le <b>cimetière</b> 💀 à droite du héros contient les cartes détruites. Clique dessus pour les voir !", cible: ".badge.deck", autoNext: true }
        ]
    },
    2: {
        titre: "Poser une carte",
        etapes: [
            { txt: "Tu as <b>3 mana</b>. Regarde tes 2 cartes : l'une coûte 3, l'autre 4.<br><br>❌ Impossible de poser celle à 4 (grisée).<br>✅ Clique sur celle à 3 mana !", cible: "#player-hand", attendre: () => J.plateau.length > 0 },
            { txt: "Parfait ! Ta créature est sur le plateau. 🎉<br><br>Elle a une attaque ⚔ et des points de vie ❤. Les cristaux utilisés sont épuisés.", cible: "#player-board", autoNext: true }
        ]
    },
    3: {
        titre: "Attaquer",
        etapes: [
            { txt: "⚠️ Attention : une créature <b>fraîchement posée</b> ne peut PAS attaquer ce tour ! Il faut attendre le tour suivant (sauf avec Charge ⚡).", cible: "#player-board", autoNext: true },
            { txt: "Je vais passer ton tour pour simuler l'attente. Observe bien…", cible: "#btn-endturn", autoNext: true },
            { txt: "C'est reparti ! Ta créature n'est plus fatiguée : elle brille ✨. Clique dessus, puis choisis une cible :<br>• soit une <b>créature ennemie</b> pour l'affronter,<br>• soit le <b>héros adverse</b> pour l'attaquer directement !", cible: "#player-board", attendre: () => B.patience < 30 || B.plateau.length < 1 }
        ]
    },
    4: {
        titre: "La Charge ⚡",
        etapes: [
            { txt: "Le mot-clé <b>Charge ⚡</b> permet d'attaquer <b>dès l'invocation</b>, sans attendre un tour.", cible: "#player-hand", autoNext: true },
            { txt: "Invoque cette créature avec Charge en cliquant dessus !", cible: "#player-hand", attendre: () => J.plateau.some(m => m.motsCles.includes('Charge')) },
            { txt: "Elle brille immédiatement : clique dessus puis sur le héros adverse !", cible: "#opp-portrait", attendre: () => B.patience < 30 }
        ]
    },
    5: {
        titre: "La Provocation 🛡️",
        etapes: [
            { txt: "L'adversaire a une créature avec <b>Provocation 🛡️</b>.<br><br>Tu ne peux PAS attaquer son héros tant qu'elle est en vie !", cible: "#opponent-board", autoNext: true },
            { txt: "Utilise ton sort <b>« Machine à laver »</b> : clique dessus puis sur la créature pour la détruire.", cible: "#player-hand", attendre: () => B.plateau.length === 0 },
            { txt: "Bien joué ! La voie est libre, tu peux attaquer le héros.", cible: "#opp-portrait", attendre: () => B.patience < 30 }
        ]
    },
    6: {
        titre: "Les Effets - Boost 💪",
        etapes: [
            { txt: "Cette carte donne un <b>bonus à une autre créature</b> : elle peut transformer une petite créature en tueuse !", cible: "#player-hand", autoNext: true },
            { txt: "Joue le boost sur ta créature : clique sur le sort, puis sur ta créature sur le plateau.", cible: "#player-board", attendre: () => J.plateau.some(m => m.auraAtk > 0 || (defCarte(m.id) && atkTot(m) > defCarte(m.id).atk)) },
            { txt: "BOOM ! Ta créature a maintenant plus de force. Elle peut détruire la Provocation adverse !", cible: "#opponent-board", autoNext: true }
        ]
    },
    7: {
        titre: "La Fusion 💑",
        etapes: [
            { txt: "Tu as 2 créatures compatibles : <b>Naila</b> et <b>Nassim</b>.<br><br>Elles peuvent <b>fusionner</b> en une carte ultra-puissante !", cible: "#player-board", autoNext: true },
            { txt: "Clique sur la carte <b>« Naila x Nassim »</b> dans ta main !", cible: "#player-hand", attendre: () => J.plateau.some(m => m.rarete === 'fusion') },
            { txt: "✨ FUSION RÉUSSIE ! 4 dégâts ennemis. Bravo !", cible: "#player-board", autoNext: true }
        ]
    }
};

function majTutoUI() {
    [1,2,3,4,5,6,7].forEach(lvl => {
        const btn = document.getElementById('btn-tuto-' + lvl);
        if (btn) {
            if(profil['tuto_' + lvl]) {
                btn.style.background = 'linear-gradient(180deg, var(--menthe), #1c8f60)';
                btn.style.color = '#04261a';
            }
        }
    });
}

function lancerTuto(niveau) {
    modeEnLigne = false; modeAttente = false; mulliganValide = true; modeTuto = true;
    currentTutoLevel = niveau; etapeTuto = 0;
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }

    J = nouveauCote('J', 'Toi');
    B = nouveauCote('B', 'Prof. Tuto');
    const h = document.getElementById('hero-name');
    if (h) h.innerText = 'Toi';
    const opp = document.getElementById('opp-name');
    if (opp) opp.innerText = 'Professeur Tuto';
    partieFinie = false; selection = null; ciblage = null;
    const log = document.getElementById('action-log');
    if (log) log.innerHTML = '';

    J.premier = true; B.premier = false;
    J.manaMax = 3; J.manaActuel = 3; J.numTour = 1; J.cimetiere = [];
    B.manaMax = 10; B.manaActuel = 0; B.numTour = 0; B.cimetiere = [];
    B.patience = 30;
    tourActuel = 'joueur';

    if (niveau === 1) {
        // Découverte - pas de cartes jouables nécessaires
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) { c1.cout = 3; J.main.push(c1); }
    } else if (niveau === 2) {
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) { c1.cout = 3; J.main.push(c1); }
        const c2 = instancier(defCarte('m1'), 'J'); if (c2) { c2.cout = 4; J.main.push(c2); }
        J.manaMax = 3; J.manaActuel = 3;
    } else if (niveau === 3) {
        // Attaquer : pose une créature sans Charge
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) J.plateau.push(c1);
        c1.malade = true;
        // Donne 5 mana au joueur pour l'étape suivante
        J.manaMax = 5; J.manaActuel = 5;
    } else if (niveau === 4) {
        // Charge
        const c = instancier(defCarte('m8'), 'J'); if (c) J.main.push(c);
    } else if (niveau === 5) {
        // Provocation
        const c1 = instancier(defCarte('n6'), 'B'); if (c1) B.plateau.push(c1);
        const c2 = instancier(defCarte('s22'), 'J'); if (c2) J.main.push(c2);
        const c3 = instancier(defCarte('m5'), 'J'); if (c3) J.main.push(c3);
    } else if (niveau === 6) {
        // Effet boost
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) J.plateau.push(c1);
        const c2 = instancier(defCarte('s9'), 'J'); if (c2) { c2.cout = 1; J.main.push(c2); } // Tu as grandi +3/+3
        const c3 = instancier(defCarte('n6'), 'B'); if (c3) B.plateau.push(c3);
        J.manaMax = 5; J.manaActuel = 5;
    } else if (niveau === 7) {
        // Fusion : donne assez de mana pour éviter le bug
        const c1 = instancier(defCarte('ka5'), 'J'); if (c1) J.plateau.push(c1);
        const c2 = instancier(defCarte('ka6'), 'J'); if (c2) J.plateau.push(c2);
        const c3 = instancier(defCarte('f1'), 'J'); if (c3) J.main.push(c3);
        // Le coût de f1 est 8, on donne 10 mana
        J.manaMax = 10; J.manaActuel = 10;
    }

    changerEcran('game-screen');
    rafraichirJeu();
    setTimeout(() => afficherEtapeTuto(), 400);
}

function afficherEtapeTuto() {
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    const etape = config.etapes[etapeTuto];
    if (!etape) { terminerTuto(currentTutoLevel, 500, `🎓 ${config.titre} terminé !`); return; }

    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    if (etape.cible) {
        const el = document.querySelector(etape.cible);
        if (el) el.classList.add('tuto-highlight');
    }

    const bulle = document.getElementById('tuto-bubble');
    const txt = document.getElementById('tuto-text');
    const btn = document.getElementById('btn-tuto-next');
    if (!bulle || !txt || !btn) return;

    txt.innerHTML = `<b>${config.titre}</b> — Étape ${etapeTuto + 1}/${config.etapes.length}<br>${etape.txt}`;
    bulle.classList.remove('hidden');

    if (etape.autoNext) {
        btn.classList.add('hidden');
        setTimeout(() => {
            if (modeTuto && currentTutoLevel && etapeTuto < config.etapes.length) {
                etapeTuto++;
                afficherEtapeTuto();
            }
        }, 3500);
    } else if (etape.attendre) {
        btn.classList.add('hidden');
        _tutoInterval = setInterval(() => {
            if (partieFinie || !modeTuto) { clearInterval(_tutoInterval); _tutoInterval = null; return; }
            let ok = false;
            try { ok = etape.attendre(); } catch(e) { ok = false; }
            if (ok) {
                clearInterval(_tutoInterval); _tutoInterval = null;
                etapeTuto++;
                afficherEtapeTuto();
            }
        }, 300);
    } else {
        btn.classList.remove('hidden');
        btn.innerText = 'Continuer ▶';
        btn.onclick = () => { etapeTuto++; afficherEtapeTuto(); };
    }
}

function etapeTutoSuivante() {
    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    etapeTuto++;
    afficherEtapeTuto();
}

function validerEtapeTuto() {}

/* Retourne une carte que le joueur ne possède PAS encore */
function carteRecompenseTuto(niveau) {
    const cartesFixes = { 1:'m6', 2:'m7', 3:'m4', 4:'m8', 5:'s9', 6:'s22', 7:'ka5' };
    const idFix = cartesFixes[niveau];
    if (idFix && getTot(idFix) === 0) return idFix;
    // Sinon, cherche une carte random que le joueur ne possède pas
    const nonPossedees = dbCartesDispo().filter(c => getTot(c.id) === 0);
    if (nonPossedees.length) return hasard(nonPossedees).id;
    // Fallback : une commune au hasard
    const pool = dbCartesDispo().filter(c => c.rarete === 'commune');
    return pool.length ? hasard(pool).id : 'm6';
}

function terminerTuto(niveau, gain, message) {
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    const txt = document.getElementById('tuto-text');
    const btn = document.getElementById('btn-tuto-next');
    const bulle = document.getElementById('tuto-bubble');

    const idCarte = carteRecompenseTuto(niveau);

    if (txt) txt.innerHTML = message + `<br><br>🎉 +${gain} 💰 et tu vas recevoir une carte !`;
    if (btn) {
        btn.classList.remove('hidden');
        btn.innerText = 'Voir ma récompense 🎁';
        btn.onclick = () => {
            if (bulle) bulle.classList.add('hidden');
            document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
            modeTuto = false;

            if (!profil['tuto_' + niveau]) {
                profil.coins += gain;
                profil['tuto_' + niveau] = true;
                if (idCarte) {
                    initColl(idCarte);
                    const r = defCarte(idCarte).rarete;
                    collectionJoueur[idCarte][r] = (collectionJoueur[idCarte][r] || 0) + 1;
                }
                sauvegarderProgression();
                majTopBarCoins();
            }

            afficherGainRecompense(`🎓 Tuto ${niveau} terminé !`, gain, idCarte);
            afficherGainArgent(gain);

            const oldClose = window.fermerReward;
            window.fermerReward = function() {
                const ov = document.getElementById('reward-overlay');
                if (ov) ov.classList.remove('open');
                changerEcran('tuto-screen');
                majTutoUI();
                window.fermerReward = oldClose;
            };
        };
    }
}

/* ---------- Mulligan ---------- */
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

/* ---------- Helpers FX ---------- */
function elOf(uid) { return document.querySelector(`[data-uid="${uid}"]`); }
function elHero(side) { return document.querySelector(side === J ? '.hero-panel.you' : '.hero-panel.opp'); }
function fxDepuisRect(rect, texte, type) {
    if (!rect) return;
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
    secouer(elOf(m.uid));
    const p = POUVOIRS[m.id];
    if (p && p.blesse && !m.silence && m.vie > 0) p.blesse({ moi: coteDe(m), ennemi: autre(coteDe(m)), source: m });
}
function degatsHero(side, n) {
    side.patience -= n;
    fxSurHero(side, '-' + n, 'degat');
    secouer(elHero(side));
    const f = document.createElement('div');
    f.className = 'hit-flash';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 460);
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
    if (inst) { inst.malade = true; side.plateau.push(inst); }
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

function recalcAuras() {
    [J, B].forEach(side => {
        const ennemi = autre(side);
        side.plateau.forEach(m => {
            let bonusAtk = 0, bonusVie = 0;
            if (!m.silence) {
                if (m.id === 'k3' && m.vie < m.vieMax) bonusAtk += 3;
                if (m.id === 'm3') { const n = ennemi.plateau.filter(x => x.famille === 'Marouf').length; bonusAtk += n; bonusVie += n; }
            }
            const t = side.terrain;
            if (t) {
                if (t.id === 't1' && estChat(m)) { bonusAtk += 1; bonusVie += 1; }
                if (t.id === 't2' && m.motsCles.includes('Provocation')) bonusVie += 2;
                if (t.id === 't4' && ['Meridja','Marouf','Kerkache','Belgacemi'].includes(m.famille)) bonusAtk += 1;
            }
            m.auraAtk = bonusAtk;
            const delta = bonusVie - m.auraVieAppliquee;
            if (delta !== 0) { m.vie += delta; m.vieMax += delta; m.auraVieAppliquee = bonusVie; }
        });
    });
}
function coutEffectif(side, c) { let cout = c.cout; if (side.terrain && side.terrain.id === 't1' && estChat(c)) cout -= 1; if (side.terrain && side.terrain.id === 'c12' && c.famille === 'Cousins') cout -= 1; cout += side.surcout; return Math.max(0, cout); }

function nettoyerMorts() {
    [J, B].forEach(side => {
        side.plateau.filter(m => m.vie <= 0).forEach(m => {
            const el = elOf(m.uid); if (el) el.classList.add('meurt');
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

function clicCarteMain(index) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (tourActuel !== 'joueur' && !modeEnLigne && !modeTuto) return;
    if (ciblage) return;

    const c = J.main[index];
    if (!c) return;

    if (c.rarete === 'fusion') {
        const dispo = fusionsPossibles(J, c);
        if (!dispo.length) return info('Cartes requises manquantes.');
        if (J.manaActuel < coutEffectif(J, c)) return info('Pas assez de mana.');
        if (J.plateau.length < 2) return info('Pas de place sur le terrain.');
        pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null });
        const wrapper = document.querySelectorAll('#player-hand .card-wrapper')[index];
        if (wrapper) wrapper.classList.add('fusion-anim');
        setTimeout(() => {
            if (wrapper) wrapper.classList.remove('fusion-anim');
            sacrifierPourFusion(J, c.id);
            jouerCarte(J, index, null);
        }, 600);
        return;
    }

    const cout = coutEffectif(J, c);
    if (J.manaActuel < cout) return info('Pas assez de mana.');
    if (c.famille !== 'Sort' && c.famille !== 'Terrain' && J.plateau.length >= 5) return info('Ton plateau est plein (5 créatures).');

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

    if (side === J && c.id && !c.id.startsWith('jeton_')) {
        recordCarteJouee(c.id);
    }

    const ennemi = autre(side), p = POUVOIRS[c.id];
    if (c.famille === 'Sort') {
        animerSort(c, () => {});
        if (ennemi.contreSort) {
            ennemi.contreSort = false;
            info(`${c.prenom} est annulé par Islem !`);
            banniere('Sort annulé');
        } else if (p && p.jouer) {
            p.jouer({ moi:side, ennemi, source:c, cible });
            info(`${c.prenom} lancé.`);
        }
        side.cimetiere.push({id: c.id, rarete: c.rarete});
    } else if (c.famille === 'Terrain') {
        if(side.terrain) side.cimetiere.push({id: side.terrain.id, rarete: side.terrain.rarete});
        side.terrain = c;
        if (p && p.jouer) p.jouer({ moi:side, ennemi, source:c, cible });
        info(`Terrain ${c.prenom} en jeu.`);
    } else {
        c.malade = !c.motsCles.includes('Charge');
        c.aAttaque = false;
        side.plateau.push(c);
        if (p && p.jouer) p.jouer({ moi:side, ennemi, source:c, cible });
        info(`${c.prenom} entre en jeu.`);
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
    if (m.malade) return info(`${m.prenom} ne peut pas encore attaquer.`);
    if (m.aAttaque) return info(`${m.prenom} a déjà attaqué.`);
    if (atkTot(m) <= 0) return info(`${m.prenom} n'a pas d'attaque.`);
    selection = (selection === m) ? null : m;
    info(selection ? `${m.prenom} prêt : choisis une cible ennemie.` : 'Sélection annulée.');
    rafraichirJeu();
}
function clicCreatureEnnemie(m) {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(m);
    if (tourActuel !== 'joueur' || !selection) return;
    const provocations = B.plateau.filter(x => x.motsCles.includes('Provocation'));
    if (provocations.length && !m.motsCles.includes('Provocation')) return info('Tu dois d\'abord attaquer une Provocation.');
    attaquer(selection, m);
}
function clicHeroAdverse() {
    if (partieFinie) return;
    if (modeEnLigne && (modeAttente || tourActuel !== 'joueur')) return info('Ce n\'est pas ton tour.');
    if (ciblage) return choisirCible(B);
    if (tourActuel !== 'joueur' || !selection) return;
    if (B.plateau.some(x => x.motsCles.includes('Provocation'))) return info('Une Provocation protège l\'adversaire.');
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
    if (elA && elC) {
        const a = elA.getBoundingClientRect(), b = elC.getBoundingClientRect();
        const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        elA.style.transition = 'transform .16s cubic-bezier(.4,0,.6,1)';
        elA.style.zIndex = 60;
        elA.style.transform = `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(1.05)`;
        await pause(170);
    }

    if (cible.uid) echangeDegats(attaquant, cible); else degatsHero(cible, atkTot(attaquant));
    attaquant.aAttaque = true;
    if (elA) { elA.style.transform = ''; await pause(140); }

    recalcAuras();
    nettoyerMorts();
    await pause(260);
    rafraichirJeu();
    verifierFin();
    validerEtapeTuto();
}

function prochainManaMax(side) {
    side.numTour++;
    if (side.numTour === 1) side.manaMax = side.premier ? 2 : 3;
    else side.manaMax = Math.min(10, side.manaMax + 1);
    side.manaActuel = side.manaMax;
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
    J.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
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
        B.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
        piocher(B, 1);
        rafraichirJeu();
    } else if (!modeTuto) {
        jouerTourBot();
    }
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

async function jouerTourBot() {
    if (modeEnLigne || modeTuto) return;
    if (partieFinie) return;

    if (!B.deck || B.deck.length === 0) {
        const banned = window.cartesBannies || [];
        B.deck = hasard(decksPreconstruits).cartes
            .filter(c => !banned.includes(typeof c === 'string' ? c : c.id))
            .map(c => { const id = typeof c === 'string' ? c : c.id; return instancier(defCarte(id), 'B'); })
            .filter(x => x);
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
    B.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
    piocher(B, 1);
    rafraichirJeu();
    await pause(700);

    let action = true, securite = 0;
    while (action && !partieFinie && securite < 20) {
        securite++;
        action = false;
        const jouables = B.main.map((c, i) => ({ c, i })).filter(o => {
            if (o.c.rarete === 'fusion') return fusionsPossibles(B, o.c).length > 0 && coutEffectif(B, o.c) <= B.manaActuel;
            return coutEffectif(B, o.c) <= B.manaActuel && (o.c.famille === 'Sort' || o.c.famille === 'Terrain' || B.plateau.length < 5);
        }).sort((a, b) => b.c.cout - a.c.cout);

        if (jouables.length) {
            const choix = jouables[0];
            if (choix.c.rarete === 'fusion') { sacrifierPourFusion(B, choix.c.id); jouerCarte(B, choix.i, null); }
            else {
                const p = POUVOIRS[choix.c.id];
                let cible = null;
                if (p && p.cible) cible = choisirCibleBot(p.cible, ciblesValides(B, p.cible));
                jouerCarte(B, choix.i, cible);
            }
            action = true;
            await pause(750);
        }
    }
    await pause(300);
    for (const m of [...B.plateau]) {
        if (partieFinie) break;
        if (m.aAttaque || m.malade || m.gele > 0 || atkTot(m) <= 0) continue;
        const provocations = J.plateau.filter(x => x.motsCles.includes('Provocation'));
        let cible;
        if (provocations.length) cible = provocations[0];
        else if (J.plateau.length && Math.random() > 0.45) cible = [...J.plateau].sort((a, b) => atkTot(b) - atkTot(a))[0];
        else cible = J;
        await attaquer(m, cible);
        await pause(280);
    }
    if (partieFinie) return;
    appliquerFinDeTour(B);
    B.surcout = 0;
    if (B.voitMainAdverse > 0) B.voitMainAdverse--;
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
        const mode = modeEnLigne ? 'multi' : 'bot';
        enregistrerResultat(gagne, mode);
        banniere(gagne ? 'Victoire !' : 'Défaite…');
        const bfNav = document.getElementById('btn-forfait');
        if (bfNav) bfNav.hidden = true;
        const attente = document.getElementById('attente-overlay');
        if (attente) attente.classList.remove('open');

        let gain = 0;
        if (mode === 'bot') gain = gagne ? 50 : 15;
        else gain = gagne ? 100 : 30;

        profil.coins += gain;
        sauvegarderProgression();
        majTopBarCoins();
        afficherGainArgent(gain);

        setTimeout(() => { changerEcran('menu-screen'); }, 2200);
    }
}

function info(txt) { const el = document.getElementById('combat-info'); if (el) el.innerText = txt; }

function enregistrerResultat(gagne, mode) {
    if (gagne !== null && gagne !== undefined) {
        stats.parties++;
        if (gagne) stats.victoires++; else stats.defaites++;
    }
    const ratio = stats.parties > 0 ? Math.round(stats.victoires / stats.parties * 100) : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('stat-parties', stats.parties);
    set('stat-victoires', stats.victoires);
    set('stat-defaites', stats.defaites);
    set('stat-ratio', ratio + '%');

    let bestDeck = '—', bestDeckN = 0;
    if (profil.statsDecks) {
        Object.entries(profil.statsDecks).forEach(([nom, n]) => {
            if (n > bestDeckN) { bestDeckN = n; bestDeck = nom; }
        });
    }
    set('stat-deck-fav', bestDeck);
    set('stat-deck-fav-count', bestDeckN);

    let bestCarte = '—', bestCarteN = 0;
    if (profil.statsCartes) {
        Object.entries(profil.statsCartes).forEach(([id, n]) => {
            if (n > bestCarteN) {
                bestCarteN = n;
                const c = defCarte(id);
                bestCarte = c ? c.prenom : id;
            }
        });
    }
    set('stat-carte-fav', bestCarte);
    set('stat-carte-fav-count', bestCarteN);
}

/* ---------- Profil ---------- */
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
                toggleAvatarPicker(); // referme après choix
                flashInfo('Avatar mis à jour !');
            };
            p.appendChild(d);
        });
    }
}

function copierCodeAmi() {
    const code = profil.codeAmi;
    if (!code) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => flashInfo('Code copié ! 📋')).catch(() => {
            prompt('Copie ce code :', code);
        });
    } else {
        prompt('Copie ce code :', code);
    }
}

function afficherProfil() {
    const p = document.getElementById('profil-pseudo');
    if (p) p.innerText = J.nom || 'Joueur';
    const codeEl = document.getElementById('profil-code');
    if (codeEl) codeEl.innerText = 'Code ami : ' + (profil.codeAmi || '—') + ' 📋';
    const av = document.getElementById('profil-avatar-big');
    if (av) av.innerText = profil.avatar || '🧑';
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
        div.innerHTML = `<span class="nom">${d.pseudo || d.code || 'Inconnu'}</span>
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
    afficherProfil();
    flashInfo('Ami accepté !');
}

function refuserDemandeAmiPar(code) {
    profil.demandesAmisRecues = (profil.demandesAmisRecues || []).filter(d => d.code !== code);
    sauvegarderProgression();
    afficherDemandesAmis();
}

function afficherAmis() {
    const liste = document.getElementById('amis-liste');
    if (!liste) return;
    liste.innerHTML = '';
    const amis = profil.amis || [];
    if (amis.length === 0) {
        liste.innerHTML = '<p class="hint">Aucun ami pour l\'instant.</p>';
        return;
    }
    amis.forEach((codeAmi) => {
        const div = document.createElement('div');
        div.className = 'ami-item';
        div.innerHTML = `
            <div class="ami-info">
                <div class="ami-avatar">🧑</div>
                <div>
                    <div class="ami-nom">${codeAmi}</div>
                    <div class="ami-etat" id="ami-etat-${codeAmi.replace(/[^a-zA-Z0-9]/g,'_')}">Chargement…</div>
                </div>
            </div>
            <div class="ami-actions">
                <button onclick="ouvrirChat('${codeAmi}')">💬</button>
                <button class="sec" onclick="retirerAmi('${codeAmi}')">✕</button>
            </div>
        `;
        liste.appendChild(div);
        chargerFicheAmi(codeAmi);
    });
}

function ajouterAmi() {
    const inp = document.getElementById('friend-code-input');
    if (!inp) return;
    const code = (inp.value || '').trim().toUpperCase();
    if (!code || code === profil.codeAmi) {
        flashInfo('Code invalide.');
        return;
    }
    // Envoie une demande à ce code
    if (typeof fbDB === 'undefined' || !fbDB) {
        flashInfo('Impossible d\'ajouter (hors-ligne).');
        return;
    }
    fbDB.ref('profils').orderByChild('public/codeAmi').equalTo(code).once('value').then(snap => {
        const data = snap.val();
        if (!data) {
            flashInfo('Code introuvable.');
            return;
        }
        const uid = Object.keys(data)[0];
        const pub = data[uid].public || {};
        // Envoie la demande dans la boîte du destinataire
        fbDB.ref('demandesAmis/' + uid).push({
            deCode: profil.codeAmi,
            dePseudo: J.nom,
            deUid: monId,
            ts: Date.now()
        });
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
            el.innerHTML = `${av} ${nom} <span style="color:${online ? 'var(--menthe)' : 'var(--texte-doux)'}">●</span>`;
            el.classList.toggle('on', online);
            const avEl = el.parentElement.parentElement.querySelector('.ami-avatar');
            if (avEl) avEl.innerText = av;
        } else {
            el.innerText = 'Inconnu';
        }
    }).catch(() => {
        const el = document.getElementById('ami-etat-' + codeAmi.replace(/[^a-zA-Z0-9]/g,'_'));
        if (el) el.innerText = 'Inconnu';
    });
}

/* Chat */
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

function fermerChat() {
    const ov = document.getElementById('chat-overlay');
    if (ov) ov.classList.remove('open');
    window._amiChatEnCours = null;
}

function envoyerMessageChat() {
    const inp = document.getElementById('chat-input');
    const code = window._amiChatEnCours;
    if (!inp || !code) return;
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    if (typeof fbDB === 'undefined' || !fbDB) {
        flashInfo('Impossible d\'envoyer (hors-ligne).');
        return;
    }
    const cle = [profil.codeAmi, code].sort().join('_');
    fbDB.ref('messagesPrives/' + cle).push({
        de: profil.codeAmi,
        texte: txt,
        ts: Date.now()
    });
}

/* Demandes d'amis reçues (écoute Firebase) */
function ecouterDemandesAmis() {
    if (typeof fbDB === 'undefined' || !fbDB || !monId) return;
    fbDB.ref('demandesAmis/' + monId).on('value', snap => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([k, v]) => ({ id: k, ...v }));
        profil.demandesAmisRecues = arr.map(d => ({ code: d.deCode, pseudo: d.dePseudo, id: d.id }));
        if (arr.length > 0 && document.getElementById('profil-screen').classList.contains('active')) {
            afficherProfil();
        } else if (arr.length > 0) {
            flashInfo(`👋 ${arr.length} demande(s) d'ami !`);
        }
    });
}

/* ---------- Cimetière, logs, emotes ---------- */
function voirCimetiere(cle) {
    const side = cle === 'J' ? J : B;
    const ov = document.getElementById('graveyard-overlay');
    const cards = document.getElementById('graveyard-cards');
    const title = document.getElementById('graveyard-title');
    if (!ov || !cards) return;
    if (title) title.innerText = 'Cimetière — ' + side.nom;
    cards.innerHTML = '';
    side.cimetiere.forEach(c => {
        const def = defCarte(c.id);
        if (def) cards.appendChild(creerHTMLCarte(def, 'collection'));
    });
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

function toggleEmotes(cle) {
    const menu = document.getElementById('emotes-' + cle);
    if (menu) menu.classList.toggle('hidden');
}
function jouerEmote(txt) {
    if (!modeEnLigne || !window.multiPartie || !window.multiPartie.active) {
        afficherEmote(J, txt); return;
    }
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

/* ---------- Rendu plateau ---------- */
function rafraichirJeu() {
    recalcAuras();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('player-mana', `${J.manaActuel}/${J.manaMax}`);
    set('player-health', J.patience);
    set('player-deck', J.deck.length);
    set('player-grave-count', J.cimetiere.length);
    set('opp-mana', `${B.manaActuel}/${B.manaMax}`);
    set('opp-health', B.patience);
    set('opp-hand', B.main.length);
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
            B.main.forEach(c => {
                const el = creerHTMLCarte(c, 'jeu');
                el.style.setProperty('--cw', '72px');
                oh.appendChild(el);
            });
        } else {
            B.main.forEach(() => {
                const d = document.createElement('div');
                d.className = 'mini-back';
                oh.appendChild(d);
            });
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
        }
    });

    const pj = document.getElementById('player-board');
    if (pj) {
        pj.innerHTML = '';
        J.plateau.forEach(m => {
            const el = creerHTMLCarte(m, 'jeu');
            if (m === selection) el.classList.add('selection');
            else if (!m.malade && !m.aAttaque && m.gele === 0 && atkTot(m) > 0 && tourActuel === 'joueur') el.classList.add('pret');
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
            if (c.rarete === 'fusion') placePlateau = J.plateau.length >= 2 && fusionsPossibles(J, c).length > 0;
            const peutJouer = tourActuel === 'joueur' && !modeAttente;
            if (peutJouer && J.manaActuel >= cout && placePlateau) el.classList.add('jouable');
            else el.classList.add('injouable');
            el.onclick = () => clicCarteMain(i);
            main.appendChild(el);
        });
    }
    ajusterChevauchementMain();
    const gs = document.getElementById('game-screen');
    if (gs) ajusterTextes(gs);
}

function ajusterChevauchementMain() {
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
    if (!confirm('Déclarer forfait ? Tu perdras cette partie.')) return;
    partieFinie = true;
    clearInterval(timer);
    annulerCiblage();
    selection = null;
    const mode = modeEnLigne ? 'multi' : 'bot';
    enregistrerResultat(false, mode);
    banniere('Forfait… Défaite');
    const gain = mode === 'multi' ? 10 : 5;
    profil.coins += gain;
    sauvegarderProgression();
    majTopBarCoins();
    afficherGainArgent(gain);
    if (window.multiPartie && window.multiPartie.active && typeof signalerForfaitEnLigne === 'function') signalerForfaitEnLigne();
    const bfNav = document.getElementById('btn-forfait');
    if (bfNav) bfNav.hidden = true;
    const attente = document.getElementById('attente-overlay');
    if (attente) attente.classList.remove('open');
    setTimeout(() => { changerEcran('menu-screen'); }, 2000);
}

/* ---------- DÉMARRAGE ---------- */
document.addEventListener('DOMContentLoaded', function() {
    try {
        const zone = document.getElementById('login-cards');
        if (zone) {
            // 6 cartes décoratives (recto-verso)
            ['m1','ma2','k1','ka1','f1','u1'].forEach(id => {
                const c = defCarte(id);
                if (c) {
                    const el = creerHTMLCarte(c, 'zoom');
                    el.classList.add('flipped'); // affiche le dos pour l'effet décoratif
                    zone.appendChild(el);
                }
            });
            ajusterTextes(zone);
        }
    } catch(e) { console.error("Erreur decor", e); }

    try {
        const estMobile = ('ontouchstart' in window) && (navigator.maxTouchPoints > 0) && (window.matchMedia('(pointer: coarse)').matches) && (window.innerWidth <= 1366);
        if (estMobile) {
            function appliquerOrientation() {
                const enPortrait = window.matchMedia('(orientation: portrait)').matches;
                document.body.classList.toggle('force-portrait', enPortrait);
            }
            appliquerOrientation();
            window.addEventListener('resize', appliquerOrientation);
            window.addEventListener('orientationchange', () => setTimeout(appliquerOrientation, 200));
        }
    } catch(e) {}

    window.appPret = true;
    if (typeof window.onAppPret === 'function') window.onAppPret();

    window.addEventListener('beforeunload', (e) => {
        const gs = document.getElementById('game-screen');
        if (gs && gs.classList.contains('active') && !partieFinie && !modeTuto) {
            e.preventDefault(); e.returnValue = '';
        }
    });

    // Écoute des demandes d'amis
    setTimeout(() => { if (typeof ecouterDemandesAmis === 'function') ecouterDemandesAmis(); }, 2000);
});

/* ---------- Templates admin ---------- */
var TEMPLATES_EFFETS = {
    buff_allie_1_1:      { desc: "Cri de guerre : donne +1/+1 à une créature alliée.", motsCles: [] },
    buff_allie_3_3:      { desc: "Donne +3/+3 à une créature alliée.", motsCles: [] },
    buff_all_allies_2_2: { desc: "Donne +2/+2 à toutes tes créatures.", motsCles: [] },
    si_X_buff_2_2:       { desc: "Gagne +2/+2 si [PERSO] est en jeu.", motsCles: [] },
    degats_cible_2:      { desc: "Cri de guerre : inflige 2 dégâts à une cible ennemie.", motsCles: [] },
    soin_hero_2:         { desc: "Cri de guerre : rend 2 patience à ton héros.", motsCles: [] },
    charge:              { desc: "Charge : attaque dès son arrivée.", motsCles: ['Charge'] }
};

function adminAppliquerTemplate() {
    const sel = document.getElementById('new-card-template');
    const desc = document.getElementById('new-card-desc');
    const perso1 = document.getElementById('new-card-template-perso');
    if (!sel || !desc) return;
    const tpl = TEMPLATES_EFFETS[sel.value];
    if (!tpl) return;
    let texte = tpl.desc;
    if (perso1 && perso1.value.trim()) {
        texte = texte.replace('[PERSO]', perso1.value.trim());
    }
    desc.value = texte;
    const mc = document.getElementById('new-card-motscles');
    if (mc && tpl.motsCles.length) {
        const actuels = mc.value.split(',').map(s => s.trim()).filter(Boolean);
        tpl.motsCles.forEach(k => { if (!actuels.includes(k)) actuels.push(k); });
        mc.value = actuels.join(', ');
    }
}

/* ---------- Admin ---------- */
function adminTab(tab) {
    ['actions','cartes','creation','stats','bannir','annonces'].forEach(t => {
        const el = document.getElementById('admin-tab-' + t);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'cartes') adminAfficherToutesCartes();
    if (tab === 'stats') adminAfficherStats();
    if (tab === 'bannir') adminAfficherCartesBannies();
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
            collectionJoueur[c.id].fusion += 1;
            collectionJoueur[c.id].unifiee += 1;
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
    if (typeof fbDB === 'undefined' || !fbDB) {
        el.innerHTML = '<p class="hint">Firebase non connecté.</p>';
        return;
    }
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
                const parties = (v.profil && v.profil.statsDecks)
                    ? Object.values(v.profil.statsDecks).reduce((a, b) => a + b, 0) : 0;
                totalParties += parties;
                joueursActifs.push({ pseudo, parties, lastLogin: (v.profil && v.profil.lastLogin) || 0 });
            }).catch(() => {}));
        });

        Promise.all(refs).then(() => {
            joueursActifs.sort((a, b) => b.parties - a.parties);
            let html = `
                <div class="admin-stat-grid">
                    <div class="admin-stat-card"><div class="num">${total}</div><div class="label">Comptes créés</div></div>
                    <div class="admin-stat-card"><div class="num">${enLigne}</div><div class="label">Connectés maintenant</div></div>
                    <div class="admin-stat-card"><div class="num">${enCombat}</div><div class="label">En combat</div></div>
                </div>
                <div class="admin-stat-grid">
                    <div class="admin-stat-card"><div class="num">${totalParties}</div><div class="label">Parties jouées (total)</div></div>
                </div>
                <h4 style="color:var(--laiton-clair); margin-top:20px;">Joueurs actifs (par parties jouées)</h4>
                <table>
                    <tr><th>Pseudo</th><th>Parties</th><th>Dernière connexion</th></tr>
                    ${joueursActifs.slice(0, 30).map(j => `
                        <tr>
                            <td>${j.pseudo}</td>
                            <td>${j.parties}</td>
                            <td>${j.lastLogin ? new Date(j.lastLogin).toLocaleDateString('fr-FR') : '—'}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
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
            if (typeof fbDB !== 'undefined' && fbDB) {
                try { fbDB.ref('cartesBannies').set(window.cartesBannies || []); } catch(e) {}
            }
            adminAfficherCartesBannies();
        };
        grid.appendChild(el);
    });
    ajusterTextes(grid);
}

function adminToutDebloquer(n) {
    dbCartes.forEach(c => {
        initColl(c.id);
        collectionJoueur[c.id].commune = n;
        collectionJoueur[c.id].rare = n;
        collectionJoueur[c.id].epique = n;
        collectionJoueur[c.id].legendaire = n;
        collectionJoueur[c.id].fusion = n;
        collectionJoueur[c.id].unifiee = n;
    });
    sauvegarderProgression();
    alert(`✅ ${n} exemplaire(s) de CHAQUE carte et rareté ajouté !`);
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
    const motsCles = document.getElementById('new-card-motscles').value.split(',').map(s=>s.trim()).filter(Boolean);

    const id = 'custom_' + Date.now();
    const nouvelleCarte = C(id, prenom, famille, cout, atk, vie, rarete, desc, motsCles, emoji);
    dbCartes.push(nouvelleCarte);
    parId[id] = nouvelleCarte;
    initColl(id);
    collectionJoueur[id][rarete] = 10;
    sauvegarderProgression();
    alert(`✨ Carte "${prenom}" créée et 10 exemplaires ajoutés !`);
    document.getElementById('new-card-prenom').value = '';
    document.getElementById('new-card-desc').value = '';
    document.getElementById('new-card-template').value = '';
    adminTab('cartes');
}

function deconnexion() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => location.reload()).catch(() => location.reload());
        } else {
            location.reload();
        }
    } catch(e) { location.reload(); }
}
