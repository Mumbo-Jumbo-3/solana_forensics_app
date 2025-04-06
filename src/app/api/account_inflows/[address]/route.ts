import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
) {
    const { address } = await context.params;
    const backendBaseUrl = process.env.PYTHON_API_URL; // Private environment variable
    
    try {
        const response = await fetch(
            `${backendBaseUrl}/account_inflows/${address}`,
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
                { error: 'Failed to fetch network data' },
                { status: 500 }
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