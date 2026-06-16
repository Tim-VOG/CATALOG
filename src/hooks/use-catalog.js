import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ── Catalog Assets ──────────────────────────────────────── */

const getCatalogAssets = async () => {
  const { data, error } = await supabase
    .from('catalog_assets')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

const createCatalogAsset = async (asset) => {
  const { data, error } = await supabase
    .from('catalog_assets')
    .insert(asset)
    .select()
    .single()
  if (error) throw error
  return data
}

const updateCatalogAsset = async ({ id, ...updates }) => {
  const { data, error } = await supabase
    .from('catalog_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

const deleteCatalogAsset = async (id) => {
  const { error } = await supabase.from('catalog_assets').delete().eq('id', id)
  if (error) throw error
}

export const useCatalogAssets = () =>
  useQuery({
    queryKey: ['catalog-assets'],
    queryFn: getCatalogAssets,
    staleTime: 1000 * 60 * 5,
  })

export const useCreateCatalogAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCatalogAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-assets'] }),
  })
}

export const useUpdateCatalogAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCatalogAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-assets'] }),
  })
}

export const useDeleteCatalogAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCatalogAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-assets'] }),
  })
}

/* ── Product Display Settings (targeted update) ─────────── */

const updateProductDisplaySettings = async ({ id, display_settings }) => {
  const { data, error } = await supabase
    .from('products')
    .update({ display_settings })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

const updateProductSpecs = async ({ id, specs }) => {
  const { data, error } = await supabase
    .from('products')
    .update({ specs })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const useUpdateProductDisplaySettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProductDisplaySettings,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', variables.id] })
    },
  })
}

export const useUpdateProductSpecs = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProductSpecs,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', variables.id] })
    },
  })
}

/* ── Upload catalog asset to Supabase Storage ────────────── */

export const uploadCatalogAsset = async (file) => {
  const ext = file.name.split('.').pop()
  const path = `asset-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('catalog-assets')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('catalog-assets').getPublicUrl(path)
  return urlData.publicUrl
}
