import React, { ChangeEventHandler } from "react";

type Store = { id?: string | number; name: string } | string;

interface AllStoreFilterProps {
  stores: Store[]; // List of store names or objects
  selectedStore: string; // Currently selected store
  onStoreChange: ChangeEventHandler<HTMLSelectElement>; // Callback when selection changes
  className?: string;
  id?: string;
  label?: string;
}

const normalizeStore = (s: Store) =>
  typeof s === "string"
    ? { id: s, name: s }
    : { id: s.id ?? s.name, name: s.name };

const AllStoreFilter: React.FC<AllStoreFilterProps> = ({
  stores = [],
  selectedStore,
  onStoreChange,
  className = "",
  id = "all-store-filter",
  label = "Select store",
}) => {
  const normalized = stores.map(normalizeStore);

  return (
    <div className={`flex items-center ${className}`}>
      {/* Visible label on larger screens, sr-only for mobile */}
      <label
        htmlFor={id}
        className="hidden sm:inline-block text-sm font-medium text-gray-700 min-w-[90px]"
      >
        {label}
      </label>

      <div className="w-auto">
        <select
          id={id}
          value={selectedStore}
          onChange={onStoreChange}
          aria-label={label}
          className="w-full sm:w-64 md:w-72 lg:w-80 px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:ring-opacity-30 outline-none truncate"
        >
          {normalized.length === 0 ? (
            <option value="all" disabled>
              No stores available
            </option>
          ) : (
            normalized.map((store) => (
              <option key={store.id} value={store.name}>
                {store.name}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
};

export default AllStoreFilter;
