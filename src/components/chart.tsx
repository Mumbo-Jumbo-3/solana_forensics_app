'use client'
import { Chart } from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { LinearScale } from 'chart.js';
import { Dictionary, merge } from 'lodash';
import { useEffect, useRef } from 'react';

Chart.register(SankeyController, Flow, LinearScale);

export interface ISankeyLink {
    from: string;
    to: string;
    flow: number;
}

export interface ISankeyNode {
    color?: string;
    title?: string;
    priority?: number;
}

export interface ISankeyData {
    title :string;
    style?: {
        chart?: CSSStyleDeclaration;
        node?: CSSStyleDeclaration;
        colorMode?: 'gradient' | 'from' | 'to';
        flowColorDefault: string | 'gray';
    };
    nodes: Dictionary<ISankeyNode>;
    links?: ISankeyLink[];
}

export function SankeyChart({ idata }: { idata: ISankeyData }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = document.createElement('canvas');
        merge(canvas.style, idata?.style?.chart || {} as CSSStyleDeclaration);

        const nodes: Dictionary<ISankeyNode> = idata?.nodes;

        function getColorByData(key: string): string{
            const ret = (nodes)?.[key]?.color;
            return ret ? ret : idata?.style?.flowColorDefault || 'gray'
        }
        function getLabels(idata :ISankeyData){
            const ret: Dictionary<string>= {}
            for(const i in nodes){
                ret[i] = nodes[i]?.title || i;
            } 
            return ret
        }
        function getPriority(idata :ISankeyData){
            const ret: Dictionary<number>= {}
            let priority=0
            for(var i in nodes){
                ret[i] = nodes[i]?.priority || Math.abs(++priority);
            } 
            return ret
        }

        new Chart(canvas, {
            type: 'sankey',
            data: {
                datasets: [
                    {
                        color: canvas.style?.color || 'initial',
                        borderWidth: parseInt(idata?.style?.node?.borderWidth || '0'),
                        borderColor: idata?.style?.node?.borderColor || 'transparent',
                        data: idata?.links?.map(i=>({from:i?.from, to:i?.to, flow:i?.flow||1})) || [{from:"Error:",to:"No data!",flow: 1}],
                        colorFrom: (config) => getColorByData(config.dataset.data[config.dataIndex].from),
                        colorTo: (config) => getColorByData(config.dataset.data[config.dataIndex].to),
                        colorMode: idata?.style?.colorMode || 'gradient',
                        labels: getLabels(idata),
                        priority: getPriority(idata),
                        size: 'max', // 'max' or 'min' if flow overlap is preferred
                    },
                ],
            },
        });
    
        containerRef.current?.appendChild(canvas);

        // Cleanup function to remove the canvas when component unmounts
        return () => {
            containerRef.current?.removeChild(canvas);
        };
    }, [idata]); // Re-run effect when idata changes
    
    return (
        <div ref={containerRef} />
    )
}
