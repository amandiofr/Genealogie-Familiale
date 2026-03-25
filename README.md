# 🌿 Généalogie Familiale — Guide de déploiement OVH

Stack : **PHP 8+ · MySQL · HTML/CSS/JS vanilla**  
Aucune dépendance npm, aucune compilation, aucune commande serveur.

---

## 1. Prérequis OVH

- Hébergement mutualisé OVH avec **PHP 8.0+** (vérifiez dans cPanel → PHP)
- Une **base de données MySQL** créée dans l'espace client OVH
  - Notez : hôte, nom de la base, utilisateur, mot de passe

---

## 2. Configuration

Ouvrez `config.php` et renseignez vos identifiants MySQL :

```php
define('DB_HOST', 'votre-serveur.mysql.db');  // ex: mysql51-42.perso.ovh.net
define('DB_NAME', 'votre_base');
define('DB_USER', 'votre_utilisateur');
define('DB_PASS', 'votre_mot_de_passe');
define('SESSION_SECRET', 'une-chaine-aleatoire-longue-et-unique');
```

> 💡 L'hôte MySQL OVH ressemble à `mysqlXX-XX.perso.ovh.net` ou `localhost`.  
> Retrouvez-le dans : Espace client OVH → Hébergements → votre hébergement → Bases de données.

---

## 3. Upload via FTP

Connectez-vous avec FileZilla (ou votre client FTP) :

| Paramètre | Valeur OVH |
|-----------|-----------|
| Hôte      | `ftp.cluster0XX.hosting.ovh.net` |
| Identifiant | votre login OVH |
| Mot de passe | votre mot de passe FTP |
| Port | 21 |

**Uploadez tous les fichiers** dans le dossier `www/` (ou `public_html/`) :

```
www/
├── api/
│   ├── auth.php
│   ├── personnes.php
│   ├── evenements.php
│   ├── anecdotes.php
│   ├── utilisateurs.php
│   └── export.php
├── uploads/
│   ├── thumbs/          ← créer ce dossier vide
│   └── .htaccess
├── config.php
├── index.html
├── login.html
├── install.php
└── .htaccess
```

> ⚠️ Vérifiez que les **dossiers `uploads/` et `uploads/thumbs/`** ont les permissions **755** (clic droit → Permissions dans FileZilla).

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

---

## 5. Première connexion

Accédez à `https://votre-domaine.fr/`

| Email | Mot de passe |
|-------|-------------|
| `admin@famille.local` | `admin1234` |

**Changez immédiatement le mot de passe** : menu Admin → "Changer mon mot de passe".

---

## 6. Fonctionnalités

| Section | Description |
|---------|-------------|
| **Arbre** | Visualisation par génération, clic → fiche complète |
| **Membres** | Liste searchable, filtres, fiches avec photos et liens familiaux |
| **Événements** | Mariages, voyages, réunions, etc. avec photos et participants |
| **Anecdotes** | Histoires familiales libres, avec photos et personnes mentionnées |
| **Statistiques** | Chiffres clés, répartition par génération |
| **Admin** | Gestion des comptes, import/export |

### Rôles utilisateurs

| Rôle | Consultation | Ajout/Modification | Administration |
|------|----|----|----|
| **Lecteur** | ✅ | ❌ | ❌ |
| **Éditeur** | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ |

---

## 7. Import / Export

### Export
- **GEDCOM 5.5.1** : compatible Ancestry, MyHeritage, Geneanet, Heredis…
- **JSON** : sauvegarde complète (personnes, liens, événements, anecdotes)
- **CSV** : liste des membres pour Excel/Google Sheets

### Import
- **GEDCOM** : depuis n'importe quel logiciel de généalogie
- **JSON** : depuis un export précédent (restauration)

---

## 8. Sauvegardes recommandées

1. **Base MySQL** : Espace client OVH → Bases de données → Export  
   *ou* utilisez l'export JSON depuis l'application (Admin → Export JSON)

2. **Photos** : téléchargez périodiquement le dossier `uploads/` via FTP

---

## 9. Sécurité

- Le dossier `uploads/` est protégé contre l'exécution de scripts PHP (`.htaccess`)
- `config.php` est bloqué en accès direct (`.htaccess`)
- Les sessions durent 30 jours (modifiable dans `config.php`)
- Les mots de passe sont hashés avec `bcrypt`

---

## 10. Dépannage fréquent OVH

| Problème | Solution |
|----------|---------|
| Page blanche | Activez PHP 8.0+ dans cPanel → PHP |
| "Connexion impossible" | Vérifiez `DB_HOST` — chez OVH mutualisé c'est rarement `localhost` |
| Photos ne s'affichent pas | Vérifiez les permissions du dossier `uploads/` (755) |
| `.htaccess` ignoré | Activez `mod_rewrite` dans cPanel, ou contactez le support OVH |
| Erreur 500 | Consultez les logs dans cPanel → Logs d'erreurs |
