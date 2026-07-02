import { describe, expect, it } from 'vitest'
import {
  formatObjectivesForTextarea,
  parseNaturalLanguageObjectives,
  stripLeadingNumberPrefix,
} from './parseObjectivesText'

describe('parseObjectivesText', () => {
  it('splits inline docx-style numbered objectives without punctuation', () => {
    const text =
      '1 Explain health insurance policy fundamentals, including essential health benefits and metal tiers 2 Differentiate between group and individual health plan structures 3 Apply enrollment rules and special open enrollment triggers 4 Describe pre-existing condition limitations and HIPAA privacy protections'

    expect(parseNaturalLanguageObjectives(text)).toEqual([
      'Explain health insurance policy fundamentals, including essential health benefits and metal tiers',
      'Differentiate between group and individual health plan structures',
      'Apply enrollment rules and special open enrollment triggers',
      'Describe pre-existing condition limitations and HIPAA privacy protections',
    ])
  })

  it('splits numbered objectives with periods', () => {
    const text = `1. Explain benefit triggers
2. Compare policy types
3. Apply compliance rules`

    expect(parseNaturalLanguageObjectives(text)).toEqual([
      'Explain benefit triggers',
      'Compare policy types',
      'Apply compliance rules',
    ])
  })

  it('strips repeated leading numbers before formatting', () => {
    expect(stripLeadingNumberPrefix('1. 1. 1. Explain coverage basics')).toBe('Explain coverage basics')
  })

  it('does not accumulate numbering when formatting repeatedly', () => {
    const objectives = parseNaturalLanguageObjectives(
      '1 Explain coverage basics 2 Compare policy types',
    )
    const formattedOnce = formatObjectivesForTextarea(objectives)
    const reparsed = parseNaturalLanguageObjectives(formattedOnce)

    expect(reparsed).toEqual(objectives)
    expect(formattedOnce).toBe(
      '1. Explain coverage basics\n2. Compare policy types',
    )
  })

  it('parses bullet lists', () => {
    const text = `- Explain benefit triggers
- Compare policy types`

    expect(parseNaturalLanguageObjectives(text)).toEqual([
      'Explain benefit triggers',
      'Compare policy types',
    ])
  })
})
