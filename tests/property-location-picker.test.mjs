import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('Map click, marker drag and keyboard selection update owner coordinates and clean up on unmount', async () => {
  const effects=[],refs=[],changes=[],events={},keys={}; let removed=false; let currentZoom=14; const views=[]; let mapOptions;
  const marker={on(name,fn){events['marker:'+name]=fn;return this;},addTo(){return this;},setLatLng(point){this.point=point;return this;},getLatLng(){return {lat:-6.9834567,lng:110.4102342};}};
  const mapContainer={addEventListener(name,fn){keys[name]=fn;}};
  const map={setView(point,level){views.push({point,level});currentZoom=level;return this;},getZoom(){return currentZoom;},stop(){return this;},setZoom(level){currentZoom=level;events.zoomend?.();return this;},on(name,fn){events[name]=fn;return this;},getContainer(){return mapContainer;},getCenter(){return {lat:-6.99,lng:110.42};},remove(){removed=true;},panTo(){},invalidateSize(){}};
  const leaflet={map:(_container,options)=>{mapOptions=options;return map;},tileLayer:()=>({on(){return this;},addTo(){return this;}}),divIcon:()=>({}),marker:()=>marker};
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/components/property-location-picker.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
    exports,require(name){
      if(name==='react')return {useEffect:fn=>effects.push(fn),useRef:value=>{const ref={current:value};refs.push(ref);return ref;},useState:value=>[value,()=>{}]};
      if(name==='next-intl')return {useTranslations:()=>key=>key};
      if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
      if(name==='../lib/marketplace-client')return {api:async()=>({places:[]})};
      if(name==='leaflet')return leaflet;
      if(name.endsWith('.css'))return {};
      throw Error(name);
    },navigator:{geolocation:{getCurrentPosition(success){success({coords:{latitude:-6.98,longitude:110.4}});}}},ResizeObserver:class{observe(){}disconnect(){}},
  });
  const tree=exports.default({latitude:'',longitude:'',onChange:(...point)=>changes.push(point)});
  function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node; for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}}
  const searchInput=find(tree,node=>node.type==='input'&&node.props['aria-label']==='mapSearchLabel');
  assert.equal(searchInput.props.autoComplete,'off');
  assert.equal(searchInput.props.spellCheck,false);
  function checkButtonState(node){if(!node||typeof node!=='object')return;if(node.type==='button')assert.equal(node.props.autoComplete,'off','Firefox must not restore pre-hydration disabled button states');for(const child of [node.props?.children].flat(Infinity))checkButtonState(child);}
  checkButtonState(tree);
  assert.equal(find(tree,node=>node.type==='button'&&node.props.className==='location-center-button').props.disabled,true,'Initial render waits for the client map on both server and client');
  refs[0].current={};
  effects[0]();effects[1]();const cleanup=effects[2]();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(changes.length,0,'Viewing the default map must not select a sample location');
  assert.equal(mapOptions.scrollWheelZoom,true);
  assert.equal(mapOptions.zoomControl,false);
  assert.ok(mapOptions.wheelPxPerZoomLevel>=120,'Trackpad zoom must not be overly sensitive');
  find(tree,node=>node.props?.['aria-label']==='mapZoomIn').props.onClick();
  assert.equal(currentZoom,15);
  find(tree,node=>node.props?.['aria-label']==='mapZoomOut').props.onClick();
  assert.equal(currentZoom,14);
  const slider=find(tree,node=>node.type==='input'&&node.props.type==='range');
  slider.props.onChange({target:{value:'30'}});assert.equal(currentZoom,19);
  slider.props.onChange({target:{value:'0'}});assert.equal(currentZoom,3);
  slider.props.onChange({target:{value:'16'}});assert.equal(currentZoom,16);
  assert.equal(changes.length,0,'Zooming must not change property coordinates');
  events.click({latlng:{lat:-6.9823456,lng:110.4091234}});
  assert.deepEqual(changes.at(-1),['-6.982346','110.409123']);
  events['marker:dragend']();
  assert.deepEqual(changes.at(-1),['-6.983457','110.410234']);
  keys.keydown({key:'Enter',target:mapContainer,preventDefault(){}});
  assert.deepEqual(changes.at(-1),['-6.990000','110.420000']);
  assert.equal(currentZoom,16,'Choosing the centre must preserve the chosen zoom');
  find(tree,node=>node.props?.className==='location-center-button').props.onClick();
  assert.deepEqual(changes.at(-1),['-6.990000','110.420000']);
  find(tree,node=>node.type==='button' && node.props?.onClick?.name==='locate').props.onClick();
  assert.deepEqual(changes.at(-1),['-6.980000','110.400000']);
  cleanup();assert.equal(removed,true);
});
