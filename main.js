#!/usr/bin/env node
const {
	readFileSync,
	writeFileSync,
	readdirSync,
	mkdirSync,
}=require("fs");
const fetch=require("node-fetch");
const audioPlayerLib=require("audio-player-lib");

const config_tracks="tracks.json";
const folderDownloads="downloads";

const tracks=JSON.parse(readFileSync(config_tracks,"utf-8"));
const player=audioPlayerLib.createPlayer();

function download(){return new Promise(async resolve=>{
	try{mkdirSync(folderDownloads)}catch(e){} // if "catch" the folder already exist!

	const downloadFileNames=readdirSync(folderDownloads)
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
		player.addTrack(folderDownloads+"/"+downloaded[0]);
	}

	if(downloadRequired.length==0){
		resolve();
		return;
	}else{
		const length=downloadRequired.length;
		console.log(`Es ${length==1?"muss":"müssen"} noch ${length} ${length==1?"Song":"Songs"} herunter geladen werden ...\n`);
	}
	data="";
	for(data of downloadRequired){
		const [fileName_utf8,url]=data;
		console.log(`${fileName_utf8} wird heruntergeladen...`);
		try{
			const header=await fetch(url);
			//const contentType=header.headers.get("Content-Type");
			const arrayBuffer=await header.arrayBuffer();

			const fileData=Buffer.from(arrayBuffer);
			const fileName_hex=Buffer.from(fileName_utf8).toString("hex");
			const filePath=folderDownloads+"/"+fileName_hex;

			writeFileSync(filePath,fileData);
			player.addTrack(filePath);
		}
		catch(e){
			console.log(`${fileName_utf8} konnte nicht heruntergeladen werden prüfen sie ihre Verbindung!`);
			continue;
		}
		console.log(`${fileName_utf8} wurde erfolgreich heruntergeladen und zur wiedergabe hinzugefügt!`);
	}
	console.log("Herunterladen wurde abgeschlossen!");
	resolve();
	return;
})}

download();

for(const track of tracks.files){
	player.addTrack(track);
}
player.play();
