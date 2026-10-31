import { Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import SelectControl from '../../../components/ui/SelectControl.jsx';

const emptyLine = () => ({
  productId: '',
  variantId: '',
  quantity: '1',
  taxId: '',
  taxRate: '0',
});

export default function LineItemsEditor({
  items,
  onChange,
  products,
  readOnly = false,
}) {
  function updateLine(index, field, value) {
    onChange(
      items.map((item, current) =>
        current === index ? { ...current, [field]: value } : current,
      ),
    );
  }

  function updateProduct(index, productId) {
    const product = products.find((item) => item._id === productId);
    onChange(
      items.map((item, current) =>
        current === index
          ? {
              ...item,
              productId,
              variantId: '',
            }
          : current,
      ),
    );
    return product;
  }

  function removeLine(index) {
    onChange(items.filter((_, current) => current !== index));
  }

  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="text-sm font-semibold text-slate-800">Line items</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          The server snapshots active product and variant pricing. Only product,
          variant, quantity, and tax inputs are submitted.
        </p>
      </div>
      {items.map((item, index) => {
        const selectedProduct = products.find(
          (product) => product._id === item.productId,
        );
        const variants = (selectedProduct?.variants || []).filter(
          (variant) => variant.status === 'active',
        );

        return (
          <div
            className="rounded-xl border border-line bg-slate-50/60 p-4"
            key={item._id || `line-${index}`}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelectControl
                label="Product"
                onChange={(event) => updateProduct(index, event.target.value)}
                options={products
                  .filter((product) => product.status === 'active')
                  .map((product) => ({
                    value: product._id,
                    label: product.name,
                  }))}
                placeholder="Select product"
                required
                value={item.productId}
              />
              <SelectControl
                disabled={!item.productId || variants.length === 0}
                label="Variant"
                onChange={(event) =>
                  updateLine(index, 'variantId', event.target.value)
                }
                options={variants.map((variant) => ({
                  value: variant._id,
                  label: variant.name,
                }))}
                placeholder={variants.length ? 'No variant' : 'No variants'}
                value={item.variantId || ''}
              />
              <Input
                label="Quantity"
                min="1"
                onChange={(event) =>
                  updateLine(index, 'quantity', event.target.value)
                }
                required
                type="number"
                value={item.quantity}
              />
              <Input
                label="Tax rate (%)"
                max="100"
                min="0"
                onChange={(event) =>
                  updateLine(index, 'taxRate', event.target.value)
                }
                required
                step="0.01"
                type="number"
                value={item.taxRate}
              />
              <Input
                description="Optional MongoDB tax reference ID."
                label="Tax ID"
                maxLength={24}
                onChange={(event) => updateLine(index, 'taxId', event.target.value)}
                value={item.taxId || ''}
              />
            </div>
            {!readOnly && items.length > 1 && (
              <Button
                className="mt-3"
                onClick={() => removeLine(index)}
                size="sm"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" size={15} />
                Remove line
              </Button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <Button
          onClick={() => onChange([...items, emptyLine()])}
          size="sm"
          variant="secondary"
        >
          <Plus aria-hidden="true" size={15} />
          Add line item
        </Button>
      )}
    </fieldset>
  );
}

export { emptyLine };
