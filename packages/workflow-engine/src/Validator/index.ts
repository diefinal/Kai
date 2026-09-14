export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export class StepValidator {
  public validate(expectedCondition: boolean, errorMessage: string = 'Validation failed'): ValidationResult {
    return {
      isValid: expectedCondition,
      message: expectedCondition ? 'Validation passed' : errorMessage
    };
  }
}
