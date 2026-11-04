// ─────────────────────────────────────────────────────────────
// EquipmentGenderPicker — choose whether armour pieces are shown
// with male or female equipment images. Used at sign-up and in the profile.
// ─────────────────────────────────────────────────────────────
import type { EquipmentGender } from '../../store/authStore';
import { cn } from '../../lib/utils';

const OPTIONS: { id: EquipmentGender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

interface EquipmentGenderPickerProps {
  value: EquipmentGender;
  onChange: (value: EquipmentGender) => void;
  className?: string;
}

export default function EquipmentGenderPicker({ value, onChange, className }: EquipmentGenderPickerProps) {
  return (
    <div role="radiogroup" aria-label="Equipment images" className={cn('flex gap-2', className)}>
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
              active
                ? 'border-mh-gold-500/60 bg-mh-gold-500/10 text-mh-gold-300'
                : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-500 hover:text-mh-slate-300',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
