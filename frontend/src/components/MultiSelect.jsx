import { useState, useRef, useEffect } from "react";

export function MultiSelect({ options = [], value = [], onChange, placeholder = "Select items..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const selectedItems = options.filter((opt) => value.includes(opt._id || opt.value));
  
  // Show all unselected options that match search term
  const availableOptions = options.filter((opt) => !value.includes(opt._id || opt.value));
  const filteredOptions = availableOptions.filter(
    (opt) =>
      (opt.name || opt.label || String(opt)).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionId) => {
    if (value.includes(optionId)) {
      onChange(value.filter((v) => v !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeItem = (optionId) => {
    onChange(value.filter((v) => v !== optionId));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Display selected items */}
      <div className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap gap-2">
          {selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <span
                key={item._id || item.value}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-200">{item.name || item.label || item.shopName || item.companyName}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item._id || item.value)}
                  className="ml-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>

        {/* Search input */}
        <input
          type="text"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={selectedItems.length > 0 ? "Add more..." : placeholder}
          className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-sm outline-none dark:text-white"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option._id || option.value}
                type="button"
                onClick={() => {
                  toggleOption(option._id || option.value);
                  setSearchTerm("");
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {option.name || option.label || option.shopName || option.companyName}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
              {availableOptions.length === 0 ? "All items selected" : "No matches found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
