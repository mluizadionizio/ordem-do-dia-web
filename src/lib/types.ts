export type VoteOption = "A Favor" | "Contra" | "Abster" | null;

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
