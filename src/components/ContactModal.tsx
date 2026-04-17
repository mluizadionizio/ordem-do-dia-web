"use client";

import { useEffect, useRef, useState } from "react";
import { Contact, ContactCategory, CONTACT_CATEGORIES, PRESET_TAGS } from "@/lib/types";
import { createContact, updateContact } from "@/lib/contacts-firestore";
import { useAuth } from "@/lib/auth-context";

interface Props {
  contact?: Contact;
  allTags: string[];
  onClose: () => void;
}

const EMPTY_FORM = {
  name: "",
  nickname: "",
  category: "Cidadão" as ContactCategory,
  phone: "",
  email: "",
  address: "",
  neighborhood: "",
  city: "",
  tags: [] as string[],
  notes: "",
};

export default function ContactModal({ contact, allTags, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Tag autocomplete state
  const [tagInput, setTagInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        nickname: contact.nickname ?? "",
        category: contact.category,
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        address: contact.address ?? "",
        neighborhood: contact.neighborhood ?? "",
        city: contact.city ?? "",
        tags: [...contact.tags],
        notes: contact.notes ?? "",
      });
    }
  }, [contact]);

  const suggestionTags = Array.from(
    new Set([...PRESET_TAGS, ...allTags])
  )
    .filter(
      (t) =>
        t.toLowerCase().includes(tagInput.toLowerCase()) &&
        !form.tags.includes(t)
    )
    .slice(0, 10);

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }));
    setTagInput("");
    setTagDropdownOpen(false);
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionTags.length > 0) {
        addTag(suggestionTags[0]);
      } else if (tagInput.trim()) {
        addTag(tagInput.trim());
      }
    } else if (e.key === "Escape") {
      setTagDropdownOpen(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    setSaving(true);
    setError("");

    const data = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
      category: form.category,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
      city: form.city.trim() || undefined,
      tags: form.tags,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (contact) {
        await updateContact(contact.id, data, user);
      } else {
        await createContact(data, user);
      }
      onClose();
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      setError(`Erro ao salvar contato [${code ?? "desconhecido"}]: ${err instanceof Error ? err.message : "tente novamente."}`);
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-base">
            {contact ? "Editar contato" : "Novo contato"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Name + Nickname */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                disabled={saving}
                placeholder="Nome completo"
                className={field}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Apelido</label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                disabled={saving}
                placeholder="Como é conhecido"
                className={field}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ContactCategory }))}
              disabled={saving}
              className={field}
            >
              {CONTACT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={saving}
                placeholder="(81) 99999-9999"
                className={field}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={saving}
                placeholder="email@exemplo.com"
                className={field}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              disabled={saving}
              placeholder="Rua, número"
              className={field}
            />
          </div>

          {/* Neighborhood + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                disabled={saving}
                placeholder="Bairro"
                className={field}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                disabled={saving}
                placeholder="Recife"
                className={field}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
            {/* Pills */}
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-red-400 hover:text-red-700 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Input with dropdown */}
            <div className="relative">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setTagDropdownOpen(true);
                }}
                onFocus={() => setTagDropdownOpen(true)}
                onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
                onKeyDown={handleTagKeyDown}
                disabled={saving}
                placeholder="Adicionar tag... (ex: autismo)"
                className={field}
              />
              {tagDropdownOpen && (tagInput || suggestionTags.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {suggestionTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={() => addTag(tag)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 hover:text-red-900 transition"
                    >
                      {tag}
                    </button>
                  ))}
                  {tagInput.trim() && !form.tags.includes(tagInput.trim()) && !suggestionTags.includes(tagInput.trim()) && (
                    <button
                      type="button"
                      onMouseDown={() => addTag(tagInput.trim())}
                      className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition border-t border-gray-100"
                    >
                      Adicionar "{tagInput.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={saving}
              placeholder="Informações adicionais..."
              rows={3}
              className={`${field} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 bg-red-900 hover:bg-red-800 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              contact ? "Salvar alterações" : "Criar contato"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
