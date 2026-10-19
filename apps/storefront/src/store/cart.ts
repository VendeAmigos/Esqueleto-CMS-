import { persistentAtom } from '@nanostores/persistent';

export interface SelectedModifierOption {
  modifierId: string;
  modifierName: string;
  optionId: string;
  optionName: string;
  priceDelta: number; // En centavos
}

export interface CartItem {
  readonly id: string; // ID del producto
  readonly instanceId: string; // Identificador único de la combinación producto + modificadores
  readonly title: string;
  readonly image?: string;
  readonly category?: string;
  readonly basePrice: number; // En centavos
  readonly unitPrice: number; // basePrice + suma(priceDelta)
  readonly quantity: number;
  readonly selectedModifiers: SelectedModifierOption[];
}

/**
 * Estado global persistente del carrito en localStorage
 */
export const $cart = persistentAtom<CartItem[]>('esqueleto_cart:', [], {
  encode: JSON.stringify,
  decode: (value: string): CartItem[] => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
});

export function generateInstanceId(
  productId: string,
  selectedModifiers: SelectedModifierOption[] = []
): string {
  if (!selectedModifiers || selectedModifiers.length === 0) return productId;
  const sortedOptionIds = [...selectedModifiers]
    .map((m) => m.optionId)
    .sort()
    .join('_');
  return `${productId}_${sortedOptionIds}`;
}

/**
 * Agrega un producto con modificadores seleccionados al carrito
 */
export function addItem(item: {
  id: string;
  title: string;
  image?: string;
  category?: string;
  basePrice: number;
  quantity?: number;
  selectedModifiers?: SelectedModifierOption[];
}): void {
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
  const selectedModifiers = item.selectedModifiers || [];

  const modifiersDelta = selectedModifiers.reduce(
    (acc, m) => acc + (m.priceDelta || 0),
    0
  );
  const unitPrice = item.basePrice + modifiersDelta;
  const instanceId = generateInstanceId(item.id, selectedModifiers);

  const currentCart = $cart.get();
  const existingIndex = currentCart.findIndex(
    (i) => (i.instanceId || i.id) === instanceId
  );

  if (existingIndex > -1) {
    const updated = [...currentCart];
    const existing = updated[existingIndex];
    if (existing) {
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + quantity,
      };
      $cart.set(updated);
    }
  } else {
    $cart.set([
      ...currentCart,
      {
        id: item.id,
        instanceId,
        title: item.title,
        image: item.image,
        category: item.category,
        basePrice: item.basePrice,
        unitPrice,
        quantity,
        selectedModifiers,
      },
    ]);
  }
}

export const addCartItem = addItem;

/**
 * Actualiza la cantidad de un artículo configurado
 */
export function updateQuantity(instanceId: string, quantity: number): void {
  if (quantity <= 0) {
    removeItem(instanceId);
    return;
  }

  const currentCart = $cart.get();
  const updated = currentCart.map((item) => {
    if ((item.instanceId || item.id) === instanceId) {
      return { ...item, quantity };
    }
    return item;
  });

  $cart.set(updated);
}

/**
 * Elimina una configuración de producto del carrito
 */
export function removeItem(instanceId: string): void {
  const currentCart = $cart.get();
  const filtered = currentCart.filter(
    (item) => (item.instanceId || item.id) !== instanceId
  );
  $cart.set(filtered);
}

export const removeCartItem = removeItem;

/**
 * Vacía por completo el carrito
 */
export function clearCart(): void {
  $cart.set([]);
}

/**
 * Total de piezas físicas en el carrito
 */
export function getTotalQuantity(): number {
  return $cart.get().reduce((acc, item) => acc + item.quantity, 0);
}

/**
 * Monto total en centavos
 */
export function getTotalAmount(): number {
  return $cart.get().reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );
}
