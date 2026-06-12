// @ts-nocheck — Phase-3 migration in progress; this file will be properly typed in a follow-up pass.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getItInventory, createItInventoryItem, updateItInventoryItem, deleteItInventoryItem,
} from '@/lib/api/it-inventory'

const KEY = ['it-inventory']

export const useItInventory = () =>
  useQuery({ queryKey: KEY, queryFn: getItInventory })

export const useCreateItInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createItInventoryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useUpdateItInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateItInventoryItem(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useDeleteItInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItInventoryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
