export type VoteOption = "A Favor" | "Contra" | "Abster" | null;

export type ContactCategory =
  | "Cidadão"
  | "Eleitor"
  | "Reitor"
  | "Parlamentar"
  | "Entidade"
  | "Parceiro"
  | "Institucional"
  | "Outro";

export interface Contact {
  id: string;
  name: string;
  nickname?: string;
  category: ContactCategory;
  phone?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  tags: string[];
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export const CONTACT_CATEGORIES: ContactCategory[] = [
  "Cidadão",
  "Eleitor",
  "Reitor",
  "Parlamentar",
  "Entidade",
  "Parceiro",
  "Institucional",
  "Outro",
];

export const PRESET_TAGS = [
  "autismo",
  "saúde",
  "educação",
  "LGBTQIA+",
  "assistência social",
  "habitação",
  "cultura",
  "meio ambiente",
  "segurança pública",
  "mobilidade",
  "criança e adolescente",
  "idoso",
  "pessoa com deficiência",
  "economia solidária",
  "esporte",
];

export interface VotingSession {
  id: string;
  sessionTitle: string;
  filename: string;
  importedAt: Date;
  importedBy: string;
}

export interface VotingItem {
  id: string;
  index: number;
  itemType: string; // "REQUERIMENTO" | "PLE" | "EMENDA" | "OUTRO"
  itemNumber: string;
  author: string;
  fullText: string;
  destaque?: string;
  docSuggestion?: string;
  vote: VoteOption;
  fazerAparte: boolean;
  fazerDestaque: boolean;
  notes: string;
  voteUpdatedBy?: string;
  voteUpdatedAt?: Date;
  aparteUpdatedBy?: string;
  destaqueUpdatedBy?: string;
  notesUpdatedBy?: string;
}
