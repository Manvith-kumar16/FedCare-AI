import { useState, useCallback } from 'react';

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface FieldConfig {
  [field: string]: ValidationRules;
}

interface FormErrors {
  [field: string]: string;
}

export const useFormValidation = <T extends Record<string, string>>(
  initialValues: T,
  rules: FieldConfig
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: string): string => {
    const fieldRules = rules[name];
    if (!fieldRules) return '';

    if (fieldRules.required && !value.trim()) {
      return 'This field is required.';
    }
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      return `Must be at least ${fieldRules.minLength} characters.`;
    }
    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      return `Must be no more than ${fieldRules.maxLength} characters.`;
    }
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      return 'Invalid format.';
    }
    if (fieldRules.custom) {
      const customError = fieldRules.custom(value);
      if (customError) return customError;
    }
    return '';
  }, [rules]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, values[name] ?? '') }));
  }, [validateField, values]);

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    const allTouched: Record<string, boolean> = {};

    Object.keys(rules).forEach(name => {
      allTouched[name] = true;
      const error = validateField(name, values[name] ?? '');
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setTouched(allTouched);
    setErrors(newErrors);
    return isValid;
  }, [rules, values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isFieldValid = (name: string) => touched[name] && !errors[name];
  const isFieldInvalid = (name: string) => touched[name] && !!errors[name];

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isFieldValid,
    isFieldInvalid,
  };
};
