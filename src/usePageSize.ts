import {useEffect,useState} from 'react';
export default function usePageSize(){const measure=()=>innerWidth<600?1:Math.max(1,Math.min(6,Math.floor((innerHeight-400)/64)));const [size,setSize]=useState(measure);useEffect(()=>{const update=()=>setSize(measure());addEventListener('resize',update);return()=>removeEventListener('resize',update);},[]);return size;}
