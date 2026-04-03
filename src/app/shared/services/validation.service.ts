import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  /**
   * Get validation error messages
   */
  getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    if (errors['required']) {
      return 'This field is required';
    }
    if (errors['email']) {
      return 'Please enter a valid email address';
    }
    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['maxlength']) {
      return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    }
    if (errors['min']) {
      return `Minimum value is ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `Maximum value is ${errors['max'].max}`;
    }
    if (errors['pattern']) {
      return 'Invalid format';
    }
    if (errors['custom']) {
      return errors['custom'];
    }

    return 'Invalid value';
  }

  /**
   * Format field name for display (e.g., "firstName" -> "First Name")
   */
  formatFieldName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Custom validator: Required if condition is true
   */
  requiredIf(condition: () => boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (condition() && (!control.value || control.value.toString().trim() === '')) {
        return { required: true };
      }
      return null;
    };
  }

  /**
   * Custom validator: Must match another field.
   * Apply this validator to the form GROUP (not a single control) via AbstractControl.
   * Returns a group-level error; mark the confirming control explicitly in the template.
   */
  mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const sourceControl = control.get(controlName);
      const matchingControl = control.get(matchingControlName);

      if (!sourceControl || !matchingControl) {
        return null;
      }

      if (sourceControl.value !== matchingControl.value) {
        return { mustMatch: true };
      }
      return null;
    };
  }

  /**
   * Custom validator: Email format
   */
  emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = emailRegex.test(control.value);
      return valid ? null : { email: true };
    };
  }

  /**
   * Custom validator: Number range
   */
  numberRange(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const num = Number(control.value);
      if (isNaN(num)) {
        return { number: true };
      }
      if (num < min || num > max) {
        return { range: { min, max, actual: num } };
      }
      return null;
    };
  }
}
