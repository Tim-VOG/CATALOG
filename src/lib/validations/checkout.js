import { z } from 'zod'

export const checkoutSchema = z.object({
  project_name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(255, 'Project name is too long'),
  project_description: z
    .string()
    .min(10, 'Please provide a brief description (min 10 characters)')
    .max(2000, 'Description is too long'),
  location_id: z.string().min(1, 'Please select a location'),
  location_other: z.string().optional(),
  justification: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
  responsibility_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept responsibility for the equipment' }),
  }),
})
