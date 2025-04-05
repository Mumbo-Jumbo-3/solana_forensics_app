import { Dictionary } from "lodash";
import SankeyChart1 from "../components/SankeyChart";
import NetworkGraph from "../components/NetworkGraph";

export default async function Home() {  
  return (
    <div>
      <NetworkGraph />
    </div>
  )
}
/*
async function fetchSankeyData(): Promise<ISankeyData> {
  const response = await fetch('/api/sankey', {
    method: 'GET',
    body: JSON.stringify({
      projectName: 'default' // or pass your project name as needed
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Sankey data');
  }

  const data = await response.json();
  
  // Format the data to match ISankeyData interface
  const formattedData: ISankeyData = {
    title: data.title,
    style: {
      chart: data.chartStyles,
      node: data.nodeStyles,
      colorMode: data.colorMode,
      flowColorDefault: data.flowColorDefault,
    },
    nodes: data.nodes.reduce((acc: Dictionary<ISankeyNode>, node: any) => {
      acc[node.nodeKey] = {
        title: node.title,
        color: node.color,
        priority: node.priority,
      };
      return acc;
    }, {}),
    links: data.links.map((link: any) => ({
      from: link.fromNode,
      to: link.toNode,
      flow: link.flow,
    })),
  };

  return formattedData;
}

export default async function Home() {
  const idata: ISankeyData = await fetchSankeyData();
  
  return (
    <div>
      <SankeyChart idata={idata} />
    </div>
  )
}
*/