import { z } from 'zod'

export const zodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Campo obrigatório' }
      }
      return { message: `Tipo inválido: esperado ${issue.expected}` }

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' }
      if (issue.validation === 'url') return { message: 'URL inválida' }
      if (issue.validation === 'uuid') return { message: 'UUID inválido' }
      if (issue.validation === 'regex') return { message: 'Formato inválido' }
      return { message: 'Texto inválido' }

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) return { message: 'Campo obrigatório' }
        return { message: `Mínimo de ${issue.minimum} caracteres` }
      }
      if (issue.type === 'number') {
        return { message: `Valor mínimo: ${issue.minimum}` }
      }
      if (issue.type === 'array') {
        return { message: `Mínimo de ${issue.minimum} item(s)` }
      }
      return { message: ctx.defaultError }

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Máximo de ${issue.maximum} caracteres` }
      }
      if (issue.type === 'number') {
        return { message: `Valor máximo: ${issue.maximum}` }
      }
      return { message: ctx.defaultError }

    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `Valor inválido. Opções: ${issue.options.join(', ')}`,
      }

    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida' }

    case z.ZodIssueCode.not_finite:
      return { message: 'Número inválido' }

    default:
      return { message: ctx.defaultError }
  }
}

z.setErrorMap(zodErrorMap)
