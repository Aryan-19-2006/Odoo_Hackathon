import { useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import SelectControl from '../../../components/ui/SelectControl.jsx';
import LineItemsEditor, { emptyLine } from './LineItemsEditor.jsx';

const statuses = {
  products: ['active', 'inactive', 'archived'],
  plans: ['active', 'inactive', 'archived'],
  templates: ['active', 'inactive'],
  quotations: ['quotation', 'confirmed', 'expired', 'cancelled'],
};

export function initialValues(resource, record) {
  if (resource === 'products') {
    return {
      name: record?.name || '',
      type: record?.type || '',
      salesPrice: record?.salesPrice ?? '',
      costPrice: record?.costPrice ?? '',
      description: record?.description || '',
      status: record?.status || 'active',
      variants: (record?.variants || []).map((variant) => ({
        id: variant._id,
        name: variant.name || '',
        sku: variant.sku || '',
        priceDelta: variant.priceDelta ?? 0,
        costDelta: variant.costDelta ?? 0,
        status: variant.status || 'active',
      })),
    };
  }
  if (resource === 'plans') {
    return {
      name: record?.name || '',
      description: record?.description || '',
      frequency: record?.frequency || 'monthly',
      minQuantity: record?.minQuantity ?? 1,
      productIds: record?.productIds?.map(String) || [],
      availableFrom: record?.availableFrom?.slice?.(0, 10) || '',
      availableTo: record?.availableTo?.slice?.(0, 10) || '',
      autoClose: Boolean(record?.autoClose),
      autoCloseAfterCycles: record?.autoCloseAfterCycles ?? '',
      earlyCloseAllowed: Boolean(record?.earlyCloseAllowed),
      pauseAllowed: Boolean(record?.pauseAllowed),
      renewalAllowed: record?.renewalAllowed ?? true,
      status: record?.status || 'active',
    };
  }
  if (resource === 'templates') {
    return {
      name: record?.name || '',
      planId: String(record?.planId || ''),
      validityDays: record?.validityDays ?? 30,
      notes: record?.notes || '',
      status: record?.status || 'active',
      items: record?.items?.length
        ? record.items.map((item) => ({
            ...item,
            productId: String(item.productId),
            variantId: item.variantId ? String(item.variantId) : '',
            quantity: String(item.quantity),
            taxId: item.taxId ? String(item.taxId) : '',
            taxRate: String(item.taxRate ?? 0),
          }))
        : [emptyLine()],
    };
  }
  if (resource === 'quotations') {
    const issuedAt = record?.issuedAt ? new Date(record.issuedAt).getTime() : 0;
    const expiresAt = record?.expiresAt ? new Date(record.expiresAt).getTime() : 0;
    return {
      templateId: '',
      customerId: record?.customerId || '',
      planId: record?.planId ? String(record.planId) : '',
      validityDays:
        issuedAt && expiresAt
          ? Math.max(1, Math.round((expiresAt - issuedAt) / 86400000))
          : 30,
      items: record?.items?.length
        ? record.items.map((item) => ({
            ...item,
            productId: String(item.productId),
            variantId: item.variantId ? String(item.variantId) : '',
            quantity: String(item.quantity),
            taxId: item.taxId ? String(item.taxId) : '',
            taxRate: String(item.taxRate ?? 0),
          }))
        : [emptyLine()],
      notes: record?.notes || '',
      startDate: '',
      expiryDate: '',
      paymentTerms: '',
    };
  }
  return {
    templateId: '',
    customerId: '',
    planId: '',
    validityDays: 30,
    items: [emptyLine()],
    notes: '',
    startDate: '',
    expiryDate: '',
    paymentTerms: '',
  };
}

function toLineItems(items) {
  return items.map((item, index) => {
    const productId = item.productId.trim();
    const quantity = Number(item.quantity);
    const taxRate = Number(item.taxRate);
    if (!/^[a-f\d]{24}$/i.test(productId)) {
      throw new Error(`Line ${index + 1}: select a valid product.`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Line ${index + 1}: quantity must be a positive integer.`);
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error(`Line ${index + 1}: tax rate must be between 0 and 100.`);
    }
    const variantId = item.variantId?.trim();
    const taxId = item.taxId?.trim();
    if (variantId && !/^[a-f\d]{24}$/i.test(variantId)) {
      throw new Error(`Line ${index + 1}: tax/variant references must be valid MongoDB IDs.`);
    }
    if (taxId && !/^[a-f\d]{24}$/i.test(taxId)) {
      throw new Error(`Line ${index + 1}: tax ID must be a valid MongoDB ID.`);
    }
    return {
      productId,
      ...(variantId ? { variantId } : {}),
      quantity,
      ...(taxId ? { taxId } : {}),
      taxRate,
    };
  });
}

function Checkbox({ checked, label, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function ProductFields({ values, setValues, errors }) {
  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  function updateVariant(index, field, value) {
    set(
      'variants',
      values.variants.map((variant, current) =>
        current === index ? { ...variant, [field]: value } : variant,
      ),
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" maxLength={160} onChange={(e) => set('name', e.target.value)} required value={values.name} />
        <Input label="Type" maxLength={80} onChange={(e) => set('type', e.target.value)} required value={values.type} />
        <Input label="Sales price" min="0" onChange={(e) => set('salesPrice', e.target.value)} required step="0.01" type="number" value={values.salesPrice} />
        <Input label="Cost price" min="0" onChange={(e) => set('costPrice', e.target.value)} required step="0.01" type="number" value={values.costPrice} />
        <SelectControl label="Status" onChange={(e) => set('status', e.target.value)} options={statuses.products.map((status) => ({ value: status, label: status }))} value={values.status} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea className="min-h-24 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" maxLength={4000} onChange={(e) => set('description', e.target.value)} value={values.description} />
      </label>
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-slate-800">Product variants</legend>
          <p className="mt-1 text-xs text-slate-500">A variant’s price is added to the product sales price. Variants are saved with this product, and omitted variants are deactivated by the API.</p>
        </div>
        {values.variants.map((variant, index) => (
          <div className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-3" key={variant.id || index}>
            <Input label="Variant name" maxLength={160} onChange={(e) => updateVariant(index, 'name', e.target.value)} required value={variant.name} />
            <Input label="SKU" maxLength={80} onChange={(e) => updateVariant(index, 'sku', e.target.value)} value={variant.sku} />
            <Input label="Price delta" min="0" onChange={(e) => updateVariant(index, 'priceDelta', e.target.value)} required step="0.01" type="number" value={variant.priceDelta} />
            <Input label="Cost delta" min="0" onChange={(e) => updateVariant(index, 'costDelta', e.target.value)} required step="0.01" type="number" value={variant.costDelta} />
            <SelectControl label="Variant status" onChange={(e) => updateVariant(index, 'status', e.target.value)} options={['active', 'inactive'].map((status) => ({ value: status, label: status }))} value={variant.status} />
            <div className="flex items-end">
              <Button onClick={() => set('variants', values.variants.filter((_, current) => current !== index))} size="sm" variant="secondary">Remove variant</Button>
            </div>
          </div>
        ))}
        <Button onClick={() => set('variants', [...values.variants, { name: '', sku: '', priceDelta: 0, costDelta: 0, status: 'active' }])} size="sm" variant="secondary">Add variant</Button>
      </fieldset>
      {errors && <p className="text-sm text-rose-600">{errors}</p>}
    </>
  );
}

function PlanFields({ values, setValues, products }) {
  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  function toggleProduct(id) {
    set('productIds', values.productIds.includes(id)
      ? values.productIds.filter((current) => current !== id)
      : [...values.productIds, id]);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" maxLength={160} onChange={(e) => set('name', e.target.value)} required value={values.name} />
        <SelectControl label="Frequency" onChange={(e) => set('frequency', e.target.value)} options={['daily', 'weekly', 'monthly', 'yearly'].map((frequency) => ({ value: frequency, label: frequency }))} value={values.frequency} />
        <Input label="Minimum quantity" min="1" onChange={(e) => set('minQuantity', e.target.value)} required type="number" value={values.minQuantity} />
        <SelectControl label="Status" onChange={(e) => set('status', e.target.value)} options={statuses.plans.map((status) => ({ value: status, label: status }))} value={values.status} />
        <Input label="Available from" onChange={(e) => set('availableFrom', e.target.value)} type="date" value={values.availableFrom} />
        <Input label="Available to" min={values.availableFrom || undefined} onChange={(e) => set('availableTo', e.target.value)} type="date" value={values.availableTo} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea className="min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" maxLength={4000} onChange={(e) => set('description', e.target.value)} value={values.description} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800">Active products</legend>
        {products.filter((product) => product.status === 'active').length === 0 ? (
          <p className="text-sm text-slate-500">Create an active product before creating a plan.</p>
        ) : products.filter((product) => product.status === 'active').map((product) => (
          <Checkbox checked={values.productIds.includes(product._id)} key={product._id} label={product.name} onChange={() => toggleProduct(product._id)} />
        ))}
      </fieldset>
      <div className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
        <Checkbox checked={values.autoClose} label="Automatically close after a number of billing cycles" onChange={(checked) => set('autoClose', checked)} />
        {values.autoClose && <Input label="Auto-close after cycles" min="1" onChange={(e) => set('autoCloseAfterCycles', e.target.value)} required type="number" value={values.autoCloseAfterCycles} />}
        <Checkbox checked={values.earlyCloseAllowed} label="Allow early close" onChange={(checked) => set('earlyCloseAllowed', checked)} />
        <Checkbox checked={values.pauseAllowed} label="Allow pause" onChange={(checked) => set('pauseAllowed', checked)} />
        <Checkbox checked={values.renewalAllowed} label="Allow renewal" onChange={(checked) => set('renewalAllowed', checked)} />
      </div>
    </>
  );
}

function TemplateFields({ values, setValues, products, plans }) {
  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" maxLength={160} onChange={(e) => set('name', e.target.value)} required value={values.name} />
        <SelectControl label="Plan" onChange={(e) => set('planId', e.target.value)} options={plans.filter((plan) => plan.status === 'active').map((plan) => ({ value: plan._id, label: `${plan.name} (${plan.frequency})` }))} placeholder="Select active plan" required value={values.planId} />
        <Input label="Validity (days)" max="3650" min="1" onChange={(e) => set('validityDays', e.target.value)} required type="number" value={values.validityDays} />
        <SelectControl label="Status" onChange={(e) => set('status', e.target.value)} options={statuses.templates.map((status) => ({ value: status, label: status }))} value={values.status} />
      </div>
      <LineItemsEditor items={values.items} onChange={(items) => set('items', items)} products={products} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea className="min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" maxLength={4000} onChange={(e) => set('notes', e.target.value)} value={values.notes} />
      </label>
    </>
  );
}

function QuotationFields({ values, setValues, products, plans, templates, editing }) {
  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const isTemplate = Boolean(values.templateId) && !editing;
  return (
    <>
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input description="Use the customer ID assigned by the backend." label="Customer ID" maxLength={160} onChange={(e) => set('customerId', e.target.value)} required value={values.customerId} />
          <SelectControl label="Quotation source" onChange={(e) => { set('templateId', e.target.value); set('planId', ''); }} options={templates.filter((template) => template.status === 'active').map((template) => ({ value: template._id, label: template.name }))} placeholder="Build from a plan and line items" value={values.templateId} />
          {!isTemplate && (
            <>
              <SelectControl label="Plan" onChange={(e) => set('planId', e.target.value)} options={plans.filter((plan) => plan.status === 'active').map((plan) => ({ value: plan._id, label: `${plan.name} (${plan.frequency})` }))} placeholder="Select active plan" required value={values.planId} />
              <Input label="Validity (days)" max="3650" min="1" onChange={(e) => set('validityDays', e.target.value)} required type="number" value={values.validityDays} />
            </>
          )}
        </div>
      )}
      {editing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectControl label="Plan" onChange={(e) => set('planId', e.target.value)} options={plans.filter((plan) => plan.status === 'active').map((plan) => ({ value: plan._id, label: `${plan.name} (${plan.frequency})` }))} placeholder="Select active plan" required value={values.planId} />
          <Input label="Validity (days)" max="3650" min="1" onChange={(e) => set('validityDays', e.target.value)} required type="number" value={values.validityDays} />
        </div>
      )}
      {!isTemplate && <LineItemsEditor items={values.items} onChange={(items) => set('items', items)} products={products} />}
      {isTemplate && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          The API uses the selected active template’s plan, validity, line items,
          and notes.
        </p>
      )}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea className="min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" maxLength={4000} onChange={(e) => set('notes', e.target.value)} value={values.notes} />
      </label>
      {!editing && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Subscription start date" onChange={(e) => set('startDate', e.target.value)} type="date" value={values.startDate} />
            <Input label="Subscription expiry date" min={values.startDate || undefined} onChange={(e) => set('expiryDate', e.target.value)} type="date" value={values.expiryDate} />
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Payment terms</span>
            <textarea className="min-h-16 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" maxLength={1000} onChange={(e) => set('paymentTerms', e.target.value)} value={values.paymentTerms} />
          </label>
        </>
      )}
    </>
  );
}

export default function RecordForm({
  editing = false,
  onCancel,
  onSubmit,
  options = { products: [], plans: [], templates: [] },
  record,
  resource,
  submitting = false,
}) {
  const [values, setValues] = useState(() => initialValues(resource, record));
  const [validationError, setValidationError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setValidationError('');
    try {
      const payload = buildPayload(resource, values, editing);
      await onSubmit(payload);
    } catch (error) {
      setValidationError(error.message);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      {resource === 'products' && (
        <ProductFields
          errors={validationError}
          setValues={setValues}
          values={values}
        />
      )}
      {resource === 'plans' && (
        <PlanFields products={options.products} setValues={setValues} values={values} />
      )}
      {resource === 'templates' && (
        <TemplateFields
          plans={options.plans}
          products={options.products}
          setValues={setValues}
          values={values}
        />
      )}
      {resource === 'quotations' && (
        <QuotationFields
          editing={editing}
          plans={options.plans}
          products={options.products}
          setValues={setValues}
          templates={options.templates}
          values={values}
        />
      )}

      {validationError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {validationError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button disabled={submitting} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button loading={submitting} type="submit">
          {editing ? 'Save changes' : `Create ${resource === 'templates' ? 'template' : resource === 'quotations' ? 'quotation' : resource === 'products' ? 'product' : 'plan'}`}
        </Button>
      </div>
    </form>
  );
}

export function buildPayload(resource, values, editing = false) {
  if (resource === 'products') {
    const name = values.name.trim();
    const type = values.type.trim();
    const salesPrice = Number(values.salesPrice);
    const costPrice = Number(values.costPrice);
    if (!name || !type) throw new Error('Name and type are required.');
    if (![salesPrice, costPrice].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new Error('Sales price and cost price must be non-negative numbers.');
    }
    const variants = values.variants.map((variant, index) => {
      const variantName = variant.name.trim();
      const priceDelta = Number(variant.priceDelta);
      const costDelta = Number(variant.costDelta);
      if (!variantName || !Number.isFinite(priceDelta) || priceDelta < 0 || !Number.isFinite(costDelta) || costDelta < 0) {
        throw new Error(`Variant ${index + 1} needs a name and non-negative price/cost deltas.`);
      }
      if (variant.sku && variant.sku.trim().length > 80) {
        throw new Error(`Variant ${index + 1} SKU must be at most 80 characters.`);
      }
      return {
        ...(variant.id ? { id: variant.id } : {}),
        name: variantName,
        ...(variant.sku.trim() ? { sku: variant.sku.trim() } : {}),
        priceDelta,
        costDelta,
        status: variant.status,
      };
    });
    return {
      name,
      type,
      salesPrice,
      costPrice,
      description: values.description,
      status: values.status,
      variants,
    };
  }

  if (resource === 'plans') {
    if (!values.name.trim()) throw new Error('Plan name is required.');
    if (values.productIds.length === 0) throw new Error('Select at least one active product.');
    const minQuantity = Number(values.minQuantity);
    if (!Number.isInteger(minQuantity) || minQuantity < 1) throw new Error('Minimum quantity must be a positive integer.');
    const autoCloseAfterCycles = Number(values.autoCloseAfterCycles);
    if (values.autoClose && (!Number.isInteger(autoCloseAfterCycles) || autoCloseAfterCycles < 1)) {
      throw new Error('Auto-close cycles must be a positive integer when auto-close is enabled.');
    }
    if (values.availableFrom && values.availableTo && values.availableTo < values.availableFrom) {
      throw new Error('Available-to date must be on or after the available-from date.');
    }
    return {
      name: values.name.trim(),
      description: values.description,
      frequency: values.frequency,
      minQuantity,
      productIds: values.productIds,
      availableFrom: values.availableFrom || null,
      availableTo: values.availableTo || null,
      autoClose: values.autoClose,
      ...(values.autoClose ? { autoCloseAfterCycles } : {}),
      earlyCloseAllowed: values.earlyCloseAllowed,
      pauseAllowed: values.pauseAllowed,
      renewalAllowed: values.renewalAllowed,
      status: values.status,
    };
  }

  if (resource === 'templates') {
    if (!values.name.trim()) throw new Error('Template name is required.');
    if (!/^[a-f\d]{24}$/i.test(values.planId)) throw new Error('Select a plan.');
    const validityDays = Number(values.validityDays);
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 3650) {
      throw new Error('Validity must be from 1 to 3650 days.');
    }
    const items = toLineItems(values.items);
    return {
      name: values.name.trim(),
      planId: values.planId,
      validityDays,
      items,
      notes: values.notes,
      status: values.status,
    };
  }

  if (resource === 'quotations') {
    if (editing) {
      const planId = values.planId;
      if (!/^[a-f\d]{24}$/i.test(planId)) throw new Error('Select a plan.');
      const validityDays = Number(values.validityDays);
      if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 3650) {
        throw new Error('Validity must be from 1 to 3650 days.');
      }
      return {
        planId,
        validityDays,
        items: toLineItems(values.items),
        notes: values.notes,
      };
    }
    if (!values.customerId.trim()) throw new Error('Customer ID is required.');
    const templateId = values.templateId;
    if (templateId) {
      if (!/^[a-f\d]{24}$/i.test(templateId)) throw new Error('Select a valid template.');
      return {
        templateId,
        customerId: values.customerId.trim(),
        ...(values.startDate ? { startDate: values.startDate } : {}),
        ...(values.expiryDate ? { expiryDate: values.expiryDate } : {}),
        paymentTerms: values.paymentTerms,
        notes: values.notes,
      };
    }
    if (!/^[a-f\d]{24}$/i.test(values.planId)) throw new Error('Select an active plan.');
    const validityDays = Number(values.validityDays);
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 3650) {
      throw new Error('Validity must be from 1 to 3650 days.');
    }
    if (values.startDate && values.expiryDate && values.expiryDate <= values.startDate) {
      throw new Error('Expiry date must be after the start date.');
    }
    return {
      customerId: values.customerId.trim(),
      planId: values.planId,
      validityDays,
      items: toLineItems(values.items),
      notes: values.notes,
      ...(values.startDate ? { startDate: values.startDate } : {}),
      ...(values.expiryDate ? { expiryDate: values.expiryDate } : {}),
      paymentTerms: values.paymentTerms,
    };
  }

  throw new Error('This form is not supported.');
}
