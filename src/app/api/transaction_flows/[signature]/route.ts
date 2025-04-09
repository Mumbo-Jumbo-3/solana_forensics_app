import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ signature: string }> }
) {
    const { signature } = await context.params;
    const { existingNodes, existingEdges } = await request.json();
    const backendBaseUrl = process.env.PYTHON_API_URL; // Private environment variable
    
    try {
        const response = await fetch(
            `${backendBaseUrl}/transaction_flows/${signature}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    existingNodes,
                    existingEdges
                })
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