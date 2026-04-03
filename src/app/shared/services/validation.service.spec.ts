import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationService]
    });
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return required error message', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    expect(service.getErrorMessage(control)).toBe('This field is required');
  });

  it('should validate form and return errors', () => {
    const form = {
      firstName: new FormControl('', Validators.required)
    };
    form.firstName.markAsTouched();
    const result = service.validateForm(form);
    expect(result.isValid).toBeFalse();
    expect(result.errors.length).toBe(1);
  });

  it('should format field names', () => {
    expect(service.formatFieldName('firstName')).toBe('First Name');
  });

  it('should validate requiredIf', () => {
    const validator = service.requiredIf(() => true);
    const control = new FormControl('');
    expect(validator(control)).toEqual({ required: true });
  });

  it('should validate mustMatch', () => {
    const validator = service.mustMatch('password', 'confirmPassword');

    const mismatch = new FormGroup(
      { password: new FormControl('abc'), confirmPassword: new FormControl('xyz') },
      { validators: validator }
    );
    expect(mismatch.errors).toEqual({ mustMatch: true });

    const match = new FormGroup(
      { password: new FormControl('abc'), confirmPassword: new FormControl('abc') },
      { validators: validator }
    );
    expect(match.errors).toBeNull();
  });

  it('should validate email format', () => {
    const validator = service.emailValidator();
    const control = new FormControl('invalid');
    expect(validator(control)).toEqual({ email: true });
  });

  it('should validate number range', () => {
    const validator = service.numberRange(1, 5);
    const control = new FormControl('10');
    expect(validator(control)).toEqual({ range: { min: 1, max: 5, actual: 10 } });
  });
});
