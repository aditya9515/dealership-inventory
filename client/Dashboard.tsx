import { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Boxes,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  History,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { api, money } from './api';
import type { Catalogue, User } from './types';
import { Brand } from './components/Brand';
import { VehicleCard } from './components/VehicleCard';
import { VehicleDialog, type VehicleAction } from './components/VehicleDialog';
import { Activity } from './Activity';
import { Dialog } from './components/Dialog';

const initialFilters = {
  q: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  inStock: '',
  sort: 'name',
};

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const admin = user.role === 'admin';
  const [view, setView] = useState<'inventory' | 'activity'>('inventory');
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<VehicleAction | null>(null);
  const [notice, setNotice] = useState('');
  const [help, setHelp] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.q), 250);
    return () => clearTimeout(timer);
  }, [filters.q]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: '9', sort: filters.sort });
    for (const [key, value] of Object.entries({ ...filters, q: debouncedQuery }))
      if (value) params.set(key, value);
    setLoading(true);
    setError('');
    api<Catalogue>(`/vehicles/search?${params}`, { signal: controller.signal })
      .then((result) => {
        if (result.pagination.totalPages && page > result.pagination.totalPages)
          setPage(result.pagination.totalPages);
        else setData(result);
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    debouncedQuery,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    filters.sort,
    page,
    revision,
  ]);
  function filter(key: keyof typeof initialFilters, value: string) {
    setPage(1);
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }
  function saved(message: string) {
    setAction(null);
    setNotice(message);
    setRevision((value) => value + 1);
  }
  const summary = data?.summary;
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && value !== '');
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">
            <CarFront size={18} />
          </span>
          <div>
            <strong>The showroom</strong>
            <span>{admin ? 'Dealership workspace' : 'Vehicle collection'}</span>
          </div>
          <span className="live-dot" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${view === 'inventory' ? 'active' : ''}`}
            onClick={() => setView('inventory')}
          >
            <LayoutGrid size={18} /> Inventory{' '}
            <span className="nav-count">{summary?.models ?? '—'}</span>
          </button>
          {admin && (
            <button
              className={`nav-item ${view === 'activity' ? 'active' : ''}`}
              onClick={() => setView('activity')}
            >
              <History size={18} /> Activity
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-label">ROOM FOR YOUR NEXT CHAPTER</span>
            <p>
              A well-kept inventory.
              <br />A road full of possibilities.
            </p>
            <ArrowRight size={19} />
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Quick guide
          </button>
          <button className="nav-item" onClick={onLogout}>
            <LogOut size={17} /> Sign out
          </button>
          <div className="sidebar-footer">
            MOTORSTOCK <span>EST. 2026</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{view === 'inventory' ? 'Inventory' : 'Activity'}</strong>
          </div>
          <div className="profile">
            <div>
              <strong>{user.name}</strong>
              <span>{admin ? 'Administrator' : 'Customer'}</span>
            </div>
            <span className="avatar">{initials}</span>
            <button className="mobile-logout icon-button" aria-label="Sign out" onClick={onLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="page-heading">
            <div>
              <span className="small-label">YOUR SHOWROOM, IN SYNC</span>
              <h1>
                {view === 'inventory' ? 'A good day to drive.' : 'Every update, accounted for.'}
              </h1>
              <p className="muted">
                {view === 'inventory'
                  ? 'Explore the collection. Keep the details in check.'
                  : 'Follow the movement of every vehicle in your inventory.'}
              </p>
            </div>
            {admin && view === 'inventory' && (
              <button
                className="button primary add-vehicle"
                onClick={() => setAction({ kind: 'add' })}
              >
                <Plus size={17} /> Add vehicle
              </button>
            )}
          </div>
          {view === 'inventory' ? (
            <>
              <section className="stats-grid" aria-label="Inventory summary">
                {[
                  {
                    title: 'VEHICLE MODELS',
                    value: summary?.models,
                    description: 'Across the showroom',
                    icon: CarFront,
                    style: 'green',
                  },
                  {
                    title: 'UNITS IN STOCK',
                    value: summary?.totalUnits,
                    description: 'Ready for the road',
                    icon: Package,
                    style: 'blue',
                  },
                  {
                    title: 'INVENTORY VALUE',
                    value: summary ? money(summary.inventoryValue) : undefined,
                    description: 'Total value of current stock',
                    icon: Wallet,
                    style: 'purple',
                  },
                  {
                    title: 'LOW STOCK',
                    value: summary?.lowStock,
                    description: 'Models with 2 units or fewer',
                    icon: TriangleAlert,
                    style: 'orange',
                  },
                ].map((stat) => (
                  <article key={stat.title} className="stat-card">
                    <div className="stat-top">
                      <span>{stat.title}</span>
                      <span className={`stat-icon ${stat.style}`}>
                        <stat.icon size={17} />
                      </span>
                    </div>
                    <strong>{stat.value ?? '—'}</strong>
                    <p>{stat.description}</p>
                  </article>
                ))}
              </section>
              <section className="catalogue-section" aria-label="Vehicle inventory">
                <div className="section-heading">
                  <div className="flex items-center gap-3">
                    <h2>The collection</h2>
                    <span className="result-count">{data?.pagination.total ?? 0} vehicles</span>
                  </div>
                  <span className="collection-note">
                    <span className="live-dot" /> Stock saved with every update
                  </span>
                </div>
                <div className="filter-bar">
                  <div className="search-field">
                    <Search size={18} />
                    <input
                      aria-label="Search vehicles"
                      placeholder="Search make, model, or category…"
                      value={filters.q}
                      onChange={(event) => filter('q', event.target.value)}
                    />
                    {filters.q && (
                      <button aria-label="Clear search" onClick={() => filter('q', '')}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <div className="category-filter">
                    <input
                      aria-label="Filter by category"
                      list="filter-categories"
                      placeholder="All categories"
                      value={filters.category}
                      onChange={(event) => filter('category', event.target.value)}
                    />
                    <datalist id="filter-categories">
                      {['SUV', 'Sedan', 'Hatchback', 'Electric', 'Coupe', 'Truck'].map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                  <button
                    className={`button filter-toggle ${advanced ? 'selected' : ''}`}
                    aria-expanded={advanced}
                    onClick={() => setAdvanced(!advanced)}
                  >
                    <SlidersHorizontal size={16} /> Filters{' '}
                    {(filters.minPrice || filters.maxPrice || filters.inStock) && (
                      <span className="filter-dot" />
                    )}
                  </button>
                  <div className="sort-field">
                    <ArrowDownUp size={15} />
                    <select
                      aria-label="Sort vehicles"
                      value={filters.sort}
                      onChange={(event) => filter('sort', event.target.value)}
                    >
                      <option value="name">Name: A–Z</option>
                      <option value="price_asc">Price: Low to high</option>
                      <option value="price_desc">Price: High to low</option>
                      <option value="newest">Recently added</option>
                    </select>
                  </div>
                </div>
                {advanced && (
                  <div className="advanced-filters">
                    <label>
                      Min price (₹)
                      <input
                        aria-label="Minimum price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="No minimum"
                        value={filters.minPrice}
                        onChange={(event) => filter('minPrice', event.target.value)}
                      />
                    </label>
                    <span className="range-dash">—</span>
                    <label>
                      Max price (₹)
                      <input
                        aria-label="Maximum price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="No maximum"
                        value={filters.maxPrice}
                        onChange={(event) => filter('maxPrice', event.target.value)}
                      />
                    </label>
                    <label>
                      Availability
                      <select
                        aria-label="Filter availability"
                        value={filters.inStock}
                        onChange={(event) => filter('inStock', event.target.value)}
                      >
                        <option value="">All vehicles</option>
                        <option value="true">In stock</option>
                        <option value="false">Out of stock</option>
                      </select>
                    </label>
                  </div>
                )}
                {hasFilters && (
                  <div className="active-filters">
                    <span>Showing filtered results</span>
                    <button onClick={clearFilters}>
                      Clear all <X size={13} />
                    </button>
                  </div>
                )}
                {error ? (
                  <div className="empty-state">
                    <TriangleAlert size={26} />
                    <p role="alert">{error}</p>
                    <button className="button secondary" onClick={() => setRevision(revision + 1)}>
                      Try again
                    </button>
                    {hasFilters && (
                      <button className="text-link" onClick={clearFilters}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : loading ? (
                  <div className="vehicle-grid" aria-label="Loading vehicles" role="status">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div key={index} className="skeleton-card animate-pulse">
                        <div />
                        <span />
                        <span />
                      </div>
                    ))}
                  </div>
                ) : data?.vehicles.length ? (
                  <div className="vehicle-grid">
                    {data.vehicles.map((vehicle, index) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        index={index}
                        admin={admin}
                        onAction={setAction}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Boxes size={38} />
                    <h3>
                      {hasFilters
                        ? 'No vehicles found'
                        : 'Your showroom is ready for its first vehicle'}
                    </h3>
                    <p>
                      {hasFilters
                        ? 'Try another search or adjust your filters.'
                        : admin
                          ? 'Add a vehicle to start building your collection.'
                          : 'Check back soon for new arrivals.'}
                    </p>
                    {hasFilters ? (
                      <button className="button secondary" onClick={clearFilters}>
                        Clear filters
                      </button>
                    ) : (
                      admin && (
                        <button
                          className="button primary"
                          onClick={() => setAction({ kind: 'add' })}
                        >
                          Add vehicle
                        </button>
                      )
                    )}
                  </div>
                )}
                {data && data.pagination.totalPages > 1 && (
                  <div className="pagination">
                    <span>
                      Page {page} of {data.pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="button secondary"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft size={15} /> Previous
                      </button>
                      <button
                        className="button secondary"
                        disabled={page >= data.pagination.totalPages || loading}
                        onClick={() => setPage(page + 1)}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <Activity />
          )}
          <footer className="main-footer">
            <span>
              <CarFront size={15} /> A little more order. A lot more possibility.
            </span>
            <span>Motorstock © 2026</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {action && <VehicleDialog action={action} onClose={() => setAction(null)} onSaved={saved} />}
      {help && (
        <Dialog title="A quick tour of Motorstock" onClose={() => setHelp(false)}>
          <div className="guide">
            <p>
              Search by make, model, or category. Open Filters to narrow the price range or show
              only vehicles in stock.
            </p>
            <p>
              Choose Purchase, enter a quantity, and confirm. Stock updates as soon as your purchase
              succeeds.
            </p>
            {admin && (
              <p>
                As an administrator, you can add and edit vehicles, restock inventory with the +
                button, or delete a listing. The Activity tab records initial stock, purchases, and
                restocks.
              </p>
            )}
            <button className="button primary" onClick={() => setHelp(false)}>
              Got it
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
