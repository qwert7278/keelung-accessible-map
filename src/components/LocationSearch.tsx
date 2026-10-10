import {useEffect,useId,useRef,useState} from 'react';
import type {LocationResult} from '../services/locationContract';

/** Editable combobox: focus stays in the input; selecting never submits the form. */
export default function LocationSearch({query,results,loading,note,onQuery,onSearch,onSelect}:{
  query:string;results:LocationResult[];loading:boolean;note:string;
  onQuery:(value:string)=>void;onSearch:()=>void;onSelect:(result:LocationResult)=>void;
}){
  const id=useId(), input=useRef<HTMLInputElement>(null), list=useRef<HTMLUListElement>(null);
  const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
  const expanded=open&&(loading||results.length>0||Boolean(note));
  useEffect(()=>{list.current?.children[active]?.scrollIntoView({block:'nearest'});},[active]);
  function select(result:LocationResult){setOpen(false);setActive(-1);onSelect(result);input.current?.focus();}
  return <div className="location-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setActive(-1);}}}>
    <div className="location-search-row">
      <label htmlFor={`${id}-input`}>搜尋地址或地標
        <input ref={input} id={`${id}-input`} role="combobox" aria-autocomplete="list"
          aria-expanded={expanded} aria-controls={`${id}-list`} aria-describedby={`${id}-help ${id}-status`}
          aria-activedescendant={expanded&&active>=0&&results[active]?`${id}-option-${active}`:undefined}
          autoComplete="off" value={query} maxLength={120} placeholder="例如：精一路19號、基隆長庚醫院"
          onFocus={()=>setOpen(true)}
          onChange={event=>{setOpen(true);setActive(-1);onQuery(event.target.value);}}
          onKeyDown={event=>{
            if(event.nativeEvent.isComposing)return;
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);setActive(-1);}
            else if(['ArrowDown','ArrowUp'].includes(event.key)&&results.length&&!loading){event.preventDefault();setOpen(true);setActive(value=>event.key==='ArrowDown'?Math.min(value+1,results.length-1):value<0?results.length-1:Math.max(0,value-1));}
            else if(event.key==='Enter'){event.preventDefault();if(expanded&&!loading&&active>=0&&results[active])select(results[active]);else{setOpen(true);setActive(-1);onSearch();}}
          }}/>
      </label>
      <button className="button secondary" type="button" disabled={loading} onClick={()=>{setOpen(true);setActive(-1);onSearch();}}>搜尋</button>
    </div>
    <p id={`${id}-help`} className="muted">直接輸入地址或地標。上下鍵選擇，Enter 選取，Escape 收起。</p>
    <p id={`${id}-status`} className="location-search-status muted" role="status" aria-live="polite" aria-atomic="true">{loading?'正在搜尋地址與地標…':note}</p>
    <ul ref={list} id={`${id}-list`} className="location-results" role="listbox" aria-label="搜尋候選位置" aria-busy={loading} hidden={!expanded||!results.length}>
      {results.map((result,index)=><li id={`${id}-option-${index}`} key={`${result.label}-${index}`} role="option"
        aria-selected={active===index} className={active===index?'is-active':''}
        onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!loading)select(result);}}>
        <strong>{result.label}</strong>
        <small>{result.city} · {result.district}{result.address?` · ${result.address}`:' · 請確認地圖上的現場位置'}</small>
      </li>)}
    </ul>
    <p className="muted">候選位置僅供參考 · <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Powered by Geoapify</a> / OpenStreetMap</p>
  </div>;
}
