import Input from './Input.jsx';

export default function DateRangeControl({
  fromLabel = 'From',
  onChange,
  toLabel = 'To',
  value = { from: '', to: '' },
}) {
  function update(field, fieldValue) {
    onChange?.({ ...value, [field]: fieldValue });
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Date range</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          aria-label={fromLabel}
          label={fromLabel}
          max={value.to || undefined}
          onChange={(event) => update('from', event.target.value)}
          readOnly={!onChange}
          type="date"
          value={value.from || ''}
        />
        <Input
          aria-label={toLabel}
          label={toLabel}
          min={value.from || undefined}
          onChange={(event) => update('to', event.target.value)}
          readOnly={!onChange}
          type="date"
          value={value.to || ''}
        />
      </div>
    </fieldset>
  );
}
