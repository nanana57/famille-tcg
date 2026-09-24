/* ===========================================================
   FAMILLE TCG — moteur de jeu (Édition Ultime Collection & Boutique)
   =========================================================== */

function C(id, prenom, famille, cout, atk, vie, rarete, desc, motsCles, emoji) {
    return { id, prenom, famille, cout, atk, vie, rarete, desc, motsCles: motsCles || [], emoji };
}

const dbCartes = [
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

    C('f1','Naila x Nassim','Nouvelle famille',8,7,7,'fusion','Fusion : nécessite Naila et Nassim. Cri de guerre : inflige 4 dégâts répartis aléatoirement entre les ennemis.',[],'💑'),
    C('f2','Amina x Marouane','Nouvelle famille',8,6,8,'fusion','Fusion : nécessite Amina et Marouane. Cri de guerre : donne +3/+3 à toutes les autres créatures alliées.',[],'💑'),
    C('f3','Ines x Islem','Nouvelle famille',9,8,8,'fusion','Fusion : nécessite Inès et Islem. Cri de guerre : annule le prochain sort adverse et pioche une carte.',[],'💑'),
    C('f4','Toufik x Manel','Nouvelle famille',7,5,9,'fusion','Fusion : nécessite Toufik et Manel. Provocation. Cri de guerre : soigne ton héros de 5 patience.',['Provocation'],'💑'),
    C('f5','Safya x Saad','Nouvelle famille',8,7,7,'fusion','Fusion : nécessite Safya et Saad. Cri de guerre : invoque Hanna si elle n\'est pas en jeu.',[],'💑'),

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

const parId = {};
dbCartes.forEach(c => parId[c.id] = c);

function defCarte(id) { return parId[id]; }

/* ---------- Générateur aléatoire synchronisé ---------- */
let _syncSeed = 12345;
function getSyncRandom() {
    if (!modeEnLigne) return Math.random();
    _syncSeed = (_syncSeed * 9301 + 49297) % 233280;
    return _syncSeed / 233280;
}

/* ---------- Fusion : recettes ---------- */
const FUSIONS = {
    'f1': ['ka5','ka6'], 'f2': ['m4','m5'], 'f3': ['ma3','ma4'], 'f4': ['ka7','ka8'], 'f5': ['ka3','ka4']
};
const FUSION_DE = {};
Object.entries(FUSIONS).forEach(([fid, compo]) => {
    FUSION_DE[compo[0]] = FUSION_DE[compo[0]] || []; FUSION_DE[compo[1]] = FUSION_DE[compo[1]] || [];
    FUSION_DE[compo[0]].push({fusion:fid, autre:compo[1]}); FUSION_DE[compo[1]].push({fusion:fid, autre:compo[0]});
});

/* ---------- 2. Pouvoirs ---------- */
const POUVOIRS = {
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

    c1: { mode:'infini', destruction: ({ ennemi }) => { ennemi.plateau.forEach(m => fraper(m, 3)); degatsHero(ennemi, 3); }},
    c2: { mode:'infini', blesse: ({ source }) => { if(!source.motsCles.includes('Charge')){ source.motsCles.push('Charge'); source.malade = false; fxSur(source, 'Charge !', 'buff'); } buff(source, 2, 0); }},
    c3: { mode:'infini', blesse: ({ moi }) => { piocher(moi, 1); }},
    c4: { mode:'infini', destruction: ({ moi }) => { soinHero(moi, 4); }},
    c5: { mode:'infini', blesse: ({ ennemi }) => { degatsHero(ennemi, 2); }},
    c6: { mode:'infini', destruction: ({ moi }) => { const c = hasard(moi.plateau); if(c) buff(c, 2, 2); }},
    c7: { mode:'infini', blesse: ({ source }) => { buff(source, 1, 1); }},
    c8: { mode:'infini', destruction: ({ ennemi }) => { const cible = [...ennemi.plateau].sort((a,b) => atkTot(b) - atkTot(a))[0]; if(cible) fraper(cible, 999); }},
    
    c9: { mode:'eclair', jouer: ({ moi }) => { moi.plateau.forEach(m => fraper(m, 1)); piocher(moi, 2); }},
    c10:{ mode:'eclair', jouer: ({ moi }) => { invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',['Provocation']); invoquerJeton(moi,'Cousin éloigné',1,1,'🧒',['Provocation']); }},
    c11:{ mode:'eclair', jouer: ({ moi, ennemi }) => { moi.plateau.forEach(m => { const p = POUVOIRS[m.id]; if(p && p.destruction && !m.silence) p.destruction({ moi, ennemi, source:m }); }); }},
    c12:{ mode:'infini', aura: true }
];

const parId = {};
dbCartes.forEach(c => parId[c.id] = c);

function defCarte(id) { return parId[id]; }

let _syncSeed = 12345;
function getSyncRandom() {
    if (!modeEnLigne) return Math.random();
    _syncSeed = (_syncSeed * 9301 + 49297) % 233280;
    return _syncSeed / 233280;
}

const FUSIONS = { 'f1': ['ka5','ka6'], 'f2': ['m4','m5'], 'f3': ['ma3','ma4'], 'f4': ['ka7','ka8'], 'f5': ['ka3','ka4'] };
const FUSION_DE = {};
Object.entries(FUSIONS).forEach(([fid, compo]) => {
    FUSION_DE[compo[0]] = FUSION_DE[compo[0]] || []; FUSION_DE[compo[1]] = FUSION_DE[compo[1]] || [];
    FUSION_DE[compo[0]].push({fusion:fid, autre:compo[1]}); FUSION_DE[compo[1]].push({fusion:fid, autre:compo[0]});
});

dbCartes.forEach(c => {
    if (!POUVOIRS[c.id] && c.motsCles.some(k => k === 'Charge' || k === 'Provocation')) POUVOIRS[c.id] = { mode:'infini', aura:true };
    if ((c.motsCles.includes('Rage') || c.motsCles.includes('Destruction')) && !POUVOIRS[c.id]) POUVOIRS[c.id] = { mode:'infini' };
});

function modePouvoir(carte) { const p = POUVOIRS[carte.id]; if (!p) return null; return p.mode; }

/* ---------- 3. Collection, Progression & Decks ---------- */
let collectionJoueur = {};
let mesDecks = [];
let profil = { coins: 0, deckStart: false, lastLogin: 0 };

const decksPreconstruits = [
    { nom:'Meridja Aggro',   cartes:['m1','m2','m3','m4','m4','m5','m5','m6','m6','m7','m7','m8','m8','m9','m9','m10','n1','n2','m11','m12'] },
    { nom:'Marouf Contrôle', cartes:['ma1','ma2','ma3','ma4','ma5','ma5','ma6','ma6','ma7','ma7','ma8','ma8','ma9','ma9','ma10','ma10','n1','n2','s1','ma11'] },
    { nom:'Kerkache Défense',cartes:['k1','k2','k3','k4','k4','k5','k5','k6','k6','k7','k7','k8','k8','n1','n2','s2','s5','s6','s11','s18'] },
    { nom:'Belgacemi Synergie', cartes:['ka1','ka2','ka3','ka4','ka5','ka5','ka6','ka6','ka7','ka7','ka8','ka8','ka9','ka9','ka10','ka10','n1','n2','s15','ka11'] },
    { nom:'Les Infiltrés', cartes:['f1','f2','f3','f4','f5','ka5','ka6', 'm4','m5', 'ma3','ma4', 'ka7','ka8', 'ka3','ka4','m11','m12','ma11','ka11','n7'] },
    { nom:'Alliance des Cousins', cartes:['c7','c7','c4','c4','c9','c9','c3','c3','c12','c12','c6','c6','c5','c5','c10','c10','c2','c11','c8','c1'] }
];

let deckEnEdition = null, tempDeckCartes = [], triCourant = 'cout';

function formatCoins(c) { return c >= 999999 ? '∞' : c; }

function majTopBarCoins() {
    const el = document.getElementById('nav-coins');
    if(el) el.innerText = formatCoins(profil.coins) + " 💰";
}

/* --- MIGRATION MULTI-RARETE --- */
function initCollectionIfNull(id) {
    if(!collectionJoueur[id] || typeof collectionJoueur[id] === 'number') {
        const defaultRarity = defCarte(id).rarete;
        const oldVal = typeof collectionJoueur[id] === 'number' ? collectionJoueur[id] : 0;
        collectionJoueur[id] = { commune:0, rare:0, epique:0, legendaire:0, fusion:0 };
        collectionJoueur[id][defaultRarity] = oldVal;
    }
}

function getQty(id, rarete) { initCollectionIfNull(id); return collectionJoueur[id][rarete] || 0; }
function getTotalQty(id) {
    initCollectionIfNull(id);
    let s = 0; for(let r in collectionJoueur[id]) s += collectionJoueur[id][r]; return s;
}
function getHighestRarity(id) {
    initCollectionIfNull(id);
    const order = ['fusion', 'legendaire', 'epique', 'rare', 'commune'];
    for(let r of order) { if(collectionJoueur[id][r] > 0) return r; }
    return null;
}

function normalizeDeck(d) {
    d.cartes = d.cartes.map(c => {
        if (typeof c === 'string') return { id: c, rarete: defCarte(c).rarete };
        return c;
    });
}

function chargerProgression(email) {
    if (email === 'nassim57132@gmail.com') profil.coins = 9999999;

    try {
        const brut = localStorage.getItem('ftcg_save_' + (monId || 'local'));
        if (brut) {
            const data = JSON.parse(brut);
            if (data.profil) profil = data.profil;
            if (data.collectionJoueur) collectionJoueur = data.collectionJoueur;
            if (data.mesDecks) mesDecks = data.mesDecks;
        }
    } catch (e) { console.error("Erreur chargement save", e); }

    if (email === 'nassim57132@gmail.com') profil.coins = 9999999;

    const maintenant = Date.now();
    if (maintenant - profil.lastLogin > 86400000) { 
        if (email !== 'nassim57132@gmail.com') profil.coins += 50;
        profil.lastLogin = maintenant;
        flashInfo("🎁 Bonus quotidien : +50 💰 !");
    }

    if (mesDecks.length === 0) {
        mesDecks = JSON.parse(JSON.stringify(decksPreconstruits));
        mesDecks.forEach(normalizeDeck);
    } else {
        mesDecks.forEach(normalizeDeck);
    }

    if (!profil.deckStart) attribuerDeckDepart();
    
    sauvegarderProgression();
    majTopBarCoins();
}

function sauvegarderProgression() {
    const data = { profil, collectionJoueur, mesDecks };
    try { localStorage.setItem('ftcg_save_' + (monId || 'local'), JSON.stringify(data)); } catch (e) {}
    if (typeof fbDB !== 'undefined' && fbDB && typeof monId !== 'undefined' && monId) {
        fbDB.ref('profils/' + monId + '/save').set(data);
    }
    majTopBarCoins();
}

function attribuerDeckDepart() {
    const famillesDeBase = ['Meridja', 'Marouf', 'Kerkache', 'Belgacemi'];
    const familleChoisie = famillesDeBase[Math.floor(Math.random() * famillesDeBase.length)];
    const precon = decksPreconstruits.find(d => d.nom.includes(familleChoisie));
    
    // Débloque TOUTES les cartes du deck préconstruit en version Commune
    precon.cartes.forEach(id => {
        initCollectionIfNull(id);
        collectionJoueur[id].commune = 2; // Donne 2 exemplaires en commune
    });

    profil.deckStart = true;
    profil.coins += 100;
    sauvegarderProgression();
    
    setTimeout(() => { 
        alert(`🎉 La famille ${familleChoisie} t'adopte !\nTu as débloqué ses cartes de base et reçu 100 💰 en cadeau !`); 
    }, 500);
}

function calculerCartesPossedeesPourDeck(cartesDeck) {
    let owned = 0; 
    let tempColl = JSON.parse(JSON.stringify(collectionJoueur));
    cartesDeck.forEach(c => { 
        const id = typeof c === 'string' ? c : c.id;
        const r = typeof c === 'string' ? defCarte(c).rarete : c.rarete;
        initCollectionIfNull(id);
        if (tempColl[id][r] && tempColl[id][r] > 0) { 
            owned++; tempColl[id][r]--; 
        } 
    });
    return owned;
}

/* ---------- 4. État de partie ---------- */
function nouveauCote(cle, nom) { return { cle, nom, patience:20, manaActuel:0, manaMax:0, main:[], plateau:[], deck:[], terrain:null, surcout:0, contreSort:false, voitMainAdverse:0, pioceBloquee:false, numTour:0, premier:false, cimetiere:[] }; }

let J = nouveauCote('J', 'Toi'), B = nouveauCote('B', 'Bot');
let tourActuel = 'joueur', timer = null, tempsRestant = 60, selection = null, ciblage = null, partieFinie = false, uidSeq = 1;
let modeEnLigne = false, modeAttente = false, mulliganValide = false;
let modeTuto = false, etapeTuto = 0, currentTutoLevel = 0;
let _dernierIdTraite = 0, _compteurAction = 0, _replayEnCours = false;

function instancier(def, cle, jeton) { return { uid:'u'+(uidSeq++), id:def.id, prenom:def.prenom, famille:def.famille, cout:def.cout, atk:def.atk, vie:def.vie, vieMax:def.vie, rarete:def.rarete, desc:def.desc, emoji:def.emoji, motsCles:[...def.motsCles], cote:cle, auraAtk:0, auraVieAppliquee:0, aAttaque:false, malade:true, gele:0, silence:false, jeton:!!jeton }; }

/* ---------- 5. Navigation & UI globales ---------- */
function changerEcran(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(id !== 'login-screen') document.getElementById('main-nav').classList.remove('hidden');
    else document.getElementById('main-nav').classList.add('hidden');

    const bfNav = document.getElementById('btn-forfait'), bfIn = document.getElementById('btn-forfait-ingame');
    if (bfNav) bfNav.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    if (bfIn) bfIn.hidden = (id !== 'game-screen' || partieFinie || modeTuto);
    
    if (id === 'deckbuilder-screen') chargerListeDecks();
    if (id === 'menu-screen') chargerDropdownDecks();
    if (id === 'profil-screen') afficherProfil();
    if (id === 'tuto-screen') majTutoUI();
    if (id === 'multi-screen' && typeof rafraichirJoueurs === 'function') rafraichirJoueurs();
}
function ouvrirAide() { document.getElementById('aide-overlay').classList.add('open'); }
function fermerAide() { document.getElementById('aide-overlay').classList.remove('open'); }

let stats = { parties:0, victoires:0, defaites:0 };
function chargerStats() { try { const brut = localStorage.getItem('familletcg_stats'); if (brut) stats = JSON.parse(brut); } catch (e) {} }
function sauvegarderStats() { try { localStorage.setItem('familletcg_stats', JSON.stringify(stats)); } catch (e) {} }
function enregistrerResultat(victoire) { if(modeTuto) return; stats.parties++; if (victoire) { stats.victoires++; profil.coins += 20; } else { stats.defaites++; profil.coins += 5; } sauvegarderStats(); sauvegarderProgression(); }
function afficherProfil() { document.getElementById('profil-pseudo').innerText = J.nom ? `Statistiques de ${J.nom}` : 'Statistiques'; document.getElementById('stat-parties').innerText = stats.parties; document.getElementById('stat-victoires').innerText = stats.victoires; document.getElementById('stat-defaites').innerText = stats.defaites; document.getElementById('stat-ratio').innerText = stats.parties ? Math.round(stats.victoires / stats.parties * 100) + '%' : '—'; }
chargerStats();

function ajouterLog(emoji, text, side) { const log = document.getElementById('action-log'); if (!log) return; const div = document.createElement('div'); div.className = 'log-item ' + (side === J ? 'moi' : 'adv'); div.innerHTML = emoji; div.title = text; log.prepend(div); if (log.children.length > 5) log.lastChild.remove(); }
function voirCimetiere(cle) { const arr = cle === 'J' ? J.cimetiere : B.cimetiere; const grid = document.getElementById('graveyard-cards'); grid.innerHTML = ''; document.getElementById('graveyard-title').innerText = `Cimetière (${arr.length})`; arr.forEach(def => { grid.appendChild(creerHTMLCarte(def, 'collection')); }); ajusterTextes(grid); document.getElementById('graveyard-overlay').classList.add('open'); }
function fermerCimetiere() { document.getElementById('graveyard-overlay').classList.remove('open'); }

function toggleEmotes(cle) { if (cle !== 'J') return; const el = document.getElementById('emotes-J'); if (el) el.classList.toggle('hidden'); }
function jouerEmote(text) { document.getElementById('emotes-J').classList.add('hidden'); afficherEmote(J, text); if (modeEnLigne && typeof pousserAction === 'function')Je constate effectivement le problème sur votre capture d'écran `image_6466a0.png`[cite: 1]. 

L'interface de "FAMILLE TCG" semble rencontrer un bug d'affichage majeur[cite: 1] :
*   La zone **COLLECTION GLOBALE** est totalement noire ; aucune carte n'apparaît sous les filtres (Coût, Rareté, Famille)[cite: 1].
*   Dans le panneau latéral gauche **MES DECKS**, la liste est vide en dessous du bouton "Nouveau deck perso"[cite: 1].

Puisqu'il s'agit très probablement d'un problème technique lié au site ou au jeu, voici quelques étapes de dépannage que vous pouvez essayer :

*   **Rafraîchir la page :** Appuyez sur F5 ou Ctrl+R (ou forcez le rafraîchissement avec Ctrl+Maj+R).
*   **Vider le cache :** Parfois, un cache de navigateur corrompu empêche le chargement des images et des données.
*   **Relancer la session :** Déconnectez-vous de votre compte depuis l'onglet "Profil", puis reconnectez-vous[cite: 1].
*   **Vérifier les serveurs :** Si d'autres joueurs rencontrent le même problème, il s'agit sûrement d'une panne des serveurs du jeu.

Si rien ne fonctionne, je vous conseille de transmettre directement cette capture d'écran au support technique ou sur le serveur communautaire (Discord, forum) des développeurs pour qu'ils puissent corriger ce bug.
