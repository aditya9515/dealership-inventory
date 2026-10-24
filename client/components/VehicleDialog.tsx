import { useState, type FormEvent } from 'react';
import { api, money } from '../api';
import type { Vehicle } from '../types';
import { Dialog } from './Dialog';

export type VehicleAction =
  | { kind: 'add' }
  | { kind: 'edit' | 'purchase' | 'restock' | 'delete'; vehicle: Vehicle };

export function VehicleDialog({
  action,
  onClose,
  onSaved,
}: {
  action: VehicleAction;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const vehicle = 'vehicle' in action ? action.vehicle : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const titles = {
    add: 'Add a vehicle',
    edit: 'Edit vehicle',
    purchase: 'Confirm purchase',
    restock: 'Restock vehicle',
    delete: 'Delete vehicle',
  };
  const catalogueForm = action.kind === 'add' || action.kind === 'edit';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (catalogueForm) {
        const body: Record<string, unknown> = {
          make: form.get('make'),
          model: form.get('model'),
          category: form.get('category'),
          price: Number(form.get('price')),
        };
        if (action.kind === 'add') body.quantity = Number(form.get('quantity'));
        await api(`/vehicles${vehicle ? `/${vehicle.id}` : ''}`, {
          method: vehicle ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        });
      } else if (action.kind === 'delete') {
        await api(`/vehicles/${vehicle!.id}`, { method: 'DELETE' });
      } else {
        await api(`/vehicles/${vehicle!.id}/${action.kind}`, {
          method: 'POST',
          body: JSON.stringify({ quantity }),
        });
      }
      onSaved(
        {
          add: 'Vehicle added to the showroom.',
          edit: 'Vehicle details updated.',
          purchase: 'Purchase complete. Stock has been updated.',
          restock: 'Stock replenished.',
          delete: 'Vehicle deleted.',
        }[action.kind],
      );
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <Dialog title={titles[action.kind]} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="dialog-form">
        {catalogueForm ? (
          <>
            <p className="muted">Keep the details clear so the right vehicle is easy to find.</p>
            <div className="form-grid">
              <label>
                Make
                <input
                  name="make"
                  defaultValue={vehicle?.make}
                  placeholder="e.g. Tata"
                  required
                  maxLength={60}
                />
              </label>
              <label>
                Model
                <input
                  name="model"
                  defaultValue={vehicle?.model}
                  placeholder="e.g. Nexon"
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <label>
              Category
              <input
                name="category"
                list="vehicle-categories"
                defaultValue={vehicle?.category || 'SUV'}
                required
                maxLength={40}
              />
            </label>
            <datalist id="vehicle-categories">
              {['SUV', 'Sedan', 'Hatchback', 'Electric', 'Coupe', 'Truck'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </datalist>
            <div className="form-grid">
              <label>
                Price (₹)
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  max="100000000"
                  step="0.01"
                  defaultValue={vehicle?.price}
                  required
                />
              </label>
              {action.kind === 'add' ? (
                <label>
                  Initial stock
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    defaultValue="1"
                    required
                  />
                </label>
              ) : (
                <div className="stock-note">
                  Stock: {vehicle?.quantity} units
                  <br />
                  <span>Use Restock to add inventory.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              {vehicle!.make} <strong>{vehicle!.model}</strong>
            </p>
            {action.kind === 'delete' ? (
              <p>
                This removes the vehicle from the catalogue. Its past inventory activity will be
                retained.
              </p>
            ) : (
              <>
                <div className="transaction-info">
                  <span>Current stock</span>
                  <strong>{vehicle!.quantity} units</strong>
                </div>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    max={
                      action.kind === 'purchase' ? vehicle!.quantity : 1000000 - vehicle!.quantity
                    }
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    required
                  />
                </label>
                {action.kind === 'purchase' && (
                  <div className="transaction-info">
                    <span>Total price</span>
                    <strong>{money(vehicle!.price * quantity)}</strong>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={`button ${action.kind === 'delete' ? 'danger' : 'primary'}`}
            disabled={busy}
          >
            {busy ? 'Saving…' : catalogueForm ? 'Save vehicle' : titles[action.kind]}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
