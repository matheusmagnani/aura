import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractService } from '../../../shared/services/contractService'

export function useClientContracts(clientId: number) {
  return useQuery({
    queryKey: ['client-contracts', clientId],
    queryFn: () => contractService.listByClient(clientId),
    enabled: clientId > 0,
  })
}

export function useClientContractsPaginated(clientId: number, page: number, limit: number) {
  return useQuery({
    queryKey: ['client-contracts', clientId, page, limit],
    queryFn: () => contractService.listByClientPaginated(clientId, page, limit),
    enabled: clientId > 0,
    placeholderData: (prev) => prev,
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { templateId: number; clientId: number; proposalId: number }) =>
      contractService.create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-contracts', vars.clientId] })
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId: number }) => contractService.delete(id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-contracts', vars.clientId] })
    },
  })
}
