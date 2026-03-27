import { ApiReference } from "@scalar/nextjs-api-reference";

/** Scalar UI — HTML gerado pelo pacote (Route Handler, não componente React). */
export const GET = ApiReference(
  // Tipos do pacote não expõem `spec`; em runtime o merge repassa para Scalar.createApiReference.
  {
    spec: {
      url: "/openapi.json",
    },
  } as Parameters<typeof ApiReference>[0],
);
