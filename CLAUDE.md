# Contexte projet - shop-api

## Stack technique

- Node.js 20+.
- TypeScript `^5.3.3` (`5.9.3` resolu dans package-lock.json).
- NestJS `^10.3.0` :
  - `@nestjs/common`
  - `@nestjs/core`
  - `@nestjs/platform-fastify`
  - `@nestjs/testing`
  - `@nestjs/cli`
- Fastify via `NestFastifyApplication` et `FastifyAdapter`.
- Prisma `^5.10.0` (`@prisma/client` et `prisma` en `5.22.0` dans package-lock.json).
- SQLite via `DATABASE_URL="file:./dev.db"` ; aucun PostgreSQL ni SQL brut.
- `class-validator ^0.14.1` et `class-transformer ^0.5.1`.
- RxJS `^7.8.1`.
- Vitest `^1.3.0` (`1.6.1` resolu) avec `@vitest/coverage-v8 ^1.3.0`.
- `ts-node ^10.9.2`, `@types/node ^20.11.0` (`20.19.39` resolu) et `unplugin-swc ^1.4.3`.
- Compilation Nest vers `dist/` en CommonJS, cible ES2021.

Configuration TypeScript importante :

- `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`
- `noFallthroughCasesInSwitch`
- decorators Nest/Prisma/metadata actifs
- declarations et source maps generees

## Architecture

### Organisation NestJS

- `src/main.ts` : bootstrap Nest/Fastify, ecoute sur `0.0.0.0:3000` et ValidationPipe global.
- `src/app.module.ts` : module racine important `ProductsModule` et `OrdersModule`.
- `src/common/prisma/prisma.service.ts` : PrismaClient injectable et gestion du cycle de vie.
- `src/common/exceptions/app.exception.ts` : HttpException structuree, mais non utilisee par les services actuels.
- `src/products/` : module, controller, service et DTO produits.
- `src/orders/` : module, controller, service et DTO commandes.
- `prisma/schema.prisma` : modèles `Product`, `Order` et `OrderItem`.
- `prisma/seed.ts` : donnees initiales e-commerce.
- `integration_tests/` : collections de requetes Bruno.

Le flux effectif est :

```text
Controller HTTP -> Service injectable -> PrismaService -> SQLite
```

Il n'existe pas de couche repository active. Les acces Prisma sont faits directement dans les services.

### Modules et injection

- `ProductsModule` expose `ProductsController`, `ProductsService` et exporte `ProductsService`.
- `OrdersModule` importe `ProductsModule` puis injecte `ProductsService` dans `OrdersService`.
- Les deux modules enregistrent aussi `PrismaService` directement.
- `AppModule` fournit aussi `PrismaService` au niveau racine.

Conserver cette organisation modulaire lors d'evolutions NestJS. Eviter d'ajouter une nouvelle API ou une nouvelle injection sans mettre explicitement a jour les exports/imports du module concerne.

### Controller, service et validation

- Les controllers utilisent `@Controller()`, `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Body()` et `@Param()`.
- Les controllers ne font pas d'acces Prisma : ils deleguent au service.
- Les services portent les conditions d'etat, les calculs et les appels Prisma.
- `ValidationPipe` est global avec `whitelist: true` et `transform: true`.
- Les DTO sont valides avec `class-validator` :
  - `CreateProductDto`, `UpdateProductDto`
  - `CreateOrderDto`, `AddItemDto`

Les routes actuelles sont `/products` et `/orders` avec les operations documentees dans README.md.

### Prisma

`PrismaService` etend `PrismaClient` et implemente :

- `onModuleInit()` avec `$connect()`
- `onModuleDestroy()` avec `$disconnect()`

Les modeles utilisent des identifiants `String @id @default(cuid())`, des relations Product-OrderItem et Order-OrderItem, et les champs de dates `createdAt`/`updatedAt`.

## Conventions de code observees

- Nommage camelCase pour fonctions, variables et proprietes ; PascalCase pour les classes.
- Decorateurs NestJS pour controllers, modules et injections.
- Constructeurs avec injection explicite et champs `readonly` pour les services controller.
- Services suffixes `Service`, modules suffixes `Module`, controllers suffixes `Controller`.
- DTO de demande dans `src/<module>/dto/`.
- Retour direct des resultats Prisma depuis les services.
- Requetes Prisma avec `findMany`, `findUnique`, `create`, `update`, `delete`, `orderBy`, `include` et filtres imbriques.
- Les methodes produits suivent principalement `findAll`, `findOne`, `create`, `update`, `remove`.
- Les methodes commandes portent un vocabulaire metier : `getOrders`, `getOrderById`, `createOrder`, `addItem`, `confirmOrder`, `cancelOrder`.
- Les champs facultatifs sont des proprietes `?` et les champs obligatoires DTO utilisent `!`.
- Le seed nettoie les tables dans l'ordre puis recree les produits et commandes.
- Bruno est la collection d'integration, sans suite Jest ni tests unitaires actuels.

## Etat technique connu

Le depot contient volontairement de la dette technique. Ne pas la supprimer ou la corriger par inference :

- `ProductsService.findOne()` lève une `Error` générique au lieu d'une exception HTTP Nest.
- `ProductsService.updateStock()` ne bloque pas les stocks negatifs.
- `OrdersService.getOrders()` ne pagine pas.
- `OrdersService.getOrderById()` lève une `Error` générique.
- `OrdersService.addItem()` calcule le total sans prendre en compte la quantite.
- `OrdersService.calculateDiscount()` contient une formule incorrecte et n'est pas appelee.
- `prisma/seed.ts` contient une commande dont le total est intentionnellement incorrect pour une quantite superieure a 1.
- Les commentaires `BUG`, `DETTE` ou `DEAD CODE` signalent ces comportements intentionnels.

## Contraintes pour un outil IA

- Ne jamais modifier une migration Prisma existante sans demande explicite.
- Ne pas executer `prisma migrate dev` comme effet de bord d'une modification applicative.
- Ne pas modifier le provider SQLite ni remplacer la base sans demande explicite.
- Ne pas utiliser de SQL brut ; passer les operations par Prisma.
- Ne pas ajouter de repository ou remodeler l'application en Express/PostgreSQL sans demande explicite.
- Ne pas ajouter de dependance au package.json sans validation explicite.
- Ne pas faire des appels Prisma dans les controllers ou les routes.
- Conserver les operations Prisma dans les services et l'injection via les modules Nest.
- Conserver `ProductsService` exporte par `ProductsModule` et importe par `OrdersModule`.
- Ne pas introduire automatiquement `try/catch` ni `asyncHandler` : ils ne sont pas un pattern du code actuel.
- Utiliser Vitest, pas Jest. Aucun test unitaire n'est actuellement present.
- Ajouter une couverture pour les comportements demandes avec un cas reel produit/commande, pas en recreant les bugs intentionnels.
- Les scripts attendus sont `npm run build`, `npm run start:dev`, `npm test`, `npm run test:coverage` et les scripts Prisma documentes dans package.json.
- Respecter les contraintes de `DATABASE_URL` SQLite ; verifier que les operations restent compatibles avec SQLite.
- Ne pas supprimer les marqueurs de dette technique ou les commentaires de bugs sans une correction explicite.
- Ne pas normaliser seulement les guillemets ou les points-virgules de tout le projet : respecter le style du fichier modifié.
