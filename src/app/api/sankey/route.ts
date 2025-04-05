import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const body = await request.json()
    try {
        const nodes = await prisma.sankeyNode.findMany({
            where: {
                project: body.projectName
            }
        })
        const links = await prisma.sankeyLink.findMany({
            where: {
                project: body.projectName
            }
        })
        const chartStyles = null;
        const nodeStyles = null;
        const title = "My Sankey Chart";
        const flowColorDefault = "gray";
        const colorMode = "gradient";

        return NextResponse.json({ nodes, links, chartStyles, nodeStyles, title, flowColorDefault, colorMode })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch charts' }, { status: 500 })
    }
}

export async function POST(request: Request) {
  return NextResponse.json({ message: 'Hello, world!' })
}