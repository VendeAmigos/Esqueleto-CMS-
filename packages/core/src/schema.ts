import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// ==========================================
// 1. Tabla: users
// ==========================================
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'), // 'admin' | 'customer'
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
});

// ==========================================
// 2. Tabla: categories
// ==========================================
export const categories = pgTable('categories', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

// ==========================================
// 3. Tabla: products
// ==========================================
export const products = pgTable('products', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  basePrice: integer('base_price').notNull(), // Almacenado en centavos (ej: 29900 = $299.00 MXN)
  isActive: boolean('is_active').notNull().default(true),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
});

// ==========================================
// 4. Tabla: product_modifiers (Grupos de Modificadores para cada producto)
// ==========================================
export const productModifiers = pgTable('product_modifiers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ej: "Talla", "Color", "Extras", "Tipo de Leche"
  type: text('type').notNull().default('single'), // 'single' (radio/select) o 'multiple' (checkboxes)
  required: boolean('required').notNull().default(false),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
});

// ==========================================
// 5. Tabla: modifier_options (Opciones con precios modificables)
// ==========================================
export const modifierOptions = pgTable('modifier_options', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modifierId: text('modifier_id')
    .notNull()
    .references(() => productModifiers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ej: "Grande (L)", "Extra Queso", "Vainilla"
  priceDelta: integer('price_delta').notNull().default(0), // Diferencia en centavos (+2000 = +$20.00 MXN)
  isDefault: boolean('is_default').notNull().default(false),
});

// ==========================================
// 6. Tabla: product_variants (Variantes / SKU)
// ==========================================
export const productVariants = pgTable('product_variants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  price: integer('price').notNull(), // Centavos
  stock: integer('stock').notNull().default(0),
});

// ==========================================
// 7. Tabla: orders
// ==========================================
export const orders = pgTable('orders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'shipped' | 'cancelled'
  total: integer('total').notNull(), // En centavos
  customerEmail: text('customer_email'),
  itemsSummary: text('items_summary'), // Resumen legible
  itemsJson: text('items_json'), // Detalle estructurado de productos y modificadores
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
});

// ==========================================
// Relaciones (Drizzle Relations)
// ==========================================
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  modifiers: many(productModifiers),
  variants: many(productVariants),
}));

export const productModifiersRelations = relations(productModifiers, ({ one, many }) => ({
  product: one(products, {
    fields: [productModifiers.productId],
    references: [products.id],
  }),
  options: many(modifierOptions),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
  modifier: one(productModifiers, {
    fields: [modifierOptions.modifierId],
    references: [productModifiers.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

// ==========================================
// Tipos TypeScript
// ==========================================
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductModifier = InferSelectModel<typeof productModifiers>;
export type NewProductModifier = InferInsertModel<typeof productModifiers>;

export type ModifierOption = InferSelectModel<typeof modifierOptions>;
export type NewModifierOption = InferInsertModel<typeof modifierOptions>;

export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;
