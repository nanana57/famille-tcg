/* ===========================================================
   FAMILLE TCG — moteur de jeu (Édition Ultime v3)
   =========================================================== */

var collectionJoueur = {};
var mesDecks = [];
var profil = { coins: 0, deckStart: false, lastLogin: 0, tuto_1:false, tuto_2:false, tuto_3:false, tuto_4:false, tuto_5:false };
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
window.appPret = false;

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
    C('m9','Chat 2','Meridja',2,2,1,'commune','Miaule très fort la nuit.',['Charge','Chat'],'🐈'),
    C('m10','Chat 3','Meridja',2,2,1,'commune','Saute partout sans prévenir.',['Charge','Chat'],'🐈'),
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
    C('k8','Oiseau 2','Kerkache',2,1,2,'commune','Gazouille joyeusement.',['Charge'],'🕊️'),

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
    C('c12','Cherchell','Terrain',3,0,0,'rare','Tes créatures Cousins coûtent 1 mana de moins.',[],'🏖️')
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
    { nom:'Kerkache Défense',cartes:['k1','k2','k3','k4','k4','k5','k5','k6','k6','k7','k7','k8','k8','n1','n2','s2','s5','s6','s11','s18'] },
    { nom:'Belgacemi Synergie', cartes:['ka1','ka2','ka3','ka4','ka5','ka5','ka6','ka6','ka7','ka7','ka8','ka8','ka9','ka9','ka10','ka10','n1','n2','s15','ka11'] },
    { nom:'Les Infiltrés', cartes:['f1','f2','f3','f4','f5','ka5','ka6','m4','m5','ma3','ma4','ka7','ka8','ka3','ka4','m11','m12','ma11','ka11','n7'] },
    { nom:'Alliance des Cousins', cartes:['c7','c7','c4','c4','c9','c9','c3','c3','c12','c12','c6','c6','c5','c5','c10','c10','c2','c11','c8','c1'] }
];

var decksPreconstruits = decksPreconstruitsBrut.map(function(d) {
    return {
        nom: d.nom,
        cartes: d.cartes.map(function(id) { return { id: id, rarete: defCarte(id).rarete }; })
    };
});

function initColl(id) {
    if (!collectionJoueur[id] || typeof collectionJoueur[id] === 'number') {
        const defR = defCarte(id) ? defCarte(id).rarete : 'commune';
        const oldQty = typeof collectionJoueur[id] === 'number' ? collectionJoueur[id] : 0;
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
    const o = ['fusion','legendaire','epique','rare','commune'];
    for (let i = 0; i < o.length; i++) { if (collectionJoueur[id][o[i]] > 0) return o[i]; }
    return defCarte(id) ? defCarte(id).rarete : 'commune';
}

function formatCoins(c) { return c >= 999999 ? '∞' : c; }

function majTopBarCoins() {
    const el = document.getElementById('nav-coins');
    const elDb = document.getElementById('db-coins');
    if(el) el.innerText = formatCoins(profil.coins) + " 💰";
    if(elDb) elDb.innerText = formatCoins(profil.coins) + " 💰";
}

function sanitizeSave() {
    if (typeof collectionJoueur === 'object' && collectionJoueur !== null) {
        for (let id in collectionJoueur) {
            if (typeof collectionJoueur[id] === 'number') {
                let oldVal = collectionJoueur[id];
                let defR = defCarte(id) ? defCarte(id).rarete : 'commune';
                collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0 };
                collectionJoueur[id][defR] = oldVal;
            }
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

    decksPreconstruits.forEach(dp => {
        if (!mesDecks.some(md => md.nom === dp.nom && md.base === true)) {
            mesDecks.unshift({ nom: dp.nom, cartes: dp.cartes.map(c=>({...c})), base: true });
        }
    });
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
    if (email === 'nassim57132@gmail.com') profil.coins = 9999999;

    const maintenant = Date.now();
    if (maintenant - profil.lastLogin > 86400000) {
        if (email !== 'nassim57132@gmail.com') profil.coins += 50;
        profil.lastLogin = maintenant;
        flashInfo("🎁 Bonus quotidien : +50 💰 !");
    }

    if (!profil.deckStart && email !== 'nassim57132@gmail.com') attribuerDeckDepart();

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
    }
    majTopBarCoins();
}

function attribuerDeckDepart() {
    const famillesDeBase = ['Meridja', 'Marouf', 'Kerkache', 'Belgacemi'];
    const familleChoisie = famillesDeBase[Math.floor(Math.random() * famillesDeBase.length)];
    const precon = decksPreconstruits.find(d => d.nom.includes(familleChoisie));

    precon.cartes.forEach(c => {
        initColl(c.id);
        collectionJoueur[c.id].commune = 2;
    });

    profil.deckStart = true;
    profil.coins += 100;
    sauvegarderProgression();
    setTimeout(() => { alert(`🎉 La famille ${familleChoisie} t'adopte !\nTu as débloqué ses cartes de base et reçu 100 💰 en cadeau !`); }, 500);
}

function calculerCartesPossedeesPourDeck(cartesDeck) {
    let owned = 0;
    let tempColl = JSON.parse(JSON.stringify(collectionJoueur));
    cartesDeck.forEach(c => {
        const id = typeof c === 'string' ? c : c.id;
        const r = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        initColl(id);
        if (tempColl[id] && tempColl[id][r] && tempColl[id][r] > 0) {
            owned++; tempColl[id][r]--;
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

function changerEcran(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const cible = document.getElementById(id);
    if (cible) cible.classList.add('active');

    const nav = document.getElementById('main-nav');
    if (nav) {
        if(id !== 'login-screen') nav.classList.remove('hidden');
        else nav.classList.add('hidden');
    }

    const bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
    if (bfNav) bfNav.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    if (bfIn) bfIn.hidden = (id !== 'game-screen' || partieFinie || modeTuto);

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

function creerHTMLCarte(c, ctx, opts) {
    opts = opts || {};
    const w = document.createElement('div');
    w.className = 'card-wrapper';
    if (c.uid) w.dataset.uid = c.uid;

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
    const rareteHtml = enJeu ? '' : `<div class="rarity-text">${displayRarete}</div>`;
    const clRarete = displayRarete === 'fusion' ? 'fusion' : displayRarete;

    const motsCles = c.motsCles.filter(k => k !== 'Chat');
    const kw = motsCles.length ? `<div class="keyword-row">${motsCles.map(k => `<span class="kw">${k}</span>`).join('')}</div>` : '';
    const qty = (opts.qty !== undefined) ? `<div class="qty-badge">×${opts.qty}</div>` : '';
    const loupe = (ctx === 'collection' || ctx === 'booster') ? `<div class="zoom-btn" onclick="zoomCarte(event,'${c.id}')">🔍</div>` : '';
    const tagDeck = opts.enDeck ? `<div class="nouveau-tag">Dans le deck ×${opts.enDeck}</div>` : '';
    const tagNeuf = opts.nouveau ? '<div class="nouveau-tag">Nouvelle</div>' : '';
    const coutAffiche = opts.cout !== undefined ? opts.cout : c.cout;
    const classeTexte = POUVOIRS[c.id] ? 'pouvoir' : 'lore';
    const clFamille = c.famille === 'Nouvelle famille' ? 'Nouvelle' : c.famille;

    w.innerHTML = `${qty}${loupe}${tagDeck}${tagNeuf}<div class="card-inner"><div class="card bg-${clFamille} border-${clRarete}"><div class="card-head"><div class="mana-gem">${coutAffiche}</div><div class="card-name">${c.prenom}</div>${badge}</div><div class="card-art">${c.emoji}</div><div class="faction-tag">${c.famille}</div><div class="card-text ${classeTexte}">${c.desc}</div>${kw}${pied}${rareteHtml}</div><div class="card-back">✦</div></div>`;

    if (opts.missing) {
        w.classList.add('missing');
        const b = document.createElement('div');
        b.className = 'missing-badge';
        b.textContent = 'MANQUANTE';
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

/* Deckbuilder */
function afficherBoutique(critere) {
    triCourant = critere;
    const ordreRarete = { fusion:0, legendaire:1, epique:2, rare:3, commune:4 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, Neutre:7, Terrain:8, Sort:9 };
    const liste = [...dbCartes];
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

        const supprBtn = d.base
            ? '<span class="base-tag">Officiel</span>'
            : `<button class="del-btn" onclick="supprimerDeck(${i}, event)">✕</button>`;
        const warnTag = isComplete
            ? '<span class="deck-ok">✓</span>'
            : `<span class="deck-warn">${owned}/20</span>`;

        div.innerHTML = `<span class="di-texte">${d.nom}</span>${warnTag}${supprBtn}`;
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
    if (mesDecks[i].base) return;
    if (!confirm(`Supprimer le deck « ${mesDecks[i].nom} » ?`)) return;
    mesDecks.splice(i, 1);
    if (deckEnEdition === i) deckEnEdition = null;
    else if (deckEnEdition !== null && deckEnEdition > i) deckEnEdition--;
    chargerListeDecks();
    sauvegarderProgression();
}

function editerDeck(i) {
    deckEnEdition = i;
    tempDeckCartes = [...mesDecks[i].cartes];
    const inp = document.getElementById('deck-name-input');
    if (inp) inp.value = mesDecks[i].nom;

    const list = document.getElementById('liste-decks');
    if (list) [...list.children].forEach((el, k) => el.classList.toggle('active', k === i));
    trierDeckbuilder(triCourant);
    afficherDeckEnCours();
}

function trierDeckbuilder(critere) {
    triCourant = critere;
    const ordreRarete = { fusion:0, legendaire:1, epique:2, rare:3, commune:4 };
    const ordreFamille = { Meridja:1, Marouf:2, Kerkache:3, Belgacemi:4, Cousins:5, 'Nouvelle famille':6, Neutre:7, Terrain:8, Sort:9 };
    const liste = [...dbCartes];

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

        if (!manquante && dispo <= 0) el.style.filter = "grayscale(1) brightness(0.6)";

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

        const rList = ['commune','rare','epique','legendaire','fusion'];
        const rPrices = { commune: 10, rare: 50, epique: 200, legendaire: 1000, fusion: 2000 };

        let rowsHtml = rList.map(r => {
            const possede = coll[r];
            const maxCopies = (r === 'legendaire' || r === 'epique' || r === 'fusion') ? 1 : 2;
            const prix = rPrices[r];
            const prixV = prix / 2;
            const dansDeck = modeDeckbuilder ? tempDeckCartes.filter(x => x.id === idCarte && x.rarete === r).length : 0;

            let deckBtns = '';
            if(modeDeckbuilder && deckEnEdition !== null) {
                deckBtns = `
                    <button onclick="window.ajouterAuDeck('${idCarte}', '${r}')" ${dansDeck >= possede || dansDeck >= maxCopies || tempDeckCartes.length >= 20 ? 'disabled' : ''}>+ Deck</button>
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

        content.innerHTML = `
            <div class="detail-panel-left" style="pointer-events:none;">
                ${wrapTmp.innerHTML}
            </div>
            <div class="detail-panel-right">
                <h3>${c.prenom}</h3>
                ${modeDeckbuilder && deckEnEdition !== null ? `<h4 style="text-align:center; color:var(--laiton-clair); margin:0 0 10px;">Édition de : ${mesDecks[deckEnEdition].nom} (${tempDeckCartes.length}/20)</h4>` : ''}
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
        if (tempDeckCartes.length < 20) {
            tempDeckCartes.push({id: id, rarete: r});
            render();
            afficherDeckEnCours();
            trierDeckbuilder(triCourant);
        }
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
        div.style.borderLeftColor = `var(--r-${r === 'fusion' ? 'fusion' : r})`;

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
    mesDecks[deckEnEdition].nom = (inp && inp.value.trim()) || 'Sans nom';
    mesDecks[deckEnEdition].cartes = [...tempDeckCartes];
    sauvegarderProgression();
    chargerListeDecks();
    flashInfo(tempDeckCartes.length === 20 ? 'Deck enregistré.' : `Deck incomplet (${tempDeckCartes.length}/20).`);
}

function chargerDropdownDecks() {
    const sel = document.getElementById('deck-select');
    if (!sel) return;
    sel.innerHTML = '';
    mesDecks.forEach((d, i) => {
        const owned = calculerCartesPossedeesPourDeck(d.cartes);
        const o = document.createElement('option');
        o.value = i;
        o.innerText = d.nom + (owned !== 20 ? ` — (Incomplète : ${owned}/20)` : '');
        if(owned !== 20) o.disabled = true;
        sel.appendChild(o);
    });
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
            if (r > 0.98) rarete = 'fusion';
            else if (r > 0.93) rarete = 'legendaire';
            else if (r > 0.82) rarete = 'epique';
            else if (r > 0.58) rarete = 'rare';
            else rarete = 'commune';
            const pool = dbCartes.filter(c => c.rarete === rarete);
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
                    if (rarete === 'legendaire' || rarete === 'epique' || rarete === 'fusion') el.classList.add('reveal-' + (rarete === 'fusion' ? 'legendaire' : rarete));
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

    J.deck = mesDecks[i].cartes.map(c => {
        const id = typeof c === 'string' ? c : c.id;
        const rarete = typeof c === 'string' ? (defCarte(id) ? defCarte(id).rarete : 'commune') : c.rarete;
        return instancier(defCarte(id), 'J', false, rarete);
    }).filter(x => x);
    melanger(J.deck);

    B.deck = hasard(decksPreconstruits).cartes.map(c => {
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
   TUTORIEL v2 — Étapes interactives
   =========================================================== */
var TUTO_ETAPES = {
    1: {
        titre: "Les bases : Invoquer",
        etapes: [
            { txt: "Bienvenue à l'Académie ! 🎓<br><br>Tu vois les <b>cristaux bleus</b> en bas ? Ce sont tes <b>points de mana</b>. Chaque carte a un coût (chiffre bleu en haut à gauche).", cible: "#crystals", autoNext: true },
            { txt: "Ici tu as <b>3 mana</b>. Regarde tes 2 cartes : l'une coûte 3, l'autre coûte 4.<br><br>❌ Tu ne peux PAS jouer la carte à 4 (elle est grisée).<br>✅ Clique sur la carte à 3 mana !", cible: "#player-hand", attendre: () => J.plateau.length > 0 },
            { txt: "Parfait ! Ta créature est sur le plateau. 🎉<br><br>Elle a une <b>attaque ⚔</b> et des <b>points de vie ❤</b>. Les cristaux utilisés sont épuisés.", cible: "#player-board", autoNext: true }
        ]
    },
    2: {
        titre: "L'Attaque & la Charge",
        etapes: [
            { txt: "Cette créature a le mot-clé <b>Charge ⚡</b>.<br><br>Cela signifie qu'elle peut attaquer <b>dès son arrivée</b> (contrairement aux autres qui doivent attendre un tour).", cible: "#player-hand", autoNext: true },
            { txt: "Invoque la carte en cliquant dessus !", cible: "#player-hand", attendre: () => J.plateau.length > 0 },
            { txt: "Clique sur ta créature (elle doit briller ✨), puis sur le <b>héros adverse</b> pour attaquer !", cible: "#opp-portrait", attendre: () => B.patience < 30 }
        ]
    },
    3: {
        titre: "La Provocation 🛡️",
        etapes: [
            { txt: "L'adversaire a posé une créature avec <b>Provocation 🛡️</b>.<br><br>Tu ne peux PAS attaquer son héros tant qu'elle est en vie !", cible: "#opponent-board", autoNext: true },
            { txt: "Utilise ton sort <b>« Machine à laver qui déborde »</b> (3 dégâts) : clique dessus puis sur la créature adverse.", cible: "#player-hand", attendre: () => B.plateau.length === 0 },
            { txt: "Bien joué ! Maintenant tu peux attaquer le héros.", cible: "#opp-portrait", attendre: () => B.patience < 30 }
        ]
    },
    4: {
        titre: "Les Effets : Rage 🔥",
        etapes: [
            { txt: "Cette créature possède <b>Rage</b>.<br><br>Son effet se déclenche quand elle est <b>blessée sans mourir</b>.", cible: "#player-board", autoNext: true },
            { txt: "Joue <b>« Bagarre de cousins »</b> : elle inflige 1 dégât à toutes tes créatures (déclenche la Rage) et pioche 2 cartes.", cible: "#player-hand", attendre: () => J.plateau.some(m => m.id === 'c2' && m.vie < m.vieMax) },
            { txt: "Sa Rage a déclenché : +2 ATK et <b>Charge</b> ! Frappe maintenant !", cible: "#opp-portrait", attendre: () => B.patience < 30 }
        ]
    },
    5: {
        titre: "La Fusion 💑",
        etapes: [
            { txt: "Tu as 2 créatures sur le terrain : <b>Naila</b> et <b>Nassim</b>.<br><br>Elles peuvent se <b>fusionner</b> pour créer une carte ultra-puissante !", cible: "#player-board", autoNext: true },
            { txt: "Clique sur la carte <b>« Naila x Nassim »</b> dans ta main pour lancer la fusion !", cible: "#player-hand", attendre: () => J.plateau.some(m => m.rarete === 'fusion') },
            { txt: "✨ FUSION RÉUSSIE ! La carte a un effet puissant : 4 dégâts ennemis. Regarde son animation !", cible: "#player-board", autoNext: true }
        ]
    }
};

function majTutoUI() {
    [1,2,3,4,5].forEach(lvl => {
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
        const c1 = instancier(defCarte('m6'), 'J'); if (c1) { c1.cout = 3; J.main.push(c1); }
        const c2 = instancier(defCarte('m1'), 'J'); if (c2) { c2.cout = 4; J.main.push(c2); }
        J.manaMax = 3; J.manaActuel = 3;
    } else if (niveau === 2) {
        const c = instancier(defCarte('m8'), 'J'); if (c) J.main.push(c);
    } else if (niveau === 3) {
        const c1 = instancier(defCarte('n6'), 'B'); if (c1) B.plateau.push(c1);
        const c2 = instancier(defCarte('s22'), 'J'); if (c2) J.main.push(c2);
        const c3 = instancier(defCarte('m5'), 'J'); if (c3) J.main.push(c3);
    } else if (niveau === 4) {
        const c1 = instancier(defCarte('c2'), 'J'); if (c1) J.plateau.push(c1);
        const c2 = instancier(defCarte('c9'), 'J'); if (c2) J.main.push(c2);
    } else if (niveau === 5) {
        const c1 = instancier(defCarte('ka5'), 'J'); if (c1) J.plateau.push(c1);
        const c2 = instancier(defCarte('ka6'), 'J'); if (c2) J.plateau.push(c2);
        const c3 = instancier(defCarte('f1'), 'J'); if (c3) J.main.push(c3);
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

    txt.innerHTML = `<b>${config.titre}</b> — Étape ${etapeTuto + 1}/${config.etapes.length}<br><br>${etape.txt}`;

    if (etape.autoNext) {
        btn.classList.add('hidden');
        setTimeout(() => { if (modeTuto && currentTutoLevel && etapeTuto < config.etapes.length) { etapeTuto++; afficherEtapeTuto(); } }, 3000);
    } else if (etape.attendre) {
        btn.classList.add('hidden');
        _tutoInterval = setInterval(() => {
            if (partieFinie || !modeTuto) { clearInterval(_tutoInterval); return; }
            let ok = false;
            try { ok = etape.attendre(); } catch(e) { ok = false; }
            if (ok) {
                clearInterval(_tutoInterval);
                _tutoInterval = null;
                etapeTuto++;
                afficherEtapeTuto();
            }
        }, 300);
    } else {
        btn.classList.remove('hidden');
        btn.innerText = 'Continuer ▶';
        btn.onclick = () => { etapeTuto++; afficherEtapeTuto(); };
    }
    bulle.classList.remove('hidden');
}

function etapeTutoSuivante() {
    const config = TUTO_ETAPES[currentTutoLevel];
    if (!config) return;
    etapeTuto++;
    afficherEtapeTuto();
}

function validerEtapeTuto() { /* géré par afficherEtapeTuto */ }

function terminerTuto(niveau, gain, message) {
    if (_tutoInterval) { clearInterval(_tutoInterval); _tutoInterval = null; }
    const txt = document.getElementById('tuto-text');
    const btn = document.getElementById('btn-tuto-next');
    if (txt) txt.innerHTML = message + `<br><br>🎉 +${gain} 💰 et +1 carte bonus !`;
    if (btn) btn.classList.add('hidden');

    const cartesRecompense = ['m6','m8','s22','c2','ka5'];
    if (!profil['tuto_' + niveau]) {
        profil.coins += gain;
        profil['tuto_' + niveau] = true;
        const idCarte = cartesRecompense[niveau - 1];
        if (idCarte) {
            initColl(idCarte);
            collectionJoueur[idCarte].commune += 1;
        }
        sauvegarderProgression();
    }

    setTimeout(() => {
        const b = document.getElementById('tuto-bubble');
        if (b) b.classList.add('hidden');
        document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
        modeTuto = false;
        changerEcran('tuto-screen');
        majTutoUI();
    }, 4000);
}

/* Mulligan */
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

function afficherAttente(titre, texte) {
    const ov = document.getElementById('attente-overlay');
    const t = document.getElementById('attente-titre');
    if (t) t.innerText = titre || 'En attente…';
    if (ov) ov.classList.add('open');
}
function fermerAttente() {
    const ov = document.getElementById('attente-overlay');
    if (ov) ov.classList.remove('open');
}
function melanger(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(getSyncRandom() * (i + 1));
        const temp = a[i]; a[i] = a[j]; a[j] = temp;
    }
}

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
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1000);
    }
}
function fxSur(m, texte, type) { const el = elOf(m.uid); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function fxSurHero(side, texte, type) { const el = elHero(side); if (el) fxDepuisRect(el.getBoundingClientRect(), texte, type); }
function banniere(texte) {
    const d = document.createElement('div');
    d.className = 'fx-banniere';
    d.textContent = texte;
    const layer = document.getElementById('fx-layer');
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.remove(), 1500);
    }
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
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.classList.add('disparait'), 1000);
        setTimeout(() => d.remove(), 1500);
    }
}
function afficherPiece(pile) {
    const d = document.createElement('div');
    d.className = 'fx-de';
    d.innerHTML = `<span class="de-face">💰</span><span class="de-valeur">${pile ? 'Pile !' : 'Face…'}</span>`;
    const layer = document.getElementById('fx-layer');
    if (layer) {
        layer.appendChild(d);
        setTimeout(() => d.classList.add('disparait'), 1000);
        setTimeout(() => d.remove(), 1500);
    }
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
        if (!dispo.length) return info('Cartes requises manquantes (plateau ou main).');
        if (J.manaActuel < coutEffectif(J, c)) return info('Pas assez de mana.');
        if (J.plateau.length < 2) return info('Pas de place sur le terrain.');
        pousserAction({ type:'jouer', id:c.id, idxCible:null, campCible:null, cibleHero:null });
        // Animation de fusion
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
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '42%';
    el.style.transform = 'translate(-50%,-50%) scale(1.1)';
    el.style.zIndex = 960;
    el.style.transition = 'opacity .5s, transform .5s';
    el.style.pointerEvents = 'none';
    const layer = document.getElementById('fx-layer');
    if (layer) {
        layer.appendChild(el);
        ajusterTextes(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%,-50%) scale(1.5) rotate(8deg)';
        }, 420);
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
        modeAttente = true;
        tourActuel = 'bot';
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
    tempsRestant = 60;
    clearInterval(timer);
    majTimer();
    timer = setInterval(() => {
        tempsRestant--;
        majTimer();
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
        B.deck = hasard(decksPreconstruits).cartes.map(c => {
            const id = typeof c === 'string' ? c : c.id;
            return instancier(defCarte(id), 'B');
        }).filter(x => x);
        melanger(B.deck);
    }

    tourActuel = 'bot';
    selection = null;
    clearInterval(timer);
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

    let action = true;
    let securite = 0;
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
        enregistrerResultat(gagne);
        banniere(gagne ? 'Victoire !' : 'Défaite…');
        const bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
        if (bfNav) bfNav.hidden = true;
        if (bfIn) bfIn.hidden = true;
        const attente = document.getElementById('attente-overlay');
        if (attente) attente.classList.remove('open');
        setTimeout(() => { changerEcran('menu-screen'); }, 2200);
    }
}
function info(txt) { const el = document.getElementById('combat-info'); if (el) el.innerText = txt; }

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
                el.oncontextmenu = e => { e.preventDefault(); zoomCarte(e, c.id); };
                el.ondblclick = e => { e.stopPropagation(); zoomCarte(e, c.id); };
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
            el.oncontextmenu = e => { e.preventDefault(); zoomCarte(e, side.terrain.id); };
            el.ondblclick = e => { e.stopPropagation(); zoomCarte(e, side.terrain.id); };
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
            el.oncontextmenu = e => { e.preventDefault(); if (!m.jeton) zoomCarte(e, m.id); };
            el.ondblclick = e => { e.stopPropagation(); if (!m.jeton) zoomCarte(e, m.id); };
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
            el.oncontextmenu = e => { e.preventDefault(); if (!m.jeton) zoomCarte(e, m.id); };
            el.ondblclick = e => { e.stopPropagation(); if (!m.jeton) zoomCarte(e, m.id); };
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
            el.oncontextmenu = e => { e.preventDefault(); zoomCarte(e, c.id); };
            el.ondblclick = e => { e.stopPropagation(); zoomCarte(e, c.id); };
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

/* Utils divers */
function enregistrerResultat(gagne) {
    stats.parties++;
    if (gagne) stats.victoires++; else stats.defaites++;
    const ratio = stats.parties > 0 ? Math.round(stats.victoires / stats.parties * 100) : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('stat-parties', stats.parties);
    set('stat-victoires', stats.victoires);
    set('stat-defaites', stats.defaites);
    set('stat-ratio', ratio + '%');
}

function afficherProfil() {
    const p = document.getElementById('profil-pseudo');
    if (p) p.innerText = J.nom || 'Joueur';
    enregistrerResultat(null);
}

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
function fermerCimetiere() {
    const ov = document.getElementById('graveyard-overlay');
    if (ov) ov.classList.remove('open');
}

function ajouterLog(emoji, txt, side) {
    const log = document.getElementById('action-log');
    if (!log) return;
    const d = document.createElement('div');
    d.className = 'log-item ' + (side === J ? 'moi' : 'adv');
    d.textContent = emoji;
    d.title = txt;
    log.appendChild(d);
    if (log.children.length > 6) log.firstChild.remove();
}

function toggleEmotes(cle) {
    const menu = document.getElementById('emotes-' + cle);
    if (menu) menu.classList.toggle('hidden');
}
function jouerEmote(txt) {
    if (!modeEnLigne || !window.multiPartie || !window.multiPartie.active) {
        afficherEmote(J, txt);
        return;
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

/* DÉMARRAGE */
document.addEventListener('DOMContentLoaded', function() {
    try {
        const zone = document.getElementById('login-cards');
        if (zone) {
            ['m1','ma2','k1','ka1','f1'].forEach(id => {
                const c = defCarte(id);
                if (c) zone.appendChild(creerHTMLCarte(c, 'zoom'));
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
    enregistrerResultat(false);
    banniere('Forfait… Défaite');
    info('Tu as déclaré forfait. Retour au menu…');
    if (window.multiPartie && window.multiPartie.active && typeof signalerForfaitEnLigne === 'function') signalerForfaitEnLigne();
    const bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
    if (bfNav) bfNav.hidden = true;
    if (bfIn) bfIn.hidden = true;
    const attente = document.getElementById('attente-overlay');
    if (attente) attente.classList.remove('open');
    setTimeout(() => { changerEcran('menu-screen'); }, 2000);
}

/* ===========================================================
   FONCTIONS ADMIN ÉTENDUES
   =========================================================== */
function adminTab(tab) {
    ['actions','cartes','creation','annonces'].forEach(t => {
        const el = document.getElementById('admin-tab-' + t);
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'cartes') adminAfficherToutesCartes();
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
            sauvegarderProgression();
            adminAfficherToutesCartes();
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
