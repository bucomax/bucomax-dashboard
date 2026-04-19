import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";

export const invitePreviewQuerySchema = z.object({
  token: z.string().min(1, zodApiMsg("errors.validationInvitePreviewTokenRequired")),
});
