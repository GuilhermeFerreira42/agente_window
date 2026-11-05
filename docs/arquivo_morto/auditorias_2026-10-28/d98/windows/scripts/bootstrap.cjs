const fs=require('node:fs'),p=require('node:path'),os=require('node:os'),cp=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=process.cwd(),scripts=__dirname,target=p.resolve(process.argv[2]||p.join(os.tmpdir(),'d98-win-'+Date.now()));
const relative=p.relative(root,target);if(!relative||(!relative.startsWith('..'+p.sep)&&relative!=='..'&&!p.isAbsolute(relative)))throw Error('Output must be outside the repository');
if(fs.existsSync(target))throw Error('Output already exists; use a fresh directory (nothing is deleted)');fs.mkdirSync(target);
for(const file of fs.readdirSync(scripts))if(file.endsWith('.cjs')&&file!=='bootstrap.cjs')fs.copyFileSync(p.join(scripts,file),p.join(target,file));
const escaped=value=>JSON.stringify(value).slice(1,-1);
const config=fs.readFileSync(p.join(scripts,'vite-template.txt'),'utf8').replaceAll('@@ROOT_ESC@@',escaped(root)).replaceAll('@@OUT_ESC@@',escaped(target)).replaceAll('@@OUT_SLASH@@',target.replaceAll('\\','/')).replaceAll('@@VITE_URL@@',pathToFileURL(p.join(root,'platform/node_modules/vite/dist/node/index.js')).href);
const component=fs.readFileSync(p.join(scripts,'component-template.txt'),'utf8').replaceAll('@@ROOT_SLASH@@',root.replaceAll('\\','/'));
if(/@@[A-Z_]+@@/.test(config+component))throw Error('Unresolved template placeholder');fs.writeFileSync(p.join(target,'vite-diagnostic.mjs'),config);fs.writeFileSync(p.join(target,'component.tsx'),component);
if(!process.argv.includes('--prepare-only')){const r=cp.spawnSync(process.execPath,[p.join(target,'generate.cjs')],{cwd:root,stdio:'inherit',windowsHide:true,timeout:120000});if(r.status!==0)throw Error('Fixture generation failed');}
console.log('Prepared isolated diagnostics:',target);
