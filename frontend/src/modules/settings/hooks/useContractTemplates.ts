import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractTemplateService } from '../../../shared/services/contractTemplateService'

export function useContractTemplates() {
  return useQuery({
    queryKey: ['contract-templates'],
    queryFn: contractTemplateService.list,
  })
}

export function useCreateContractTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; content: Record<string, unknown> }) =>
      contractTemplateService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-templates'] }),
  })
}

export function useUpdateContractTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; content?: Record<string, unknown> }) =>
      contractTemplateService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-templates'] }),
  })
}

export function useDeleteContractTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contractTemplateService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-templates'] }),
  })
}
