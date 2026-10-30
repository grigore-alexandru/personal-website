'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CostCategory } from '@/lib/trips/schema';
import { CATEGORY_LABEL } from '@/lib/trips/money';
import { addCost, MutationError, parseDollarRange, type CostOwner } from '@/lib/trips/mutations';
import { useTrip } from './TripProvider';

/** "Adaugă cost": label, category, optional amount (single or range). */
export function AddCostForm({ owner, defaultCategory = 'transport' }: { owner: CostOwner; defaultCategory?: CostCategory }) {
  const { mutate, toast } = useTrip();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<CostCategory>(defaultCategory);
  const [amount, setAmount] = useState('');

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] text-sm font-semibold text-neutral-900">
        <Plus size={16} /> Adaugă cost
      </button>
    );
  }

  const submit = () => {
    if (!label.trim()) return toast('Scrie o descriere pentru cost.', 'error');
    try {
      const [min, max] = parseDollarRange(amount);
      const ok = mutate(
        addCost(owner, { label: label.trim(), category, amountCents: min, amountMaxCents: max, qty: 1, paid: false, source: 'manual', verifiedAt: null, note: null }),
      );
      if (ok) {
        setLabel('');
        setAmount('');
        setOpen(false);
      }
    } catch (e) {
      toast(e instanceof MutationError ? e.message : String(e), 'error');
    }
  };

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-neutral-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex-1 min-w-[160px] text-xs font-medium text-neutral-600">
        Descriere
        <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 px-2 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">
        Categorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CostCategory)}
          className="mt-1 block min-h-[40px] rounded-lg border border-neutral-300 px-2 text-sm bg-white"
        >
          {CostCategory.options.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-neutral-600">
        Sumă ($)
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="opțional"
          className="mt-1 block w-28 min-h-[40px] rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="min-h-[40px] px-4 rounded-lg bg-black text-white text-sm font-semibold">
          Adaugă
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[40px] px-3 rounded-lg border border-neutral-300 text-sm">
          Renunță
        </button>
      </div>
    </form>
  );
}
