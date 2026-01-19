# Migration: Chiffrement des clés Stripe

Ce document explique comment déployer le chiffrement des clés Stripe en production.

## ⚠️ IMPORTANT

- Cette migration chiffre les clés Stripe stockées en base de données
- **Sauvegardez votre base de données** avant de procéder
- Une fois chiffrées, les clés ne peuvent pas être déchiffrées sans la clé ENCRYPTION_KEY
- **Ne perdez JAMAIS la clé ENCRYPTION_KEY** - conservez-la en lieu sûr

## Prérequis

1. Accès à votre base de données de production
2. Accès aux variables d'environnement de production (Vercel/autre)
3. Backup de la base de données

## Étape 1: Générer la clé de chiffrement

Générez une clé de chiffrement sécurisée (64 caractères hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Exemple de sortie:**
```
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

⚠️ **CONSERVEZ CETTE CLÉ EN LIEU SÛR** - Sans elle, vous ne pourrez plus déchiffrer les clés Stripe!

## Étape 2: Ajouter la variable d'environnement

### Sur Vercel

1. Aller dans votre projet > Settings > Environment Variables
2. Ajouter une nouvelle variable:
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: La clé générée à l'étape 1
   - **Environment**: Production, Preview, Development

3. Cliquer sur "Save"

### Localement (.env)

Ajouter dans votre fichier `.env`:

```bash
ENCRYPTION_KEY="votre-cle-de-64-caracteres-hex-ici"
```

## Étape 3: Déployer le code

1. Merger le PR `feat/encrypt-stripe-keys`
2. Le déploiement se fera automatiquement sur Vercel

**OU** déployer manuellement:

```bash
git checkout main
git pull origin main
vercel --prod
```

## Étape 4: Exécuter la migration

### Option A: Localement (Recommandé pour tester d'abord)

1. S'assurer que `DATABASE_URL` pointe vers la production dans `.env`
2. Exécuter le script:

```bash
npx tsx scripts/encrypt-stripe-keys.ts
```

**Sortie attendue:**
```
🔐 Starting Stripe key encryption migration...

Found 3 user(s) with Stripe keys

  ✅ User user1@example.com - Key encrypted successfully
  ✅ User user2@example.com - Key encrypted successfully
  ⏭️  User user3@example.com - Key already encrypted, skipping

📊 Migration Summary:
  - Total users with keys: 3
  - Newly encrypted: 2
  - Already encrypted: 1
  - Errors: 0

✅ Migration completed successfully!
```

### Option B: Directement en production (SSH/Console)

Si vous avez accès SSH à votre serveur:

```bash
cd /path/to/your/app
npx tsx scripts/encrypt-stripe-keys.ts
```

## Étape 5: Vérifier

1. Tester qu'un paiement Stripe fonctionne toujours
2. Vérifier dans la base de données que les clés sont chiffrées:

```sql
SELECT
  email,
  CASE
    WHEN "stripeSecretKey" IS NULL THEN 'No key'
    WHEN "stripeSecretKey" LIKE '%:%:%' THEN 'Encrypted ✅'
    ELSE 'Plain text ❌'
  END as key_status
FROM "User"
WHERE "stripeSecretKey" IS NOT NULL;
```

Tous les utilisateurs devraient avoir le statut "Encrypted ✅"

## Rollback (En cas de problème)

Si quelque chose ne fonctionne pas:

1. **Option 1: Restaurer le backup**
   ```bash
   # Restaurer votre backup de base de données
   ```

2. **Option 2: Reverter le code**
   ```bash
   git revert <commit-hash-du-merge>
   git push
   ```

3. **Les clés chiffrées resteront chiffrées** - il faudra que les utilisateurs reconfigurent leurs clés Stripe dans leur profil

## Sécurité

### Protection de la clé ENCRYPTION_KEY

✅ **À FAIRE:**
- Stocker dans un gestionnaire de secrets (Vercel, AWS Secrets Manager, etc.)
- Limiter l'accès aux variables d'environnement de production
- Créer un backup chiffré de la clé et le stocker séparément
- Documenter où la clé est stockée pour l'équipe

❌ **À NE PAS FAIRE:**
- Commit la clé dans Git
- Partager la clé par email/Slack
- Utiliser la même clé entre environnements (dev/prod)
- Afficher la clé dans les logs

### Rotation de la clé (Avancé)

Si vous devez changer la clé ENCRYPTION_KEY:

1. Générer une nouvelle clé
2. Modifier le script de migration pour:
   - Déchiffrer avec l'ancienne clé
   - Re-chiffrer avec la nouvelle clé
3. Mettre à jour ENCRYPTION_KEY dans les variables d'environnement

## Support

Si vous rencontrez des problèmes:

1. Vérifier que ENCRYPTION_KEY est bien définie (64 caractères hex)
2. Vérifier les logs du script de migration
3. Vérifier les logs de l'application lors d'un paiement Stripe

## Checklist de déploiement

- [ ] Backup de la base de données effectué
- [ ] ENCRYPTION_KEY générée et sauvegardée en lieu sûr
- [ ] ENCRYPTION_KEY ajoutée dans Vercel (Production + Preview + Development)
- [ ] Code déployé en production
- [ ] Script de migration exécuté avec succès
- [ ] Paiement Stripe testé et fonctionnel
- [ ] Vérification SQL: toutes les clés sont chiffrées
- [ ] Documentation mise à jour pour l'équipe
