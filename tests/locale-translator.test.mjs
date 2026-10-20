import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for(const locale of ['id','en','zh'])test(`Locale ${locale}: DOM observer settles after external changes`,()=>{
  const queue=[];let observing=false,callback,writes=0;
  const notify=()=>{if(observing)queue.push(callback);};
  class Element {
    constructor(tagName,attributes={}){this.tagName=tagName;this.attributes=attributes;}
    querySelectorAll(){return this.tagName==='BODY'?[input]:[];}
    getAttribute(key){return this.attributes[key]??null;}
    // Real DOM attribute writes notify observers even when the value is unchanged.
    setAttribute(key,value){this.attributes[key]=value;writes++;notify();}
  }
  const input=new Element('INPUT',{'placeholder':'Alamat email','aria-label':'Alamat email','title':'Masuk'});
  const body=new Element('BODY');const parent=new Element('SPAN');
  const text={parentElement:parent,_value:'Selamat datang kembali.',get nodeValue(){return this._value;},set nodeValue(value){this._value=value;notify();}};
  const exports={};
  const source=readFileSync(new URL('../app/components/global-locale-translator.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(compiled,{
    exports,require(name){if(name==='react')return {useEffect:fn=>fn()};if(name==='next-intl')return {useLocale:()=>locale};if(name==='next/navigation')return {usePathname:()=>'/pencari/results'};if(name.endsWith('.json'))return JSON.parse(readFileSync(new URL('../'+name.replace('../../',''),import.meta.url),'utf8'));if(name==='../../i18n/page-phrases'){const phraseModule={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../i18n/page-phrases.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:phraseModule.exports,require(name){if(name==='./compare-phrases'){const nested={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../i18n/compare-phrases.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:nested});return nested;}throw new Error(name);}});return phraseModule.exports;}throw new Error(name);},
    requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame:()=>{},Element,NodeFilter:{SHOW_TEXT:4},
    document:{body,createTreeWalker(){let seen=false;return {currentNode:null,nextNode(){if(seen)return false;seen=true;this.currentNode=text;return true;}};}},
    MutationObserver:class {constructor(fn){callback=fn;}observe(){observing=true;}disconnect(){observing=false;}},
  });
  exports.GlobalLocaleTranslator();
  const comparison={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../i18n/compare-phrases.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:comparison});
  for(const [id,en,zh] of comparison.compareEntries)assert.equal(exports.translate(id,locale),{id,en,zh}[locale], 'Complete comparison copy: '+id);

  assert.equal(exports.translate('Kenali pilihan properti Anda.',locale),{id:'Kenali pilihan properti Anda.',en:'Understand your property options.',zh:'了解您的房产选择。'}[locale]);
  assert.equal(exports.translate('Ganti pilihan',locale),{id:'Ganti pilihan',en:'Change selection',zh:'更换选择'}[locale]);
  assert.equal(exports.translate('Prediksi AI menunjukkan potensi lokasi tinggi. Layak masuk prioritas survei; hasil penjualan tetap bergantung pada cara Anda menjalankan usaha.',locale),{id:'Prediksi AI menunjukkan potensi lokasi tinggi. Layak masuk prioritas survei; hasil penjualan tetap bergantung pada cara Anda menjalankan usaha.',en:'AI predicts high location potential. Prioritise a visit; sales results still depend on how you run the business.',zh:'AI预测地段潜力较高，值得优先考察；销售结果仍取决于您的经营方式。'}[locale]);
  assert.equal(exports.translate('Ruko Imam Bonjol · Parkir · Listrik 4400W',locale),{id:'Properti Imam Bonjol · Parkir · Listrik 4400W',en:'Property Imam Bonjol · Parking · Electricity 4400W',zh:'房产 Imam Bonjol · 停车位 · 电力 4400W'}[locale]);
  assert.equal(exports.translate('Nama properti',locale),{id:'Nama properti',en:'Property name',zh:'商铺名称'}[locale]);
  assert.equal(exports.translate('pemilik@propora.demo',locale),'pemilik@propora.demo','Email addresses must never be translated');
  // A React render or user interaction can change an observed attribute.
  input.setAttribute('title','Masuk');
  let turns=0;
  while(queue.length && turns++<25)queue.shift()();
  assert.equal(queue.length,0,'Mutation observer must settle instead of starving the browser event loop');
  assert.ok(writes<20,'Unchanged attributes must not be repeatedly written');
  assert.equal(input.getAttribute('placeholder'),{id:'Alamat email',en:'Email address',zh:'电子邮箱'}[locale]);
  text.nodeValue='Ruko Sudirman · Parkir';
  let dataTurns=0;
  while(queue.length && dataTurns++<25)queue.shift()();
  assert.equal(text.nodeValue,{id:'Properti Sudirman · Parkir',en:'Property Sudirman · Parking',zh:'房产 Sudirman · 停车位'}[locale],'Late database text must be normalized and translated');
  text.nodeValue='Daftar';
  input.setAttribute('placeholder','Kata sandi');
  turns=0;
  while(queue.length && turns++<25)queue.shift()();
  assert.equal(queue.length,0);
  assert.equal(text.nodeValue,{id:'Daftar',en:'Sign up',zh:'注册'}[locale],'React text updates must not be reverted to an old translation');
  assert.equal(input.getAttribute('placeholder'),{id:'Kata sandi',en:'Password',zh:'密码'}[locale]);
});
