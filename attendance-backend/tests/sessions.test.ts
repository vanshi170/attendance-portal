import { calculateStrength } from '../src/routes/sessions.routes';

describe('Strength Percentage Calculation', () => {
  it('should return 0 if total is 0', () => {
    expect(calculateStrength(0, 0)).toBe(0);
  });

  it('should return 100 if present equals total', () => {
    expect(calculateStrength(70, 70)).toBe(100);
  });

  it('should return correct percentage and round to 2 decimal places', () => {
    expect(calculateStrength(61, 70)).toBe(87.14);
    expect(calculateStrength(1, 3)).toBe(33.33);
  });

  it('should handle zero present correctly', () => {
    expect(calculateStrength(0, 70)).toBe(0);
  });
});
