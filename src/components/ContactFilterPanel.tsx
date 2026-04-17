"use client";

import { Contact, ContactCategory, PRESET_TAGS } from "@/lib/types";

interface Props {
  contacts: Contact[];
  allCategories: string[];
  selectedCategories: ContactCategory[];
  setSelectedCategories: (v: ContactCategory[]) => void;
  selectedTags: string[];
  setSelectedTags: (v: string[]) => void;
  selectedCity: string;
  setSelectedCity: (v: string) => void;
  onClear: () => void;
}

export default function ContactFilterPanel({
  contacts,
  allCategories,
  selectedCategories,
  setSelectedCategories,
  selectedTags,
  setSelectedTags,
  selectedCity,
  setSelectedCity,
  onClear,
}: Props) {
  // Derive unique tags from loaded contacts + preset tags
  const allTags = Array.from(
    new Set([...PRESET_TAGS, ...contacts.flatMap((c) => c.tags)])
  ).sort();

  // Derive unique cities from loaded contacts
  const cities = Array.from(
    new Set(contacts.map((c) => c.city).filter(Boolean) as string[])
  ).sort();

  const hasFilters =
    selectedCategories.length > 0 || selectedTags.length > 0 || selectedCity;

  const toggleCategory = (cat: ContactCategory) => {
    setSelectedCategories(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    );
  };

  return (
    <div className="space-y-5">
      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="w-full text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg py-1.5 font-medium transition"
        >
          Limpar filtros
        </button>
      )}

      {/* Category */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</p>
        <div className="space-y-1">
          {allCategories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="rounded border-gray-300 text-red-900 focus:ring-red-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {allTags.map((tag) => (
            <label key={tag} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => toggleTag(tag)}
                className="rounded border-gray-300 text-red-900 focus:ring-red-400"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {/* City */}
      {cities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cidade</p>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Todas</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
