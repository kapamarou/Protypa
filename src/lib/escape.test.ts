import { escHtml } from './escape'

describe('escHtml', () => {
  it('passes through strings with no special characters', () => {
    expect(escHtml('hello world')).toBe('hello world')
    expect(escHtml('')).toBe('')
    expect(escHtml('Ελληνικά')).toBe('Ελληνικά')
  })

  it('escapes ampersands', () => {
    expect(escHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(escHtml('&&')).toBe('&amp;&amp;')
  })

  it('escapes angle brackets', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;')
    expect(escHtml('</div>')).toBe('&lt;/div&gt;')
    expect(escHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0')
  })

  it('escapes double quotes', () => {
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;')
    expect(escHtml('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('escapes single quotes', () => {
    expect(escHtml("it's fine")).toBe('it&#039;s fine')
    expect(escHtml("O'Brien")).toBe('O&#039;Brien')
  })

  it('escapes a complete XSS payload', () => {
    const input  = '<script>alert("xss")</script>'
    const output = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    expect(escHtml(input)).toBe(output)
  })

  it('escapes all five special characters in one string', () => {
    expect(escHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#039;')
  })

  it('escapes HTML attribute injection attempt', () => {
    const input  = '" onmouseover="alert(1)'
    const output = '&quot; onmouseover=&quot;alert(1)'
    expect(escHtml(input)).toBe(output)
  })
})
