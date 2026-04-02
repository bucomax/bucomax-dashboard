/** Cookie httpOnly da sessão do portal do paciente (separada do NextAuth staff). */
export const PATIENT_PORTAL_SESSION_COOKIE = "patient_portal_session";

/** Tempo de vida do link mágico enviado por e-mail (ms). */
export const PATIENT_PORTAL_LINK_TTL_MS = 72 * 60 * 60 * 1000;

/** Duração da sessão após troca do token (segundos). */
export const PATIENT_PORTAL_SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;
