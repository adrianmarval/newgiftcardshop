# Solmaira Cards - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Architecture Patterns](#architecture-patterns)
6. [Server Actions & Safe Actions](#server-actions--safe-actions)
7. [Authentication](#authentication)
8. [Flows](#flows)
9. [State Management](#state-management)
10. [URL Filtering with nuqs](#url-filtering-with-nuqs)
11. [UI Components](#ui-components)
12. [Code Conventions](#code-conventions)
13. [Common Patterns](#common-patterns)

---

## Project Overview

**Solmaira Cards** is a marketplace platform for buying and selling gift cards. The platform connects sellers (who upload gift cards) with buyers (who purchase them at a discount).

### Core Features

- **Sell Flow**: Sellers upload gift cards → validation → publishing
- **Buy Flow**: Buyers search cards → select → verify → pay
- **Admin Panel**: Manage batches, process payouts, view activity

---

## Tech Stack

| Category      | Technology                |
| ------------- | ------------------------- |
| Framework     | Next.js 15 (App Router)   |
| Language      | TypeScript                |
| Database      | PostgreSQL via Prisma ORM |
| Auth          | Better Auth               |
| UI            | TailwindCSS + shadcn/ui   |
| State         | Zustand                   |
| URL Filtering | nuqs                      |
| Forms         | react-hook-form + zod     |
| Icons         | Tabler Icons + Lucide     |
| Animations    | Framer Motion             |

---

## Project Structure

```
src/
├── actions/                    # Server Actions
│   ├── admin/               # Admin-specific actions
│   ├── catalog/             # Brand/country queries
│   ├── giftcard/           # Giftcard operations
│   ├── order/              # Order operations (buyer)
│   └── seller/             # Seller operations
│
├── app/                      # Next.js App Router
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── admin/
│   │   ├── buy/
│   │   └── sell/
│   └── api/                # API routes
│
├── components/              # React components
│   ├── admin/              # Admin components
│   ├── auth/              # Auth components
│   ├── buy/                # Buyer components
│   ├── sell/               # Seller components
│   └── ui/                 # shadcn/ui components
│
├── hooks/                   # Custom React hooks
│
├── lib/                     # Utilities
│   ├── authorization.ts    # Auth helpers
│   ├── encryption.ts       # Code encryption (AES-256-GCM)
│   ├── prisma.ts          # DB client
│   └── safe-action.ts     # Safe action factory
│
├── types/                   # TypeScript types
│   ├── application/        # Flow-specific types
│   ├── domain/             # Domain entities
│   │   ├── admin/
│   │   ├── giftcard/
│   │   ├── order/
│   │   ├── payment/
│   │   └── seller/
│   └── index.ts           # Barrel exports
│
└── ui/                     # shadcn/ui components
```

---

## Database Schema

### Core Models

```prisma
model User {
  id            String  @id @default(cuid())
  name          String
  email         String  @unique
  role          Role[]  @default([BUYER])
  buyRate       Decimal @default(0.85)  # Buyer discount rate
  sellRate      Decimal @default(0.75) # Seller payout rate
  giftcards     Giftcard[]
  orders        Order[]
  giftcardBatches GiftcardBatch[]
}

model Giftcard {
  id          String         @id @default(cuid())
  brandId     String
  brand       Brand          @relation(fields: [brandId], references: [id])
  claimCode   String         # Encrypted with AES-256-GCM
  codeHash    String?        @unique
  amount      Decimal        # Face value
  status      GiftcardStatus @default(UNUSED)
  isConfirmed Boolean        @default(false)  # Verified by buyer
  orderId     String?
  batchId     Int?
}

model GiftcardBatch {
  id       Int      @id @default(autoincrement())
  sellRate Decimal  # Seller's rate at creation time
  isPaid  Boolean @default(false)
  userId   String
  giftcards Giftcard[]
}

model Order {
  id            String      @id @default(cuid())
  total         Decimal     # Original total
  adjustedTotal Decimal?    # Adjusted after verification
  buyRate       Decimal     # Buyer's rate at creation
  status        OrderStatus
  userId        String
  giftcards     Giftcard[]
  payments      Payment[]
}

model Payment {
  id              String          @id @default(cuid())
  amount          Decimal
  status          PaymentStatus
  transactionType TransactionType
  orderId         String?
  batchId         Int?
}
```

### Enums

```prisma
enum Role { ADMIN, SELLER, BUYER }
enum GiftcardStatus { UNUSED, USED, ALREADY_USED, INVALID, DEACTIVATED, WRONG_AMOUNT }
enum OrderStatus { PENDING, AWAITING_PAYMENT, COMPLETED, CANCELLED }
enum PaymentStatus { PENDING, COMPLETED, CANCELLED }
enum TransactionType { DEBIT, CREDIT }
```

---

## Architecture Patterns

### 1. Domain-Driven Types

All entity types live in `src/types/domain/`. Each entity has:

- **Zod schema** for validation
- **TypeScript type** inferred from schema
- **Barrel export** in `index.ts`

```typescript
// Example: Giftcard entity
// src/types/domain/giftcard/Giftcard.ts
export const giftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  amount: z.number(),
  status: giftcardStatusEnum,
  // ...
});

export type Giftcard = z.infer<typeof giftcardSchema>;
```

### 2. Server Actions with Safe Actions

All server actions use `safe-action` for type-safe mutations with auth.

```typescript
// src/actions/seller/get-rate.ts
export const getSellerRate = sellerActionClient.outputSchema(getSellerRateOutputSchema).action(async ({ ctx }) => {
  // ctx.auth contains the authenticated user
  const userId = ctx.auth.user.id;
  // ...
  return { rate: 0.75 };
});
```

### 3. Client Components for Interactivity

Server Components fetch data, Client Components handle state and interactions.

### 4. Zustand for Flow State

Ephemeral wizard state (not persisted) uses Zustand stores in `src/hooks/`.

---

## Server Actions & Safe Actions

### Action Clients

The app defines three action clients for different authorization levels:

```typescript
// src/lib/safe-action.ts

// Any authenticated user
export const authActionClient = actionClient.use(...)

// Sellers only
export const sellerActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const isSeller = (authData.user.role as Role[]).includes('SELLER');
      if (!isSeller) unauthorized();
      return next({ ctx: { auth: authData } });
    },
  })
);

// Admins only
export const adminActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const isAdmin = (authData.user.role as Role[]).includes('ADMIN');
      if (!isAdmin) unauthorized();
      return next({ ctx: { auth: authData } });
    },
  })
);
```

### Using in Server Actions

```typescript
// Create a new action
export const doSomething = authActionClient
  .inputSchema(inputSchema) // Optional: zod input validation
  .outputSchema(outputSchema) // zod output validation
  .action(async ({ ctx, parsedInput }) => {
    // ctx.auth.user contains the authenticated user
    // parsedInput contains validated input
    // Return the result
  });
```

### Calling from Components

```typescript
// In a Server Component
const result = await doSomething({ param: 'value' });

if (!result.data?.success) {
  throw new Error('Failed');
}

const output = result.data.outputField;
```

---

## Authentication

Uses **Better Auth** with custom session handling.

```typescript
// Getting session in Server Components
import { getSession } from '@/lib/authorization';

export default async function Page() {
  const session = await getSession();
  // session.user contains { id, name, email, role[] }
}
```

### Roles

- `ADMIN`: Full platform access
- `SELLER`: Can upload and manage gift cards
- `BUYER`: Can purchase gift cards

Users can have multiple roles (array).

---

## Flows

### Sell Flow (Seller)

**Path**: `/sell/flow`

1. **Config Step**: Select brand, country, upload codes (bulk paste or OCR)
2. **Intake Step**: Review codes, resolve validation issues (fuzzy matches, amount mismatches)
3. **Review Step**: Final review, publish batch

State managed by Zustand store in `src/hooks/use-sell-flow.ts`.

### Buy Flow (Buyer)

**Path**: `/buy/flow`

1. **Search Step**: Search/filter available cards
2. **Select Step**: Select cards to purchase
3. **Redeem Step**: Verify claim codes
4. **Confirm Usage Step**: Confirm all codes work
5. **Payment Step**: Complete payment (Binance)

State managed by Zustand store in `src/hooks/use-buy-flow.ts`.

---

## State Management

### Zustand for Flow State

Ephemeral wizard state (valid only during the flow):

```typescript
// src/hooks/use-sell-flow.ts
interface SellFlowState {
  step: 'config' | 'intake' | 'review';
  brand: Brand | null;
  cards: SellFlowCard[];
  // Actions
  setStep: (step: SellFlowState['step']) => void;
  addCards: (cards: SellFlowCard[]) => void;
  // ...
}

export const useSellFlow = create<SellFlowState>((set) => ({
  step: 'config',
  brand: null,
  cards: [],
  // ...
}));
```

### Server State

Data from the database is fetched in Server Components and passed as props to Client Components.

---

## URL Filtering with nuqs

The app uses **nuqs** for type-safe URL search parameters.

### Server-Side Parsing

```typescript
// src/types/domain/order/SearchParams.ts
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const orderSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(['ALL', 'PENDING', 'COMPLETED'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

// src/lib/search-params-cache.ts
import { createSearchParamsCache } from 'nuqs/server';
import { orderSearchParamsParsers } from '@/types/domain/order';

export const searchParamsCache = createSearchParamsCache(orderSearchParamsParsers);

// In a page
export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);
  // parsed.page, parsed.status, etc.
}
```

### Client-Side Filtering

```typescript
// src/components/buy/giftcard-orders/orders-filters.tsx
import { useQueryStates, debounce } from 'nuqs';

export const OrdersFilters = () => {
  const [{ status, search, sort }, setParams] = useQueryStates(
    orderSearchParamsParsers,
    { shallow: false, limitUrlUpdates: debounce(400) }
  );

  return (
    <Select value={status} onValueChange={(v) => setParams({ status: v })}>
      {/* Options */}
    </Select>
  );
};
```

---

## UI Components

### shadcn/ui

The app uses **shadcn/ui** components in `src/components/ui/`.

Common patterns:

```typescript
// Using Card components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Icon Library

Uses **Tabler Icons** via `@tabler/icons-react`:

```typescript
import { IconPlus, IconSearch } from '@tabler/icons-react';
```

---

## Code Conventions

### 1. Types First

Always define Zod schemas and TypeScript types in `src/types/domain/` before implementing actions.

### 2. Barrel Exports

Each domain has an `index.ts` that exports everything:

```typescript
// src/types/domain/order/index.ts
export { orderStatusEnum, buyerOrderSchema } from './Order';
export type { OrderStatus, BuyerOrder } from './Order';
export { createOrderInputSchema } from './Order';
// etc.
```

### 3. Server Action Patterns

```typescript
// Correct pattern
export const doSomething = authActionClient.outputSchema(outputSchema).action(async ({ ctx }) => {
  const userId = ctx.auth.user.id;
  // Query DB
  return { success: true, data: 'result' };
});
```

### 4. Component Structure

```typescript
// Client Component
'use client';

import { useState } from 'react';
// Imports...

interface ComponentProps {
  data: Type;
}

export function Component({ data }: ComponentProps) {
  const [state, setState] = useState(initial);

  // Handlers
  const handleAction = async () => {
    const result = await serverAction({ id: data.id });
    if (result.data?.success) {
      // Handle success
    }
  };

  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

### 5. Import Aliases

Always use path aliases:

```typescript
// Good
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

// Avoid
import { Button } from '../../../components/ui/button';
```

---

## Common Patterns

### 1. Server Component Fetches, Client Displays

```typescript
// page.tsx (Server Component)
export default async function Page({ searchParams }) {
  const data = await fetchData(searchParams);
  return <ClientComponent data={data} />;
}

// client-component.tsx (Client Component)
'use client';
export function ClientComponent({ data }) {
  // Interactive UI
}
```

### 2. Handling Action Results

```typescript
const result = await serverAction(input);

if (result.serverError) {
  toast.error(result.serverError);
  return;
}

if (!result.data?.success) {
  toast.error(result.data?.error || 'Unknown error');
  return;
}

toast.success('Success!');
router.refresh(); // Revalidate server data
```

### 3. Form Validation with Zod

```typescript
const formSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type FormData = z.infer<typeof formSchema>;
```

### 4. Pagination

```typescript
// Server action returns paginated response
{
  items: Item[],
  pagination: {
    currentPage: number,
    totalPages: number,
    totalCount: number,
  }
}
```

### 5. Filtering in Lists

Use `nuqs` for URL-based filtering:

1. Define parsers in `types/domain/.../SearchParams.ts`
2. Parse in page component
3. Pass to client component
4. Client uses `useQueryStates` for interactive filtering

---

## File Naming Conventions

| Type       | Convention               |
| ---------- | ------------------------ |
| Pages      | `page.tsx`, `layout.tsx` |
| Components | `kebab-case.tsx`         |
| Types      | `PascalCase.ts`          |
| Actions    | `kebab-case.ts`          |
| Hooks      | `use-kebab-case.ts`      |

---

## Summary

This codebase follows these key principles:

1. **Type Safety**: Zod schemas everywhere, TypeScript strict mode
2. **Server/Client Separation**: Server fetches, client interacts
3. **URL as Source of Truth**: Filter state in URL with nuqs
4. **Domain-Driven Types**: Entities in `types/domain/`
5. **Auth via Better Auth**: Role-based access control
6. **shadcn/ui**: Customizable component library

When implementing new features, follow these patterns to maintain consistency.
