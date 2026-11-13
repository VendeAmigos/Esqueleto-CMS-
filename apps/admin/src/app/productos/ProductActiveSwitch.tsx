'use client';

import React, { useEffect, useId, useState, useTransition } from 'react';
import { toggleProductActiveAction } from '../../actions/products';

interface ProductActiveSwitchProps {
  productId: string;
  productTitle: string;
  initialActive: boolean;
}

export default function ProductActiveSwitch({
  productId,
  productTitle,
  initialActive,
}: ProductActiveSwitchProps) {
  const switchId = useId();
  const [active, setActive] = useState(initialActive);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive]);

  useEffect(() => {
    if (
      typeof HTMLInputElement !== 'undefined' &&
      !('switch' in HTMLInputElement.prototype)
    ) {
      void import('input-switch-polyfill/input-switch-polyfill.css');
      void import('input-switch-polyfill');
    }
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.currentTarget.checked;
    setErrorMessage(null);
    setActive(nextChecked);

    startTransition(async () => {
      const result = await toggleProductActiveAction(productId, nextChecked);
      if (result?.error) {
        setActive(!nextChecked);
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <label
        htmlFor={switchId}
        title={
          active
            ? 'Producto visible en tienda (clic para pausar)'
            : 'Producto pausado (clic para activar)'
        }
        className={`inline-flex items-center gap-2 select-none ${
          isPending ? 'opacity-65 cursor-wait' : 'cursor-pointer'
        }`}
      >
        <input
          id={switchId}
          type="checkbox"
          checked={active}
          disabled={isPending}
          onChange={handleChange}
          {...({ switch: '' } as Record<string, string>)}
        />
        <span className="sr-only">Estado de {productTitle}: </span>
        <span
          className={`text-xs font-semibold whitespace-nowrap ${
            active ? 'text-emerald-700' : 'text-gray-500'
          }`}
        >
          {active ? 'Activo' : 'Pausado'}
        </span>
      </label>
      {errorMessage && (
        <span role="alert" className="text-[11px] font-medium text-red-600">
          {errorMessage}
        </span>
      )}
    </div>
  );
}

