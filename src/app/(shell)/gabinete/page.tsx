"use client";

import { useEffect, useMemo, useState } from "react";
import { Contact, ContactCategory, CONTACT_CATEGORIES, PRESET_TAGS } from "@/lib/types";
import { listenToContacts, listenToCategories, deleteContact, bulkDeleteContacts, bulkAddTags, bulkSetCategory } from "@/lib/contacts-firestore";
import { exportContactsToCSV, exportContactsToXLSX } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import ContactCard from "@/components/ContactCard";
import ContactFilterPanel from "@/components/ContactFilterPanel";
import ContactModal from "@/components/ContactModal";
import ImportContactsModal from "@/components/ImportContactsModal";
import BulkActionsBar from "@/components/BulkActionsBar";

export default function GabineteVirtualPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<ContactCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal state
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const unsub = listenToContacts((data) => {
      setContacts(data);
      setLoading(false);
    });
    const unsubCat = listenToCategories(setCustomCategories);
    return () => { unsub(); unsubCat(); };
  }, []);

  const allCategories = useMemo(
    () => Array.from(new Set([...CONTACT_CATEGORIES, ...customCategories])),
    [customCategories]
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set([...PRESET_TAGS, ...contacts.flatMap((c) => c.tags)])).sort(),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          (c.nickname?.toLowerCase().includes(q) ?? false) ||
          (c.neighborhood?.toLowerCase().includes(q) ?? false) ||
          (c.city?.toLowerCase().includes(q) ?? false) ||
          c.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedCategories.length && !selectedCategories.includes(c.category)) return false;
      if (selectedTags.length && !selectedTags.every((t) => c.tags.includes(t))) return false;
      if (selectedCity && c.city !== selectedCity) return false;
      return true;
    });
  }, [contacts, searchText, selectedCategories, selectedTags, selectedCity]);

  const hasFilters =
    !!searchText || selectedCategories.length > 0 || selectedTags.length > 0 || !!selectedCity;

  function clearFilters() {
    setSearchText("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedCity("");
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!confirm(`Excluir ${ids.length} contato${ids.length !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`)) return;
    try {
      await bulkDeleteContacts(ids);
      exitSelectionMode();
    } catch {
      alert("Erro ao excluir contatos.");
    }
  }

  async function handleBulkAddTags(tags: string[]) {
    if (!user) return;
    await bulkAddTags(Array.from(selectedIds), tags, user);
  }

  async function handleBulkSetCategory(category: string) {
    if (!user) return;
    await bulkSetCategory(Array.from(selectedIds), category, user);
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`Excluir o contato "${contact.name}"?`)) return;
    try {
      await deleteContact(contact.id);
    } catch {
      alert("Erro ao excluir contato.");
    }
  }

  function openCreate() {
    setEditingContact(undefined);
    setModalOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Toolbar ── */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nome, tag, bairro..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setIsFilterOpen((o) => !o)}
            className={`md:hidden flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition
              ${isFilterOpen || hasFilters ? "bg-red-900 text-white border-red-900" : "bg-white border-gray-200 text-gray-600 hover:border-red-300"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filtros
            {hasFilters && (
              <span className="bg-white text-red-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                !
              </span>
            )}
          </button>

          {/* Selection mode toggle */}
          <button
            onClick={selectionMode ? exitSelectionMode : enterSelectionMode}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition ${
              selectionMode
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selectionMode ? "Selecionando" : "Selecionar"}
          </button>

          {/* Action buttons */}
          <button
            onClick={openCreate}
            className="bg-red-900 hover:bg-red-800 text-white text-sm px-4 py-2 rounded-xl font-medium transition flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo
          </button>

          <button
            onClick={() => exportContactsToCSV(filteredContacts)}
            disabled={filteredContacts.length === 0}
            title="Baixar CSV"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-green-400 hover:text-green-700 transition disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>

          <button
            onClick={() => exportContactsToXLSX(filteredContacts)}
            disabled={filteredContacts.length === 0}
            title="Baixar XLSX"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-emerald-500 hover:text-emerald-700 transition disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            XLSX
          </button>

          <button
            onClick={() => setImportOpen(true)}
            title="Importar CSV"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Importar
          </button>
        </div>
      </div>

      {/* ── Body: filter sidebar + contact grid ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop filter sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4">
          <ContactFilterPanel
            contacts={contacts}
            allCategories={allCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            onClear={clearFilters}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-5xl mx-auto">

            {/* Mobile filter panel (collapsible) */}
            {isFilterOpen && (
              <div className="md:hidden bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <ContactFilterPanel
                  contacts={contacts}
                  allCategories={allCategories}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  selectedTags={selectedTags}
                  setSelectedTags={setSelectedTags}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  onClear={clearFilters}
                />
              </div>
            )}

            {/* Count bar */}
            {!loading && contacts.length > 0 && (
              <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                <span>
                  {filteredContacts.length === contacts.length
                    ? `${contacts.length} contato${contacts.length !== 1 ? "s" : ""}`
                    : `${filteredContacts.length} de ${contacts.length} contato${contacts.length !== 1 ? "s" : ""}`}
                </span>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-red-600 hover:text-red-800 text-xs font-medium">
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-24">
                <span className="w-8 h-8 border-4 border-red-900 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Empty state — no contacts at all */}
            {!loading && contacts.length === 0 && (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-lg font-semibold text-gray-700">Nenhum contato ainda</p>
                <p className="text-sm text-gray-400 mt-1">Adicione o primeiro contato do gabinete</p>
                <button
                  onClick={openCreate}
                  className="inline-block mt-6 bg-red-900 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  + Adicionar contato
                </button>
              </div>
            )}

            {/* Empty state — filters returned nothing */}
            {!loading && contacts.length > 0 && filteredContacts.length === 0 && (
              <div className="text-center py-24">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-base font-semibold text-gray-700">Nenhum resultado</p>
                <p className="text-sm text-gray-400 mt-1">Nenhum contato corresponde aos filtros selecionados</p>
                <button
                  onClick={clearFilters}
                  className="inline-block mt-6 text-red-700 hover:text-red-900 text-sm font-medium underline underline-offset-2"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* Contact grid */}
            {!loading && filteredContacts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={() => openEdit(contact)}
                    onDelete={() => handleDelete(contact)}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(contact.id)}
                    onToggleSelect={() => toggleSelect(contact.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {modalOpen && (
        <ContactModal
          contact={editingContact}
          allTags={allTags}
          allCategories={allCategories}
          onClose={() => { setModalOpen(false); setEditingContact(undefined); }}
        />
      )}
      {importOpen && (
        <ImportContactsModal onClose={() => setImportOpen(false)} />
      )}

      {selectionMode && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={filteredContacts.length}
          allSelected={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onAddTags={handleBulkAddTags}
          onChangeCategory={handleBulkSetCategory}
          onDelete={handleBulkDelete}
          onCancel={exitSelectionMode}
          allTags={allTags}
          allCategories={allCategories}
        />
      )}
    </div>
  );
}
