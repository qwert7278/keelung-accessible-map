import {useEffect,useId,useRef,useState} from 'react';
import type {LocationResult} from '../services/locationContract';
import {displayLocationAddress} from '../utils/locationDisplay';

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
      <label htmlFor={`${id}-input`}>搜尋地點
        <input ref={input} id={`${id}-input`} role="combobox" aria-autocomplete="list"
          aria-expanded={expanded} aria-controls={`${id}-list`} aria-describedby={`${id}-help ${id}-status`}
          aria-activedescendant={expanded&&active>=0&&results[active]?`${id}-option-${active}`:undefined}
          autoComplete="off" value={query} maxLength={120} placeholder="輸入路名、車站、大學或商家名稱"
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
    <p id={`${id}-help`} className="muted">輸入部分名稱也可以搜尋，選好地點後會自動帶入地址。</p>
    <p id={`${id}-status`} className="location-search-status muted" role="status" aria-live="polite" aria-atomic="true">{loading?'正在搜尋地址與地標…':note}</p>
    <ul ref={list} id={`${id}-list`} className="location-results" role="listbox" aria-label="搜尋候選位置" aria-busy={loading} hidden={!expanded||!results.length}>
      {results.map((result,index)=><li id={`${id}-option-${index}`} key={`${result.label}-${index}`} role="option"
        aria-selected={active===index} className={active===index?'is-active':''}
        onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!loading)select(result);}}>
        <strong>{displayLocationAddress(result.address,result.city,result.district)}{(result.kind==='poi' || !result.address) && !result.address.includes(result.label) ? ` · ${result.label}` : ''}</strong>
        <small>請確認地圖上的現場位置</small>
      </li>)}
    </ul>
    <p className="muted">候選位置僅供參考 · <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Powered by Geoapify</a> / OpenStreetMap</p>
  </div>;
}
