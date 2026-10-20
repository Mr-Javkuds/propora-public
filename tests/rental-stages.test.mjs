import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),exports={};
const compiled=ts.transpileModule(readFileSync(new URL('../app/components/rental-stages.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
vm.runInNewContext(compiled,{exports,require(name){if(name.endsWith('.css'))return {};if(name==='next/link')return function LinkStub({children,...props}){return React.createElement('a',props,children);};return require(name);}});
const render=props=>renderToStaticMarkup(React.createElement(exports.default,{listingId:5,active:1,...props}));
test('A pending application is a non-clickable submitted indicator',()=>{
  const html=render({applicationStatus:'pending'});
  assert.ok(html.includes('Pengajuan terkirim'));
  assert.ok(!html.includes('href="/pencari/booking/pengajuan-sewa?listingId=5"'));
  assert.ok(!html.includes('href="/pencari/payment?listingId=5"'));
  assert.ok(html.includes('aria-disabled="true"'));
});
test('Current application step cannot reload itself; approved applications can continue to payment',()=>{
  const html=render({active:3,applicationStatus:'approved'});
  assert.ok(html.includes('aria-current="step"'));
  assert.ok(!html.includes('href="/pencari/booking/pengajuan-sewa?listingId=5"'));
  assert.ok(html.includes('href="/pencari/payment?listingId=5"'));
});
test('A new application remains accessible when no active request exists',()=>{
  assert.ok(render({}).includes('href="/pencari/booking/pengajuan-sewa?listingId=5"'));
});
