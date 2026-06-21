import { scorePassword, validatePassword } from './password'

describe('scorePassword', () => {
  it('returns 0 for an empty string', () => {
    expect(scorePassword('')).toBe(0)
  })

  it('returns 1 for short or all-lowercase passwords', () => {
    expect(scorePassword('abc')).toBe(1)       // too short, no upper/digit
    expect(scorePassword('abcdefgh')).toBe(1)  // 8 chars but no upper or digit
  })

  it('returns 2 for medium-strength passwords', () => {
    expect(scorePassword('Abcdefgh')).toBe(2)  // 8 chars + mixed case
    expect(scorePassword('Abcdefg1')).toBe(2)  // 8 chars + mixed case + digit
  })

  it('returns 3 for strong passwords', () => {
    expect(scorePassword('Abcdefghij12')).toBe(3)  // 12+ chars + mixed case + digit
    expect(scorePassword('Abcdefgh12!')).toBe(3)   // 8+ chars + mixed case + digit + special
    expect(scorePassword('Abcdef1!')).toBe(3)      // mixed case + digit + special char
  })

  it('counts length bonus correctly', () => {
    // 12+ chars gives an extra score point
    const short  = scorePassword('Abcdef1!')    // 8 chars
    const longer = scorePassword('Abcdefghij1!') // 12 chars
    expect(longer).toBeGreaterThanOrEqual(short)
  })
})

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Abc1')).toBe(
      'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'
    )
    expect(validatePassword('Abcd123')).toBe(
      'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'
    )
  })

  it('rejects passwords longer than 128 characters', () => {
    expect(validatePassword('A1' + 'a'.repeat(128))).toBe(
      'Ο κωδικός δεν μπορεί να υπερβαίνει τους 128 χαρακτήρες.'
    )
  })

  it('rejects passwords without an uppercase letter', () => {
    expect(validatePassword('alllowercase1')).toBe(
      'Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα.'
    )
  })

  it('rejects passwords without a lowercase letter', () => {
    expect(validatePassword('ALLUPPERCASE1')).toBe(
      'Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα πεζό γράμμα.'
    )
  })

  it('rejects passwords without a digit', () => {
    expect(validatePassword('NoNumbersHere')).toBe(
      'Ο κωδικός πρέπει να περιέχει τουλάχιστον έναν αριθμό.'
    )
  })

  it('accepts valid passwords', () => {
    expect(validatePassword('ValidPass1')).toBeNull()
    expect(validatePassword('AnotherGood1!')).toBeNull()
    expect(validatePassword('A1' + 'a'.repeat(126))).toBeNull() // exactly 128 chars
  })

  it('validates length before other rules', () => {
    // A 5-char all-uppercase string should fail on length, not on missing lowercase
    const result = validatePassword('ABC1!')
    expect(result).toBe('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.')
  })
})
