import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Menu id and updates are required.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('menus')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
