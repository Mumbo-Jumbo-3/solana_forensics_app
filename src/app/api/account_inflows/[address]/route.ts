import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { address: string } }
) {
    const backendBaseUrl = process.env.PYTHON_API_URL; // Private environment variable
    const { address } = await params;
    
    try {
        const response = await fetch(
            `${backendBaseUrl}/account_inflows/${address}`
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