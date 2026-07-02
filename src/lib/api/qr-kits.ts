import { supabase } from '@/lib/supabase'

// A QR code can carry a "kit" of accessories that travel with the
// scanned device (e.g. scan a laptop → its charger + mouse are bundled).
// The scan RPC (process_qr_scan) already adjusts kit-item stock; this
// module lets admins define those accessories from the QR edit dialog.

export interface KitItem {
  product_id: string
  quantity: number
}

/** Accessories currently attached to a kit. */
export const getKitItems = async (kitId: string): Promise<KitItem[]> => {
  const { data, error } = await supabase
    .from('qr_kit_items')
    .select('product_id, quantity')
    .eq('kit_id', kitId)
  if (error) throw error
  return (data ?? []) as KitItem[]
}

/**
 * Save the accessories bundled with a QR code.
 * - none → unlink the QR and delete its kit
 * - some → create the kit if needed, link the QR, and replace items
 * Returns the resulting kit_id (or null when cleared).
 */
export const saveQrAccessories = async (
  qrCodeId: string,
  existingKitId: string | null,
  reference: string,
  accessories: KitItem[],
): Promise<string | null> => {
  const clean = accessories.filter((a) => a.product_id && a.quantity > 0)

  if (clean.length === 0) {
    await supabase.from('qr_codes').update({ kit_id: null }).eq('id', qrCodeId)
    if (existingKitId) await supabase.from('qr_kits').delete().eq('id', existingKitId)
    return null
  }

  let kitId = existingKitId
  if (!kitId) {
    const { data, error } = await supabase
      .from('qr_kits')
      .insert({ reference: `KIT-${reference}`, name: `Kit ${reference}` })
      .select('id')
      .single()
    if (error) throw error
    kitId = data.id as string
    await supabase.from('qr_codes').update({ kit_id: kitId }).eq('id', qrCodeId)
  }

  // Replace the kit's items with the current selection.
  await supabase.from('qr_kit_items').delete().eq('kit_id', kitId)
  const rows = clean.map((a) => ({ kit_id: kitId, product_id: a.product_id, quantity: a.quantity }))
  const { error: insErr } = await supabase.from('qr_kit_items').insert(rows)
  if (insErr) throw insErr

  return kitId
}
