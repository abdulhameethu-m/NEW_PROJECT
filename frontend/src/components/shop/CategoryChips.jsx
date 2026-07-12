export function CategoryChips({ categories, selectedCategoryId, selectedCategoryName, onSelectCategory }) {
  return (
    <div className="overflow-x-auto pb-2 pl-3 pr-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelectCategory("")}
          className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
            !selectedCategoryId
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          All
        </button>
        {categories.map((category) => {
          const isActive = category._id === selectedCategoryId || category.name === selectedCategoryName;
          return (
            <button
              type="button"
              key={category._id}
              onClick={() => onSelectCategory(category._id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {category.name?.charAt(0)?.toUpperCase() || "C"}
              </span>
              <span className="whitespace-nowrap">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
