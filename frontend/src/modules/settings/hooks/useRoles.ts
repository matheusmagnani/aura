import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService } from '../../../shared/services/roleService'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.list({ limit: 100 }),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => roleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['roles-all'] })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; status?: number } }) =>
      roleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['roles-all'] })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => roleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['roles-all'] })
    },
  })
}
