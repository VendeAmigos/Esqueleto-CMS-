import { persistentAtom } from '@nanostores/persistent';

/**
 * Datos de contacto y envío capturados en el carrito.
 * Se persisten en localStorage para que el cliente no tenga que reescribirlos.
 */
export interface ShippingData {
  deliveryMethod: 'delivery' | 'pickup';
  fullName: string;
  phone: string;
  street: string;
  extNumber: string;
  intNumber: string;
  neighborhood: string;
  municipality: string;
  city: string;
  state: string;
  zip: string;
  references: string;
  lat: number | null;
  lng: number | null;
  /** 'gps' = ubicación del dispositivo, 'map' = pin ajustado/ubicado en mapa, 'zip' = solo dirección escrita */
  locationSource: 'gps' | 'map' | 'zip';
}

export const emptyShipping: ShippingData = {
  deliveryMethod: 'delivery',
  fullName: '',
  phone: '',
  street: '',
  extNumber: '',
  intNumber: '',
  neighborhood: '',
  municipality: '',
  city: '',
  state: '',
  zip: '',
  references: '',
  lat: null,
  lng: null,
  locationSource: 'zip',
};

export const $shipping = persistentAtom<ShippingData>('esqueleto_shipping:', emptyShipping, {
  encode: JSON.stringify,
  decode: (value: string): ShippingData => {
    try {
      const parsed = JSON.parse(value);
      return {
        ...emptyShipping,
        ...parsed,
        deliveryMethod: parsed?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
      };
    } catch {
      return emptyShipping;
    }
  },
});

export function updateShipping(patch: Partial<ShippingData>): void {
  $shipping.set({ ...$shipping.get(), ...patch });
}

/** Devuelve la lista de campos faltantes/invalidos (ids de input) para resaltarlos. */
export function getShippingErrors(s: ShippingData): { field: keyof ShippingData; message: string }[] {
  const errors: { field: keyof ShippingData; message: string }[] = [];
  const phone = s.phone.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');

  if (s.fullName.trim().length < 3) errors.push({ field: 'fullName', message: 'Escribe tu nombre completo' });
  if (!/^\d{10}$/.test(phone)) errors.push({ field: 'phone', message: 'Teléfono a 10 dígitos' });

  if (s.deliveryMethod === 'pickup') {
    return errors;
  }

  if (!/^\d{5}$/.test(s.zip.trim())) errors.push({ field: 'zip', message: 'Código postal de 5 dígitos' });
  if (!s.street.trim()) errors.push({ field: 'street', message: 'Escribe la calle' });
  if (!s.extNumber.trim()) errors.push({ field: 'extNumber', message: 'Número exterior' });
  if (!s.neighborhood.trim()) errors.push({ field: 'neighborhood', message: 'Elige o escribe tu colonia' });
  if (!s.municipality.trim()) errors.push({ field: 'municipality', message: 'Municipio / alcaldía' });
  if (!s.state.trim()) errors.push({ field: 'state', message: 'Estado' });

  return errors;
}
