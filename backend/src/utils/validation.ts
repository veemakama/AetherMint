// Stub: validation utilities
export const validateSchema = (schema: any, data: any) => ({ isValid: true, errors: [] as string[] });
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validateAssignment = (data: any) => ({ isValid: true, errors: [] });
export const validateSubmission = (data: any) => ({ isValid: true, errors: [] });
