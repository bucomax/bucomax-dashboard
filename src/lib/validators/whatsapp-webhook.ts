import { z } from "zod";

export const whatsappWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        id: z.string(),
        changes: z
          .array(
            z.object({
              field: z.string(),
              value: z.object({
                messaging_product: z.string().optional(),
                metadata: z
                  .object({
                    phone_number_id: z.string().optional(),
                    display_phone_number: z.string().optional(),
                  })
                  .optional(),
                statuses: z
                  .array(
                    z.object({
                      id: z.string(),
                      status: z.string(),
                      timestamp: z.string(),
                      errors: z
                        .array(
                          z.object({
                            code: z.number(),
                            title: z.string(),
                          }),
                        )
                        .optional(),
                    }),
                  )
                  .optional(),
                messages: z
                  .array(
                    z.object({
                      from: z.string(),
                      id: z.string(),
                      timestamp: z.string(),
                      type: z.string(),
                      interactive: z
                        .object({
                          type: z.string(),
                          button_reply: z
                            .object({
                              id: z.string(),
                              title: z.string(),
                            })
                            .optional(),
                        })
                        .optional(),
                      context: z
                        .object({
                          from: z.string(),
                          id: z.string(),
                        })
                        .optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
