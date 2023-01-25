const fs=require("fs");

const configFileName="autoAddConfig.json";
const tracksConfFileName="tracks.json";

const config=JSON.parse(fs.readFileSync(configFileName,"utf-8"));
const tracksConf=JSON.parse(fs.readFileSync(tracksConfFileName,"utf-8"));

const filesFound=fs.readdirSync(config.searchPath)
	.filter(item=>fs.lstatSync(config.searchPath+"/"+item).isFile())
	.filter(item=>item.split(".").length==1?false:config.allowedTypes.some(i=>i==item.split(".")[1].toLowerCase()))
	.map(item=>config.searchPath+"/"+item)

const pushItems=filesFound
	.filter(item=>!tracksConf.files.some(i=>i==item))

tracksConf.files=[
	...tracksConf.files,
	...pushItems,
];

fs.writeFileSync(tracksConfFileName,JSON.stringify(tracksConf,null,2).split("  ").join("\t"));
