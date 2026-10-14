import TwinScene from './twin/TwinScene';
import { initialSimulation, type Layout } from './twin/model';
import './twin.css';
export default function ApprovalTwinPreview({layout}:{layout:Layout}) {return <TwinScene layout={layout} simulation={initialSimulation(layout)} selected="" editing={false} running={false} view="iso" onSelect={()=>{}} onMove={()=>{}}/>;}
