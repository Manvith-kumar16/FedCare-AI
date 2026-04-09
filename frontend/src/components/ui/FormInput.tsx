import React from 'react';
import { Form, InputGroup } from 'react-bootstrap';

interface FormInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
  maskPassword?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  placeholder,
  icon,
  value,
  onChange,
  error,
  required = false,
  className = '',
  autoComplete,
  maskPassword = false,
}) => {
  return (
    <Form.Group className={`mb-4 ${className}`}>
      <Form.Label className="small fw-bold text-muted uppercase-spacing extra-small mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      <InputGroup className={error ? 'is-invalid' : ''}>
        {icon && (
          <InputGroup.Text className="bg-light border-end-0">
            {icon}
          </InputGroup.Text>
        )}
        <Form.Control
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`bg-light ${icon ? 'border-start-0' : ''} py-2 ${maskPassword ? 'password-mask' : ''}`}
          required={required}
          autoComplete={autoComplete}
          isInvalid={!!error}
        />
        {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
      </InputGroup>
    </Form.Group>
  );
};

export default FormInput;
