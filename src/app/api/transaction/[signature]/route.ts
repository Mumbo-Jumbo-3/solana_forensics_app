import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ signature: string }> }
) {
    const { signature } = await context.params;
    const backendBaseUrl = process.env.PYTHON_API_URL; // Private environment variable
    
    try {
        const response = await fetch(
            `${backendBaseUrl}/transaction/${signature}`
        );
        const data = await response.json();
        console.log(data);
        
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch network data' },
            { status: 500 }
        );
    }
}