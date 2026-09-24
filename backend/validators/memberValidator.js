import { z } from 'zod';

export const memberSchema = z.object({
  fullName: z.string()
    .min(3, { message: "Legal Identity requires at least 3 characters" })
    .max(50, { message: "Name exceeds protocol limit" })
    .regex(/^[a-zA-Z\s]*$/, { message: "Name can only contain alphabetic characters" }),
  
  username: z.string()
    .min(3, { message: "System index requires at least 3 characters" })
    .max(20, { message: "Index exceeds protocol limit" })
    .regex(/^[a-z0-9_]*$/, { message: "Index must be lowercase alphanumeric with underscores" }),
  
  password: z.string()
    .optional()
    .or(z.literal('')),
  
  role: z.enum(['cashier', 'salesman'], {
    errorMap: () => ({ message: "Select a valid authorization tier" })
  }),
  
  preferredShift: z.enum(['day', 'night', 'both'], {
    errorMap: () => ({ message: "Select a valid operational rotation" })
  }).optional(),

  phoneNumber: z.string()
    .regex(/^\+?[0-9\s\-()]{1,20}$/, { message: "Invalid international signal format (E.164)" })
    .optional()
    .or(z.literal(''))
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation Error", 
        errors: (error.errors || error.issues || []).map(err => ({
          field: err.path && err.path[0] ? err.path[0] : 'unknown',
          message: err.message
        }))
      });
    }
    next(error);
  }
};
