import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ signature: string }> }
) {
    const { signature } = await context.params;
    const backendBaseUrl = process.env.PYTHON_API_URL; // Private environment variable
    
    try {
        const response = await fetch(
            `${backendBaseUrl}/transaction/${signature}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend API error:', errorData);
            return NextResponse.json(
                { error: errorData.detail || 'Failed to fetch transaction data' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch network data' },
            { status: 500 }
        );
    }
}