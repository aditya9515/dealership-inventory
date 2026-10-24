import { ArrowUpRight, Pencil, Plus, ShoppingBag, Trash2, Zap } from 'lucide-react';
import { money } from '../api';
import type { Vehicle } from '../types';
import { CarArt } from './CarArt';
import type { VehicleAction } from './VehicleDialog';

const palettes = [
  { color: '#648e81', background: '#eaf0e9' },
  { color: '#a29f91', background: '#eeede8' },
  { color: '#658594', background: '#e8eef0' },
  { color: '#b47765', background: '#f4eae4' },
  { color: '#b3955e', background: '#f1eddf' },
  { color: '#7c89a5', background: '#eceef5' },
];
export function VehicleCard({
  vehicle,
  admin,
  index,
  onAction,
}: {
  vehicle: Vehicle;
  admin: boolean;
  index: number;
  onAction: (action: VehicleAction) => void;
}) {
  const palette = palettes[index % palettes.length];
  return (
    <article className="vehicle-card" aria-label={`${vehicle.make} ${vehicle.model}`}>
      <div className="vehicle-art" style={{ background: palette.background }}>
        <span className="category-tag">
          {vehicle.category === 'Electric' && <Zap size={12} />} {vehicle.category}
        </span>
        <span
          className={`stock-pill ${vehicle.quantity === 0 ? 'empty' : vehicle.quantity <= 2 ? 'low' : ''}`}
        >
          <span />
          {vehicle.quantity === 0 ? 'Out of stock' : `${vehicle.quantity} in stock`}
        </span>
        <CarArt category={vehicle.category} color={palette.color} />
      </div>
      <div className="vehicle-details">
        <div className="vehicle-heading">
          <div>
            <p className="make-label">{vehicle.make}</p>
            <h3>{vehicle.model}</h3>
          </div>
          <ArrowUpRight size={20} className="vehicle-arrow" />
        </div>
        <div className="vehicle-price">
          <strong>{money(vehicle.price)}</strong>
          <span>per vehicle</span>
        </div>
        <div className="vehicle-actions">
          <button
            className="button purchase-button"
            disabled={vehicle.quantity === 0}
            onClick={() => onAction({ kind: 'purchase', vehicle })}
          >
            <ShoppingBag size={15} />
            {vehicle.quantity ? 'Purchase' : 'Unavailable'}
          </button>
          {admin && (
            <>
              <button
                className="icon-button"
                aria-label={`Restock ${vehicle.model}`}
                title="Restock"
                onClick={() => onAction({ kind: 'restock', vehicle })}
                disabled={vehicle.quantity >= 1000000}
              >
                <Plus size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={`Edit ${vehicle.model}`}
                title="Edit vehicle"
                onClick={() => onAction({ kind: 'edit', vehicle })}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button delete-button"
                aria-label={`Delete ${vehicle.model}`}
                title="Delete vehicle"
                onClick={() => onAction({ kind: 'delete', vehicle })}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
