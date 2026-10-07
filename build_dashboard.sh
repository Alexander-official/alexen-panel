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
