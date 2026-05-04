# 🌿 Généalogie Familiale

Une application web familiale auto-hébergée pour garder vivante la mémoire de votre famille — bien au-delà d'un simple arbre généalogique.

## L'idée

Dans chaque famille, il y a des histoires qui risquent de se perdre — le prénom d'un arrière-grand-père, le village d'où on est partis, la recette que seule mamie savait faire, la photo jaunie d'un mariage d'avant-guerre.

Cette application est un espace privé où toute la famille peut se retrouver pour explorer l'arbre généalogique, lire des anecdotes, feuilleter des albums photos, découvrir les lieux sur une carte, et ajouter ses propres souvenirs. Les plus jeunes peuvent y découvrir ceux qu'ils n'ont pas connus ; les plus anciens peuvent y déposer ce qu'ils savent avant que ça se perde.

Chacun contribue à son rythme. Quand quelqu'un ajoute quelque chose de nouveau, les autres membres reçoivent un e-mail. Vos données restent sur votre propre serveur, accessibles uniquement aux personnes que vous invitez.

---

Stack : **PHP 8+ · MySQL · HTML/CSS/JS vanilla**  
Aucune dépendance npm, aucune compilation, aucune commande serveur.

---

## 1. Prérequis

Tout hébergeur mutualisé avec :
- **PHP 8.0+**
- **MySQL 5.7+** (ou MariaDB 10.3+)
- **mod_rewrite** Apache activé
- Accès **FTP** (FileZilla ou équivalent)

> Hébergeurs testés : **OVH**, **InfinityFree**, et tout hébergement mutualisé cPanel standard.

---

## 2. Configuration

Un fichier `config.example.php` est fourni comme modèle. Copiez-le en `config.php` et renseignez vos identifiants :

```bash
cp config.example.php config.php
```

> ⚠️ `config.php` est listé dans `.gitignore` et ne sera jamais commité. `config.example.php`, lui, est commité — il sert de référence sans contenir de vrais identifiants.

Renseignez vos identifiants MySQL dans `config.php` :

```php
define('DB_HOST', 'localhost');          // voir ci-dessous selon l'hébergeur
define('DB_NAME', 'votre_base');
define('DB_USER', 'votre_utilisateur');
define('DB_PASS', 'votre_mot_de_passe');
define('SESSION_SECRET', 'une-chaine-aleatoire-longue-et-unique');
```

### Valeur de DB_HOST selon l'hébergeur

| Hébergeur | DB_HOST typique |
|-----------|----------------|
| **OVH mutualisé** | `mysqlXX-XX.perso.ovh.net` (dans Espace client → Bases de données) |
| **InfinityFree** | `sql.infinityfree.com` (dans le panneau de contrôle → MySQL Databases) |
| **Hébergement cPanel standard** | `localhost` (le plus souvent) |

### Valeur de BASE_URL

Adaptez également `BASE_URL` pour correspondre à votre sous-dossier :

```php
define('BASE_URL', '/familia-new/');  // ou '/' si à la racine
```

> ⚠️ `config.php` ne doit **jamais** être commité dans git. Ajoutez-le à `.gitignore`.

---

## 3. Upload via FTP

Connectez-vous avec FileZilla (ou votre client FTP préféré) et uploadez tous les fichiers dans le dossier public de votre hébergeur (`www/`, `public_html/`, ou `htdocs/` selon l'hébergeur) :

```
public_html/
├── api/
│   ├── access_log.php
│   ├── admin.php
│   ├── anecdotes.php
│   ├── arbres.php
│   ├── auth.php
│   ├── autos.php
│   ├── evenements.php
│   ├── export.php
│   ├── import.php
│   ├── lieux.php
│   ├── notify_cron.php
│   ├── personnes.php
│   ├── reactions.php
│   ├── recettes.php
│   ├── tagged_photo.php
│   ├── tresors.php
│   └── utilisateurs.php
├── css/
│   └── style.css
├── js/
│   ├── admin.js
│   ├── arbre.js
│   ├── autos.js
│   ├── carte.js
│   ├── events.js
│   ├── i18n.js
│   ├── init.js
│   ├── list.js
│   ├── reactions.js
│   ├── recettes.js
│   ├── timeline.js
│   ├── translate.js
│   ├── tresors.js
│   └── utils.js
├── uploads/
│   ├── thumbs/          ← créer ce dossier vide
│   └── .htaccess
├── .htaccess
├── config.php
├── familia.png
├── index.php
├── install.php
└── login.html
```

> ⚠️ Vérifiez que **`uploads/`** et **`uploads/thumbs/`** ont les permissions **755** (clic droit → Permissions dans FileZilla).

### Note InfinityFree

Sur InfinityFree, le dossier public s'appelle `htdocs/`. Vérifiez que `.htaccess` est bien uploadé (les fichiers commençant par `.` sont parfois masqués dans FileZilla — activez "Afficher les fichiers cachés").

---

## 4. Installation de la base de données

Ouvrez dans votre navigateur :

```
https://votre-domaine.fr/install.php
```

Vous devriez voir :
- ✓ Toutes les tables créées
- ✓ Compte admin créé

**⚠️ Supprimez ensuite `install.php` via FTP** — il ne doit pas rester accessible !

> En cas de mise à jour, relancez `install.php` — il est idempotent et applique les migrations sans perte de données.

---

## 5. Première connexion

Accédez à `https://votre-domaine.fr/`

| Email | Mot de passe |
|-------|-------------|
| `admin@famille.local` | `admin1234` |

**Changez immédiatement le mot de passe** : menu Admin → Mot de passe.

---

## 6. Fonctionnalités

| Section | Description |
|---------|-------------|
| **Arbre** | Visualisation par génération, clic → fiche complète |
| **Événements** | Mariages, voyages, réunions, etc. avec photos et participants |
| **Carte** | Localisation géographique des lieux de naissance et décès |
| **Membres** | Liste searchable, filtres, fiches avec photos et liens familiaux |
| **Anecdotes** | Histoires familiales libres, avec photos et personnes mentionnées |
| **Trésors** | Documents, objets et souvenirs de famille |
| **Recettes** | Recettes familiales transmises de génération en génération |
| **Autos** | Véhicules de la famille |
| **Timeline** | Chronologie de tous les événements |

### Rôles utilisateurs

| Rôle | Consultation | Ajout/Modification | Administration |
|------|----|----|----|
| **Lecteur** | ✅ | ❌ | ❌ |
| **Éditeur** | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ |

### Langues disponibles

Français · Português · English · Deutsch · فارسی · Español · Italiano · Ελληνικά

---

## 7. Import / Export

### Export
- **GEDCOM 5.5.1** : compatible Ancestry, MyHeritage, Geneanet, Heredis…
- **JSON** : sauvegarde complète (personnes, liens, événements, anecdotes, trésors…)
- **CSV** : liste des membres pour Excel/Google Sheets

### Import
- **GEDCOM** : depuis n'importe quel logiciel de généalogie
- **JSON** : depuis un export précédent (restauration complète)

---

## 8. Sauvegardes recommandées

1. **Base MySQL** : depuis votre panneau d'hébergeur (phpMyAdmin → Export)  
   *ou* utilisez l'export JSON depuis l'application (Admin → Export JSON)

2. **Photos** : téléchargez périodiquement le dossier `uploads/` via FTP

---

## 9. Sécurité

- `config.php` est bloqué en accès direct (`.htaccess`)
- Le dossier `uploads/` est protégé contre l'exécution de scripts PHP
- Les sessions durent 30 jours (modifiable dans `config.php`)
- Les mots de passe sont hashés avec `bcrypt`
- Ne commitez jamais `config.php` dans git

---

## 10. Dépannage fréquent

| Problème | Solution |
|----------|---------|
| Page blanche | Vérifiez que PHP 8.0+ est activé dans votre panneau d'hébergeur |
| "Connexion impossible" | Vérifiez `DB_HOST` — rarement `localhost` chez OVH, souvent `localhost` ailleurs |
| Photos ne s'affichent pas | Vérifiez les permissions du dossier `uploads/` (755) |
| `.htaccess` ignoré | `mod_rewrite` doit être activé — contactez votre hébergeur si besoin |
| Erreur 500 | Consultez les logs d'erreurs dans cPanel ou phpMyAdmin |
| Routes SPA cassées (404) | Vérifiez que `RewriteBase` dans `.htaccess` correspond à votre sous-dossier |

### Note InfinityFree

InfinityFree bloque certaines requêtes PHP qui s'exécutent trop longtemps. Si l'import GEDCOM échoue, découpez le fichier en lots plus petits.
