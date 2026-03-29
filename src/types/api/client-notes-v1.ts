import type { ApiPagination } from "@/lib/api/pagination";

export type ClientNoteDto = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type ClientNotesListQueryParams = {
  page?: number;
  limit?: number;
};

export type ClientNotesListResponseData = {
  data: ClientNoteDto[];
  pagination: ApiPagination;
};

export type CreateClientNoteRequestBody = {
  content: string;
};

export type CreateClientNoteResponseData = {
  note: ClientNoteDto;
};
