cd `dirname $0`/app/dashboard
# keep the page files of earlier builds: a tab opened before an update still
# asks for them (they're small, and the names never clash: content hashes)
rm -rf /tmp/alexen-old-statics && [ -d build/statics ] && cp -r build/statics /tmp/alexen-old-statics
VITE_BASE_API=/api/ npm run build --if-present -- --outDir build --assetsDir statics
if [ -d /tmp/alexen-old-statics ]; then
  find /tmp/alexen-old-statics -maxdepth 1 -type f -name "*.js" -mtime -30 -exec cp -n {} build/statics/ \;
  find /tmp/alexen-old-statics -maxdepth 1 -type f -name "*.css" -mtime -30 -exec cp -n {} build/statics/ \;
  rm -rf /tmp/alexen-old-statics
fi
cp ./build/index.html ./build/404.html
# precompress (brotli + gzip, best level, once at build): the panel serves these instead of
# compressing the same big files again for every visitor
node -e '
const fs=require("fs"),z=require("zlib"),p=require("path");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p.join(d,e.name)):[p.join(d,e.name)]);
let n=0;for(const f of walk("build")){ if(!/\.(js|css|html|json|svg)$/.test(f)) continue; const b=fs.readFileSync(f); if(b.length<1024) continue;
 const fresh=x=>fs.existsSync(x)&&fs.statSync(x).mtimeMs>=fs.statSync(f).mtimeMs;
 if(!fresh(f+".br")) fs.writeFileSync(f+".br", z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}));
 if(!fresh(f+".gz")) fs.writeFileSync(f+".gz", z.gzipSync(b,{level:9})); n++; }
console.log("precompressed", n, "files");'
