'use client'
import React, { useState, useEffect } from "react";
import { Chart } from "react-chartjs-2";
import { SankeyController, Flow } from "chartjs-chart-sankey";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  Tooltip,
  Title
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, SankeyController, Flow, Tooltip, LogarithmicScale, Title);

const SankeyChart1: React.FC = () => {
  const [txSignature, setTxSignature] = useState("");
  const [chartData, setChartData] = useState<any>(null);

  const fetchSankeyData = async (signature: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/transaction/sankey/${signature}`);
      const { nodes, links } = response.data;

      console.log(JSON.stringify(response.data, null, 2));

      // Transform data for chartjs-chart-sankey
      const sankeyData = {
        datasets: [
            {
                label: "Transaction Flow",
                data: links.map((link: any) => ({
                    from: `${link.source.slice(0, 4)}...${link.source.slice(-4)}`,
                    to: `${link.target.slice(0, 4)}...${link.target.slice(-4)}`,
                    flow: Math.pow(link.value, 0.1),
                    originalValue: link.value,
                    customData: {
                        type: link.type,
                        mint: link.mint,
                        ticker: link.ticker,
                        tag: link.tag
                    }
                })),
                colorFrom: (c: any) => {
                    const type = c.dataset.data[c.dataIndex].customData.type;
                    const ticker = c.dataset.data[c.dataIndex].customData.ticker;
                    if (type == "fee") return 'pink'
                    return ticker === 'SOL' ? 'yellow' : 'cyan';
                },
                colorTo: (c: any) => {
                    const type = c.dataset.data[c.dataIndex].customData.type;
                    const ticker = c.dataset.data[c.dataIndex].customData.ticker;
                    if (type == "fee") return 'pink'
                    return ticker === 'SOL' ? 'yellow' : 'cyan';
                },
                colorMode: "gradient",
                labels: nodes.reduce((acc: any, node: any) => {
                    // Create a mapping of pubkey to tag (if exists) or truncated pubkey
                    acc[node.pubkey] = node.tag || `${node.pubkey.slice(0, 4)}...${node.pubkey.slice(-4)}`;
                    return acc;
                }, {})
            },
        ],
      };
      setChartData(sankeyData);
    } catch (error) {
      console.error("Error fetching Sankey data:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txSignature) {
      fetchSankeyData(txSignature);
    }
  };

  return (
    <div>
        <form onSubmit={handleSubmit}>
            <input
            type="text"
            value={txSignature}
            onChange={(e) => setTxSignature(e.target.value)}
            placeholder="Enter Solana transaction signature"
            style={{ width: "300px", padding: "8px" }}
            />
            <button type="submit">Generate Sankey Chart</button>
        </form>

        {chartData && (
            <div style={{ width: "100%", height: "calc(100vh - 100px)", marginTop: "20px" }}>
                <Chart
                    type="sankey"
                    data={chartData}
                    options={{
                        maintainAspectRatio: false,
                        events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'], // Explicitly define events
                        hover: {
                            mode: 'nearest',
                            intersect: true
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Transaction Flow for ${txSignature}`,
                                color: 'white',
                                font: {
                                    size: 20
                                }
                            },
                            tooltip: {
                                enabled: true,
                                mode: 'nearest',
                                intersect: true,
                                callbacks: {
                                    label: (context: any) => {
                                        // Get the dataset index and data index
                                        const datasetIndex = context.datasetIndex;
                                        const dataIndex = context.dataIndex;
                                        
                                        // Log the indices to help with debugging
                                        console.log('Dataset Index:', datasetIndex);
                                        console.log('Data Index:', dataIndex);
                                        console.log('Full Context:', context);
                                        
                                        // Access the data directly from the dataset
                                        const dataset = chartData.datasets[datasetIndex];
                                        const flowData = dataset.data[dataIndex];
                                        
                                        if (!flowData) {
                                            return 'No data available';
                                        }
                                        
                                        return `${flowData.from} → ${flowData.to}\nAmount: ${flowData.originalValue} ${flowData.customData?.ticker || ''}`;
                                    }
                                }
                            }
                        },
                        font: {
                            size: 16,
                        }
                    }}
                />
            </div>
      )}
    </div>
  );
};

export default SankeyChart1;