const fs=require("fs");
const fetch=require("node-fetch");

const config_tracks="tracks.json";
const cmd="mplayer [TRACK]";
const folderDownloads="downloads";

const tracks=JSON.parse(fs.readFileSync(config_tracks,"utf-8"));
const tracksToPlay=tracks.files;

function download(){return new Promise(async resolve=>{
	const downloadFileNames=fs.readdirSync(folderDownloads)
		.map(item=>[item,Buffer.from(item,"hex").toString("utf-8")])
		.filter(item=>item[1]!="");

	const fileUrls=tracks.urls
		.map(item=>[item.split("/")[item.split("/").length-1],item]);
	
	const downloadRequired=fileUrls
		.filter(item=>!downloadFileNames.some(i=>i[1]==item[0]));

	let data;
	for(data of fileUrls){
		const [fileName_utf8,url]=data;
		const downloaded=downloadFileNames.find(item=>item[1]==fileName_utf8);
		if(!downloaded){continue;}
		tracksToPlay.push(folderDownloads+"/"+downloaded[0]);
	}

	if(downloadRequired.length==0){
		resolve();
		return;
	}else{
		console.log("Es müssen noch "+downloadRequired.length+" Songs herunter geladen werden ...\n");
	}
	data="";
	for(data of downloadRequired){
		const [fileName_utf8,url]=data;
		console.log(`${fileName_utf8} wird heruntergeladen...`);
		try{
			const header=await fetch(url);
			const arrayBuffer=await header.arrayBuffer();

			const fileData=Buffer.from(arrayBuffer);
			const fileName_hex=Buffer.from(fileName_utf8).toString("hex");
			const filePath=folderDownloads+"/"+fileName_hex;

			fs.writeFileSync(filePath,fileData);
			tracksToPlay.push(filePath);
		}
		catch(e){
			console.log(`${fileName_utf8} konnte nicht heruntergeladen werden prüfen sie ihr verbindung!`);
			continue;
		}
	}
	console.log("Datei*en wurden heruntergeladen!");
	resolve();
	return;
})}

(async ()=>{
	await download();
	console.log(tracksToPlay)
})();
