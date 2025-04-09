import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
) {
    const { address } = await context.params;
    const { existingNodes, existingEdges } = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const direction = searchParams.get('direction') || 'in';
    const sort = searchParams.get('sort') || 'asc';
    const limit = searchParams.get('limit') || 10;
    
    const backendBaseUrl = process.env.PYTHON_API_URL;
    
    try {
        console.log(`Fetching account flows for ${address} with direction ${direction} and sort ${sort} and limit ${limit}`);
        const response = await fetch(
            `${backendBaseUrl}/account_flows/${address}?direction=${direction}&sort=${sort}&limit=${limit}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
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