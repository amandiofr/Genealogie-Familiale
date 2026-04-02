// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  i18n — Traductions FR / PT
// ══════════════════════════════════════════════════════════════
const LANGS = {
  fr: {
    // Nav
    nav_tree:'Arbre', nav_list:'Membres', nav_events:'Événements',
    nav_reunions:'Réunions', nav_anecdotes:'Anecdotes', nav_timeline:'Chronologie', nav_admin:'Admin',
    // Site title & page headers
    site_title:'Notre Famille',
    h_membres:'Membres', h_events:'Événements', h_reunions:'Réunions familiales', h_anecdotes:'Anecdotes', h_timeline:'Frise chronologique',
    h_admin:'Administration',
    h_repartition:'Répartition par génération',
    h_longevite:'Longévité la plus élevée',
    // Header
    logout:'Déconnexion',
    // List
    search_placeholder:'Rechercher par nom, lieu, profession…',
    filter_all:'Tous', filter_male:'Hommes', filter_female:'Femmes',
    filter_living:'Vivants', filter_deceased:'Décédés',
    add_person:'+ Ajouter',
    // Tree
    tree_hint:'Cliquez sur une personne pour voir sa fiche',
    tree_mode_full:'Arbre complet', tree_mode_compact:'Vue compacte',
    // Person modal
    sec_info:'Informations', sec_famille:'Famille', sec_photos:'Photos',
    sec_bio:'Biographie', sec_events:'Événements', sec_anecdotes:'Anecdotes',
    lbl_naiss:'Naissance', lbl_age:'Âge', lbl_deces:'Décès', lbl_job:'Profession',
    btn_edit:'✏️ Modifier', btn_photos:'📷 Photos', btn_delete:'🗑',
    avatar_set:'Avatar mis à jour',
    deceased_m:'décédé', deceased_f:'décédée',
    ne_m:'né en', ne_f:'née en',
    ne_label:'né', nee_label:'née',
    // Events
    add_event:'+ Ajouter', add_reunion:'+ Ajouter', add_anecdote:'+ Écrire',
    sec_participants:'Participants', sec_description:'Description',
    // Stats
    stat_membres:'Membres', stat_vivants:'Vivants', stat_decedes:'Décédés',
    stat_gens:'Générations', stat_professions:'Professions renseignées',
    stat_photos:'Avec une photo', stat_repartition:'Répartition par génération',
    stat_longevite:'Longévité la plus élevée', stat_ans:'ans',
    // Admin
    admin_comptes:'Gestion des comptes', admin_export:'Export des données',
    admin_import:'Importer des données', admin_password:'Changer mon mot de passe',
    admin_new_user:'+ Nouveau compte', admin_save:'Enregistrer',
    admin_orphans:'Fichiers non utilisés', admin_orphans_desc:'Fichiers présents dans uploads/ mais non référencés en base de données.',
    admin_orphans_scan:'Scanner', admin_orphans_scanning:'Scan en cours…',
    admin_orphans_none:'Aucun fichier orphelin.', admin_orphans_delete_all:'Tout supprimer',
    admin_orphans_confirm:'Supprimer tous les fichiers orphelins ?',
    admin_orphans_deleted:'Fichiers orphelins supprimés',
    import_ged:'Fichier GEDCOM (.ged)', import_json:'Fichier JSON (export précédent)',
    pwd_old:'Ancien mot de passe', pwd_new:'Nouveau mot de passe', pwd_save:'Modifier',
    btn_import_ged:'Importer GEDCOM', btn_import_json:'Importer JSON',
    // Forms
    form_prenom:'Prénom', form_nom:'Nom', form_nom_naiss:'Nom de naissance',
    form_genre:'Genre', form_homme:'Homme', form_femme:'Femme', form_autre:'Autre',
    form_naiss:'Date de naissance', form_lieu_naiss:'Lieu de naissance',
    form_deces:'Date de décès', form_lieu_deces:'Lieu de décès',
    form_generation:'Génération', form_job:'Profession', form_bio:'Biographie / Notes',
    form_cancel:'Annuler', form_save:'💾 Enregistrer',
    form_lien_type:'Type de lien', form_lien_with:'Avec qui', form_lien_none:'— aucun —',
    // Empty states
    sort_date:'Date de naissance', sort_alpha:'Alphabétique',
    nb_personnes_label:'personne(s)',
    empty_events:'Aucun événement', empty_events_sub:'Ajoutez votre premier événement familial',
    empty_reunions:'Aucune réunion', empty_reunions_sub:'Ajoutez votre première réunion familiale',
    empty_timeline:'Aucun événement daté', empty_timeline_sub:'Ajoutez des membres ou des événements avec une date',
    tl_label_life:'Naissances & Décès', tl_label_mariage:'Mariages', tl_label_other:'Autres événements',
    empty_anecdotes:'Aucune anecdote', empty_anecdotes_sub:'Écrivez la première histoire familiale',
    empty_search:'Aucun résultat',
    // Roles
    role_lecteur:'Lecteur', role_editeur:'Éditeur', role_admin:'Admin',
    // Avatar événement
    event_avatar_set:'Avatar de l\'événement mis à jour',
    event_favourite:'favori',
    btn_delete_photo:'Supprimer la photo',
    // Toasts
    toast_added:'Personne ajoutée', toast_edited:'Personne modifiée',
    toast_deleted:'Personne supprimée', toast_event_added:'Événement ajouté',
    toast_event_edited:'Événement modifié', toast_event_deleted:'Événement supprimé',
    toast_reunion_added:'Réunion ajoutée', toast_reunion_edited:'Réunion modifiée', toast_reunion_deleted:'Réunion supprimée',
    toast_anec_added:'Anecdote ajoutée', toast_anec_edited:'Anecdote modifiée',
    toast_anec_deleted:'Anecdote supprimée', toast_user_created:'Compte créé',
    toast_user_deleted:'Compte supprimé', toast_pwd:'Mot de passe modifié',
    // Confirmations
    confirm_delete_person:'Supprimer définitivement cette personne ?',
    confirm_delete_lien:'Supprimer ce lien familial ?', toast_lien_deleted:'Lien supprimé',
    form_title_add_link:'Ajouter un lien familial', form_title_edit_link:'Modifier le lien',
    toast_lien_edited:'Lien modifié', lbl_personne_concernee:'Personne concernée',
    lbl_date_debut:'Date début', lbl_date_fin:'Date fin', lbl_notes:'Notes',
    ph_notes_lien:'Ex : Mariés à Lyon…', toast_lien_added:'Lien ajouté',
    lbl_upload_max_each:'JPEG, PNG, WebP — max 20 Mo chacune',
    ph_titre_event:'Ex : Mariage de Thomas et Claire',
    ph_lieu:'Paris, France',
    ph_desc_event:'Racontez cet événement…',
    ph_desc_reunion:'Racontez cette réunion…',
    ph_titre_reunion:'Ex : Réunion de famille 2024',
    ph_titre_anec:'Ex : L\'été où grand-père a construit la cabane',
    ph_contenu_anec:'Racontez cette histoire…',
    ph_date_anec:'Ex : 1972, Été 1985…',
    ph_marque:'Ex : Citroën', ph_modele:'Ex : DS 21', ph_couleur:'Bleu nuit',
    ph_desc_auto:'Anecdotes, histoire de la voiture…',
    ph_prenom_nom:'Prénom Nom', ph_password:'Min. 8 caractères',
    confirm_delete_event:'Supprimer cet événement ?',
    confirm_delete_reunion:'Supprimer cette réunion ?',
    confirm_delete_anec:'Supprimer cette anecdote ?',
    confirm_delete_user:'Supprimer ce compte ?',
    // Famille rôles
    role_conjoint:'Conjoint(e)', role_pere:'Père', role_mere:'Mère',
    role_fils:'Fils', role_fille:'Fille', lbl_enfants:'Enfants',
    // Gen labels
    gen_0:'Ancêtres fondateurs', gen_1:'Arrière-grands-parents',
    gen_2:'Grands-parents', gen_3:'Parents', gen_4:'Votre génération',
    gen_5:'Enfants', gen_6:'Petits-enfants',
    // Form titles
    form_title_new_person:'Nouvelle personne', form_title_edit:'Modifier',
    form_title_new_event:'Nouvel événement', form_title_new_reunion:'Nouvelle réunion',
    form_title_new_anec:'Nouvelle anecdote',
    form_title_new_user:'Nouveau compte',
    // Form field labels
    lbl_date:'Date', form_titre:'Titre', form_type:'Type',
    form_date_debut:'Date début', form_date_fin:'Date fin (si étalé)',
    form_lieu:'Lieu', form_contenu:'Contenu', form_date_approx:'Date approximative',
    form_written_by:'Écrit par', form_email:'Email',
    form_password:'Mot de passe', form_role:'Rôle',
    form_participants:'Participants (Ctrl+clic pour sélection multiple)',
    form_mentions:'Personnes mentionnées',
    // Role descriptions (user form)
    role_lecteur_desc:'Lecteur — consultation uniquement',
    role_editeur_desc:'Éditeur — peut ajouter/modifier',
    role_admin_desc:'Administrateur — accès total',
    // Photo / avatar
    btn_add_link:'+ Ajouter un lien familial',
    lien_conjoint:'Marié(e) avec', lien_parent_a:'Est parent de',
    lien_parent_b:'A pour parent', lien_fiancailles:'Fiancé(e) avec',
    lbl_avatar:'avatar', title_set_avatar:'Définir comme avatar',
    lbl_add_photos:'Ajouter des photos',
    lbl_upload_hint:'Cliquez ou déposez vos photos', lbl_upload_hint_touch:'Appuyez pour choisir des photos',
    lbl_legende:'Légende (optionnelle)', lbl_legende_ph:'Ex : Été 1985 à Marseille',
    lbl_upload_send:'📤 Envoyer', lbl_upload_max:'JPEG, PNG, WebP — max 20 Mo chacune',
    lbl_by:'Par', lbl_with:'Avec', btn_create_account:'Créer le compte',
    // Event type labels
    evt_mariage:'Mariage', evt_naissance:'Naissance', evt_deces:'Décès',
    evt_rencontre:'Rencontre', evt_voyage:'Voyage', evt_reunion:'Réunion',
    evt_fete:'Fête', evt_autre:'Autre',
    // Errors & validation
    error_name_required:'Prénom requis',
    error_title_required:'Titre requis',
    error_title_content_required:'Titre et contenu requis',
    error_no_photo:'Aucune photo sélectionnée',
    error_select_file:'Sélectionnez un fichier',
    toast_photos_added:'Photos ajoutées',
    // Notifications
    admin_notif:'Notifications par e-mail',
    admin_notif_desc:'Liste des adresses à prévenir lors de modifications. Un e-mail au maximum par jour, envoyé 1 heure après la dernière modification.',
    notif_empty:'Aucune adresse configurée',
    notif_added:'Adresse ajoutée',
    notif_deleted:'Adresse supprimée',
    notif_confirm_delete:'Supprimer cette adresse de notification ?',
    btn_notif_add:'+ Ajouter',
    author_placeholder:'Prénom',
    autologin_copy:'Générer un lien de connexion', autologin_copied:'Lien copié dans le presse-papiers',
    // Autos
    lbl_et:'et',
    nav_autos:'Autos', h_autos:'Autos de famille', add_auto:'+ Ajouter',
    empty_autos:'Aucune voiture', empty_autos_sub:'Ajoutez la première voiture de la famille',
    form_title_new_auto:'Nouvelle voiture',
    form_marque:'Marque', form_modele:'Modèle', form_annee:'Année', form_couleur:'Couleur',
    form_owner:'Propriétaire', form_owner_none:'— Aucun —',
    toast_auto_added:'Voiture ajoutée', toast_auto_edited:'Voiture modifiée', toast_auto_deleted:'Voiture supprimée',
    confirm_delete_auto:'Supprimer cette voiture ?',
  },
  pt: {
    nav_tree:'Árvore', nav_list:'Membros', nav_events:'Eventos',
    nav_reunions:'Reuniões', nav_anecdotes:'Anedotas', nav_timeline:'Cronologia', nav_admin:'Admin',
    // Site title & page headers
    site_title:'Nossa Família',
    h_membres:'Membros', h_events:'Eventos', h_reunions:'Reuniões familiares', h_anecdotes:'Anedotas', h_timeline:'Linha do tempo',
    h_admin:'Administração',
    h_repartition:'Distribuição por geração',
    h_longevite:'Maior longevidade',
    logout:'Sair',
    search_placeholder:'Pesquisar por nome, local, profissão…',
    filter_all:'Todos', filter_male:'Homens', filter_female:'Mulheres',
    filter_living:'Vivos', filter_deceased:'Falecidos',
    add_person:'+ Adicionar',
    tree_hint:'Clique numa pessoa para ver a sua ficha',
    tree_mode_full:'Árvore completa', tree_mode_compact:'Vista compacta',
    sec_info:'Informações', sec_famille:'Família', sec_photos:'Fotos',
    sec_bio:'Biografia', sec_events:'Eventos', sec_anecdotes:'Anedotas',
    lbl_naiss:'Nascimento', lbl_age:'Idade', lbl_deces:'Falecimento', lbl_job:'Profissão',
    btn_edit:'✏️ Editar', btn_photos:'📷 Fotos', btn_delete:'🗑',
    avatar_set:'Avatar atualizado',
    deceased_m:'falecido', deceased_f:'falecida',
    ne_m:'nascido em', ne_f:'nascida em',
    ne_label:'nascido', nee_label:'nascida',
    add_event:'+ Adicionar', add_reunion:'+ Adicionar', add_anecdote:'+ Escrever',
    sec_participants:'Participantes', sec_description:'Descrição',
    stat_membres:'Membros', stat_vivants:'Vivos', stat_decedes:'Falecidos',
    stat_gens:'Gerações', stat_professions:'Profissões registadas',
    stat_photos:'Com foto', stat_repartition:'Distribuição por geração',
    stat_longevite:'Maior longevidade', stat_ans:'anos',
    admin_comptes:'Gestão de contas', admin_export:'Exportar dados',
    admin_import:'Importar dados', admin_password:'Alterar a minha palavra-passe',
    admin_new_user:'+ Nova conta', admin_save:'Guardar',
    admin_orphans:'Ficheiros não utilizados', admin_orphans_desc:'Ficheiros presentes em uploads/ mas não referenciados na base de dados.',
    admin_orphans_scan:'Analisar', admin_orphans_scanning:'A analisar…',
    admin_orphans_none:'Nenhum ficheiro órfão.', admin_orphans_delete_all:'Eliminar tudo',
    admin_orphans_confirm:'Eliminar todos os ficheiros órfãos?',
    admin_orphans_deleted:'Ficheiros órfãos eliminados',
    import_ged:'Ficheiro GEDCOM (.ged)', import_json:'Ficheiro JSON (exportação anterior)',
    pwd_old:'Palavra-passe atual', pwd_new:'Nova palavra-passe', pwd_save:'Alterar',
    btn_import_ged:'Importar GEDCOM', btn_import_json:'Importar JSON',
    form_prenom:'Primeiro nome', form_nom:'Apelido', form_nom_naiss:'Nome de solteira',
    form_genre:'Género', form_homme:'Homem', form_femme:'Mulher', form_autre:'Outro',
    form_naiss:'Data de nascimento', form_lieu_naiss:'Local de nascimento',
    form_deces:'Data de falecimento', form_lieu_deces:'Local de falecimento',
    form_generation:'Geração', form_job:'Profissão', form_bio:'Biografia / Notas',
    form_cancel:'Cancelar', form_save:'💾 Guardar',
    form_lien_type:'Tipo de ligação', form_lien_with:'Com quem', form_lien_none:'— nenhum —',
    sort_date:'Data de nascimento', sort_alpha:'Alfabético',
    nb_personnes_label:'pessoa(s)',
    empty_events:'Nenhum evento', empty_events_sub:'Adicione o primeiro evento familiar',
    empty_reunions:'Nenhuma reunião', empty_reunions_sub:'Adicione a primeira reunião familiar',
    empty_timeline:'Nenhum evento com data', empty_timeline_sub:'Adicione membros ou eventos com uma data',
    tl_label_life:'Nascimentos & Óbitos', tl_label_mariage:'Casamentos', tl_label_other:'Outros eventos',
    empty_anecdotes:'Nenhuma anedota', empty_anecdotes_sub:'Escreva a primeira história familiar',
    empty_search:'Sem resultados',
    role_lecteur:'Leitor', role_editeur:'Editor', role_admin:'Admin',
    event_avatar_set:'Avatar do evento atualizado',
    event_favourite:'favorito',
    btn_delete_photo:'Eliminar foto',
    toast_added:'Pessoa adicionada', toast_edited:'Pessoa modificada',
    toast_deleted:'Pessoa eliminada', toast_event_added:'Evento adicionado',
    toast_event_edited:'Evento modificado', toast_event_deleted:'Evento eliminado',
    toast_reunion_added:'Reunião adicionada', toast_reunion_edited:'Reunião modificada', toast_reunion_deleted:'Reunião eliminada',
    toast_anec_added:'Anedota adicionada', toast_anec_edited:'Anedota modificada',
    toast_anec_deleted:'Anedota eliminada', toast_user_created:'Conta criada',
    toast_user_deleted:'Conta eliminada', toast_pwd:'Palavra-passe alterada',
    confirm_delete_person:'Eliminar definitivamente esta pessoa?',
    confirm_delete_lien:'Eliminar esta ligação familiar?', toast_lien_deleted:'Ligação eliminada',
    form_title_add_link:'Adicionar ligação familiar', form_title_edit_link:'Modificar ligação',
    toast_lien_edited:'Ligação modificada', lbl_personne_concernee:'Pessoa em questão',
    lbl_date_debut:'Data início', lbl_date_fin:'Data fim', lbl_notes:'Notas',
    ph_notes_lien:'Ex : Casados em Lyon…', toast_lien_added:'Ligação adicionada',
    lbl_upload_max_each:'JPEG, PNG, WebP — máx 20 Mo cada',
    ph_titre_event:'Ex : Casamento de Tomás e Clara',
    ph_lieu:'Paris, França',
    ph_desc_event:'Conte este evento…',
    ph_desc_reunion:'Conte esta reunião…',
    ph_titre_reunion:'Ex : Reunião de família 2024',
    ph_titre_anec:'Ex : O verão em que o avô construiu a cabana',
    ph_contenu_anec:'Conte esta história…',
    ph_date_anec:'Ex : 1972, Verão 1985…',
    ph_marque:'Ex : Citroën', ph_modele:'Ex : DS 21', ph_couleur:'Azul-escuro',
    ph_desc_auto:'Anedotas, história do carro…',
    ph_prenom_nom:'Nome Apelido', ph_password:'Mín. 8 caracteres',
    confirm_delete_event:'Eliminar este evento?',
    confirm_delete_reunion:'Eliminar esta reunião?',
    confirm_delete_anec:'Eliminar esta anedota?',
    confirm_delete_user:'Eliminar esta conta?',
    role_conjoint:'Cônjuge', role_pere:'Pai', role_mere:'Mãe',
    role_fils:'Filho', role_fille:'Filha', lbl_enfants:'Filhos',
    gen_0:'Antepassados fundadores', gen_1:'Bisavós',
    gen_2:'Avós', gen_3:'Pais', gen_4:'A sua geração',
    gen_5:'Filhos', gen_6:'Netos',
    // Form titles
    form_title_new_person:'Nova pessoa', form_title_edit:'Editar',
    form_title_new_event:'Novo evento', form_title_new_reunion:'Nova reunião',
    form_title_new_anec:'Nova anedota',
    form_title_new_user:'Nova conta',
    // Form field labels
    lbl_date:'Data', form_titre:'Título', form_type:'Tipo',
    form_date_debut:'Data início', form_date_fin:'Data fim (se prolongado)',
    form_lieu:'Local', form_contenu:'Conteúdo', form_date_approx:'Data aproximada',
    form_written_by:'Escrito por', form_email:'Email',
    form_password:'Palavra-passe', form_role:'Função',
    form_participants:'Participantes (Ctrl+clique para seleção múltipla)',
    form_mentions:'Pessoas mencionadas',
    // Role descriptions (user form)
    role_lecteur_desc:'Leitor — consulta apenas',
    role_editeur_desc:'Editor — pode adicionar/modificar',
    role_admin_desc:'Administrador — acesso total',
    // Photo / avatar
    btn_add_link:'+ Adicionar ligação familiar',
    lien_conjoint:'Casado(a) com', lien_parent_a:'É pai/mãe de',
    lien_parent_b:'Tem como pai/mãe', lien_fiancailles:'Noivo(a) de',
    lbl_avatar:'avatar', title_set_avatar:'Definir como avatar',
    lbl_add_photos:'Adicionar fotos',
    lbl_upload_hint:'Clique ou solte as suas fotos', lbl_upload_hint_touch:'Toque para escolher fotos',
    lbl_legende:'Legenda (opcional)', lbl_legende_ph:'Ex : Verão 1985 em Marselha',
    lbl_upload_send:'📤 Enviar', lbl_upload_max:'JPEG, PNG, WebP — máx 20 Mo cada',
    lbl_by:'Por', lbl_with:'Com', btn_create_account:'Criar conta',
    // Event type labels
    evt_mariage:'Casamento', evt_naissance:'Nascimento', evt_deces:'Falecimento',
    evt_rencontre:'Encontro', evt_voyage:'Viagem', evt_reunion:'Reunião',
    evt_fete:'Festa', evt_autre:'Outro',
    // Errors & validation
    error_name_required:'Primeiro nome obrigatório',
    error_title_required:'Título obrigatório',
    error_title_content_required:'Título e conteúdo obrigatórios',
    error_no_photo:'Nenhuma foto selecionada',
    error_select_file:'Selecione um ficheiro',
    toast_photos_added:'Fotos adicionadas',
    // Notifications
    admin_notif:'Notificações por e-mail',
    admin_notif_desc:'Lista de endereços a notificar quando forem feitas alterações. Máximo um e-mail por dia, enviado 1 hora após a última alteração.',
    notif_empty:'Nenhum endereço configurado',
    notif_added:'Endereço adicionado',
    notif_deleted:'Endereço eliminado',
    notif_confirm_delete:'Eliminar este endereço de notificação?',
    btn_notif_add:'+ Adicionar',
    author_placeholder:'Nome',
    autologin_copy:'Gerar link de acesso', autologin_copied:'Link copiado para a área de transferência',
    // Autos
    lbl_et:'e',
    nav_autos:'Autos', h_autos:'Carros da família', add_auto:'+ Adicionar',
    empty_autos:'Nenhum carro', empty_autos_sub:'Adicione o primeiro carro da família',
    form_title_new_auto:'Novo carro',
    form_marque:'Marca', form_modele:'Modelo', form_annee:'Ano', form_couleur:'Cor',
    form_owner:'Proprietário', form_owner_none:'— Nenhum —',
    toast_auto_added:'Carro adicionado', toast_auto_edited:'Carro modificado', toast_auto_deleted:'Carro eliminado',
    confirm_delete_auto:'Eliminar este carro?',
  }
};

let currentLang = localStorage.getItem('lang') || 'fr';
function T(key) { return LANGS[currentLang][key] || LANGS['fr'][key] || key; }
function evtLabel(type) { return T('evt_' + type) || type; }

const LANG_META = { fr:{flag:'<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDIzOTUiLz48cmVjdCB4PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iI0VEMjkzOSIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt="">',code:'FR'}, pt:{flag:'<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1IDMiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjMiIGZpbGw9IiMwMDY2MDAiLz48cmVjdCB4PSIyIiB3aWR0aD0iMyIgaGVpZ2h0PSIzIiBmaWxsPSIjRkYwMDAwIi8+PGNpcmNsZSBjeD0iMiIgY3k9IjEuNSIgcj0iMC42IiBmaWxsPSIjRkZENzAwIiBzdHJva2U9IiMwMDMzOTkiIHN0cm9rZS13aWR0aD0iMC4xMiIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt="">',code:'PT'} };

function toggleLangMenu() {
  const menu = document.getElementById('lang-menu');
  const btn  = document.getElementById('lang-btn');
  const open = menu.style.display === 'block';
  menu.style.display = open ? 'none' : 'block';
  btn.setAttribute('aria-expanded', String(!open));
}
function closeLangMenu() {
  document.getElementById('lang-menu').style.display = 'none';
  document.getElementById('lang-btn').setAttribute('aria-expanded','false');
}
// Fermer le menu si clic en dehors
document.addEventListener('click', e => {
  if (!document.getElementById('lang-picker')?.contains(e.target)) closeLangMenu();
});

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const m = LANG_META[lang] || LANG_META['fr'];
  const flagEl = document.getElementById('lang-flag');
  const codeEl = document.getElementById('lang-code');
  if (flagEl) flagEl.innerHTML = m.flag;
  if (codeEl) codeEl.textContent = m.code;
  applyLang();
}

function applyLang() {
  // Logo title + onglet navigateur
  const logoEl = document.getElementById('logo-title');
  if (logoEl) logoEl.textContent = T('site_title');
  document.title = T('site_title');
  // User badge
  const badge = document.getElementById('user-badge');
  if (badge && currentUser) badge.textContent = currentUser.nom + ' (' + T('role_' + currentUser.role) + ')';
  // Nav buttons
  const navMap = {tree:'nav_tree',list:'nav_list',events:'nav_events',reunions:'nav_reunions',anecdotes:'nav_anecdotes',autos:'nav_autos',timeline:'nav_timeline',admin:'nav_admin'};
  document.querySelectorAll('nav button[data-view]').forEach(b => { b.textContent = T(navMap[b.dataset.view]||b.dataset.view); });
  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.title = T('logout');
  // Search placeholder
  const si = document.getElementById('search');
  if (si) si.placeholder = T('search_placeholder');
  // Filter buttons
  const filterMap = {all:'filter_all',male:'filter_male',female:'filter_female',living:'filter_living',deceased:'filter_deceased'};
  document.querySelectorAll('.filter-btn[onclick]').forEach(b => {
    const m = b.getAttribute('onclick').match(/setFilter\('(\w+)'/);
    if (m && filterMap[m[1]]) b.textContent = T(filterMap[m[1]]);
  });
  // Add buttons
  const btnP = document.getElementById('btn-add-person');
  if (btnP) btnP.textContent = T('add_person');
  const btnE = document.getElementById('btn-add-event');
  if (btnE) btnE.textContent = T('add_event');
  const btnR = document.getElementById('btn-add-reunion');
  if (btnR) btnR.textContent = T('add_reunion');
  const btnA = document.getElementById('btn-add-anecdote');
  if (btnA) btnA.textContent = T('add_anecdote');
  const btnAu = document.getElementById('btn-add-auto');
  if (btnAu) btnAu.textContent = T('add_auto');
  // Sort buttons
  const sd = document.getElementById('sort-btn-date');
  const sa = document.getElementById('sort-btn-alpha');
  if (sd) sd.textContent = T('sort_date');
  if (sa) sa.textContent = T('sort_alpha');
  // Tree mode buttons
  const tmf = document.getElementById('tree-mode-full');
  const tmc = document.getElementById('tree-mode-compact');
  if (tmf) tmf.textContent = T('tree_mode_full');
  if (tmc) tmc.textContent = T('tree_mode_compact');
  // Tree hint
  const th = document.getElementById('tree-hint');
  if (th) th.textContent = T('tree_hint');
  // Author picker placeholder
  updateAuthorPicker();
  // Page section headings (h2 titles of each view)
  const headings = {
    'view-list-heading':      'h_membres',
    'view-events-heading':    'h_events',
    'view-reunions-heading':  'h_reunions',
    'view-anecdotes-heading': 'h_anecdotes',
    'view-autos-heading':     'h_autos',
    'view-timeline-heading':  'h_timeline',
    'view-admin-heading':    'h_admin',
  };
  Object.entries(headings).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'view-list-heading') { filterList(); return; }
    el.textContent = T(key);
  });
  // Admin labels
  const adminIds = {
    'lbl-admin-comptes':  'admin_comptes',
    'lbl-admin-export':   'admin_export',
    'lbl-admin-import':   'admin_import',
    'lbl-admin-password': 'admin_password',
    'lbl-admin-notif':    'admin_notif',
    'lbl-admin-notif-desc': 'admin_notif_desc',
    'lbl-admin-orphans':  'admin_orphans',
    'lbl-admin-orphans-desc': 'admin_orphans_desc',
    'btn-scan-orphans':   'admin_orphans_scan',
    'btn-admin-new-user': 'admin_new_user',
    'btn-notif-add':      'btn_notif_add',
    'lbl-import-ged':     'import_ged',
    'lbl-import-json':    'import_json',
    'lbl-pwd-old':        'pwd_old',
    'lbl-pwd-new':        'pwd_new',
    'btn-pwd-save':       'pwd_save',
    'btn-import-ged':     'btn_import_ged',
    'btn-import-json':    'btn_import_json',
  };
  Object.entries(adminIds).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = T(key);
  });
  const activeView = document.querySelector('.view.active');
  if (activeView?.id === 'view-list')      filterList();
  if (activeView?.id === 'view-tree')      renderTree();
  if (activeView?.id === 'view-events')    loadEvents();
  if (activeView?.id === 'view-anecdotes') loadAnecdotes();
  if (activeView?.id === 'view-autos')     loadAutos();
  if (activeView?.id === 'view-timeline')  loadTimeline();
  if (typeof _renderArbreCombo === 'function') _renderArbreCombo();
}

// BASE_URL : chemin absolu vers la racine du site (fonctionne quel que soit le sous-répertoire)
const BASE_URL = window.location.pathname.replace(/\/[^\/]*$/, '/');
function imgUrl(path) { return path ? BASE_URL + path : ''; }

let people = [], currentFilter = 'all', currentUser = null;
let authorName = localStorage.getItem('authorName') || '';

function setAuthorName(val) {
  authorName = val;
  localStorage.setItem('authorName', authorName);
  _resizeAuthorPicker();
}

function updateAuthorPicker() {
  const sel = document.getElementById('author-picker');
  if (!sel) return;
  const names = [...new Set(people.map(p => p.prenom))].sort((a,b) => a.localeCompare(b,'fr'));
  sel.innerHTML = `<option value="" disabled${!authorName ? ' selected' : ''}>${T('author_placeholder')}</option>`
    + names.map(n => `<option value="${n}"${n === authorName ? ' selected' : ''}>${n}</option>`).join('');
  _resizeAuthorPicker();
}

function _resizeAuthorPicker() {
  const sel = document.getElementById('author-picker');
  if (!sel) return;
  const text = sel.options[sel.selectedIndex]?.text || 'Mon prénom';
  const span = document.createElement('span');
  span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:"DM Sans",sans-serif;font-size:.8rem;';
  span.textContent = text;
  document.body.appendChild(span);
  sel.style.width = (span.offsetWidth + 38) + 'px'; // +38 pour flèche + padding
  document.body.removeChild(span);
}
const GEN_LABELS = () => [T('gen_0'),T('gen_1'),T('gen_2'),T('gen_3'),T('gen_4'),T('gen_5'),T('gen_6')];
const EVT_ICONS  = {mariage:'💍',naissance:'👶',deces:'🕊',rencontre:'🤝',voyage:'✈️',reunion:'🏠',fete:'🎉',autre:'📌'};

