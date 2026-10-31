import { Search, X } from 'lucide-react';
import Button from './Button.jsx';
import Input from './Input.jsx';

export default function SearchField({
  ariaLabel = 'Search',
  className = '',
  onChange,
  onClear,
  value = '',
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        size={17}
      />
      <Input
        aria-label={ariaLabel}
        className="min-h-10 pl-10 pr-10"
        onChange={onChange}
        readOnly={!onChange}
        type="search"
        value={value}
        {...props}
      />
      {value && (onClear || onChange) && (
        <Button
          aria-label="Clear search"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400"
          onClick={onClear || (() => onChange?.({ target: { value: '' } }))}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden="true" size={15} />
        </Button>
      )}
    </div>
  );
}
