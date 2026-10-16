import {useId,useRef,useState,type ReactNode} from 'react';
import './file-picker.css';
/** A native button opens the picker synchronously, including Enter/Space activation. */
export default function FilePicker({children,accept,disabledReason='',onFile,className='',variant='primary'}:{children:ReactNode;accept:string;disabledReason?:string;onFile:(file:File)=>void|Promise<void>;className?:string;variant?:'primary'|'secondary'}){
 const input=useRef<HTMLInputElement>(null),hintId=useId();const [error,setError]=useState('');
 return <div className={`file-button file-picker ${className}`}><button type="button" className={variant} disabled={!!disabledReason} aria-describedby={disabledReason||error?hintId:undefined} onClick={()=>{setError('');try{input.current?.click();}catch{setError('파일 선택창을 열지 못했습니다. 브라우저에서 다시 시도하세요.');}}}>{children}</button><input ref={input} type="file" hidden accept={accept} disabled={!!disabledReason} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void Promise.resolve().then(()=>onFile(file)).catch(e=>setError(e instanceof Error?e.message:'파일을 읽지 못했습니다. 다시 선택하세요.'));}}/>{(disabledReason||error)&&<small id={hintId} className="file-picker-hint" role={error?'alert':undefined}>{disabledReason||error}</small>}</div>;
}
