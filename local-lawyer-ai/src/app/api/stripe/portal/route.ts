import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Stripe customer portal is no longer supported as the payment system is now token-based.' }, { status: 200 });
}