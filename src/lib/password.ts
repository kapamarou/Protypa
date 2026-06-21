export function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return 1
  if (score <= 3) return 2
  return 3
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8)   return 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'
  if (pw.length > 128) return 'Ο κωδικός δεν μπορεί να υπερβαίνει τους 128 χαρακτήρες.'
  if (!/[A-Z]/.test(pw)) return 'Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα.'
  if (!/[a-z]/.test(pw)) return 'Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα πεζό γράμμα.'
  if (!/[0-9]/.test(pw)) return 'Ο κωδικός πρέπει να περιέχει τουλάχιστον έναν αριθμό.'
  return null
}
