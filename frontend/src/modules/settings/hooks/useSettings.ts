import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService, type UpdateCompanyInfoDTO } from '../services/settingsService'

export function useCompanyInfo() {
  return useQuery({
    queryKey: ['company-info'],
    queryFn: settingsService.getCompanyInfo,
  })
}

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateCompanyInfoDTO) => settingsService.updateCompanyInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-info'] })
    },
  })
}
