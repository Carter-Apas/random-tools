local root=app.params.root or app.fs.currentPath
local folder=root..'/hot-potato/art/'
local file=io.open(folder..'characters-layout.json','r');local layout=json.decode(file:read('*a'));file:close()
for _,name in ipairs({'male','female'}) do
  local path=folder..'characters-'..name..'.json'
  local input=io.open(path,'r');local metadata=json.decode(input:read('*a'));input:close()
  metadata.meta.anchors={baseline=layout.anchors.baseline,leftHand={x=layout.anchors.leftHand.x,y=layout.anchors.leftHand.y},rightHand={x=layout.anchors.rightHand.x,y=layout.anchors.rightHand.y},vegetable={x=layout.anchors.vegetable.x,y=layout.anchors.vegetable.y}}
  metadata.meta.frameSize={width=layout.frame.width,height=layout.frame.height}
  metadata.meta.approvedSource='art/concepts/fidelity-study/'..name..'-64x96.png'
  metadata.meta.sheets={Idle={image=name..'-idle.png',frames=2,width=128,height=96,durationMs=450},Hold={image=name..'-hold.png',frames=2,width=128,height=96,durationMs=450},Charred={image=name..'-charred.png',frames=1,width=64,height=96},Down={image=name..'-down.png',frames=1,width=64,height=96}}
  local output=io.open(path,'w');output:write(json.encode(metadata));output:close()
end
